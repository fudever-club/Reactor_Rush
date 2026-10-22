import type {AudioAssetOptions} from './game-audio.ts';
export const GAME_AUDIO_ASSETS:AudioAssetOptions={
 music:{
  menu:new URL('../../assets/audio/music/theme_main_menu.ogg',import.meta.url).href,
  energy:new URL('../../assets/audio/music/loop_energy_catch.ogg',import.meta.url).href,
  circuit:new URL('../../assets/audio/music/loop_duo_circuit.ogg',import.meta.url).href,
  cooling:new URL('../../assets/audio/music/loop_cool_the_core.ogg',import.meta.url).href,
  victory:new URL('../../assets/audio/music/jingle_results_buggy.ogg',import.meta.url).href,
 },
 sfx:{
  energy:new URL('../../assets/audio/sfx/sfx_energy_catch.wav',import.meta.url).href,
  hazard:new URL('../../assets/audio/sfx/sfx_hazard_hit.wav',import.meta.url).href,
  connect:new URL('../../assets/audio/sfx/sfx_socket_connect.wav',import.meta.url).href,
  circuit:new URL('../../assets/audio/sfx/sfx_circuit_complete.wav',import.meta.url).href,
  cool:new URL('../../assets/audio/sfx/sfx_cooling_pulse.wav',import.meta.url).href,
  overload:new URL('../../assets/audio/sfx/sfx_overload.wav',import.meta.url).href,
  complete:new URL('../../assets/audio/sfx/sfx_round_complete.wav',import.meta.url).href,
  select:new URL('../../assets/audio/sfx/sfx_ui_select.wav',import.meta.url).href,
  confirm:new URL('../../assets/audio/sfx/sfx_ui_confirm.wav',import.meta.url).href,
  start:new URL('../../assets/audio/sfx/sfx_round_start.wav',import.meta.url).href,
  cameraReady:new URL('../../assets/audio/sfx/sfx_camera_ready.wav',import.meta.url).href,
  trackingLost:new URL('../../assets/audio/sfx/sfx_tracking_lost.wav',import.meta.url).href,
  trackingRestored:new URL('../../assets/audio/sfx/sfx_tracking_restored.wav',import.meta.url).href,
 }
};
