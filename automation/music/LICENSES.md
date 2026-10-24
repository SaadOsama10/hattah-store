# Reel background music — licenses

All tracks are royalty-free instrumentals from **Pixabay Music**, released under the
[Pixabay Content License](https://pixabay.com/service/license-summary/) (downloaded 2026-10-25):
free for commercial use, **no attribution required**, no copyrighted/Content-ID-registered material, no vocals.
Pixabay forbids redistributing the files as standalone downloads, so the audio is **not stored in this
(public) repository**. Only a 45-second excerpt of each track lives in the **private** Supabase Storage
bucket `social-music`; the render step downloads it with the service role key.

Selection: upbeat, positive, ~97–122 BPM, soft oriental colour, no vocals; the heavier/"kick-forward"
candidates were rejected. (The previous slow oud tracks were removed on 2026-10-25.)

`tracks.json` holds, per track: title, artist, source page, **bpm** and **offset** (seconds to the first
beat of the excerpt) — produced by `analyze_beats.py` (numpy only) and used to cut the reels on the beat.
To add a track: download it from Pixabay, `ffmpeg -ss <start> -t 45 -i in.mp3 -vn -ac 2 -ar 44100 -b:a 160k out.mp3`,
run `python3 analyze_beats.py out.mp3`, upload `out.mp3` to the `social-music` bucket and add it to `tracks.json`.

| Track | Artist | BPM | Source |
|---|---|---|---|
| Forty Thieves (instrumental dance, Arabian) | melodyayresgriffiths | 122.0 | https://pixabay.com/music/upbeat-forty-thieves-instrumental-dance-arabian-aladdin-persian-138348/ |
| Arabic Dance | Tunetank | 120.0 | https://pixabay.com/music/pop-arabic-dance-347242/ |
| Turkish Istanbul Music | StudioKolomna | 115.0 | https://pixabay.com/music/world-turkish-istanbul-music-114324/ |
| Egyptian Egypt Desert Music | HitsLab | 106.5 | https://pixabay.com/music/world-egyptian-egypt-desert-music-502005/ |
| The Oriental Way (Pop, Oriental, Instrumental) | Lyrium-2025 | 105.0 | https://pixabay.com/music/instrumental-the-oriental-way-pop-oriental-instrumental-566606/ |
| Istanbul Turkish Turkey | lNPLUSMUSIC | 105.0 | https://pixabay.com/music/world-istanbul-turkish-turkey-615062/ |
| Turkish Dance | Loka_music | 101.0 | https://pixabay.com/music/arabic-turkish-dance-602715/ |
| Arabic Music | JonasBlakewood | 97.5 | https://pixabay.com/music/upbeat-arabic-arabic-music-294013/ |
| KI - Instrumental (Pop, Oriental) | Lyrium-2025 | 100.0 | https://pixabay.com/music/world-ki-instrumental-pop-oriental-337459/ |
| KI - Instrumental (Pop, Oriental) II | Lyrium-2025 | 94.0 | https://pixabay.com/music/world-ki-instrumental-pop-oriental-337454/ |
