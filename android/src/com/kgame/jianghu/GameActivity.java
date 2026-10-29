package com.kgame.jianghu;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.net.Uri;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.view.View;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.TextView;
import android.widget.ScrollView;
import java.io.*;
import java.util.*;

/** Offline, permission-free wrapper. Only the packaged HTTPS origin is served. */
public final class GameActivity extends Activity {
    private WebView web;
    private static final String HOST = "appassets.androidplatform.net";
    private static final String ENTRY = "https://" + HOST + "/game/play.html";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();
        web = new WebView(this);
        // Android's click channel bypasses the game's SFX routing/volume and
        // can sound even on the silent prologue controls. The game owns cues.
        web.setSoundEffectsEnabled(false);
        getWindow().getDecorView().setSoundEffectsEnabled(false);
        web.setBackgroundColor(0xff0b0f12);
        setContentView(web);
        requestGameFrameRate();
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String pathname = url.getPath();
                if (!"https".equals(url.getScheme()) || !HOST.equals(url.getHost()) ||
                    pathname == null || !pathname.startsWith("/game/") || pathname.contains("..") ||
                    pathname.contains("\\") || !"GET".equals(request.getMethod())) return error(403, "Forbidden");
                try {
                    String file = pathname.substring(6);
                    String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(MimeTypeMap.getFileExtensionFromUrl(file));
                    if (file.endsWith(".js")) mime = "application/javascript";
                    if (file.endsWith(".md")) mime = "text/plain";
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Cache-Control", "no-cache");
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime == null ? "application/octet-stream" : mime,
                        "UTF-8", 200, "OK", headers, getAssets().open("game/" + file));
                } catch (IOException e) { return error(404, "Not Found"); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (HOST.equals(url.getHost()) && "https".equals(url.getScheme()) && url.getPath().startsWith("/game/")) {
                    if (url.getPath().endsWith(".md")) {
                        try (InputStream in = getAssets().open(url.getPath().substring(1))) {
                            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                            byte[] chunk = new byte[4096]; int count;
                            while ((count = in.read(chunk)) != -1) buffer.write(chunk, 0, count);
                            TextView text = new TextView(GameActivity.this); text.setText(buffer.toString("UTF-8"));
                            text.setTextSize(15); text.setPadding(24, 16, 24, 16);
                            ScrollView scroll = new ScrollView(GameActivity.this); scroll.addView(text);
                            new AlertDialog.Builder(GameActivity.this).setTitle("素材署名与许可").setView(scroll).setPositiveButton("返回", null).show();
                        } catch (IOException ignored) {}
                        return true;
                    }
                    return ENTRY.equals(url.toString()) ? false : true;
                }
                if (request.hasGesture() && ("https".equals(url.getScheme()) || "http".equals(url.getScheme()))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, url)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        web.loadUrl(ENTRY);
    }
    private static WebResourceResponse error(int code, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", code, reason, Collections.emptyMap(),
            new ByteArrayInputStream(reason.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.KGameAndroid ? KGameAndroid.back() : false", result -> {
            if (!"true".equals(result)) new AlertDialog.Builder(this).setTitle("离开江湖？")
                .setMessage("当前行程已自动保存，下次可再续前路。")
                .setNegativeButton("继续", null).setPositiveButton("退出", (dialog, which) -> finish()).show();
        });
    }
    @Override protected void onPause() {
        super.onPause();
        if (web != null) web.evaluateJavascript("window.KGameAndroid && KGameAndroid.pause()", result -> web.onPause());
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.onResume(); web.evaluateJavascript("window.KGameAndroid && KGameAndroid.resume()", null); }
        immersive();
        requestGameFrameRate();
    }
    @Override public void onWindowFocusChanged(boolean focused) { super.onWindowFocusChanged(focused); if (focused) { immersive(); requestGameFrameRate(); } }
    private void requestGameFrameRate() {
        WindowManager.LayoutParams attributes = getWindow().getAttributes();
        float preference = preferredGameRate(Build.VERSION.SDK_INT, Build.VERSION.SDK_INT < 34
            ? getWindowManager().getDefaultDisplay().getSupportedRefreshRates() : null);
        // Window-scoped hint only; Android may override it. Never change global
        // display settings or select a mode with a different resolution.
        if (preference > 0f && attributes.preferredRefreshRate != preference) {
            attributes.preferredRefreshRate = preference; getWindow().setAttributes(attributes);
        }
        if (web != null && Build.VERSION.SDK_INT >= 35) web.setRequestedFrameRate(60f);
    }
    static float preferredGameRate(int api, float[] supported) {
        if (api >= 34) return 60f;
        if (supported != null) for (float rate : supported) if (Math.abs(rate - 60f) < 0.5f) return rate;
        return 0f;
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }
    @Override protected void onDestroy() { if (web != null) { web.stopLoading(); web.destroy(); } super.onDestroy(); }
}
