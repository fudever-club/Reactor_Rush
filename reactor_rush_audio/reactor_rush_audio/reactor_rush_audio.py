#!/usr/bin/env python3
"""
Reactor Rush - procedural audio generator (numpy + scipy only).

Tao: 1 nhac chu de, 3 nhac nen (Energy Catch / Duo Circuit / Cool the Core),
13 SFX, 1 jingle tong ket. Toan bo duoc tong hop bang code (khong dung model AI nhac).

Chay:  python3 reactor_rush_audio.py [thu_muc_xuat]
Chinh BPM, gain, pattern trong cac dict cfg ben duoi roi chay lai.

Dinh danh giai dieu (motif 4 not): bac 5 - 1 - 2 - 3 cua ham dang choi
(o hop C: G4 C5 D5 E5). Cac track deu tai su dung motif nay.
"""
import os
import sys
import zipfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
RNG = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else "reactor_rush_audio"

# ----------------------------------------------------------------- basics
def midi_hz(m):
    return 440.0 * 2 ** ((np.asarray(m, float) - 69) / 12)

SCALE = [0, 2, 4, 5, 7, 9, 11]          # C major
def deg(i):
    """Scale degree index -> MIDI note. deg(0)=C3, deg(7)=C4, deg(14)=C5."""
    return 48 + 12 * (i // 7) + SCALE[i % 7]

def _sos(kind, fc, order=2):
    return signal.butter(order, fc, btype=kind, fs=SR, output="sos")

def lp(x, fc, order=2): return signal.sosfilt(_sos("low", fc, order), x)
def hp(x, fc, order=2): return signal.sosfilt(_sos("high", fc, order), x)
def bp(x, lo, hi, order=2): return signal.sosfilt(_sos("band", [lo, hi], order), x)

def ad(n, atk, tau):
    t = np.arange(n) / SR
    return np.minimum(1.0, t / max(atk, 1e-4)) * np.exp(-t / tau)

def fade_out(x, ms=8):
    k = min(len(x), int(SR * ms / 1000))
    if k > 1:
        x[-k:] *= 0.5 * (1 + np.cos(np.pi * np.linspace(0, 1, k)))
    return x

def osc(n, f, kind="sine"):
    f = np.full(n, float(f)) if np.isscalar(f) else np.asarray(f, float)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "sine":
        return np.sin(ph)
    fmax = float(f.max())
    out = np.zeros(n)
    if kind == "tri":
        for k in range(24):
            h = 2 * k + 1
            if h * fmax > 0.45 * SR: break
            out += ((-1) ** k) * np.sin(h * ph) / (h * h)
        return out * 8 / np.pi ** 2
    if kind == "saw":
        for h in range(1, 25):
            if h * fmax > 0.45 * SR: break
            out += np.sin(h * ph) / h
        return out * 2 / np.pi
    raise ValueError(kind)

# ------------------------------------------------------------ instruments
def pluck(f, dur, tau=0.2, bright=4.0, atk=0.002):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k in range(1, 9):
        if f * k > 0.45 * SR: break
        x += (1 / k ** 1.4) * np.sin(2 * np.pi * f * k * t) * np.exp(-bright * (k - 1) * t)
    return fade_out(x * ad(n, atk, tau) * 0.6)

def mallet(f, dur, tau=0.3):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for ratio, amp, ds in ((1, 1.0, 1.0), (2.756, 0.3, 0.45), (5.404, 0.12, 0.2)):
        if f * ratio > 0.45 * SR: break
        x += amp * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / (tau * ds))
    return fade_out(x * np.minimum(1, t / 0.002) * 0.7)

def bassnote(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * f * t)
         + 0.45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6)
         + 0.2 * np.sin(6 * np.pi * f * t) * np.exp(-t * 10))
    x *= np.minimum(1, t / 0.006) * np.exp(-t / (dur * 1.2))
    return fade_out(x * 0.8, 15)

def padnote(freqs, dur, atk=0.3, rel=0.5, detune=0.003):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f in freqs:
        for d in (-detune, 0.0, detune):
            ff = f * (1 + d)
            x += np.sin(2 * np.pi * ff * t) + 0.25 * np.sin(4 * np.pi * ff * t)
    e = np.minimum(1, t / atk) * np.where(t > dur, np.maximum(0, 1 - (t - dur) / rel), 1)
    return x * e / (len(freqs) * 3)

def shimmer(freqs, dur, atk=0.5, rel=0.8):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for i, f in enumerate(freqs):
        lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.35 * t + i * 1.7)
        x += np.sin(2 * np.pi * 2 * f * t) * (0.35 + 0.65 * lfo)
        x += 0.45 * np.sin(2 * np.pi * 3.003 * f * t) * (1.0 - 0.6 * lfo)
    e = np.minimum(1, t / atk) * np.where(t > dur, np.maximum(0, 1 - (t - dur) / rel), 1)
    return x * e / (len(freqs) * 1.5)

def _norm(x): return x / (np.abs(x).max() + 1e-9)

def make_kick():
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = 62 + 85 * np.exp(-t / 0.02)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    return fade_out(hp(_norm(x), 40), 10)

def make_tick():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return fade_out(_norm(bp(RNG.standard_normal(n), 2500, 7000) * np.exp(-t / 0.008)), 5)

def make_clap():
    n = int(0.14 * SR); t = np.arange(n) / SR
    e = np.zeros(n)
    for off in (0.0, 0.01):
        e += np.where(t >= off, np.exp(-(t - off) / 0.006), 0) * 0.5
    e += np.where(t >= 0.02, np.exp(-(t - 0.02) / 0.04), 0)
    return fade_out(_norm(bp(RNG.standard_normal(n), 900, 3200) * e), 10)

def make_rim():
    n = int(0.06 * SR); t = np.arange(n) / SR
    x = (np.sin(2 * np.pi * 1000 * t) + 0.5 * np.sin(2 * np.pi * 1700 * t)) * np.exp(-t / 0.012)
    return fade_out(_norm(x), 5)

KICK, TICK, CLAP, RIM = make_kick(), make_tick(), make_clap(), make_rim()

# ------------------------------------------------------------------ mixer
class Mix:
    def __init__(self, n):
        self.N = n
        self.b = np.zeros((n, 2))

    def add(self, sig, start, gain=1.0, pan=0.0, wrap=True):
        ang = (pan + 1) * np.pi / 4
        gl, gr = np.cos(ang) * gain, np.sin(ang) * gain
        n = len(sig)
        if wrap:
            idx = (start + np.arange(n)) % self.N
            self.b[idx, 0] += sig * gl
            self.b[idx, 1] += sig * gr
        else:
            end = min(self.N, start + n)
            if end > start:
                self.b[start:end, 0] += sig[:end - start] * gl
                self.b[start:end, 1] += sig[:end - start] * gr

    def echo(self, sig, start, gain, pan, delay, wrap=True):
        self.add(sig, start, gain, pan, wrap)
        for k, g in ((1, 0.33), (2, 0.14)):
            self.add(sig, start + k * delay, gain * g, -pan, wrap)

def reverb(b, amt, rt=0.9, wrap=True):
    N = len(b); n = int(rt * SR); t = np.arange(n) / SR
    out = np.zeros_like(b)
    for ch in range(2):
        ir = lp(RNG.standard_normal(n) * np.exp(-6.9 * t / rt), 6000)
        k = int(0.012 * SR); ir[:k] *= np.linspace(0, 1, k)
        ir /= np.sqrt((ir ** 2).sum())
        w = signal.fftconvolve(b[:, ch], ir)
        o = w[:N].copy(); tail = w[N:]
        if wrap: o[:len(tail)] += tail
        out[:, ch] = o
    return b + amt * out

def circ_filter(x):
    """High-pass 35 Hz + low-pass 12 kHz, applied circularly so the loop seam stays continuous."""
    N = len(x)
    y = np.concatenate([x, x, x])
    y = signal.sosfilt(_sos("high", 35), y, axis=0)
    y = signal.sosfilt(_sos("low", 12000), y, axis=0)
    return y[N:2 * N]

# -------------------------------------------------------------- track core
MOTIF = [11, 14, 15, 16]                 # 5 - 1 - 2 - 3 relative to chord root (G C D E on C)

def bar_layers(m, S, spb, b0, r, bi, L, sec, cfg, G):
    barlen = 16 * spb
    # --- pad
    if "pad" in L:
        ds = [0, 3, 4] if (cfg.get("sus") and r == 4) else [0, 2, 4]
        base = r + 7 if r <= 3 else r
        m.add(padnote([float(midi_hz(deg(base + d))) for d in ds], barlen), S(b0), G["pad"])
    if "shimmer" in L:
        ds = [0, 4]
        base = r + 7 if r <= 3 else r
        m.add(shimmer([float(midi_hz(deg(base + d))) for d in ds], barlen), S(b0), G["shimmer"])
    # --- bass
    if "bass" in L:
        for e in cfg["bass"]:
            st, off, ln = e[0], e[1], e[2]
            g = e[3] if len(e) > 3 else 1.0
            f = float(midi_hz(deg(r) - 12 + off))
            m.add(bassnote(f, ln * spb + 0.02), S(b0 + st), G["bass"] * g)
    # --- percussion
    if "kick" in L:
        for st in cfg["kick"]: m.add(KICK, S(b0 + st), G["kick"])
    if "tick" in L:
        for st in cfg["tick"]: m.add(TICK, S(b0 + st), G["tick"], pan=0.25)
        for st in cfg.get("tick_ghost", []): m.add(TICK, S(b0 + st), G["tick"] * 0.45, pan=-0.25)
    if "clap" in L:
        for st in cfg["clap"]: m.add(CLAP, S(b0 + st), G["clap"])
    if "rim" in L:
        for st in cfg["rim"]: m.add(RIM, S(b0 + st), G["rim"], pan=-0.2)
    # --- motif / answer (call & response)
    has_motif = "motif" in L
    if has_motif:
        offs = MOTIF if bi % 2 == 0 else MOTIF[::-1]
        voice = cfg["motif_voice"](bi)
        for (st, ln), o in zip(cfg["motif_steps"], offs):
            f = float(midi_hz(deg(r + o)))
            dur = ln * spb + 0.3
            if voice[0] == "pluck":
                sig = pluck(f, dur, tau=cfg.get("lead_tau", 0.28), bright=2.5)
            else:
                sig = mallet(f, dur + 0.2, tau=0.35)
            m.add(sig, S(b0 + st), G["lead"], pan=voice[1])
    # --- arp bed (ping-pong echo = dotted eighth)
    if "arp" in L:
        thin = has_motif and not sec.get("arp_full", cfg.get("arp_full", False))
        for i, (st, d, pan, vc) in enumerate(cfg["arp"]):
            if thin and st < 8: continue
            f = float(midi_hz(deg(r + d)))
            acc = 1.0 if st % 4 == 0 else 0.75
            sig = pluck(f, 0.45, tau=cfg.get("arp_tau", 0.16), bright=5) if vc == "pluck" else mallet(f, 0.5, tau=0.22)
            m.echo(sig, S(b0 + st), G["arp"] * acc, pan, S(3))
    # --- sparkle accents (glassy mallet)
    if "sparkle" in L and (bi % cfg.get("sparkle_every", 2) == cfg.get("sparkle_phase", 1)):
        for i, (st, d) in enumerate(cfg["sparkle"]):
            f = float(midi_hz(deg(r + d)))
            m.add(mallet(f, 0.7, tau=0.25), S(b0 + st), G["sparkle"], pan=0.5 if i % 2 == 0 else -0.5)

def render_track(bpm, sections, cfg, rev=0.16, target_rms_db=-20.0):
    spb = 60.0 / bpm / 4
    S = lambda s: int(round(s * spb * SR))
    nbars = sum(len(s["prog"]) for s in sections)
    N = S(nbars * 16)
    m = Mix(N); bar = 0
    for sec in sections:
        for bi, r in enumerate(sec["prog"]):
            bar_layers(m, S, spb, bar * 16, r, bi, sec["layers"], sec, cfg, cfg["gain"])
            bar += 1
    x = reverb(m.b, rev, rt=cfg.get("rt", 0.9))
    x = circ_filter(x)
    rms = np.sqrt((x ** 2).mean())
    x *= 10 ** (target_rms_db / 20) / rms
    pk = np.abs(x).max()
    if pk > 0.9: x *= 0.9 / pk
    return x, nbars

def alt_pans(steps_degs, pan=0.35, voice="pluck"):
    return [(st, d, pan if i % 2 == 0 else -pan, voice) for i, (st, d) in enumerate(steps_degs)]

# ------------------------------------------------------------ track configs
PROG_A = [0, 4, 5, 3, 0, 4, 3, 4]       # C G Am F C G F G
PROG_B = [3, 4, 2, 5, 1, 4, 0, 4]       # F G Em Am Dm G C G

THEME_BPM = 116
THEME_CFG = dict(
    gain=dict(pad=0.20, bass=0.55, kick=0.42, tick=0.12, clap=0.17, rim=0.0, arp=0.30, lead=0.50, sparkle=0.24, shimmer=0.0),
    bass=[(0, 0, 3), (3, 0, 1), (6, 0, 2), (8, 0, 3), (11, 0, 1), (14, 7, 2)],
    kick=[0, 8], tick=[2, 6, 10, 14], clap=[4, 12], rim=[],
    arp=alt_pans([(0, 7), (2, 9), (4, 11), (6, 9), (8, 7), (10, 9), (12, 11), (14, 14)]),
    motif_steps=[(0, 2), (2, 2), (4, 2), (6, 6)],
    motif_voice=lambda bi: ("pluck", 0.0),
    sparkle=[(10, 18), (14, 21)], lead_tau=0.30,
)
THEME_SECTIONS = [
    dict(prog=PROG_A, layers={"pad", "bass", "kick", "tick", "arp", "motif"}),
    dict(prog=PROG_A, layers={"pad", "bass", "kick", "tick", "clap", "arp", "motif", "sparkle"}),
    dict(prog=PROG_B, layers={"pad", "bass", "kick", "tick", "clap", "arp", "motif", "sparkle"}, arp_full=True),
    dict(prog=PROG_A, layers={"pad", "bass", "kick", "tick", "clap", "arp", "motif", "sparkle"}, arp_full=True),
]

ENERGY_BPM = 120
ENERGY_CFG = dict(
    gain=dict(pad=0.15, bass=0.50, kick=0.40, tick=0.12, clap=0.18, rim=0.0, arp=0.28, lead=0.46, sparkle=0.22, shimmer=0.0),
    bass=[(0, 0, 2), (3, 0, 1), (4, 12, 1, 0.8), (6, 0, 2), (8, 0, 2), (11, 0, 1), (12, 12, 1, 0.8), (14, 7, 1)],
    kick=[0, 8], tick=[2, 6, 10, 14], tick_ghost=[1, 5, 9, 13], clap=[4, 12], rim=[],
    arp=alt_pans([(0, 7), (2, 9), (3, 11), (6, 14), (8, 11), (10, 9), (11, 14), (14, 16)]),
    motif_steps=[(0, 2), (3, 2), (6, 2), (8, 6)],
    motif_voice=lambda bi: ("pluck", 0.0),
    sparkle=[(10, 18), (13, 21)], lead_tau=0.18, arp_tau=0.12, sparkle_every=2, sparkle_phase=1,
)
E_A = [0, 5, 3, 4, 0, 5, 3, 4]
E_B = [3, 4, 2, 5, 3, 4, 0, 4]
ENERGY_SECTIONS = [
    dict(prog=E_A, layers={"bass", "kick", "tick", "arp", "motif"}),
    dict(prog=E_A, layers={"pad", "bass", "kick", "tick", "clap", "arp", "motif", "sparkle"}),
    dict(prog=E_B, layers={"pad", "bass", "kick", "tick", "clap", "arp", "motif", "sparkle"}, arp_full=True),
    dict(prog=E_A, layers={"pad", "bass", "kick", "tick", "clap", "arp", "motif", "sparkle"}, arp_full=True),
]

DUO_BPM = 116
_P = [0, 3, 6, 8, 11, 14]
_D = [7, 9, 11, 14, 11, 9]
DUO_CFG = dict(
    gain=dict(pad=0.18, bass=0.50, kick=0.30, tick=0.09, clap=0.0, rim=0.14, arp=0.26, lead=0.48, sparkle=0.20, shimmer=0.22),
    bass=[(0, 0, 4), (6, 0, 2), (8, 0, 4), (14, 7, 2)],
    kick=[0, 8], tick=[2, 6, 10, 14], clap=[], rim=[4, 12],
    # interlocking arps: left voice (pluck) and right voice (mallet) alternate steps
    arp=[(st, d, -0.55 if i % 2 == 0 else 0.55, "pluck" if i % 2 == 0 else "bell")
         for i, (st, d) in enumerate(zip(_P, _D))],
    arp_full=True,
    # call & response: left pluck states the motif, right mallet answers (reversed)
    motif_steps=[(0, 2), (2, 2), (4, 2), (6, 6)],
    motif_voice=lambda bi: ("pluck", -0.5) if bi % 2 == 0 else ("bell", 0.5),
    sparkle=[(12, 18)], lead_tau=0.26, arp_tau=0.14, sparkle_every=4, sparkle_phase=3,
)
D_A = [0, 4, 5, 2, 3, 0, 3, 4]
D_B = [3, 4, 2, 5, 1, 4, 0, 4]
DUO_SECTIONS = [
    dict(prog=D_A, layers={"pad", "bass", "kick", "tick", "arp", "motif"}),
    dict(prog=D_A, layers={"pad", "bass", "kick", "tick", "rim", "arp", "motif", "shimmer"}),
    dict(prog=D_B, layers={"pad", "bass", "kick", "tick", "rim", "arp", "motif", "shimmer", "sparkle"}),
    dict(prog=D_A, layers={"pad", "bass", "kick", "tick", "rim", "arp", "motif", "shimmer", "sparkle"}),
]

COOL_BPM = 112
COOL_CFG = dict(
    gain=dict(pad=0.14, bass=0.40, kick=0.0, tick=0.10, clap=0.0, rim=0.15, arp=0.16, lead=0.42, sparkle=0.20, shimmer=0.30),
    bass=[(st, 0, 1.5, 1.0 if st % 8 == 0 else 0.7) for st in range(0, 16, 2)],
    kick=[], tick=[2, 6, 10, 14], clap=[], rim=[4, 12],
    arp=alt_pans([(2, 7), (6, 9), (10, 11), (14, 9)], pan=0.4),
    arp_full=True,
    motif_steps=[(0, 4), (4, 4), (8, 4), (12, 4)],
    motif_voice=lambda bi: ("pluck", 0.0) if bi % 2 == 0 else ("bell", 0.2),
    sparkle=[(6, 21), (14, 18)], lead_tau=0.5, arp_tau=0.2, sus=True, sparkle_every=2, sparkle_phase=1, rt=1.2,
)
C_A = [5, 3, 0, 4, 5, 3, 0, 4]
C_B = [3, 0, 4, 5, 3, 0, 4, 4]
C_C = [5, 3, 0, 4, 5, 3, 4, 4]
COOL_SECTIONS = [
    dict(prog=C_A, layers={"shimmer", "pad", "bass", "tick", "rim", "motif"}),
    dict(prog=C_A, layers={"shimmer", "pad", "bass", "tick", "rim", "motif", "arp"}),
    dict(prog=C_B, layers={"shimmer", "pad", "bass", "tick", "rim", "motif", "arp", "sparkle"}),
    dict(prog=C_C, layers={"shimmer", "pad", "bass", "tick", "rim", "motif", "arp"}),
]

# ---------------------------------------------------------------- jingle
def build_jingle(dur=3.0):
    N = int(4.0 * SR); m = Mix(N); T = lambda s: int(round(s * SR))
    # four-note identity (5-1-2-3 on C): G4 C5 D5 E5
    for i, (f, t0) in enumerate(zip([392.0, 523.25, 587.33, 659.26], [0.0, 0.13, 0.26, 0.39])):
        m.add(pluck(f, 0.5, tau=0.25, bright=2.5), T(t0), 0.55, pan=-0.1 + 0.07 * i, wrap=False)
    m.add(KICK, 0, 0.40, wrap=False)
    for t0 in (0.13, 0.26, 0.39): m.add(TICK, T(t0), 0.12, pan=0.25, wrap=False)
    m.add(CLAP, T(0.52), 0.18, wrap=False)
    # bloom: warm C major (add9 colour)
    for f in (261.63, 392.0, 523.25, 659.26, 783.99):
        m.add(pluck(f, 1.6, tau=0.6, bright=2.0), T(0.52), 0.22, wrap=False)
    m.add(padnote([261.63, 329.63, 392.0, 587.33], 1.8, atk=0.08, rel=1.0), T(0.52), 0.30, wrap=False)
    # sparkling mallet flourish
    for i, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        m.add(mallet(f, 1.0, tau=0.4), T(0.56 + 0.065 * i), 0.20 if i < 3 else 0.12, pan=-0.4 + 0.27 * i, wrap=False)
    x = reverb(m.b, 0.12, rt=0.9, wrap=False)
    x = x[:int(dur * SR)]
    k = int(0.15 * SR)
    x[-k:] *= 0.5 * (1 + np.cos(np.pi * np.linspace(0, 1, k)))[:, None]
    x = hp(x, 35) if False else signal.sosfilt(_sos("high", 35), x, axis=0)
    return x * (0.8 / np.abs(x).max())

# ------------------------------------------------------------------- SFX
def sfx_buf(d): return np.zeros(int(round(d * SR)))

def put(buf, sig, t0=0.0, g=1.0):
    i = int(round(t0 * SR)); mm = min(len(sig), len(buf) - i)
    if mm > 0: buf[i:i + mm] += sig[:mm] * g

def sweep(f0, f1, dur, tau, atk=0.002, kind="sine"):
    n = int(dur * SR); t = np.arange(n) / SR
    return osc(n, f0 * (f1 / f0) ** (t / dur), kind) * ad(n, atk, tau)

def nburst(dur, lo, hi, tau, atk=0.0005):
    n = int(dur * SR)
    return _norm(bp(RNG.standard_normal(n), lo, hi)) * ad(n, atk, tau)

def tone(f, dur, tau, h2=0.0, h3=0.0, atk=0.003):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) + h2 * np.sin(4 * np.pi * f * t) + h3 * np.sin(6 * np.pi * f * t)
    return x * ad(n, atk, tau)

def fmbell(f, dur, tau, ratio=2.0, idx=1.6, atk=0.002):
    n = int(dur * SR); t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * ratio * t) * idx * np.exp(-t / (tau * 0.6))
    return np.sin(2 * np.pi * f * t + mod) * ad(n, atk, tau)

def s_energy_catch():
    b = sfx_buf(0.20)
    put(b, sweep(260, 640, 0.07, 0.022, atk=0.003), 0, 0.9)
    for i, (f, g) in enumerate([(1046.5, 0.5), (1318.5, 0.45), (1568.0, 0.42), (2093.0, 0.30)]):
        put(b, pluck(f, 0.14, tau=0.05, bright=9), 0.035 + 0.027 * i, g)
    return b

def s_hazard_hit():
    b = sfx_buf(0.25)
    put(b, sweep(200, 85, 0.09, 0.03), 0, 1.0)
    put(b, lp(nburst(0.03, 200, 1200, 0.008), 1500), 0, 0.35)
    for t0, f0, f1, tau in [(0.07, 392.0, 365.0, 0.05), (0.15, 293.66, 262.0, 0.07)]:
        n = int(0.1 * SR)
        put(b, lp(osc(n, np.linspace(f0, f1, n), "tri"), 1800) * ad(n, 0.004, tau), t0, 0.55)
    return b

def s_socket_connect():
    b = sfx_buf(0.20)
    put(b, nburst(0.012, 1500, 5500, 0.003), 0, 0.6)
    put(b, tone(170, 0.03, 0.008, h2=0.3), 0, 0.6)
    put(b, tone(880, 0.16, 0.065, h2=0.25, h3=0.08), 0.045, 0.7)
    return b

def s_circuit_complete():
    b = sfx_buf(0.40)
    for f, t0, tau, g in [(523.25, 0, 0.09, 0.7), (659.26, 0.08, 0.09, 0.75), (783.99, 0.16, 0.16, 0.85)]:
        put(b, pluck(f, 0.26, tau=tau, bright=3.5), t0, g)
    put(b, pluck(1046.5, 0.24, tau=0.12, bright=5), 0.16, 0.35)
    n = int(0.2 * SR); t = np.arange(n) / SR
    sh = (np.sin(2 * np.pi * 2093 * t) + 0.6 * np.sin(2 * np.pi * 3136 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 20 * t)) * ad(n, 0.01, 0.09)
    put(b, sh, 0.19, 0.16)
    return b

def s_cooling_pulse():
    b = sfx_buf(0.25)
    n = int(0.2 * SR); t = np.arange(n) / SR
    ex = _norm(bp(RNG.standard_normal(n), 1800, 5200)) * np.minimum(1, t / 0.02) * np.exp(-t / 0.07)
    put(b, ex, 0, 0.45)
    put(b, sweep(1100, 2300, 0.08, 0.03), 0.07, 0.45)
    put(b, tone(3400, 0.08, 0.03), 0.075, 0.10)
    return b

def s_overload():
    b = sfx_buf(0.35)
    n = int(0.09 * SR)
    for t0 in (0.0, 0.11):
        put(b, lp(osc(n, 220, "tri"), 1200) * ad(n, 0.004, 0.05), t0, 0.9)
    n = int(0.13 * SR)
    put(b, lp(osc(n, np.linspace(196, 105, n), "saw"), 800) * ad(n, 0.006, 0.09), 0.225, 0.45)
    return b

def s_round_complete():
    b = sfx_buf(0.45)
    for f, t0, g in [(523.25, 0, 0.6), (659.26, 0.07, 0.62), (783.99, 0.14, 0.65), (1046.5, 0.21, 0.8)]:
        put(b, fmbell(f, 0.25, 0.09), t0, g)
    put(b, fmbell(1318.5, 0.22, 0.12), 0.21, 0.30)
    put(b, fmbell(783.99, 0.22, 0.14), 0.21, 0.35)
    return b

def s_ui_select():
    b = sfx_buf(0.08)
    put(b, tone(1400, 0.08, 0.012, atk=0.0005), 0, 0.6)
    put(b, nburst(0.004, 2000, 6000, 0.001), 0, 0.15)
    return b

def s_ui_confirm():
    b = sfx_buf(0.15)
    put(b, nburst(0.006, 1500, 5000, 0.002), 0, 0.3)
    put(b, tone(700, 0.04, 0.01), 0, 0.4)
    put(b, sweep(660, 1100, 0.1, 0.05) + 0.3 * sweep(1320, 2200, 0.1, 0.04), 0.035, 0.6)
    return b

def s_round_start():
    b = sfx_buf(0.35)
    n = int(0.2 * SR); t = np.arange(n) / SR
    sw = lp(osc(n, 330 * (1320 / 330) ** (t / 0.2), "tri") * (t / 0.2) ** 1.3, 3000)
    k = int(0.012 * SR); sw[-k:] *= np.linspace(1, 0, k)
    put(b, sw, 0, 0.5)
    put(b, pluck(1318.5, 0.15, tau=0.07, bright=6), 0.2, 0.85)
    put(b, tone(2637, 0.1, 0.04), 0.2, 0.12)
    return b

def _two_notes(f1, f2, tau1, tau2, g1, g2, soft=2800):
    b = sfx_buf(0.25)
    put(b, lp(tone(f1, 0.2, tau1, h2=0.15), soft), 0.0, g1)
    put(b, lp(tone(f2, 0.2, tau2, h2=0.15), soft), 0.11, g2)
    return b

def s_camera_ready():     return _two_notes(523.25, 783.99, 0.07, 0.12, 0.6, 0.7)
def s_tracking_lost():    return _two_notes(783.99, 587.33, 0.06, 0.07, 0.55, 0.45, soft=2200)
def s_tracking_restored(): return _two_notes(587.33, 783.99, 0.07, 0.12, 0.5, 0.6)

SFX = [  # (file, duration s, builder, peak)
    ("sfx_energy_catch", 0.20, s_energy_catch, 0.70),
    ("sfx_hazard_hit", 0.25, s_hazard_hit, 0.65),
    ("sfx_socket_connect", 0.20, s_socket_connect, 0.65),
    ("sfx_circuit_complete", 0.40, s_circuit_complete, 0.72),
    ("sfx_cooling_pulse", 0.25, s_cooling_pulse, 0.62),
    ("sfx_overload", 0.35, s_overload, 0.60),
    ("sfx_round_complete", 0.45, s_round_complete, 0.72),
    ("sfx_ui_select", 0.08, s_ui_select, 0.50),
    ("sfx_ui_confirm", 0.15, s_ui_confirm, 0.60),
    ("sfx_round_start", 0.35, s_round_start, 0.68),
    ("sfx_camera_ready", 0.25, s_camera_ready, 0.60),
    ("sfx_tracking_lost", 0.25, s_tracking_lost, 0.55),
    ("sfx_tracking_restored", 0.25, s_tracking_restored, 0.58),
]

def finish_sfx(x, dur, peak):
    n = int(round(dur * SR))
    x = x[:n] if len(x) >= n else np.pad(x, (0, n - len(x)))
    k = int(0.001 * SR); x[:k] *= np.linspace(0, 1, k)
    k = int(0.015 * SR); x[-k:] *= 0.5 * (1 + np.cos(np.pi * np.linspace(0, 1, k)))
    return x * (peak / (np.abs(x).max() + 1e-9))

# ----------------------------------------------------------------- output
def write_wav(path, x):
    wavfile.write(path, SR, np.clip(np.round(x * 32767), -32768, 32767).astype(np.int16))

def report(name, x, loop=False):
    mono = x if x.ndim == 1 else x.mean(axis=1)
    pk = 20 * np.log10(np.abs(x).max() + 1e-12)
    rms = 20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12)
    F = np.abs(np.fft.rfft(mono)) ** 2; fr = np.fft.rfftfreq(len(mono), 1 / SR)
    hf = F[fr > 8000].sum() / F.sum() * 100
    line = f"{name:26s} {len(mono) / SR:6.2f}s  peak {pk:6.1f} dBFS  rms {rms:6.1f} dBFS  >8kHz {hf:5.2f}% energy"
    if loop:
        seam = abs(mono[0] - mono[-1]); typ = np.percentile(np.abs(np.diff(mono)), 99.9)
        line += f"  seam/diff99.9 = {seam / typ:4.2f}"
    print(line)

def main():
    md, sd = os.path.join(OUT, "music"), os.path.join(OUT, "sfx")
    os.makedirs(md, exist_ok=True); os.makedirs(sd, exist_ok=True)
    tracks = [
        ("theme_main_menu", THEME_BPM, THEME_SECTIONS, THEME_CFG, 0.16),
        ("loop_energy_catch", ENERGY_BPM, ENERGY_SECTIONS, ENERGY_CFG, 0.12),
        ("loop_duo_circuit", DUO_BPM, DUO_SECTIONS, DUO_CFG, 0.15),
        ("loop_cool_the_core", COOL_BPM, COOL_SECTIONS, COOL_CFG, 0.20),
    ]
    for name, bpm, secs, cfg, rev in tracks:
        x, nb = render_track(bpm, secs, cfg, rev)
        write_wav(os.path.join(md, name + ".wav"), x)
        report(name + f" ({nb} bars)", x, loop=True)
    j = build_jingle()
    write_wav(os.path.join(md, "jingle_results_buggy.wav"), j)
    report("jingle_results_buggy", j)
    for name, dur, fn, peak in SFX:
        x = finish_sfx(fn(), dur, peak)
        write_wav(os.path.join(sd, name + ".wav"), x)
        report(name, x)

if __name__ == "__main__":
    main()
