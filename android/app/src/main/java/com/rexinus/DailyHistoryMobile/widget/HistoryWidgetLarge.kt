package com.rexinus.DailyHistoryMobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import com.rexinus.DailyHistoryMobile.R

class HistoryWidgetLarge : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            HistoryWidget.updateWidgetWithLayout(context, appWidgetManager, appWidgetId, R.layout.widget_large)
        }
    }
}
