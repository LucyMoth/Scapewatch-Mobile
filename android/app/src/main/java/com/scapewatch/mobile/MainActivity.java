package com.scapewatch.mobile;

import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        OrientationPreference orientation = new OrientationPreference(this);
        setRequestedOrientation(OrientationPreference.requestedOrientation(orientation.get()));
        registerPlugin(OrientationPlugin.class);
        WebView webView = findViewById(com.getcapacitor.android.R.id.webview);
        MobileUiInjector mobileUi = new MobileUiInjector(getAssets());

        // Bridge construction loads the remote game. Install first so its initial
        // document receives the same UI bundle as every subsequent navigation.
        mobileUi.install(webView);
        bridgeBuilder.addWebViewListener(mobileUi);
        super.load();
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            private boolean pending;

            @Override
            public void handleOnBackPressed() {
                if (pending) {
                    return;
                }
                if (!MobileUiInjector.isGameUrl(webView.getUrl())) {
                    fallback();
                    return;
                }
                pending = true;
                webView.evaluateJavascript(
                    "(() => { try { return typeof window.__swMobileBack === 'function' "
                        + "&& window.__swMobileBack() === true; } catch (_) { return false; } })()",
                    result -> {
                        pending = false;
                        if (!"true".equals(result)) {
                            fallback();
                        }
                    }
                );
            }

            private void fallback() {
                if (!MobileUiInjector.isGameUrl(webView.getUrl()) && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                setEnabled(false);
                try {
                    getOnBackPressedDispatcher().onBackPressed();
                } finally {
                    setEnabled(true);
                }
            }
        });
    }
}
