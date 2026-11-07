# Reel / story background music — licenses

All 4 tracks are royalty-free music from **Pixabay Music**, released under the
[Pixabay Content License](https://pixabay.com/service/license-summary/) (downloaded 2026-11-07):
free for commercial use (including social media), **no attribution required**, no recordings of existing songs or artists.
Chosen by the owner from a shortlist (Levantine / oriental feel, upbeat, no EDM, no religious material).
Pixabay forbids redistributing the files as standalone downloads, so the audio is **not stored in this
(public) repository**. Only a 45-second excerpt of each track lives in the **private** Supabase Storage
bucket `social-music`; the render step downloads it with the service role key.

How the excerpts are made (`music/prepare_tracks.py`): the strongest section is found by energy / onset analysis
(no soft intro: the music is full from the first second), cut on a bar boundary of the refined beat grid, and — when the
strong part is shorter than 45 s — looped on a whole number of bars (phrase-matched, 12 ms equal-power crossfade, beat grid kept exact).
EQ (treble -2 dB @ 6 kHz) → loudnorm -18 LUFS → soft limiter. `tracks.json` holds the refined **bpm** and **offset** (first beat).
At render time (reel.ts / story.ts): same EQ → loudnorm (-18 LUFS reels, -20 LUFS stories) → soft limiter, 0.2 s fade-in,
fade-out 1.8 s (reels, ending on a beat) / 1.5 s (stories).

"AI = yes": the Pixabay page tags the track as AI-generated; it is still covered by the Pixabay Content License.
The previous libraries (instrumentals of 2026-10-25 and 2026-11-07) were removed from the bucket and the repo.

| Track | Artist | BPM | Source | AI |
|---|---|---|---|---|
| Ancient Egyptian Celebration (Oud, Ney & Darbuka Groove) | SoundsByAmelia | 100.0 | https://pixabay.com/music/folk-ancient-egyptian-celebration-oud-ney-amp-darbuka-groove-422958/ | yes |
| Arabic Music Desert | os_music | 106.69 | https://pixabay.com/music/world-arabic-music-desert-royalty-free-music-497001/ | no |
| Middle East (Ethnic Arabic Music) | NverAvetyanMusic | 105.0 | https://pixabay.com/music/upbeat-middle-east-ethnic-arabic-music-156548/ | no |
| Nopți Arabe | Iul4an | 110.0 | https://pixabay.com/music/folk-nop%C8%9Bi-arabe-487088/ | no |
