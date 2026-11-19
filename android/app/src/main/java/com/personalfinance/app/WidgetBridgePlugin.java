package com.personalfinance.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ponte entre o app (JavaScript) e o widget da tela inicial.
 * O app manda o resumo do mês já formatado; aqui ele é guardado e o
 * widget é redesenhado.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        Context context = getContext();
        SharedPreferences.Editor editor = context
            .getSharedPreferences(FinanceWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit();

        editor.putString("title", call.getString("title", "Personal Finance"));
        editor.putString("label", call.getString("label", "Saldo do mês"));
        editor.putString("balance", call.getString("balance", ""));
        editor.putString("income", call.getString("income", ""));
        editor.putString("expense", call.getString("expense", ""));
        editor.putString("accent", call.getString("accent", "#8b5cf6"));
        editor.putBoolean("negative", Boolean.TRUE.equals(call.getBoolean("negative", false)));
        editor.putString("month", call.getString("month", ""));
        editor.putBoolean("locked", Boolean.TRUE.equals(call.getBoolean("locked", false)));
        editor.apply();

        FinanceWidgetProvider.updateAll(context);
        call.resolve();
    }
}
