# Reel / story background music — licenses

All tracks are royalty-free instrumentals from **Pixabay Music**, released under the
[Pixabay Content License](https://pixabay.com/service/license-summary/) (downloaded 2026-11-07):
free for commercial use (including social media), **no attribution required**, no vocals, and no recordings of
existing songs or artists (no folk-song recordings). Chosen for a Palestinian / Levantine heritage feel:
dabke rhythm, oud, mijwiz, ney/reed flute, darbuka/tabla/daff — light and upbeat, nothing sad or heavy.
Pixabay forbids redistributing the files as standalone downloads, so the audio is **not stored in this
(public) repository**. Only a 45-second excerpt of each track (normalised to ≈ -18 LUFS, 160 kbps) lives in the
**private** Supabase Storage bucket `social-music`; the render step downloads it with the service role key.
The reel/story render adds its own loudnorm (-18 LUFS reels, -20 LUFS stories) and fade in/out.

The whole previous library (Turkish / Egyptian / generic "Arabic" tracks) was replaced on 2026-11-07 and removed
from the bucket and the repo.

`tracks.json` holds, per track: title, artist, source page, **bpm** and **offset** (seconds to the first
beat of the excerpt) — produced by `analyze_beats.py` (numpy only) and used to cut the reels on the beat.
To add a track: download it from Pixabay,
`ffmpeg -ss <start> -t 45 -i in.mp3 -vn -af loudnorm=I=-18:TP=-2:LRA=7 -ac 2 -ar 44100 -b:a 160k out.mp3`,
run `python3 analyze_beats.py out.mp3`, upload `out.mp3` to the `social-music` bucket and add it to `tracks.json`.

"AI = yes": the Pixabay page tags the track as AI-generated; it is still covered by the Pixabay Content License.

| Track | Artist | BPM | Source | AI |
|---|---|---|---|---|
| Atlas • Palestine | Vadim_Makes_Sound | 126.5 | https://pixabay.com/music/world-atlas-palestine-579050/ | yes |
| Dabke Fusion Theme | vjgalaxy | 107.0 | https://pixabay.com/music/arabic-dabke-fusion-theme-588122/ | yes |
| Melodic Dabke Fusion Theme | vjgalaxy | 95.0 | https://pixabay.com/music/arabic-melodic-dabke-fusion-theme-588123/ | yes |
| Oasis Rhythm | AstronautFlute | 114.0 | https://pixabay.com/music/world-oasis-rhythm-590416/ | no |
| Upbeat Arabic | Alec_Koff | 110.0 | https://pixabay.com/music/world-upbeat-arabic-486550/ | no |
| Çöl Ateşi Darbuka | KeopsRa | 110.0 | https://pixabay.com/music/dance-%C3%A7%C3%B6l-ate%C5%9Fi-darbuka-519931/ | no |
| Night of Gold | djovan | 112.0 | https://pixabay.com/music/folk-night-of-gold-461581/ | yes |
| Red Veil Dance | djovan | 102.5 | https://pixabay.com/music/upbeat-red-veil-dance-461585/ | yes |
| Belly Dance | AliveTunesMusic | 100.0 | https://pixabay.com/music/world-belly-dance-118609/ | no |
| Pearls of Fez | djovan | 100.0 | https://pixabay.com/music/world-pearls-of-fez-461583/ | yes |
| Middle Eastern Percussion (World, Oriental) | Ashot_Danielyan | 87.0 | https://pixabay.com/music/world-middle-eastern-percussion-world-oriental-224611/ | no |
