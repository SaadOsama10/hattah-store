#!/usr/bin/env python3
"""Builds the 45 s music excerpts of the reel/story library from full Pixabay downloads (numpy only).
Usage: prepare_tracks.py <workdir>   — reads <workdir>/dl2/<name>.mp3, writes <workdir>/out2/<name>.mp3 and prints bpm/offset/loop info
(edit the `name` list at the bottom). Strongest section by energy, bar-aligned on the refined beat grid, phrase-matched loop when the
strong part is shorter than 45 s, then EQ + loudnorm -18 + limiter. Put bpm/offset from the output into tracks.json, upload to `social-music`."""
import subprocess, json, sys, numpy as np
SR=22050; HOP=128; N=1024; EXC=45.0
def load(path, sr=SR):
    raw=subprocess.run(["ffmpeg","-v","error","-i",path,"-ac","1","-ar",str(sr),"-f","f32le","-"],capture_output=True,check=True).stdout
    return np.frombuffer(raw,dtype=np.float32).copy()
def flux_of(x):
    win=np.hanning(N); fr=1+(len(x)-N)//HOP
    idx=np.arange(N)[None,:]+HOP*np.arange(fr)[:,None]
    S=np.abs(np.fft.rfft(x[idx]*win,axis=1))
    L=np.log1p(10*S); f=np.maximum(0,np.diff(L,axis=0)).sum(axis=1)
    return (f-f.mean())/(f.std()+1e-9), S
FPS=SR/HOP
def tempo(flux, lo=85, hi=135):
    ac=np.correlate(flux,flux,"full")[len(flux)-1:]
    best,bb=-1,100
    for b in np.arange(lo,hi+.25,.25):
        lag=FPS*60/b; s=sum(np.interp(lag*k,np.arange(len(ac)),ac)/k**.25 for k in (1,2,4))
        if s>best: best,bb=s,b
    return bb
def comb(flux,bpm,phases):
    p=FPS*60/bpm; best=(-1e9,0)
    for ph in phases:
        pts=np.arange(ph,len(flux)-1,p); sc=np.interp(pts,np.arange(len(flux)),flux).sum()/len(pts)
        if sc>best[0]: best=(sc,ph)
    return best
def refine(flux,b0):
    best=(-1e9,b0,0)
    for b in np.arange(b0-1.5,b0+1.5,.02):
        p=FPS*60/b
        sc,ph=comb(flux,b,np.arange(0,p,1.0))
        if sc>best[0]: best=(sc,b,ph)
    return best[1],best[2]/FPS   # bpm, offset seconds
def strong_run(x):
    n=int(FPS*0)  # unused
    w=SR  # 1 s rolling rms
    e=np.sqrt(np.convolve(x**2,np.ones(w)/w,"same"))
    p90=np.percentile(e,90); mask=e>=0.62*p90
    mask[:SR]=False; mask[-SR:]=False
    runs=[];i=0
    while i<len(mask):
        if mask[i]:
            j=i
            while j<len(mask) and mask[j]: j+=1
            runs.append([i,j]); i=j
        else: i+=1
    merged=[]
    for r in runs:
        if merged and r[0]-merged[-1][1]<1.5*SR: merged[-1][1]=r[1]
        else: merged.append(r)
    return max(merged,key=lambda r:r[1]-r[0])
def cos(a,b): return float(a@b/(np.linalg.norm(a)*np.linalg.norm(b)+1e-9))
def spec(seg):
    n=len(seg)//2*2; w=np.hanning(len(seg)); s=np.abs(np.fft.rfft(seg*w)); return np.log1p(s[:len(s)//2])
def build(name,src,out):
    x=load(src); rep={"name":name,"dur":len(x)/SR}
    a,b=strong_run(x); rep["run"]=[round(a/SR,2),round(b/SR,2)]
    fl,_=flux_of(x)
    ra=int(a/HOP); rb=int(b/HOP)
    b0=tempo(fl[ra:rb]); bpm,off=refine(fl[ra:rb],b0)   # off relative to run start frame
    period=60/bpm; rep["bpm"]=round(bpm,2)
    t0=a/SR+off   # first beat inside run
    # bar phase: which of 4 beats carries most flux
    sums=[]
    for k in range(4):
        pts=np.arange(t0+k*period,b/SR-period,4*period)
        fi=np.clip((pts*FPS).astype(int),0,len(fl)-1); sums.append(fl[fi].sum()/max(1,len(pts)))
    k0=int(np.argmax(sums)); start=t0+k0*period
    if start<a/SR+0.05: start+=4*period
    bar=4*period
    # strongest entry point: first bar (or best 45 s window for long runs) whose energy is already full, never a soft intro bar
    nb=int((b/SR-start)//bar); E=np.array([np.sqrt((x[int((start+i*bar)*SR):int((start+(i+1)*bar)*SR)]**2).mean()) for i in range(nb)])
    med=float(np.median(E)); ok=[i for i in range(nb-1) if E[i]>=0.88*med and E[i+1]>=0.88*med]
    wb=int(EXC//bar)+1
    full=[i for i in ok if i+wb<=nb]
    if full: i0=max(full,key=lambda i:E[i:i+wb].mean()-0.0*i)
    elif ok: i0=ok[0]
    else: i0=0
    start=start+i0*bar; rep["entry_bar"]=int(i0)
    avail=b/SR-start
    rep["start"]=round(start,3); rep["avail"]=round(avail,2); rep["barphase"]=k0
    s0=int(round(start*SR)); need=int(EXC*SR)
    if avail>=EXC+0.5:
        y=x[s0:s0+need]; rep["loop"]=None
    else:
        K=int(avail//bar); e=s0+int(round(K*bar*SR)); bs=int(round(bar*SR))
        # choose loop unit M bars by phrase similarity of the bar before e vs the bar before e-M bars
        best=(-9,None)
        ref=spec(x[e-2*bs:e])
        for M in range(2,K+1):
            if e-M*int(round(bar*SR))-2*bs<s0-bs: break
            cand=spec(x[e-M*bs-2*bs:e-M*bs]) if False else spec(x[e-int(round(M*bar*SR))-2*bs:e-int(round(M*bar*SR))])
            sc=cos(ref,cand)+0.004*M
            if sc>best[0]: best=(sc,M)
        M=best[1]; unit=int(round(M*bar*SR)); xf=int(0.012*SR)
        y=x[s0:e].copy()
        while len(y)<need+unit:
            tail=y[-xf:]; pre=x[e-unit-xf:e-unit]
            fade=np.linspace(0,1,xf)
            y[-xf:]=tail*np.cos(fade*np.pi/2)+pre*np.sin(fade*np.pi/2)
            y=np.concatenate([y,x[e-unit:e]])
        y=y[:need]; rep["loop"]={"bars":int(M),"sim":round(best[0],3),"unit_s":round(unit/SR,2),"seg_s":round((e-s0)/SR,2)}
    # write wav → EQ/limiter/loudnorm → mp3
    p=subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-ar","44100","-ac","2",
        "-af","treble=g=-2:f=6000,loudnorm=I=-18:TP=-2:LRA=7,alimiter=limit=0.89:attack=5:release=80","-b:a","160k",out],input=y.astype(np.float32).tobytes(),capture_output=True)
    if p.returncode: print(p.stderr.decode()[-300:]); sys.exit(1)
    # re-analyse the final excerpt for tracks.json
    z=load(out); fz,_=flux_of(z); b2=tempo(fz); bpm2,off2=refine(fz,b2)
    rep["final_bpm"]=round(bpm2,2); rep["final_offset"]=round(off2,3)
    rep["start_energy"]=[round(float(np.sqrt((z[int(t*SR):int((t+1)*SR)]**2).mean())),3) for t in (0,5,15,30,43)]
    return rep
if __name__=="__main__":
    S=sys.argv[1]; res=[]
    for name in ["ancient-egyptian-celebration","arabic-music-desert","middle-east-ethnic","nopti-arabe"]:
        r=build(name,f"{S}/dl2/{name}.mp3",f"{S}/out2/{name}.mp3"); print(json.dumps(r,ensure_ascii=False)); res.append(r)
    json.dump(res,open(f"{S}/prep.json","w"),indent=1)
