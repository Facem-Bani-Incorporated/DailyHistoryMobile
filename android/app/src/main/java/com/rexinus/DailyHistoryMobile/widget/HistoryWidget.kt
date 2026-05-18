package com.rexinus.dailyhistorymobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import com.rexinus.dailyhistorymobile.MainActivity
import com.rexinus.dailyhistorymobile.R
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
            updateWidgetWithLayout(context, appWidgetManager, appWidgetId, R.layout.widget_small)
        }
    }

    override fun onEnabled(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(
            android.content.ComponentName(context, HistoryWidget::class.java)
        )
        for (id in ids) updateWidgetWithLayout(context, manager, id, R.layout.widget_small)
    }

    companion object {
        const val PREFS_NAME    = "HistoryWidgetPrefs"
        const val KEY_TITLE     = "widget_title"
        const val KEY_YEAR      = "widget_year"
        const val KEY_IMAGE_URL = "widget_image_url"

        private const val IMAGE_CACHE_FILE = "widget_image.png"
        private const val MAX_IMAGE_DIM    = 480

        fun updateWidgetWithLayout(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            layoutId: Int,
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val pendingIntent = PendingIntent.getActivity(
                context, 0,
                Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                },
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val views = buildViews(context, layoutId, pendingIntent,
                prefs.getString(KEY_TITLE, "") ?: "",
                prefs.getString(KEY_YEAR, "") ?: "",
                loadCachedBitmap(context))

            try { appWidgetManager.updateAppWidget(appWidgetId, views) } catch (_: Exception) {}

            fetchAndRefresh(context, appWidgetManager, appWidgetId, layoutId)
        }

        // Kept for any legacy callers; defaults to small layout.
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            updateWidgetWithLayout(context, appWidgetManager, appWidgetId, R.layout.widget_small)
        }

        private fun buildViews(
            context: Context,
            layoutId: Int,
            pendingIntent: PendingIntent,
            title: String,
            year: String,
            bitmap: Bitmap?,
        ): RemoteViews {
            val views = RemoteViews(context.packageName, layoutId)
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
            try { views.setTextViewText(R.id.widget_year, year) } catch (_: Exception) {}
            // widget_title exists only in medium/large layouts; silently skipped for small.
            try { views.setTextViewText(R.id.widget_title, title) } catch (_: Exception) {}
            if (bitmap != null) {
                try { views.setImageViewBitmap(R.id.widget_image, bitmap) } catch (_: Exception) {}
            }
            return views
        }

        private fun fetchAndRefresh(
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
                    val conn = (URL("https://daily-history-server-production.up.railway.app/api/v1/daily-content/guest?date=$today")
                        .openConnection() as HttpURLConnection).apply {
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
                    val event = pickTopEventWithImage(events) ?: events.getJSONObject(0)

                    val title = event.optJSONObject("titleTranslations")?.optString("en")
                        ?.takeIf { it.isNotEmpty() }
                        ?: event.optString("title", "Daily History")

                    val rawDate = listOf("eventDate", "event_date", "date")
                        .map { event.optString(it) }.firstOrNull { it.isNotEmpty() } ?: ""
                    val year = if (rawDate.length >= 4) rawDate.take(4) else rawDate

                    val imageUrl = pickFirstImage(event.optJSONArray("gallery"))

                    prefs.edit().apply {
                        putString(KEY_TITLE, title)
                        putString(KEY_YEAR, year)
                        putString(KEY_IMAGE_URL, imageUrl ?: "")
                        apply()
                    }

                    val bitmap = imageUrl?.let { downloadImage(context, it) }

                    handler.post {
                        val pendingIntent = PendingIntent.getActivity(
                            context, 0,
                            Intent(context, MainActivity::class.java).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                            },
                            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                        )
                        val views = buildViews(context, layoutId, pendingIntent, title, year,
                            bitmap ?: loadCachedBitmap(context))
                        try { appWidgetManager.updateAppWidget(appWidgetId, views) } catch (_: Exception) {}
                    }
                } catch (_: Exception) {}
            }
        }

        private fun parseEventsArray(response: String): JSONArray? {
            return try {
                JSONObject(response).optJSONArray("events")
            } catch (_: Exception) {
                try { JSONArray(response) } catch (_: Exception) { null }
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
                val url = when (item) {
                    is String     -> item
                    is JSONObject -> item.optString("url").ifEmpty { item.optString("secureUrl") }
                    else          -> null
                }
                if (!url.isNullOrEmpty() && url.startsWith("http")) return url
            }
            return null
        }

        private fun downloadImage(context: Context, imageUrl: String): Bitmap? {
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

                val scaled = scaleBitmap(raw, MAX_IMAGE_DIM, MAX_IMAGE_DIM)
                if (scaled !== raw) raw.recycle()

                saveBitmapToCache(context, scaled)
                scaled
            } catch (_: Exception) { null }
        }

        private fun scaleBitmap(bitmap: Bitmap, maxW: Int, maxH: Int): Bitmap {
            val ratio = minOf(maxW.toFloat() / bitmap.width, maxH.toFloat() / bitmap.height, 1f)
            if (ratio >= 1f) return bitmap
            val w = (bitmap.width * ratio).toInt().coerceAtLeast(1)
            val h = (bitmap.height * ratio).toInt().coerceAtLeast(1)
            return Bitmap.createScaledBitmap(bitmap, w, h, true)
        }

        private fun cacheFile(context: Context) = File(context.cacheDir, IMAGE_CACHE_FILE)

        private fun saveBitmapToCache(context: Context, bitmap: Bitmap) {
            try {
                FileOutputStream(cacheFile(context)).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }
            } catch (_: Exception) {}
        }

        fun loadCachedBitmap(context: Context): Bitmap? {
            return try {
                val f = cacheFile(context)
                if (f.exists()) BitmapFactory.decodeFile(f.absolutePath) else null
            } catch (_: Exception) { null }
        }
    }
}
