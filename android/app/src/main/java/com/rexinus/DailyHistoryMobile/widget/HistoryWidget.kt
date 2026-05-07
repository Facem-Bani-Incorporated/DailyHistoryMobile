package com.rexinus.DailyHistoryMobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import com.rexinus.DailyHistoryMobile.MainActivity
import com.rexinus.DailyHistoryMobile.R
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class HistoryWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        const val PREFS_NAME    = "HistoryWidgetPrefs"
        const val KEY_TITLE     = "widget_title"
        const val KEY_YEAR      = "widget_year"
        const val KEY_IMAGE_URL = "widget_image_url"

        private const val IMAGE_CACHE_FILE = "widget_image.png"
        private const val DEBUG_LOG_FILE   = "widget_debug.log"
        // Tight RemoteViews IPC budget: keep bitmap small to avoid Samsung One UI
        // launcher rejecting the widget add transaction.
        // 300 * 225 * 4 bytes (ARGB_8888) = 270KB raw bitmap.
        private const val MAX_IMAGE_W      = 300
        private const val MAX_IMAGE_H      = 225
        private const val CORNER_RADIUS_PX = 48f

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            try { logDebug(context, "updateWidget id=$appWidgetId") } catch (_: Exception) {}

            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minWidth  = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
            val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)

            val layoutId = when {
                minWidth >= 250 && minHeight >= 250 -> R.layout.widget_large
                minWidth >= 250                     -> R.layout.widget_medium
                else                                -> R.layout.widget_small
            }

            val views = try {
                buildViews(context, layoutId)
            } catch (e: Exception) {
                logDebug(context, "buildViews FAIL: ${e.javaClass.simpleName}: ${e.message}")
                return
            }

            val title = prefs.getString(KEY_TITLE, "") ?: ""
            val year  = prefs.getString(KEY_YEAR, "")  ?: ""
            applyText(views, title, year)

            // Initial render: NO bitmap to keep the IPC transaction small for add-widget
            // operations on stricter launchers (Samsung One UI). The async fetch below
            // pushes the bitmap in a separate IPC after the widget is already placed.
            try {
                appWidgetManager.updateAppWidget(appWidgetId, views)
                logDebug(context, "updateAppWidget OK (no bitmap)")
            } catch (e: Exception) {
                logDebug(context, "updateAppWidget FAIL: ${e.javaClass.simpleName}: ${e.message}")
            }

            fetchEventData(context, appWidgetManager, appWidgetId, layoutId)
        }

        private fun logDebug(context: Context, msg: String) {
            try {
                val ts  = SimpleDateFormat("HH:mm:ss", Locale.US).format(Date())
                val dir = context.getExternalFilesDir(null) ?: context.filesDir
                File(dir, DEBUG_LOG_FILE).appendText("[$ts] $msg\n")
            } catch (_: Exception) { /* logging must never crash the widget */ }
        }

        private fun buildViews(context: Context, layoutId: Int): RemoteViews {
            val views = RemoteViews(context.packageName, layoutId)
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            return views
        }

        private fun applyText(views: RemoteViews, title: String, year: String) {
            try { views.setTextViewText(R.id.widget_title, title) } catch (_: Exception) {}
            try { views.setTextViewText(R.id.widget_year, year)   } catch (_: Exception) {}
        }

        private fun fetchEventData(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            layoutId: Int,
        ) {
            val executor = Executors.newSingleThreadExecutor()
            val handler  = Handler(Looper.getMainLooper())
            val prefs    = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            executor.execute {
                try {
                    val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
                    val url = URL("https://daily-history-server-dev-development.up.railway.app/api/v1/daily-content/guest?date=$today")
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "GET"
                        connectTimeout = 8000
                        readTimeout = 8000
                        setRequestProperty("Accept", "application/json")
                    }

                    if (conn.responseCode != 200) { conn.disconnect(); return@execute }
                    val response = conn.inputStream.bufferedReader().readText()
                    conn.disconnect()

                    val events = parseEventsArray(response) ?: return@execute
                    if (events.length() == 0) return@execute

                    val topEvent = pickTopEventWithImage(events) ?: events.getJSONObject(0)

                    val titleObj = topEvent.optJSONObject("titleTranslations")
                    val title    = titleObj?.optString("en")?.takeIf { it.isNotEmpty() }
                        ?: topEvent.optString("title", "Daily History")

                    val rawDate = listOf("eventDate", "event_date", "date")
                        .map { topEvent.optString(it) }
                        .firstOrNull { it.isNotEmpty() } ?: ""
                    val yearStr = extractYear(rawDate)

                    val imageUrl = pickFirstImage(topEvent.optJSONArray("gallery"))

                    prefs.edit().apply {
                        putString(KEY_TITLE, title)
                        putString(KEY_YEAR, yearStr)
                        putString(KEY_IMAGE_URL, imageUrl ?: "")
                        apply()
                    }

                    val bitmap = imageUrl?.let { downloadAndProcessImage(context, it) }

                    handler.post {
                        val views = buildViews(context, layoutId)
                        applyText(views, title, yearStr)

                        val finalBitmap = bitmap ?: loadCachedBitmap(context)
                        if (finalBitmap != null) {
                            try { views.setImageViewBitmap(R.id.widget_image, finalBitmap) } catch (e: Exception) {
                                logDebug(context, "post setImageViewBitmap FAIL: ${e.javaClass.simpleName}: ${e.message}")
                            }
                        }

                        try {
                            appWidgetManager.updateAppWidget(appWidgetId, views)
                            logDebug(context, "fetch update OK title='$title' year='$yearStr' hasImage=${finalBitmap != null}")
                        } catch (e: Exception) {
                            logDebug(context, "post updateAppWidget FAIL: ${e.javaClass.simpleName}: ${e.message}")
                        }
                    }
                } catch (e: Exception) {
                    logDebug(context, "fetchEventData FAIL: ${e.javaClass.simpleName}: ${e.message}")
                    e.printStackTrace()
                }
            }
        }

        private fun parseEventsArray(response: String): JSONArray? {
            return try {
                val obj = JSONObject(response)
                obj.optJSONArray("events") ?: obj.optJSONArray("data")
            } catch (e: Exception) {
                try { JSONArray(response) } catch (ex: Exception) { null }
            }
        }

        private fun pickTopEventWithImage(events: JSONArray): JSONObject? {
            var best: JSONObject? = null
            var bestImpact = -1
            for (i in 0 until events.length()) {
                val e = events.optJSONObject(i) ?: continue
                val gallery = e.optJSONArray("gallery")
                if (gallery == null || gallery.length() == 0) continue
                val imp = e.optInt("impactScore", 0)
                if (imp > bestImpact) { bestImpact = imp; best = e }
            }
            return best
        }

        private fun pickFirstImage(gallery: JSONArray?): String? {
            if (gallery == null) return null
            for (i in 0 until gallery.length()) {
                val item = gallery.opt(i) ?: continue
                val urlStr = when (item) {
                    is String     -> item
                    is JSONObject -> item.optString("url").ifEmpty { item.optString("secureUrl") }
                    else          -> null
                }
                if (!urlStr.isNullOrEmpty() && urlStr.startsWith("http")) return urlStr
            }
            return null
        }

        private fun extractYear(rawDate: String): String {
            if (rawDate.isEmpty()) return ""
            return try {
                val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(rawDate)
                    ?: throw Exception("parse failed")
                SimpleDateFormat("yyyy", Locale.US).format(date)
            } catch (e: Exception) {
                if (rawDate.length >= 4) rawDate.take(4) else rawDate
            }
        }

        private fun downloadAndProcessImage(context: Context, imageUrl: String): Bitmap? {
            return try {
                val conn = (URL(imageUrl).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000
                    readTimeout = 12000
                    instanceFollowRedirects = true
                    setRequestProperty("User-Agent", "DailyHistoryWidget/1.0")
                }
                if (conn.responseCode != 200) { conn.disconnect(); return null }

                val raw = BitmapFactory.decodeStream(conn.inputStream)
                conn.disconnect()
                if (raw == null) return null

                val scaled = scaleBitmap(raw, MAX_IMAGE_W, MAX_IMAGE_H)
                if (scaled !== raw) raw.recycle()

                val rounded = roundBitmap(scaled, CORNER_RADIUS_PX)
                if (rounded !== scaled) scaled.recycle()

                saveBitmapToCache(context, rounded)
                rounded
            } catch (e: Exception) {
                e.printStackTrace()
                null
            }
        }

        private fun scaleBitmap(bitmap: Bitmap, maxW: Int, maxH: Int): Bitmap {
            val ratio = minOf(maxW.toFloat() / bitmap.width, maxH.toFloat() / bitmap.height, 1f)
            if (ratio >= 1f) return bitmap
            val w = (bitmap.width * ratio).toInt().coerceAtLeast(1)
            val h = (bitmap.height * ratio).toInt().coerceAtLeast(1)
            return Bitmap.createScaledBitmap(bitmap, w, h, true)
        }

        private fun roundBitmap(bitmap: Bitmap, radiusPx: Float): Bitmap {
            val output = Bitmap.createBitmap(bitmap.width, bitmap.height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(output)
            val paint  = Paint(Paint.ANTI_ALIAS_FLAG)
            paint.shader = BitmapShader(bitmap, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
            val rect = RectF(0f, 0f, bitmap.width.toFloat(), bitmap.height.toFloat())
            canvas.drawRoundRect(rect, radiusPx, radiusPx, paint)
            return output
        }

        private fun cacheFile(context: Context): File = File(context.cacheDir, IMAGE_CACHE_FILE)

        private fun saveBitmapToCache(context: Context, bitmap: Bitmap) {
            try {
                FileOutputStream(cacheFile(context)).use { fos ->
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, fos)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        private fun loadCachedBitmap(context: Context): Bitmap? {
            return try {
                val f = cacheFile(context)
                if (!f.exists()) null else BitmapFactory.decodeFile(f.absolutePath)
            } catch (e: Exception) {
                null
            }
        }
    }
}
