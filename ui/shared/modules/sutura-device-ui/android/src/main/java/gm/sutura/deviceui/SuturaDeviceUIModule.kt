package gm.sutura.deviceui

import android.app.AlertDialog
import android.content.Context
import android.content.res.Configuration
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.Switch
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView
import expo.modules.kotlin.viewevent.EventDispatcher

class SuturaDeviceUIModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SuturaDeviceUI")
    View(DeviceControlView::class) {
      Events("onAction", "onValueChange")
      Prop("controlKind") { view: DeviceControlView, value: String -> view.kind = value }
      Prop("label") { view: DeviceControlView, value: String -> view.label = value }
      Prop("value") { view: DeviceControlView, value: String -> view.value = value }
      Prop("checked") { view: DeviceControlView, value: Boolean -> view.checked = value }
      Prop("disabled") { view: DeviceControlView, value: Boolean -> view.disabled = value }
      Prop("dark") { view: DeviceControlView, value: Boolean -> view.dark = value }
      Prop("options") { view: DeviceControlView, value: List<Map<String, Any?>> -> view.options = value }
      OnViewDidUpdateProps { view: DeviceControlView -> view.updateControl() }
      OnViewDestroys { view: DeviceControlView -> view.closeDialog() }
    }
  }
}

/** Framework widgets, explicitly themed by the OS/OEM rather than AppCompat. */
class DeviceControlView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  override val shouldUseAndroidLayout = true
  val onAction by EventDispatcher()
  val onValueChange by EventDispatcher()
  var kind = "button"
  var label = ""
  var value = ""
  var checked = false
  var disabled = false
  var dark = false
  var options: List<Map<String, Any?>> = emptyList()
  private var widget: View? = null
  private var widgetKey = ""
  private var dialog: AlertDialog? = null
  private var synchronizing = false

  init {
    gravity = Gravity.CENTER_VERTICAL
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  private fun deviceContext(): Context {
    val config = Configuration(context.resources.configuration)
    config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
      if (dark) Configuration.UI_MODE_NIGHT_YES else Configuration.UI_MODE_NIGHT_NO
    val base = appContext.currentActivity ?: context
    return object : ContextThemeWrapper(base, if (dark)
      android.R.style.Theme_DeviceDefault_NoActionBar else android.R.style.Theme_DeviceDefault_Light_NoActionBar) {
      private var deviceInflater: LayoutInflater? = null
      override fun getSystemService(name: String): Any? {
        // Keep the activity's WindowManager/token, but do not inherit its
        // AppCompat inflater factory when the framework dialog inflates widgets.
        if (name == Context.LAYOUT_INFLATER_SERVICE) {
          return deviceInflater ?: LayoutInflater.from(base.applicationContext).cloneInContext(this).also {
            deviceInflater = it
          }
        }
        return super.getSystemService(name)
      }
    }.apply {
        applyOverrideConfiguration(config)
      }
  }

  fun updateControl() {
    val key = "$kind:$dark"
    if (key != widgetKey) {
      closeDialog()
      removeAllViews()
      val themed = deviceContext()
      widget = if (kind == "switch") Switch(themed).apply {
        setOnCheckedChangeListener { _, next ->
          if (!synchronizing && !disabled) onValueChange(mapOf("checked" to next))
        }
      } else Button(themed).apply {
        setOnClickListener {
          if (!disabled) {
            if (kind == "select") openSelection() else onAction(emptyMap<String, Any>())
          }
        }
      }
      addView(widget, LinearLayout.LayoutParams(
        if (kind == "switch") ViewGroup.LayoutParams.WRAP_CONTENT else ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT))
      widgetKey = key
    }
    synchronizing = true
    widget?.isEnabled = !disabled && (kind != "select" || options.any { it["enabled"] != false })
    widget?.contentDescription = label
    if (widget is Switch) (widget as Switch).isChecked = checked
    else (widget as? Button)?.text = if (kind == "select")
      options.firstOrNull { it["value"] == value }?.get("label") as? String ?: "Choose an option" else label
    synchronizing = false
    if (disabled) closeDialog()
  }

  private fun openSelection() {
    if (dialog != null || disabled) return
    val themed = deviceContext()
    val entries = options.toList()
    val adapter = object : ArrayAdapter<String>(themed, android.R.layout.simple_list_item_single_choice,
      entries.map { it["label"] as? String ?: "" }) {
      override fun areAllItemsEnabled() = false
      override fun isEnabled(position: Int) = entries[position]["enabled"] != false
      override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
        return super.getView(position, convertView, parent).apply {
          isEnabled = entries[position]["enabled"] != false
          alpha = if (isEnabled) 1f else .38f
        }
      }
    }
    dialog = AlertDialog.Builder(themed)
      .setTitle(label)
      .setSingleChoiceItems(adapter, entries.indexOfFirst { it["value"] == value }) { popup, index ->
        val option = entries.getOrNull(index)
        val selectedValue = option?.get("value") as? String
        // Recheck current props: a wallet may become disabled while the dialog is open.
        if (!disabled && selectedValue != null && options.any { it["value"] == selectedValue && it["enabled"] != false }) {
          onValueChange(mapOf("value" to selectedValue))
          popup.dismiss()
        }
      }
      .setNegativeButton(android.R.string.cancel, null)
      .create().also { popup -> popup.setOnDismissListener { dialog = null }; popup.show() }
  }

  fun closeDialog() { dialog?.dismiss(); dialog = null }
  override fun onDetachedFromWindow() { closeDialog(); super.onDetachedFromWindow() }
}
