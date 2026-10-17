package com.scapewatch.mobile;

import android.content.res.AssetManager;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.WebViewListener;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

final class MobileUiInjector extends WebViewListener {

    private static final Set<String> GAME_ORIGINS = new HashSet<>(Arrays.asList(
        "https://play.scapewatch.com",
        "https://alt.play.scapewatch.com"
    ));

    private final String script;

    MobileUiInjector(AssetManager assets) {
        script = wrap(readBundle(assets));
    }

    void install(WebView webView) {
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(webView, script, GAME_ORIGINS);
        }
    }

    @Override
    public void onPageCommitVisible(WebView webView, String url) {
        inject(webView, url);
    }

    @Override
    public void onPageLoaded(WebView webView) {
        inject(webView, webView.getUrl());
    }

    private void inject(WebView webView, String url) {
        // These callbacks also cover WebViews without document-start support.
        // The script checks the live origin again in case navigation has raced.
        if (isGameUrl(url)) {
            webView.evaluateJavascript(script, null);
        }
    }

    static boolean isGameUrl(String url) {
        if (url == null) {
            return false;
        }

        try {
            URI uri = URI.create(url);
            return "https".equals(uri.getScheme())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && ("play.scapewatch.com".equals(uri.getHost())
                    || "alt.play.scapewatch.com".equals(uri.getHost()));
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    private static String wrap(String bundle) {
        return "(() => {"
            + "if (window.top !== window || "
            + "!['https://play.scapewatch.com', 'https://alt.play.scapewatch.com'].includes(location.origin)) return;\n"
            + bundle
            + "\n})();";
    }

    private static String readBundle(AssetManager assets) {
        try (InputStream input = assets.open("public/mobile-ui.js")) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        } catch (IOException error) {
            throw new IllegalStateException("The packaged mobile UI bundle is missing or unreadable", error);
        }
    }
}
