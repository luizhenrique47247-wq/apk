package com.fudidoflix.app

import android.content.Context
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity

/**
 * PlayerActivity — WebView blindada para carregar iframes de streaming
 * (autoembedhd para séries/animes, viewplayer para filmes).
 *
 * 4 defesas implementadas:
 *  1. Falso Pop-up (Buraco Negro)      — onCreateWindow destrói janelas fantasma
 *  2. Injeção JS para remoção de máscaras — remove divs overlay no onPageFinished
 *  3. Interceptação e bloqueio nativo  — shouldInterceptRequest bloqueia trackers/ads
 *  4. Gestão de memória agressiva      — destroy() completo ao fechar
 */
class PlayerActivity : AppCompatActivity() {

    private var playerWebView: WebView? = null

    // ─────────────────────────────────────────────────────────────
    // DEFESA 3 — Lista de domínios de anúncios/trackers bloqueados
    // ─────────────────────────────────────────────────────────────
    private val adBlockRegex = Regex(
        """(doubleclick\.net|googlesyndication\.com|adservice\.google\.|
           |googletagmanager\.com|googletagservices\.com|
           |amazon-adsystem\.com|media\.net|
           |popads\.net|popcash\.net|popunder\.net|pop\.solutions|
           |exoclick\.com|trafficjunky\.net|propellerads\.com|
           |adnxs\.com|bidswitch\.net|rubiconproject\.com|openx\.net|
           |casino|bet365|blaze\.com|stake\.com|roleta|
           |outbrain\.com|taboola\.com|
           |hotjar\.com|fullstory\.com|mouseflow\.com|
           |facebook\.net|connect\.facebook\.com|
           |mc\.yandex\.ru|counter\.ok\.ru)""".trimMargin(),
        RegexOption.IGNORE_CASE
    )

    // JS injetado para remover overlays/máscaras transparentes que bloqueiam o play
    private val overlayRemoverJS = """
        (function() {
            var CLICK_INTERCEPTORS_SELECTORS = [
                'div[style*="z-index: 9"]',
                'div[style*="z-index:9"]',
                'div[style*="position: fixed"]',
                'div[style*="position:fixed"]',
                'div[style*="position: absolute"][style*="top: 0"]',
                'div[onclick]',
                'a[href*="javascript"]'
            ];
            CLICK_INTERCEPTORS_SELECTORS.forEach(function(sel) {
                try {
                    document.querySelectorAll(sel).forEach(function(el) {
                        var rect = el.getBoundingClientRect();
                        var zIdx = parseInt(window.getComputedStyle(el).zIndex) || 0;
                        // Remove se cobrir mais de 30% da tela e tiver z-index alto
                        if (zIdx > 100 && rect.width > window.innerWidth * 0.3) {
                            el.remove();
                        }
                    });
                } catch(e) {}
            });
        })();
    """.trimIndent()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Tela cheia imersiva (projetor)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        val url = intent.getStringExtra("PLAYER_URL") ?: run {
            finish()
            return
        }

        playerWebView = buildShieldedWebView(this)
        setContentView(playerWebView)
        playerWebView?.loadUrl(url)
    }

    private fun buildShieldedWebView(context: Context): WebView {
        val wv = WebView(context)

        val settings = wv.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowContentAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        // ─────────────────────────────────────────────────
        // DEFESA 1 — Falso Pop-up (Buraco Negro)
        // Suporta multiple windows para interceptar pop-ups
        // ─────────────────────────────────────────────────
        settings.setSupportMultipleWindows(true)
        settings.javaScriptCanOpenWindowsAutomatically = true

        wv.webChromeClient = object : WebChromeClient() {

            override fun onCreateWindow(
                view: WebView,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message
            ): Boolean {
                // Cria WebView fantasma invisível, pega a requisição do pop-up e destrói na hora
                val ghost = WebView(context)
                ghost.webViewClient = object : WebViewClient() {
                    override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                        // Destrói imediatamente — o pop-up nunca aparece
                        ghost.stopLoading()
                        ghost.destroy()
                    }
                }
                val transport = resultMsg.obj as WebView.WebViewTransport
                transport.webView = ghost
                resultMsg.sendToTarget()
                return true
            }

            // Permite reprodução de vídeo em tela cheia dentro do iframe
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                setContentView(view)
            }

            override fun onHideCustomView() {
                setContentView(playerWebView)
            }
        }

        // ─────────────────────────────────────────────────
        // DEFESA 2 + 3 — Remoção de máscaras + Bloqueio nativo
        // ─────────────────────────────────────────────────
        wv.webViewClient = object : WebViewClient() {

            // DEFESA 3 — Interceptação e bloqueio de trackers/ads
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val host = request.url.host ?: return super.shouldInterceptRequest(view, request)
                return if (adBlockRegex.containsMatchIn(host)) {
                    // Retorna resposta vazia — bloqueia o recurso completamente
                    WebResourceResponse("text/plain", "utf-8", null)
                } else {
                    super.shouldInterceptRequest(view, request)
                }
            }

            // DEFESA 2 — Injeta JS para remover overlays após cada página carregar
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                view.evaluateJavascript(overlayRemoverJS, null)
                // Reaplica 1s depois para capturar elementos que aparecem com delay
                view.postDelayed({
                    view.evaluateJavascript(overlayRemoverJS, null)
                }, 1000)
                view.postDelayed({
                    view.evaluateJavascript(overlayRemoverJS, null)
                }, 3000)
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val scheme = request.url.scheme ?: return true
                // Bloqueia intent://, market://, javascript:// e qualquer esquema incomum
                if (scheme != "http" && scheme != "https") {
                    return true
                }
                return false
            }
        }

        return wv
    }

    // Botão Voltar do controle remoto fecha o player
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            destroyPlayer()
            finish()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    // ─────────────────────────────────────────────────
    // DEFESA 4 — Gestão de memória agressiva
    // Limpa e destrói a WebView completamente ao fechar
    // ─────────────────────────────────────────────────
    private fun destroyPlayer() {
        playerWebView?.let { wv ->
            wv.stopLoading()
            wv.loadUrl("about:blank")
            wv.clearCache(true)
            wv.clearHistory()
            wv.clearFormData()
            wv.webViewClient = WebViewClient()
            wv.webChromeClient = null
            wv.destroy()
            playerWebView = null
        }
        // Força o GC para liberar memória no dispositivo fraco
        System.gc()
    }

    override fun onDestroy() {
        destroyPlayer()
        super.onDestroy()
    }
}
