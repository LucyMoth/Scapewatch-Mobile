import { isGamePage, PREFERENCE_KEYS } from '../../environment.js';

const pluginName = 'ScapewatchOrientation';
let orientationPlugin;

export function isLandscapeDisplay() {
  // Keyboard resizing changes the viewport, not the display's orientation.
  const type = window.screen?.orientation?.type;
  if (type?.startsWith('landscape')) return true;
  if (type?.startsWith('portrait')) return false;
  if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90;
  return window.screen.width > window.screen.height;
}

function validOrientation(value) {
  return value === 'portrait' || value === 'landscape';
}

function storedOrientation() {
  try {
    const value = localStorage.getItem(PREFERENCE_KEYS.orientation);
    return validOrientation(value) ? value : 'portrait';
  } catch (_) {
    return 'portrait';
  }
}

function rememberOrientation(value) {
  try {
    localStorage.setItem(PREFERENCE_KEYS.orientation, value);
  } catch (_) {}
}

async function nativePlugin() {
  if (!window.Capacitor?.isNativePlatform?.()) return null;
  // Registration happens after the native bridge has supplied its plugin headers.
  // Keeping this import lazy also leaves ordinary browser pages unchanged.
  const { Capacitor, registerPlugin } = await import('@capacitor/core');
  if (!Capacitor.isPluginAvailable(pluginName)) return null;
  if (!orientationPlugin) orientationPlugin = registerPlugin(pluginName);
  // A plain result prevents async resolution from treating the proxy as a Promise.
  return { plugin: orientationPlugin };
}

export async function getOrientationPreference() {
  if (!isGamePage()) return { orientation: 'portrait', supported: false };
  const native = await nativePlugin();
  if (!native) return { orientation: storedOrientation(), supported: false };
  const result = await native.plugin.getOrientation();
  if (!validOrientation(result.orientation)) throw new Error('Unknown orientation preference');
  rememberOrientation(result.orientation);
  return { orientation: result.orientation, supported: result.supported === true };
}

export async function setOrientationPreference(orientation) {
  if (!validOrientation(orientation)) throw new RangeError('Choose portrait or landscape');
  if (!isGamePage()) throw new Error('Orientation is available on game pages only');
  const native = await nativePlugin();
  if (!native) return { orientation: storedOrientation(), supported: false };
  const result = await native.plugin.setOrientation({ orientation });
  if (result.orientation !== orientation || result.supported !== true)
    throw new Error('The orientation request was not applied');
  rememberOrientation(result.orientation);
  return { orientation: result.orientation, supported: true };
}
