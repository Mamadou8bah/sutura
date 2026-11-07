import ExpoModulesCore
import UIKit

public final class SuturaDeviceUIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SuturaDeviceUI")
    Constants(["supportsNativeTabs": true, "supportsButtonTint": true])
    View(DeviceControlView.self) {
      Events("onAction", "onValueChange")
      Prop("controlKind") { (view: DeviceControlView, value: String) in view.kind = value }
      Prop("buttonColor") { (view: DeviceControlView, value: String) in view.buttonColor = value }
      Prop("textColor") { (view: DeviceControlView, value: String) in view.textColor = value }
      Prop("label") { (view: DeviceControlView, value: String) in view.label = value }
      Prop("value") { (view: DeviceControlView, value: String) in view.value = value }
      Prop("checked") { (view: DeviceControlView, value: Bool) in view.checked = value }
      Prop("disabled") { (view: DeviceControlView, value: Bool) in view.disabled = value }
      Prop("dark") { (view: DeviceControlView, value: Bool) in view.dark = value }
      Prop("options") { (view: DeviceControlView, value: [[String: Any]]) in view.options = value }
      OnViewDidUpdateProps { (view: DeviceControlView) in view.updateControl() }
    }
  }
}

final class DeviceControlView: ExpoView, UITabBarDelegate {
  let onAction = EventDispatcher()
  let onValueChange = EventDispatcher()
  var kind = "button"
  var label = ""
  var buttonColor = "#f97316"
  var textColor = "#181a20"
  var value = ""
  var options: [[String: Any]] = []
  private var tabValues: [String] = []
  private let tabs = UITabBar()
  var checked = false
  var disabled = false
  var dark = false
  private let button = UIButton(type: .system)
  private let toggle = UISwitch()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    button.configuration = .filled()
    button.titleLabel?.adjustsFontForContentSizeCategory = true
    button.addTarget(self, action: #selector(pressed), for: .touchUpInside)
    toggle.addTarget(self, action: #selector(changed), for: .valueChanged)
    tabs.delegate = self
    addSubview(tabs)
    addSubview(button)
    addSubview(toggle)
  }

  func updateControl() {
    overrideUserInterfaceStyle = dark ? .dark : .light
    button.isHidden = kind == "switch" || kind == "tabs"
    tabs.isHidden = kind != "tabs"
    if kind == "tabs" { updateTabs() }
    toggle.isHidden = kind != "switch"
    button.isEnabled = !disabled
    toggle.isEnabled = !disabled
    var configuration = button.configuration ?? .filled()
    configuration.baseBackgroundColor = UIColor(suturaHex: buttonColor)
    configuration.baseForegroundColor = UIColor(suturaHex: textColor)
    configuration.cornerStyle = .medium
    configuration.contentInsets = NSDirectionalEdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 16)
    button.configuration = configuration
    button.setTitle(label, for: .normal)
    button.accessibilityLabel = label
    toggle.accessibilityLabel = label
    toggle.setOn(checked, animated: false)
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    button.frame = bounds
    tabs.frame = bounds
    let size = toggle.sizeThatFits(bounds.size)
    toggle.frame = CGRect(x: max(0, bounds.width - size.width), y: max(0, (bounds.height - size.height) / 2),
                          width: size.width, height: size.height)
  }

  private func updateTabs() {
    let symbols = ["home-outline": "house", "wallet-outline": "wallet.pass",
      "scan-outline": "qrcode.viewfinder", "qr-code-outline": "qrcode",
      "receipt-outline": "list.bullet.rectangle", "time-outline": "clock",
      "person-outline": "person.crop.circle", "grid-outline": "square.grid.2x2"]
    tabValues = options.compactMap { $0["value"] as? String }
    let items = options.enumerated().map { index, option in
      let symbol = symbols[option["icon"] as? String ?? ""] ?? "circle"
      let item = UITabBarItem(title: option["label"] as? String,
        image: UIImage(systemName: symbol), tag: index)
      item.isEnabled = !disabled && (option["enabled"] as? Bool != false)
      if let badge = option["badge"] as? Int, badge > 0 { item.badgeValue = String(badge) }
      return item
    }
    tabs.setItems(items, animated: false)
    if let index = tabValues.firstIndex(of: value), index < items.count { tabs.selectedItem = items[index] }
  }

  func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    guard !disabled, options.indices.contains(item.tag), item.isEnabled,
      let next = options[item.tag]["value"] as? String, next != value else { return }
    onValueChange(["value": next])
  }

  @objc private func pressed() { if !disabled { onAction([:]) } }
  @objc private func changed() { if !disabled { onValueChange(["checked": toggle.isOn]) } }
}

private extension UIColor {
  convenience init(suturaHex value: String) {
    let hex = value.replacingOccurrences(of: "#", with: "")
    let number = UInt32(hex, radix: 16) ?? 0xf97316
    self.init(red: CGFloat((number >> 16) & 255) / 255,
              green: CGFloat((number >> 8) & 255) / 255,
              blue: CGFloat(number & 255) / 255, alpha: 1)
  }
}
