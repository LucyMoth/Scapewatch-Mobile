package com.scapewatch.mobile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import android.content.pm.ActivityInfo;
import org.junit.Test;

public class OrientationPreferenceTest {

    @Test
    public void restoresAnExplicitLandscapeChoiceAndDefaultsToPortrait() {
        assertEquals("landscape", OrientationPreference.restoredOrientation("landscape"));
        assertEquals("portrait", OrientationPreference.restoredOrientation("portrait"));
        assertEquals("portrait", OrientationPreference.restoredOrientation(null));
        assertEquals("portrait", OrientationPreference.restoredOrientation("unknown"));
    }

    @Test
    public void mapsExplicitChoicesToNativeOrientationRequests() {
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT,
            OrientationPreference.requestedOrientation("portrait"));
        assertEquals(ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE,
            OrientationPreference.requestedOrientation("landscape"));
    }

    @Test
    public void refusesOtherNativeOrientationRequests() {
        for (String value : new String[] { null, "auto", "reverseLandscape", "", "LANDSCAPE" }) {
            assertThrows(IllegalArgumentException.class,
                () -> OrientationPreference.requestedOrientation(value));
        }
    }
}
