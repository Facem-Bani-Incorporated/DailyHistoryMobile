package com.rexinus.DailyHistoryMobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import com.rexinus.DailyHistoryMobile.MainActivity
import com.rexinus.DailyHistoryMobile.R
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import java.util.concurrent.Executors

class HistoryWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        const val PREFS_NAME = "HistoryWidgetPrefs"
        const val KEY_TITLE = "widget_title"
        const val KEY_YEAR = "widget_year"
        const val KEY_IMPACT = "widget_impact"
        const val KEY_NARRATIVE = "widget_narrative"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
            val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)

            val layoutId = when {
                minWidth >= 250 && minHeight >= 250 -> R.layout.widget_large
                minWidth >= 250 -> R.layout.widget_medium
                else -> R.layout.widget_small
            }

            val views = RemoteViews(context.packageName, layoutId)
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)

            val title     = prefs.getString(KEY_TITLE, "Daily History") ?: "Daily History"
            val year      = prefs.getString(KEY_YEAR, "") ?: ""
            val impact    = prefs.getInt(KEY_IMPACT, 0)
            val narrative = prefs.getString(KEY_NARRATIVE, "Tap to discover today's historical event.") ?: ""

            val now = Calendar.getInstance()
            val midnight = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 23)
                set(Calendar.MINUTE, 59)
                set(Calendar.SECOND, 59)
            }
            val diffMs = midnight.timeInMillis - now.timeInMillis
            val hours = (diffMs / (1000 * 60 * 60)).toInt()
            val minutes = ((diffMs / (1000 * 60)) % 60).toInt()
            val countdownText = "${hours}h ${minutes}m"

            try { views.setTextViewText(R.id.widget_title, title) } catch (e: Exception) {}
            try { views.setTextViewText(R.id.widget_year, year) } catch (e: Exception) {}
            try { views.setTextViewText(R.id.widget_impact, "⚡ $impact%") } catch (e: Exception) {}
            try { views.setTextViewText(R.id.widget_countdown, "Next in $countdownText") } catch (e: Exception) {}
            try { views.setTextViewText(R.id.widget_narrative, narrative) } catch (e: Exception) {}

            appWidgetManager.updateAppWidget(appWidgetId, views)

            fetchEventData(context, appWidgetManager, appWidgetId, views)
        }

        private fun fetchEventData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, views: RemoteViews) {
            val executor = Executors.newSingleThreadExecutor()
            val handler  = Handler(Looper.getMainLooper())
            val prefs    = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            executor.execute {
                try {
                    val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
                    val url = URL("https://daily-history-server-dev-development.up.railway.app/api/v1/daily-content/by-date?date=$today")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"
                    conn.connectTimeout = 8000
                    conn.readTimeout = 8000
                    conn.setRequestProperty("Accept", "application/json")

                    if (conn.responseCode == 200) {
                        val response = conn.inputStream.bufferedReader().readText()
                        val json = JSONObject(response)
                        val events = json.optJSONArray("events")

                        if (events != null && events.length() > 0) {
                            var topEvent = events.getJSONObject(0)
                            var topImpact = topEvent.optInt("impactScore", 0)
                            for (i in 1 until events.length()) {
                                val e = events.getJSONObject(i)
                                val imp = e.optInt("impactScore", 0)
                                if (imp > topImpact) { topImpact = imp; topEvent = e }
                            }

                            val translations = topEvent.optJSONObject("titleTranslations")
                            val title = translations?.optString("en") ?: topEvent.optString("title", "Daily History")
                            val narrativeObj = topEvent.optJSONObject("narrativeTranslations")
                            val narrative = (narrativeObj?.optString("en") ?: topEvent.optString("narrative", "")).take(120)
                            val rawDate = topEvent.optString("eventDate").ifEmpty { topEvent.optString("event_date") }.ifEmpty { topEvent.optString("date") }.ifEmpty { topEvent.optString("year") }
                            val year = if (rawDate.length >= 4) rawDate.take(4) else rawDate

                            prefs.edit().apply {
                                putString(KEY_TITLE, title)
                                putString(KEY_YEAR, year)
                                putInt(KEY_IMPACT, topImpact)
                                putString(KEY_NARRATIVE, narrative)
                                apply()
                            }

                            handler.post {
                                try { views.setTextViewText(R.id.widget_title, title) } catch (e: Exception) {}
                                try { views.setTextViewText(R.id.widget_year, year) } catch (e: Exception) {}
                                try { views.setTextViewText(R.id.widget_impact, "⚡ $topImpact%") } catch (e: Exception) {}
                                try { views.setTextViewText(R.id.widget_narrative, narrative) } catch (e: Exception) {}
                                appWidgetManager.updateAppWidget(appWidgetId, views)
                            }
                        }
                    }
                    conn.disconnect()
                } catch (e: Exception) { e.printStackTrace() }
            }
        }
    }
}
