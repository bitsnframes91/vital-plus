import Capacitor
import Foundation
import HealthKit

/// Narrow Apple Health bridge (see src/lib/apple-health and docs/ios/PHASE-2C-APPLE-HEALTH-HANDOFF.md).
/// - Reads bounded daily summaries, excluding samples this app wrote, so imports never echo back.
/// - Writes only app-originated samples with HealthKit sync identifiers (no duplicates) and only
///   deletes its own samples; data from other apps is never changed.
/// - Keeps the per-account cache in protected files that are excluded from backups.
/// Health values are never logged.
@objc(VitalHealthPlugin)
public class VitalHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VitalHealthPlugin"
    public let jsName = "VitalHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRequestStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWriteStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readDailySummary", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "writeSamples", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteSamples", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "loadState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearState", returnType: CAPPluginReturnPromise)
    ]

    private struct UnitInfo {
        let unit: HKUnit
        let name: String
    }

    /// Quantity types available on this iOS version. runningSpeed needs iOS 16; the app supports iOS 15.
    private static let quantityIdentifiers: [String: HKQuantityTypeIdentifier] = {
        var identifiers: [String: HKQuantityTypeIdentifier] = [
            "stepCount": .stepCount,
            "heartRate": .heartRate,
            "bodyMass": .bodyMass,
            "dietaryEnergyConsumed": .dietaryEnergyConsumed,
            "activeEnergyBurned": .activeEnergyBurned,
            "basalEnergyBurned": .basalEnergyBurned,
            "dietaryWater": .dietaryWater,
            "distanceWalkingRunning": .distanceWalkingRunning,
            "walkingSpeed": .walkingSpeed
        ]
        if #available(iOS 16.0, *) {
            identifiers["runningSpeed"] = .runningSpeed
        }
        return identifiers
    }()
    private static let units: [String: UnitInfo] = [
        "stepCount": UnitInfo(unit: .count(), name: "count"),
        "heartRate": UnitInfo(unit: HKUnit.count().unitDivided(by: .minute()), name: "count/min"),
        "bodyMass": UnitInfo(unit: .gramUnit(with: .kilo), name: "kg"),
        "dietaryEnergyConsumed": UnitInfo(unit: .kilocalorie(), name: "kcal"),
        "activeEnergyBurned": UnitInfo(unit: .kilocalorie(), name: "kcal"),
        "basalEnergyBurned": UnitInfo(unit: .kilocalorie(), name: "kcal"),
        "dietaryWater": UnitInfo(unit: .literUnit(with: .milli), name: "mL"),
        "distanceWalkingRunning": UnitInfo(unit: .meterUnit(with: .kilo), name: "km"),
        "walkingSpeed": UnitInfo(unit: HKUnit.meterUnit(with: .kilo).unitDivided(by: .hour()), name: "km/h"),
        "runningSpeed": UnitInfo(unit: HKUnit.meterUnit(with: .kilo).unitDivided(by: .hour()), name: "km/h")
    ]
    /// Every type the app may ask for. Types missing on this iOS version (see quantityIdentifiers)
    /// are skipped instead of rejected, so one app build works on all supported iOS versions.
    private static let knownReadable: Set<String> = [
        "stepCount", "heartRate", "bodyMass", "sleepAnalysis", "dietaryEnergyConsumed", "activeEnergyBurned",
        "basalEnergyBurned", "dietaryWater", "distanceWalkingRunning", "walkingSpeed", "runningSpeed"
    ]
    private static let readable: Set<String> = Set(quantityIdentifiers.keys).union(["sleepAnalysis"])
    /// Speeds are discrete samples: the daily value is the average of that day's samples.
    private static let averaged: Set<String> = ["walkingSpeed", "runningSpeed"]
    // Basal energy, heart rate, steps and sleep are never written: they are device measurements.
    private static let writable: Set<String> = ["bodyMass", "dietaryWater", "dietaryEnergyConsumed", "activeEnergyBurned"]
    private static let plausible: [String: ClosedRange<Double>] = [
        "bodyMass": 20...400,
        "dietaryWater": 1...10_000,
        "dietaryEnergyConsumed": 1...10_000,
        "activeEnergyBurned": 1...5_000
    ]
    private static let recordKey = "VitalPlusRecordId"
    private static let maxStateBytes = 512 * 1024

    private lazy var store = HKHealthStore()

    // MARK: - Availability and authorization

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { return call.reject("HealthKit unavailable", "UNAVAILABLE") }
        guard let read = Self.readTypes(call.getArray("read", String.self) ?? []),
              let share = Self.quantityTypes(call.getArray("write", String.self) ?? [], allowed: Self.writable) else {
            return call.reject("Unsupported Health data type", "INVALID")
        }
        // Success only means the sheet was handled; HealthKit never reveals which reads were allowed.
        store.requestAuthorization(toShare: share, read: read) { success, error in
            if success {
                call.resolve(["requested": true])
            } else {
                call.reject("Authorization request failed", "AUTH_FAILED", error)
            }
        }
    }

    /// Whether requestAuthorization would show the Health sheet for these types, e.g. because a
    /// newer app version reads types the user has not been asked about yet. Never shows UI.
    @objc func getRequestStatus(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { return call.reject("HealthKit unavailable", "UNAVAILABLE") }
        guard let read = Self.readTypes(call.getArray("read", String.self) ?? []),
              let share = Self.quantityTypes(call.getArray("write", String.self) ?? [], allowed: Self.writable) else {
            return call.reject("Unsupported Health data type", "INVALID")
        }
        store.getRequestStatusForAuthorization(toShare: share, read: read) { status, error in
            if let error = error { return call.reject("Request status failed", "AUTH_FAILED", error) }
            switch status {
            case .shouldRequest: call.resolve(["status": "shouldRequest"])
            case .unnecessary: call.resolve(["status": "unnecessary"])
            default: call.resolve(["status": "unknown"])
            }
        }
    }

    @objc func getWriteStatus(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { return call.reject("HealthKit unavailable", "UNAVAILABLE") }
        var statuses: [String: String] = [:]
        for name in call.getArray("types", String.self) ?? [] where Self.writable.contains(name) {
            guard let type = Self.quantityType(name) else { continue }
            switch store.authorizationStatus(for: type) {
            case .sharingAuthorized: statuses[name] = "authorized"
            case .sharingDenied: statuses[name] = "denied"
            default: statuses[name] = "notDetermined"
            }
        }
        call.resolve(["statuses": statuses])
    }

    // MARK: - Reading (bounded, other sources only)

    @objc func readDailySummary(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { return call.reject("HealthKit unavailable", "UNAVAILABLE") }
        let days = min(max(call.getInt("days") ?? 7, 1), 31)
        let requested = Set(call.getArray("types", String.self) ?? Array(Self.readable))
        guard requested.isSubset(of: Self.knownReadable) else { return call.reject("Unsupported Health data type", "INVALID") }
        let names = requested.intersection(Self.readable)
        let unsupported = requested.subtracting(Self.readable).sorted()
        let calendar = Calendar.current
        let now = Date()
        guard let start = calendar.date(byAdding: .day, value: -(days - 1), to: calendar.startOfDay(for: now)) else {
            return call.reject("Invalid date range", "INVALID")
        }
        let notOwn = NSCompoundPredicate(notPredicateWithSubpredicate: HKQuery.predicateForObjects(from: HKSource.default()))
        let group = DispatchGroup()
        let lock = NSLock()
        var rows: [[String: Any]] = []
        var failed: [String] = []
        for name in names {
            group.enter()
            let done: (Result<[[String: Any]], Error>) -> Void = { result in
                lock.lock()
                switch result {
                case .success(let found): rows.append(contentsOf: found)
                case .failure: failed.append(name)
                }
                lock.unlock()
                group.leave()
            }
            switch name {
            case "sleepAnalysis":
                readSleep(start: start, end: now, notOwn: notOwn, calendar: calendar, done: done)
            case "bodyMass":
                readLatest(name, start: start, end: now, notOwn: notOwn, calendar: calendar, done: done)
            case "heartRate":
                readDaily(name, options: [.discreteAverage, .discreteMin, .discreteMax], start: start, end: now, notOwn: notOwn, calendar: calendar, done: done)
            case _ where Self.averaged.contains(name):
                readDaily(name, options: .discreteAverage, start: start, end: now, notOwn: notOwn, calendar: calendar, done: done)
            default:
                readDaily(name, options: .cumulativeSum, start: start, end: now, notOwn: notOwn, calendar: calendar, done: done)
            }
        }
        group.notify(queue: .main) {
            call.resolve([
                "results": rows,
                "failedTypes": failed,
                "unsupportedTypes": unsupported,
                "startDay": Self.dayKey(start, calendar),
                "endDay": Self.dayKey(now, calendar)
            ])
        }
    }

    private func readDaily(_ name: String, options: HKStatisticsOptions, start: Date, end: Date, notOwn: NSPredicate,
                           calendar: Calendar, done: @escaping (Result<[[String: Any]], Error>) -> Void) {
        guard let type = Self.quantityType(name), let info = Self.units[name] else { return done(.success([])) }
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate), notOwn
        ])
        // Statistics merge overlapping sources (iPhone and Watch) the way the Health app does.
        let query = HKStatisticsCollectionQuery(quantityType: type, quantitySamplePredicate: predicate, options: options,
                                                anchorDate: start, intervalComponents: DateComponents(day: 1))
        query.initialResultsHandler = { _, collection, error in
            if let error = error {
                if let hkError = error as? HKError, hkError.code == .errorNoData { return done(.success([])) }
                return done(.failure(error))
            }
            var found: [[String: Any]] = []
            collection?.enumerateStatistics(from: start, to: end) { statistics, _ in
                let day = Self.dayKey(statistics.startDate, calendar)
                let values: [(String, HKQuantity?)] = [
                    ("sum", options.contains(.cumulativeSum) ? statistics.sumQuantity() : nil),
                    ("avg", options.contains(.discreteAverage) ? statistics.averageQuantity() : nil),
                    ("min", options.contains(.discreteMin) ? statistics.minimumQuantity() : nil),
                    ("max", options.contains(.discreteMax) ? statistics.maximumQuantity() : nil)
                ]
                // Days without samples have no quantity and are omitted: missing is not zero.
                for (aggregation, quantity) in values {
                    guard let quantity = quantity else { continue }
                    found.append(["type": name, "day": day, "aggregation": aggregation,
                                  "value": quantity.doubleValue(for: info.unit), "unit": info.name])
                }
            }
            done(.success(found))
        }
        store.execute(query)
    }

    private func readLatest(_ name: String, start: Date, end: Date, notOwn: NSPredicate, calendar: Calendar,
                            done: @escaping (Result<[[String: Any]], Error>) -> Void) {
        guard let type = Self.quantityType(name), let info = Self.units[name] else { return done(.success([])) }
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForSamples(withStart: start, end: end, options: []), notOwn
        ])
        let newestFirst = [NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)]
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: 1, sortDescriptors: newestFirst) { _, samples, error in
            if let error = error { return done(.failure(error)) }
            guard let sample = samples?.first as? HKQuantitySample else { return done(.success([])) }
            done(.success([["type": name, "day": Self.dayKey(sample.endDate, calendar), "aggregation": "latest",
                            "value": sample.quantity.doubleValue(for: info.unit), "unit": info.name]]))
        }
        store.execute(query)
    }

    private func readSleep(start: Date, end: Date, notOwn: NSPredicate, calendar: Calendar,
                           done: @escaping (Result<[[String: Any]], Error>) -> Void) {
        guard let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else { return done(.success([])) }
        // A night belongs to the day it ends; include sleep that began the evening before the range.
        let predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForSamples(withStart: start.addingTimeInterval(-18 * 3600), end: end, options: []), notOwn
        ])
        let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error { return done(.failure(error)) }
            // "In bed" and "awake" are not sleep; every asleep stage is. Overlapping samples from
            // several sources are merged so the same minutes are not counted twice.
            let notSleep: Set<Int> = [HKCategoryValueSleepAnalysis.inBed.rawValue, HKCategoryValueSleepAnalysis.awake.rawValue]
            let intervals = (samples as? [HKCategorySample] ?? [])
                .filter { !notSleep.contains($0.value) }
                .map { (start: $0.startDate, end: $0.endDate) }
                .sorted { $0.start < $1.start }
            var merged: [(start: Date, end: Date)] = []
            for interval in intervals {
                if let last = merged.last, interval.start <= last.end {
                    merged[merged.count - 1].end = max(last.end, interval.end)
                } else {
                    merged.append(interval)
                }
            }
            var minutes: [String: Double] = [:]
            for interval in merged where interval.end > start {
                minutes[Self.dayKey(interval.end, calendar), default: 0] += interval.end.timeIntervalSince(interval.start) / 60
            }
            done(.success(minutes.map { ["type": "sleepAnalysis", "day": $0.key, "aggregation": "sum", "value": $0.value, "unit": "min"] }))
        }
        store.execute(query)
    }

    // MARK: - Writing (app-originated samples only)

    @objc func writeSamples(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { return call.reject("HealthKit unavailable", "UNAVAILABLE") }
        guard let tag = call.getString("accountTag"), Self.matches(tag, "^[a-f0-9]{16}$") else {
            return call.reject("Missing account tag", "INVALID")
        }
        let items = call.getArray("samples", JSObject.self) ?? []
        guard items.count <= 200 else { return call.reject("Too many samples", "INVALID") }
        var results: [[String: Any]] = []
        func next(_ index: Int) {
            guard index < items.count else { return call.resolve(["results": results]) }
            writeOne(items[index], tag: tag) { recordId, status in
                results.append(["recordId": recordId, "status": status])
                next(index + 1)
            }
        }
        next(0)
    }

    private func writeOne(_ item: JSObject, tag: String, completion: @escaping (String, String) -> Void) {
        let recordId = item["recordId"] as? String ?? ""
        guard Self.matches(recordId, "^[a-z]+\\.[A-Za-z0-9_.:-]{1,80}$"),
              let name = item["type"] as? String, Self.writable.contains(name),
              let type = Self.quantityType(name), let info = Self.units[name], (item["unit"] as? String) == info.name,
              let value = Self.number(item["value"]), let range = Self.plausible[name], range.contains(value),
              let startMs = Self.number(item["startMs"]), let endMs = Self.number(item["endMs"]), endMs >= startMs,
              let versionValue = Self.number(item["version"]), versionValue >= 1 else {
            return completion(recordId, "invalid")
        }
        guard store.authorizationStatus(for: type) == .sharingAuthorized else { return completion(recordId, "unauthorized") }
        let syncId = "vitalplus.\(tag).\(recordId)"
        let version = Int64(versionValue)
        let query = HKSampleQuery(sampleType: type, predicate: Self.ownSample(syncId), limit: HKObjectQueryNoLimit, sortDescriptors: nil) { [weak self] _, samples, error in
            guard let self = self, error == nil else { return completion(recordId, "failed") }
            let stored = (samples ?? []).compactMap { ($0.metadata?[HKMetadataKeySyncVersion] as? NSNumber)?.int64Value }.max()
            if let stored = stored, stored >= version { return completion(recordId, "duplicate") }
            // A higher sync version replaces this app's earlier sample with the same identifier.
            let sample = HKQuantitySample(
                type: type,
                quantity: HKQuantity(unit: info.unit, doubleValue: value),
                start: Date(timeIntervalSince1970: startMs / 1000),
                end: Date(timeIntervalSince1970: endMs / 1000),
                metadata: [
                    HKMetadataKeySyncIdentifier: syncId,
                    HKMetadataKeySyncVersion: NSNumber(value: version),
                    HKMetadataKeyWasUserEntered: true,
                    Self.recordKey: recordId
                ]
            )
            self.store.save(sample) { saved, _ in completion(recordId, saved ? "saved" : "failed") }
        }
        store.execute(query)
    }

    @objc func deleteSamples(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else { return call.reject("HealthKit unavailable", "UNAVAILABLE") }
        guard let tag = call.getString("accountTag"), Self.matches(tag, "^[a-f0-9]{16}$") else {
            return call.reject("Missing account tag", "INVALID")
        }
        let items = call.getArray("items", JSObject.self) ?? []
        guard items.count <= 200 else { return call.reject("Too many samples", "INVALID") }
        var results: [[String: Any]] = []
        func next(_ index: Int) {
            guard index < items.count else { return call.resolve(["results": results]) }
            let item = items[index]
            let recordId = item["recordId"] as? String ?? ""
            guard Self.matches(recordId, "^[a-z]+\\.[A-Za-z0-9_.:-]{1,80}$"), let name = item["type"] as? String,
                  Self.writable.contains(name), let type = Self.quantityType(name) else {
                results.append(["recordId": recordId, "status": "invalid"])
                return next(index + 1)
            }
            guard store.authorizationStatus(for: type) == .sharingAuthorized else {
                results.append(["recordId": recordId, "status": "unauthorized"])
                return next(index + 1)
            }
            // The predicate is limited to this app's source: other apps' data is never deleted.
            store.deleteObjects(of: type, predicate: Self.ownSample("vitalplus.\(tag).\(recordId)")) { ok, count, _ in
                results.append(["recordId": recordId, "status": ok ? (count > 0 ? "deleted" : "notFound") : "failed"])
                next(index + 1)
            }
        }
        next(0)
    }

    // MARK: - Device-only cache (one protected file per account)

    @objc func loadState(_ call: CAPPluginCall) {
        guard let url = stateURL(call.getString("accountKey")) else { return call.reject("Invalid account key", "INVALID") }
        guard let data = try? Data(contentsOf: url) else { return call.resolve(["json": NSNull()]) }
        call.resolve(["json": String(decoding: data, as: UTF8.self)])
    }

    @objc func saveState(_ call: CAPPluginCall) {
        guard let url = stateURL(call.getString("accountKey")) else { return call.reject("Invalid account key", "INVALID") }
        guard let json = call.getString("json"), json.utf8.count <= Self.maxStateBytes else {
            return call.reject("Invalid state", "INVALID")
        }
        do {
            try Data(json.utf8).write(to: url, options: [.atomic, .completeFileProtection])
            call.resolve()
        } catch {
            call.reject("Saving local Health data failed", "STORAGE")
        }
    }

    @objc func clearState(_ call: CAPPluginCall) {
        guard let url = stateURL(call.getString("accountKey")) else { return call.reject("Invalid account key", "INVALID") }
        do {
            if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
            call.resolve()
        } catch {
            call.reject("Deleting local Health data failed", "STORAGE")
        }
    }

    private func stateURL(_ accountKey: String?) -> URL? {
        guard let key = accountKey, Self.matches(key, "^[a-f0-9]{64}$"),
              var directory = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                                            appropriateFor: nil, create: true) else { return nil }
        directory.appendPathComponent("VitalHealth", isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
                                                    attributes: [.protectionKey: FileProtectionType.complete])
            // Device-only: never part of iCloud or computer backups.
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try directory.setResourceValues(values)
        } catch {
            return nil
        }
        return directory.appendingPathComponent("\(key).json")
    }

    // MARK: - Helpers

    private static func quantityType(_ name: String) -> HKQuantityType? {
        guard let identifier = quantityIdentifiers[name] else { return nil }
        return HKObjectType.quantityType(forIdentifier: identifier)
    }

    private static func objectTypes(_ names: [String], allowed: Set<String>) -> Set<HKObjectType>? {
        var result = Set<HKObjectType>()
        for name in names {
            guard allowed.contains(name) else { return nil }
            if name == "sleepAnalysis", let type = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
                result.insert(type)
            } else if let type = quantityType(name) {
                result.insert(type)
            } else {
                return nil
            }
        }
        return result
    }

    /// Read types for authorization: unknown names are invalid (nil); known names that this iOS
    /// version lacks are skipped.
    private static func readTypes(_ names: [String]) -> Set<HKObjectType>? {
        guard Set(names).isSubset(of: knownReadable) else { return nil }
        return objectTypes(names.filter { readable.contains($0) }, allowed: readable)
    }

    private static func quantityTypes(_ names: [String], allowed: Set<String>) -> Set<HKSampleType>? {
        var result = Set<HKSampleType>()
        for name in names {
            guard allowed.contains(name), let type = quantityType(name) else { return nil }
            result.insert(type)
        }
        return result
    }

    private static func ownSample(_ syncId: String) -> NSPredicate {
        NSCompoundPredicate(andPredicateWithSubpredicates: [
            HKQuery.predicateForObjects(withMetadataKey: HKMetadataKeySyncIdentifier, allowedValues: [syncId]),
            HKQuery.predicateForObjects(from: HKSource.default())
        ])
    }

    private static func number(_ value: JSValue?) -> Double? {
        let result = (value as? NSNumber)?.doubleValue ?? (value as? Double)
        guard let number = result, number.isFinite else { return nil }
        return number
    }

    private static func matches(_ value: String, _ pattern: String) -> Bool {
        value.range(of: pattern, options: .regularExpression) != nil
    }

    private static func dayKey(_ date: Date, _ calendar: Calendar) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }
}
