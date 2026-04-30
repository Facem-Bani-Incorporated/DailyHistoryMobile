package com.rexinus.DailyHistoryMobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

class HistoryWidgetLarge : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            HistoryWidget.updateWidget(context, appWidgetManager, appWidgetId)
        }
    }
}
