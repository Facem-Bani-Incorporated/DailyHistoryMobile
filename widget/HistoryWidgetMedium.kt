package com.rexinus.DailyHistoryMobile.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

class HistoryWidgetMedium : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) HistoryWidget.updateWidget(context, appWidgetManager, id)
    }
}