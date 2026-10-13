import Capacitor
import UIKit

/// Bridge view controller that registers the app's local plugins.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SecureSessionStoragePlugin())
    }
}
