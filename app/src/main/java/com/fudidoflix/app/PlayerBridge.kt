package com.fudidoflix.app

import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface

/**
 * Bridge JavaScript → Android.
 * O React chama window.AndroidPlayer.openPlayer(url) para abrir o PlayerActivity.
 */
class PlayerBridge(private val context: Context) {

    @JavascriptInterface
    fun openPlayer(url: String) {
        val intent = Intent(context, PlayerActivity::class.java)
        intent.putExtra("PLAYER_URL", url)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
}
