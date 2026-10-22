# Reactor Rush audio assets

The user supplied reactor_rush_audio/reactor_rush_audio with five stereo PCM16/44.1kHz music/jingle WAVs, thirteen mono PCM16/44.1kHz SFX WAVs, and their procedural Python authoring script. Originals are tracked unchanged in that delivery directory; the duplicate ZIP is ignored. The authoring script is not executed by the game or CI.

Runtime music uses Ogg Vorbis quality4 encoded from those WAVs; SFX are byte-exact copies. manifest.json records source/export SHA-256, sizes, durations and In review status. Combined exports are3704508bytes. Encoding used external FFmpeg7.1 through imageio-ffmpeg0.6.0; no runtime or npm dependency was added.

Sound starts OFF. Explicit Sound activation starts menu or current-round music and preloads the small SFX pack. Intro/playing map to each round; intermediate results pause music; final completion uses the nonlooping Buggy jingle. Music volume0.18/jingle0.28 and sampledSFXgain0.45 preserve headroom; artistic loudness acceptance remains human review.

SFX use actual catch/challenge events; native menu actions select/confirm; successful calibration confirms; tracking cues consume current adapter readiness only during camera gameplay. Initial missing detection does not announce a loss. These notifications do not change input acceptance. Up to4voices/450ms with100ms burst throttle; failed SFX loading falls back to the existing synthesized cues without delayed playback. Music playback rejection does not disable event feedback.

Mute, hidden document, final Menu and teardown stop audio; returning to a tab does not automatically resume. The unused Phaser sound manager is disabled so it cannot create a context before opt-in.
