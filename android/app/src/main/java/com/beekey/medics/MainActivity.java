package com.beekey.medics;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ThemeBarPlugin.class); // app-local plugin: status bar colour follows the theme
        super.onCreate(savedInstanceState);
    }
}
