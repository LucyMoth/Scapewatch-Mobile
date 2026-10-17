package com.scapewatch.mobile;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;

final class OrientationPreference {

    private static final String PREFERENCE_FILE = "scapewatch_presentation";
    private static final String PREFERENCE_KEY = "orientation";
    private final SharedPreferences preferences;

    OrientationPreference(Context context) {
        preferences = context.getSharedPreferences(PREFERENCE_FILE, Context.MODE_PRIVATE);
    }

    String get() {
        return restoredOrientation(preferences.getString(PREFERENCE_KEY, "portrait"));
    }

    void set(String orientation) {
        requestedOrientation(orientation);
        preferences.edit().putString(PREFERENCE_KEY, orientation).apply();
    }

    static String restoredOrientation(String saved) {
        return "landscape".equals(saved) ? "landscape" : "portrait";
    }

    static int requestedOrientation(String orientation) {
        if ("portrait".equals(orientation)) {
            return ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT;
        }
        if ("landscape".equals(orientation)) {
            return ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE;
        }
        throw new IllegalArgumentException("Choose portrait or landscape");
    }
}
