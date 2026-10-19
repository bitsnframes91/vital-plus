import Capacitor
import Foundation
import Security

/// Keychain-backed storage for the Supabase auth session (see src/mobile/secure-auth-storage.ts).
/// Items are readable after the first unlock, stay on this device and are excluded from backups.
@objc(SecureSessionStoragePlugin)
public class SecureSessionStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureSessionStoragePlugin"
    public let jsName = "SecureSessionStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise)
    ]

    private let service = (Bundle.main.bundleIdentifier ?? "app") + ".auth-session"
    private static let installMarker = "secureSessionStorageInstalled"

    override public func load() {
        // Keychain items outlive app deletion; a reinstall must not resume the previous user's session.
        if !UserDefaults.standard.bool(forKey: Self.installMarker) {
            SecItemDelete([kSecClass: kSecClassGenericPassword, kSecAttrService: service] as CFDictionary)
            UserDefaults.standard.set(true, forKey: Self.installMarker)
        }
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("Missing key") }
        var query = baseQuery(key)
        query[kSecReturnData] = true
        query[kSecMatchLimit] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return call.resolve(["value": NSNull()]) }
        guard status == errSecSuccess, let data = item as? Data, let value = String(data: data, encoding: .utf8) else {
            return call.reject("Keychain read failed", String(status))
        }
        call.resolve(["value": value])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            return call.reject("Missing key or value")
        }
        let data = Data(value.utf8)
        var status = SecItemUpdate(baseQuery(key) as CFDictionary, [kSecValueData: data] as CFDictionary)
        if status == errSecItemNotFound {
            var item = baseQuery(key)
            item[kSecValueData] = data
            item[kSecAttrAccessible] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            status = SecItemAdd(item as CFDictionary, nil)
        }
        status == errSecSuccess ? call.resolve() : call.reject("Keychain write failed", String(status))
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else { return call.reject("Missing key") }
        let status = SecItemDelete(baseQuery(key) as CFDictionary)
        status == errSecSuccess || status == errSecItemNotFound ? call.resolve() : call.reject("Keychain delete failed", String(status))
    }

    private func baseQuery(_ key: String) -> [CFString: Any] {
        [kSecClass: kSecClassGenericPassword, kSecAttrService: service, kSecAttrAccount: key]
    }
}
