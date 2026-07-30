package com.fudidoflix.app

import android.content.Intent
import android.os.Bundle
import android.webkit.*
import android.view.KeyEvent
import android.view.View
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    // Domínios dos players de streaming — qualquer URL desses vai para o PlayerActivity blindado
    private val playerDomains = listOf(
        "autoembedhd",
        "viewplayer",
        "warezcdn",
        "superflixapi",
        "embedder",
        "player.videasy",
        "embed.smashystream",
        "multiembed.mov",
        "vidsrc",
        "embedsito"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Tela cheia sem barra de status (ideal para projetor/TV)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // Adiciona interface JavaScript para o React poder abrir o PlayerActivity
        webView.addJavascriptInterface(PlayerBridge(this), "AndroidPlayer")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                val scheme = request.url.scheme ?: return true

                // Bloqueia qualquer esquema que não seja http, https ou file
                // Isso mata os redirecionamentos intent://, market://, etc.
                if (scheme != "http" && scheme != "https" && scheme != "file") {
                    return true // bloqueia silenciosamente
                }

                // Se a URL for de um player de streaming, abre no PlayerActivity blindado
                if (playerDomains.any { url.contains(it, ignoreCase = true) }) {
                    val intent = Intent(this@MainActivity, PlayerActivity::class.java)
                    intent.putExtra("PLAYER_URL", url)
                    startActivity(intent)
                    return true
                }

                // Tudo mais carrega normalmente no app
                return false
            }
        }

        // Carrega o app React bundled localmente
        webView.loadUrl("file:///android_asset/web/index.html")
    }

    // Garante que o botão Voltar do controle remoto navegue no histórico do WebView
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK && webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onDestroy() {
        webView.clearCache(true)
        webView.destroy()
        super.onDestroy()
    }
}
