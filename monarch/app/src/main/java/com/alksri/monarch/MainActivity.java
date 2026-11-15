package com.alksri.monarch;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * System Portal — native Android shell.
 *
 * The complete System Portal experience (every page, animation, frame, tool
 * and offline feature) is bundled inside the APK under assets/www and served
 * to the WebView from a stable HTTPS origin. No network connection is needed
 * after install: the app reads everything from its own package.
 */
public class MainActivity extends Activity {

    private static final String DOMAIN = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + DOMAIN + "/monarch.html";
    private static final int REQ_CAMERA = 41;
    private static final String VERSION = "1.0";

    private WebView webView;
    private PermissionRequest pendingCameraRequest;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTheme(R.style.AppTheme);

        // Remote debugging is opt-in only: adb shell am start ... --ez systemDebug true
        try {
            if (getIntent() != null && getIntent().getBooleanExtra("systemDebug", false)) {
                WebView.setWebContentsDebuggingEnabled(true);
            }
        } catch (Exception ignored) {
            // Never let a debug helper break the app.
        }

        try {
            getWindow().setStatusBarColor(Color.parseColor("#05060C"));
            getWindow().setNavigationBarColor(Color.parseColor("#05060C"));
        } catch (Exception ignored) {
            // Older devices simply keep the default system bars.
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#05060C"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setLongClickable(true);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setUserAgentString(settings.getUserAgentString() + " SystemPortalApp/" + VERSION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        webView.addJavascriptInterface(new AppBridge(), "SystemAppBridge");
        webView.setWebViewClient(new PortalClient());
        webView.setWebChromeClient(new PortalChromeClient());

        setContentView(webView);

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    /* ---------------------------------------------------------------------
       Asset serving
       --------------------------------------------------------------------- */

    private WebResourceResponse assetResponse(String path) {
        String clean = path == null ? "" : path;
        if (clean.startsWith("/")) clean = clean.substring(1);
        if (clean.isEmpty()) clean = "login.html";

        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");
        headers.put("Access-Control-Allow-Origin", "*");

        try {
            InputStream stream = getAssets().open("www/" + clean);
            return new WebResourceResponse(mimeFor(clean), encodingFor(clean), 200, "OK", headers, stream);
        } catch (IOException e) {
            byte[] body = "Not found".getBytes();
            Map<String, String> notFoundHeaders = new HashMap<>();
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found",
                    notFoundHeaders, new ByteArrayInputStream(body));
        }
    }

    private String mimeFor(String path) {
        String p = path.toLowerCase(Locale.US);
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".webmanifest")) return "application/json";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".pdf")) return "application/pdf";
        if (p.endsWith(".mp3")) return "audio/mpeg";
        if (p.endsWith(".mp4")) return "video/mp4";
        return "application/octet-stream";
    }

    private String encodingFor(String path) {
        String mime = mimeFor(path);
        return (mime.startsWith("text/") || mime.equals("application/json")
                || mime.equals("application/javascript") || mime.equals("image/svg+xml"))
                ? "utf-8" : null;
    }

    /* ---------------------------------------------------------------------
       WebView plumbing
       --------------------------------------------------------------------- */

    private class PortalClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (uri != null && DOMAIN.equals(uri.getHost())) {
                return assetResponse(uri.getPath());
            }
            return null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (uri == null) return false;
            if (DOMAIN.equals(uri.getHost())) return false;
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.US);
            if (scheme.equals("http") || scheme.equals("https") || scheme.equals("mailto")) {
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {
                    // No handler installed; stay in the app.
                }
                return true;
            }
            return true;
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            view.evaluateJavascript(
                    "(function(){document.documentElement.classList.add('native-android');})();",
                    null);
        }
    }

    private class PortalChromeClient extends WebChromeClient {
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    boolean wantsCamera = false;
                    String[] resources = request.getResources();
                    if (resources != null) {
                        for (String resource : resources) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                                wantsCamera = true;
                            }
                        }
                    }
                    if (!wantsCamera) {
                        request.deny();
                        return;
                    }
                    if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(request.getResources());
                    } else {
                        pendingCameraRequest = request;
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                    }
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA) {
            PermissionRequest request = pendingCameraRequest;
            pendingCameraRequest = null;
            if (request == null) return;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                request.grant(request.getResources());
            } else {
                request.deny();
                Toast.makeText(this, "Camera permission is needed for vision check-ins.",
                        Toast.LENGTH_LONG).show();
            }
        }
    }

    /* ---------------------------------------------------------------------
       JS bridge
       --------------------------------------------------------------------- */

    private class AppBridge {

        @JavascriptInterface
        public String appVersion() {
            return VERSION;
        }

        @JavascriptInterface
        public boolean isApp() {
            return true;
        }

        @JavascriptInterface
        public void toast(final String message) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface
        public void keepAwake(final boolean keep) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    if (keep) {
                        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    } else {
                        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    }
                }
            });
        }

        @JavascriptInterface
        public void vibrate(int millis) {
            try {
                Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (vibrator == null || !vibrator.hasVibrator()) return;
                int duration = Math.max(10, Math.min(millis, 600));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    vibrator.vibrate(duration);
                }
            } catch (Exception ignored) {
                // Vibration is a nicety, never a requirement.
            }
        }

        @JavascriptInterface
        public boolean savePdf(String dataUri, String fileName) {
            try {
                int marker = dataUri.indexOf("base64,");
                String payload = marker >= 0 ? dataUri.substring(marker + 7) : dataUri;
                byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
                String name = sanitizeName(fileName);
                String location = writeToDownloads(bytes, name);
                if (location == null) return false;
                final String message = "Saved to " + location;
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show();
                    }
                });
                return true;
            } catch (Exception e) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(MainActivity.this, "Could not save the PDF.",
                                Toast.LENGTH_LONG).show();
                    }
                });
                return false;
            }
        }

        @JavascriptInterface
        public void openUrl(String url) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception ignored) {
                // Ignore unknown links.
            }
        }
    }

    private String sanitizeName(String fileName) {
        String name = fileName == null ? "system-portal.pdf" : fileName.replaceAll("[^A-Za-z0-9._-]", "-");
        if (name.isEmpty()) name = "system-portal.pdf";
        if (!name.toLowerCase(Locale.US).endsWith(".pdf")) name = name + ".pdf";
        return name;
    }

    private String writeToDownloads(byte[] bytes, String fileName) throws IOException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) throw new IOException("MediaStore insert failed");
            try (OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) throw new IOException("No output stream");
                out.write(bytes);
            }
            return "Downloads/" + fileName;
        }

        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null || (!dir.exists() && !dir.mkdirs())) {
            dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        }
        if (dir == null) throw new IOException("No downloads directory");
        File target = new File(dir, fileName);
        try (FileOutputStream out = new FileOutputStream(target)) {
            out.write(bytes);
        } catch (SecurityException denied) {
            // Pre-Android 10 without the storage permission: keep the file in
            // the app's own external folder instead of failing outright.
            File fallbackDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (fallbackDir == null) throw new IOException("No writable directory");
            target = new File(fallbackDir, fileName);
            try (FileOutputStream out = new FileOutputStream(target)) {
                out.write(bytes);
            }
        }
        return target.getAbsolutePath();
    }
}
