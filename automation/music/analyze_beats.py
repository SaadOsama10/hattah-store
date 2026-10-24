#!/usr/bin/env python3
"""Tempo / beat-phase / brightness analysis of music excerpts (numpy only, no librosa).
Usage: analyze_beats.py file.mp3 [...]  → JSON lines {file,bpm,offset,hf,lufs_hint}
bpm = tempo in 85–135; offset = time (s) of the first beat in the excerpt; hf = share of spectral energy above 5 kHz (harshness)."""
import json, subprocess, sys
import numpy as np

SR = 22050
def load(path):
    raw = subprocess.run(["ffmpeg","-v","error","-i",path,"-ac","1","-ar",str(SR),"-f","f32le","-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw, dtype=np.float32)

def analyze(path):
    x = load(path)
    n, hop = 1024, 256
    win = np.hanning(n)
    frames = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    S = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    freqs = np.fft.rfftfreq(n, 1 / SR)
    hf = float((S[:, freqs > 5000] ** 2).sum() / (S ** 2).sum())
    # onset strength = positive spectral flux on log-compressed magnitudes
    L = np.log1p(10 * S)
    flux = np.maximum(0, np.diff(L, axis=0)).sum(axis=1)
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    fps = SR / hop
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    best, best_bpm = -1, 100
    for bpm in np.arange(85, 135.5, 0.5):
        lag = fps * 60 / bpm
        # tempo score: autocorrelation at the beat lag plus its multiples (2x, 4x)
        s = sum(np.interp(lag * k, np.arange(len(ac)), ac) / k ** 0.25 for k in (1, 2, 4))
        if s > best: best, best_bpm = s, float(bpm)
    period = fps * 60 / best_bpm
    # beat phase: the offset whose comb of impulses collects the most onset energy
    best_ph, best_sc = 0, -1e9
    for ph in np.arange(0, period, 0.5):
        pts = np.arange(ph, len(flux) - 1, period)
        sc = np.interp(pts, np.arange(len(flux)), flux).sum()
        if sc > best_sc: best_sc, best_ph = sc, ph
    return {"file": path.split("/")[-1], "bpm": round(best_bpm, 1), "offset": round(best_ph / fps, 3), "hf": round(hf, 3)}

if __name__ == "__main__":
    for p in sys.argv[1:]:
        print(json.dumps(analyze(p)))
