package com.personalfinance.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;

/**
 * Widget da tela inicial: mostra o saldo, as entradas e as saídas do mês.
 * Os valores chegam prontos do app (WidgetBridgePlugin) e ficam guardados
 * em SharedPreferences. Tocar no widget abre o app.
 */
public class FinanceWidgetProvider extends AppWidgetProvider {

    static final String PREFS = "pf_widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int widgetId : widgetIds) {
            manager.updateAppWidget(widgetId, buildViews(context));
        }
    }

    /** Atualiza todos os widgets que estiverem na tela inicial. */
    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, FinanceWidgetProvider.class));
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context));
        }
    }

    private static int parseColor(String value, int fallback) {
        try {
            return Color.parseColor(value);
        } catch (Exception error) {
            return fallback;
        }
    }

    static RemoteViews buildViews(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_finance);

        boolean hasData = prefs.contains("balance");
        boolean locked = prefs.getBoolean("locked", false);
        int accent = parseColor(prefs.getString("accent", "#8b5cf6"), Color.parseColor("#8b5cf6"));
        boolean negative = prefs.getBoolean("negative", false);

        // O mês virou e o app ainda não foi aberto: não mostra o saldo antigo como se fosse o atual
        String month = prefs.getString("month", "");
        String currentMonth = new java.text.SimpleDateFormat("yyyy-MM", java.util.Locale.US).format(new java.util.Date());
        boolean stale = month != null && !month.isEmpty() && !month.equals(currentMonth);

        views.setTextViewText(R.id.widget_title, prefs.getString("title", "Personal Finance"));
        views.setInt(R.id.widget_accent_bar, "setBackgroundColor", accent);

        if (hasData && !locked && stale) {
            views.setTextViewText(R.id.widget_title, "Mês novo: toque para atualizar");
            views.setTextViewText(R.id.widget_balance, "—");
            views.setTextColor(R.id.widget_balance, Color.WHITE);
            views.setViewVisibility(R.id.widget_row, View.GONE);
        } else if (!hasData || locked) {
            // Sem dados ainda, ou app protegido por PIN: não mostra valores
            views.setTextViewText(R.id.widget_title, locked ? "Protegido por PIN" : "Abra o app para começar");
            views.setTextViewText(R.id.widget_balance, locked ? "•••••" : "—");
            views.setTextColor(R.id.widget_balance, Color.WHITE);
            views.setViewVisibility(R.id.widget_row, View.GONE);
        } else {
            views.setTextViewText(R.id.widget_label, prefs.getString("label", "Saldo do mês"));
            views.setTextViewText(R.id.widget_balance, prefs.getString("balance", ""));
            views.setTextColor(R.id.widget_balance, negative ? Color.parseColor("#f87171") : Color.WHITE);
            views.setTextViewText(R.id.widget_income, prefs.getString("income", ""));
            views.setTextViewText(R.id.widget_expense, prefs.getString("expense", ""));
            views.setViewVisibility(R.id.widget_row, View.VISIBLE);
        }

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pending = PendingIntent.getActivity(
            context,
            0,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        return views;
    }
}
