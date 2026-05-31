package com.brightly.pos;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReportDownloaderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
