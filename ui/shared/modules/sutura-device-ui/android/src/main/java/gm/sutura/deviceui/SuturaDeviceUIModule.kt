package gm.sutura.deviceui

import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.navigation.NavigationBarView
import com.google.android.material.color.DynamicColors
import android.graphics.Color
import android.content.res.ColorStateList
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
    Constants("supportsNativeTabs" to true, "supportsButtonTint" to true)
    View(DeviceControlView::class) {
      Events("onAction", "onValueChange")
      Prop("controlKind") { view: DeviceControlView, value: String -> view.kind = value }
      Prop("buttonColor") { view: DeviceControlView, value: String -> view.buttonColor = value }
      Prop("textColor") { view: DeviceControlView, value: String -> view.textColor = value }
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
  var buttonColor = "#f97316"
  var textColor = "#181a20"
  var value = ""
  var checked = false
  var disabled = false
  var dark = false
  var options: List<Map<String, Any?>> = emptyList()
  private var widget: View? = null
  private var widgetKey = ""
  private var dialog: AlertDialog? = null
  private var synchronizing = false
  private var tabOptions: List<Map<String, Any?>> = emptyList()

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
      tabOptions = emptyList()
      val themed = deviceContext()
      widget = if (kind == "tabs") createTabs() else if (kind == "switch") Switch(themed).apply {
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
    if (widget is BottomNavigationView) updateTabs(widget as BottomNavigationView)
    widget?.isEnabled = !disabled && (kind != "select" || options.any { it["enabled"] != false })
    widget?.contentDescription = label
    if (widget is Switch) (widget as Switch).isChecked = checked
    else (widget as? Button)?.text = if (kind == "select")
      options.firstOrNull { it["value"] == value }?.get("label") as? String ?: "Choose an option" else label
    if (kind == "button") (widget as? Button)?.apply {
      val fill = runCatching { Color.parseColor(buttonColor) }.getOrDefault(Color.rgb(249, 115, 22))
      val ink = runCatching { Color.parseColor(textColor) }.getOrDefault(Color.rgb(24, 26, 32))
      backgroundTintList = ColorStateList.valueOf(fill)
      setTextColor(ink)
      alpha = if (disabled) .45f else 1f
      minimumHeight = (48 * resources.displayMetrics.density).toInt()
      minHeight = minimumHeight
      setPadding(paddingLeft, 0, paddingRight, 0)
    }
    synchronizing = false
    if (disabled) closeDialog()
  }

  private fun createTabs(): BottomNavigationView {
    val config = Configuration(context.resources.configuration)
    config.uiMode = (config.uiMode and Configuration.UI_MODE_NIGHT_MASK.inv()) or
      if (dark) Configuration.UI_MODE_NIGHT_YES else Configuration.UI_MODE_NIGHT_NO
    val themed = ContextThemeWrapper(context.createConfigurationContext(config),
      if (dark) com.google.android.material.R.style.Theme_Material3_Dark_NoActionBar
      else com.google.android.material.R.style.Theme_Material3_Light_NoActionBar)
    return BottomNavigationView(DynamicColors.wrapContextIfAvailable(themed)).apply {
      labelVisibilityMode = NavigationBarView.LABEL_VISIBILITY_LABELED
      isItemHorizontalTranslationEnabled = false
      // The React root already applies the system navigation inset.
      androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets -> insets }
      setOnItemSelectedListener { item ->
        val option = options.getOrNull(item.itemId - 1)
        if (!synchronizing && !disabled && option != null && option["enabled"] != false) {
          val next = option["value"] as? String
          if (next != null && next != value) onValueChange(mapOf("value" to next))
        }
        true
      }
    }
  }

  private fun updateTabs(tabs: BottomNavigationView) {
    if (options != tabOptions) {
      tabs.menu.clear()
      options.take(5).forEachIndexed { index, option ->
        val name = when (option["icon"]) {
          "home-outline" -> "home"; "wallet-outline" -> "wallet"
          "scan-outline", "qr-code-outline" -> "scan"
          "receipt-outline" -> "activity"; "time-outline" -> "queue"
          else -> "more"
        }
        val icon = resources.getIdentifier("sutura_tab_$name", "drawable", context.packageName)
        tabs.menu.add(0, index + 1, index, option["label"] as? String ?: "").apply {
          setIcon(icon)
          isCheckable = true
          isEnabled = !disabled && option["enabled"] != false
        }
      }
      tabOptions = options.map { it.toMap() }
    }
    options.take(5).forEachIndexed { index, option ->
      tabs.menu.findItem(index + 1)?.isEnabled = !disabled && option["enabled"] != false
      val badge = (option["badge"] as? Number)?.toInt()
      if (badge != null && badge > 0) tabs.getOrCreateBadge(index + 1).number = badge
      else tabs.removeBadge(index + 1)
    }
    val selected = options.indexOfFirst { it["value"] == value }
    if (selected in 0..4) tabs.selectedItemId = selected + 1
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
