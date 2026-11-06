import ExpoModulesCore
import UIKit

public final class SuturaDeviceUIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SuturaDeviceUI")
    View(DeviceControlView.self) {
      Events("onAction", "onValueChange")
      Prop("controlKind") { (view: DeviceControlView, value: String) in view.kind = value }
      Prop("label") { (view: DeviceControlView, value: String) in view.label = value }
      Prop("value") { (_: DeviceControlView, _: String) in }
      Prop("checked") { (view: DeviceControlView, value: Bool) in view.checked = value }
      Prop("disabled") { (view: DeviceControlView, value: Bool) in view.disabled = value }
      Prop("dark") { (view: DeviceControlView, value: Bool) in view.dark = value }
      Prop("options") { (_: DeviceControlView, _: [[String: Any]]) in }
      OnViewDidUpdateProps { (view: DeviceControlView) in view.updateControl() }
    }
  }
}

final class DeviceControlView: ExpoView {
  let onAction = EventDispatcher()
  let onValueChange = EventDispatcher()
  var kind = "button"
  var label = ""
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
    addSubview(button)
    addSubview(toggle)
  }

  func updateControl() {
    overrideUserInterfaceStyle = dark ? .dark : .light
    button.isHidden = kind == "switch"
    toggle.isHidden = kind != "switch"
    button.isEnabled = !disabled
    toggle.isEnabled = !disabled
    button.setTitle(label, for: .normal)
    button.accessibilityLabel = label
    toggle.accessibilityLabel = label
    toggle.setOn(checked, animated: false)
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    button.frame = bounds
    let size = toggle.sizeThatFits(bounds.size)
    toggle.frame = CGRect(x: max(0, bounds.width - size.width), y: max(0, (bounds.height - size.height) / 2),
                          width: size.width, height: size.height)
  }

  @objc private func pressed() { if !disabled { onAction([:]) } }
  @objc private func changed() { if !disabled { onValueChange(["checked": toggle.isOn]) } }
}
