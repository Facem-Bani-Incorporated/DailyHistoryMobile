package com.rexinus.dailyhistorymobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import com.rexinus.dailyhistorymobile.R

class HistoryWidgetMedium : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            HistoryWidget.updateWidgetWithLayout(context, appWidgetManager, appWidgetId, R.layout.widget_medium)
        }
    }
}
