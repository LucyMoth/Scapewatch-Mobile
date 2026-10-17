package com.scapewatch.mobile;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class MobileUiInjectorTest {

    @Test
    public void permitsBothGameOriginsAndTheirNavigationPaths() {
        assertTrue(MobileUiInjector.isGameUrl("https://play.scapewatch.com/"));
        assertTrue(MobileUiInjector.isGameUrl("https://alt.play.scapewatch.com/game?world=2#map"));
        assertTrue(MobileUiInjector.isGameUrl("https://play.scapewatch.com:443/"));
    }

    @Test
    public void excludesLoginPagesAndUnrelatedOrigins() {
        assertFalse(MobileUiInjector.isGameUrl("https://steamcommunity.com/openid/login"));
        assertFalse(MobileUiInjector.isGameUrl("https://login.steampowered.com/"));
        assertFalse(MobileUiInjector.isGameUrl("https://localhost/index.html"));
        assertFalse(MobileUiInjector.isGameUrl("http://play.scapewatch.com/"));
        assertFalse(MobileUiInjector.isGameUrl("https://play.scapewatch.com:8443/"));
    }

    @Test
    public void rejectsHostLookalikesAndMalformedUrls() {
        assertFalse(MobileUiInjector.isGameUrl("https://play.scapewatch.com.example.com/"));
        assertFalse(MobileUiInjector.isGameUrl("https://play.scapewatch.com@evil.example/"));
        assertFalse(MobileUiInjector.isGameUrl("https://evil.example/?next=https://play.scapewatch.com"));
        assertFalse(MobileUiInjector.isGameUrl("not a URL"));
        assertFalse(MobileUiInjector.isGameUrl(null));
    }
}
