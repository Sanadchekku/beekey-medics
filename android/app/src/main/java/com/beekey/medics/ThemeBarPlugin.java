package com.beekey.medics;

import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the area behind the Android status and navigation bars in the app's theme colour and
 * picks dark or light bar icons to match. Called from js/native.js whenever the theme changes.
 */
@CapacitorPlugin(name = "ThemeBar")
public class ThemeBarPlugin extends Plugin {

    @PluginMethod
    public void set(PluginCall call) {
        String color = call.getString("color", "#ffffff");
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        int c;
        try {
            c = Color.parseColor(color);
        } catch (IllegalArgumentException e) {
            call.reject("Invalid colour: " + color);
            return;
        }
        getActivity().runOnUiThread(() -> {
            Window w = getActivity().getWindow();
            w.getDecorView().setBackgroundColor(c);
            WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(w, w.getDecorView());
            bars.setAppearanceLightStatusBars(!dark);
            bars.setAppearanceLightNavigationBars(!dark);
            call.resolve();
        });
    }
}
