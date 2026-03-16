package com.rexinus.DailyHistoryMobile.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.BitmapFactory
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

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
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
        const val KEY_LAST_UPDATE = "widget_last_update"

        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

            // Intent să deschidă app-ul la tap
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Determină ce layout să folosească după dimensiunea widget-ului
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

            // Date salvate local
            val title     = prefs.getString(KEY_TITLE, "Daily History") ?: "Daily History"
            val year      = prefs.getString(KEY_YEAR, "") ?: ""
            val impact    = prefs.getInt(KEY_IMPACT, 0)
            val narrative = prefs.getString(KEY_NARRATIVE, "Tap to discover today's historical event.") ?: ""

            // Countdown până la miezul nopții
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

            // Setează textele în toate layout-urile
            try {
                views.setTextViewText(R.id.widget_title, title)
                views.setTextViewText(R.id.widget_year, year)
                views.setTextViewText(R.id.widget_impact, "⚡ $impact%")
                views.setTextViewText(R.id.widget_countdown, "Next in $countdownText")
            } catch (e: Exception) { /* unele view-uri nu există în toate layout-urile */ }

            try {
                views.setTextViewText(R.id.widget_narrative, narrative)
            } catch (e: Exception) {}

            appWidgetManager.updateAppWidget(appWidgetId, views)

            // Fetch date fresh în background
            fetchEventData(context, appWidgetManager, appWidgetId, views, pendingIntent)
        }

        private fun fetchEventData(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            views: RemoteViews,
            pendingIntent: PendingIntent
        ) {
            val executor = Executors.newSingleThreadExecutor()
            val handler  = Handler(Looper.getMainLooper())

            executor.execute {
                try {
                    val today = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                        .format(java.util.Date())

                    // Înlocuiește cu URL-ul tău real de API
                    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    val apiBase = getApiBase(context)
                    val url = URL("$apiBase/daily-content/by-date?date=$today")

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
                            // Cel mai mare impact score
                            var topEvent = events.getJSONObject(0)
                            var topImpact = topEvent.optInt("impactScore", 0)
                            for (i in 1 until events.length()) {
                                val e = events.getJSONObject(i)
                                val imp = e.optInt("impactScore", 0)
                                if (imp > topImpact) { topImpact = imp; topEvent = e }
                            }

                            // Extrage titlu în engleză
                            val translations = topEvent.optJSONObject("titleTranslations")
                            val title = translations?.optString("en") ?: topEvent.optString("title", "Daily History")

                            // Extrage narațiune
                            val narrativeObj = topEvent.optJSONObject("narrativeTranslations")
                            val narrative = (narrativeObj?.optString("en") ?: topEvent.optString("narrative", ""))
                                .take(120)

                            // Extrage anul
                            val rawDate = topEvent.optString("eventDate")
                                .ifEmpty { topEvent.optString("event_date") }
                                .ifEmpty { topEvent.optString("date") }
                                .ifEmpty { topEvent.optString("year") }
                            val year = if (rawDate.length >= 4) rawDate.take(4) else rawDate

                            // Salvează în prefs
                            prefs.edit().apply {
                                putString(KEY_TITLE, title)
                                putString(KEY_YEAR, year)
                                putInt(KEY_IMPACT, topImpact)
                                putString(KEY_NARRATIVE, narrative)
                                putLong(KEY_LAST_UPDATE, System.currentTimeMillis())
                                apply()
                            }

                            handler.post {
                                try {
                                    views.setTextViewText(R.id.widget_title, title)
                                    views.setTextViewText(R.id.widget_year, year)
                                    views.setTextViewText(R.id.widget_impact, "⚡ $topImpact%")
                                } catch (e: Exception) {}
                                try { views.setTextViewText(R.id.widget_narrative, narrative) } catch (e: Exception) {}
                                appWidgetManager.updateAppWidget(appWidgetId, views)
                            }
                        }
                    }
                    conn.disconnect()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        private fun getApiBase(context: Context): String {
            // Am pus direct URL-ul tău din api.ts
            return "https://daily-history-server-dev-development.up.railway.app/api/v1"
        }
    }
}