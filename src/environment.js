export const GAME_ORIGINS = ['https://play.scapewatch.com', 'https://alt.play.scapewatch.com'];

export const PREFERENCE_KEYS = {
  layout: 'sw_mobile_ui',
  renderer: 'sw_mobile_render',
  chat: 'sw_mobile_chat',
  orientation: 'sw_mobile_orientation',
  mapDefaults: 'sw_mobile_map_defaults',
  questFilter: 'sw_mobile_quest_filter',
};

export function isGamePage() {
  return window.top === window && GAME_ORIGINS.includes(window.location.origin);
}
