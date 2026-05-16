package com.rexinus.DailyHistoryMobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import com.rexinus.DailyHistoryMobile.R

class HistoryWidgetMedium : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            HistoryWidget.updateWidgetWithLayout(context, appWidgetManager, appWidgetId, R.layout.widget_medium)
        }
    }

    override fun onEnabled(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(
            android.content.ComponentName(context, HistoryWidgetMedium::class.java)
        )
        for (id in ids) HistoryWidget.updateWidgetWithLayout(context, manager, id, R.layout.widget_medium)
    }
}
