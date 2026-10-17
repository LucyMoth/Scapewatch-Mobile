package com.scapewatch.mobile;

import androidx.webkit.WebViewFeature;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScapewatchOrientation")
public class OrientationPlugin extends Plugin {

    private OrientationPreference preference;

    @Override
    public void load() {
        preference = new OrientationPreference(getContext());
        // Plugins load synchronously on the WebView UI thread before navigation.
        // Remove Capacitor's possible Java-interface fallback while retaining
        // its separate modern WebMessageListener binding.
        if (supportsOrientation()) {
            bridge.getWebView().removeJavascriptInterface("androidBridge");
        }
    }

    @PluginMethod
    public void getOrientation(PluginCall call) {
        bridge.executeOnMainThread(() -> {
            if (!requireGamePage(call)) {
                return;
            }
            resolvePreference(call);
        });
    }

    @PluginMethod
    public void setOrientation(PluginCall call) {
        bridge.executeOnMainThread(() -> {
            if (!requireGamePage(call)) {
                return;
            }
            if (!supportsOrientation()) {
                call.unavailable("Orientation needs a current Android WebView");
                return;
            }
            String orientation = call.getString("orientation");
            final int requested;
            try {
                requested = OrientationPreference.requestedOrientation(orientation);
            } catch (IllegalArgumentException error) {
                call.reject(error.getMessage(), "INVALID_ORIENTATION");
                return;
            }
            getActivity().setRequestedOrientation(requested);
            preference.set(orientation);
            resolvePreference(call);
        });
    }

    private boolean requireGamePage(PluginCall call) {
        if (!MobileUiInjector.isGameUrl(bridge.getWebView().getUrl())) {
            call.reject("Orientation is available on game pages only", "INVALID_ORIGIN");
            return false;
        }
        return true;
    }

    private boolean supportsOrientation() {
        // The SDK does not expose its active transport. Gate on modern support
        // and configuration; load() removes any unexpected interface fallback.
        return WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)
            && !bridge.getConfig().isUsingLegacyBridge();
    }

    private void resolvePreference(PluginCall call) {
        JSObject result = new JSObject();
        result.put("orientation", preference.get());
        result.put("supported", supportsOrientation());
        call.resolve(result);
    }
}
