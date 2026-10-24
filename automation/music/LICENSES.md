# Reel background music — licenses

All tracks are royalty-free instrumentals from **Pixabay Music**, released under the
[Pixabay Content License](https://pixabay.com/service/license-summary/) (downloaded 2026-10-25):
free for commercial use, **no attribution required**, no copyrighted/Content-ID-registered material.
Pixabay forbids redistributing the files as standalone downloads, so the audio is **not stored in this
(public) repository**. Only a 40-second excerpt (from 0:10) of each track lives in the **private**
Supabase Storage bucket `social-music`; the render step downloads it with the service role key.

`tracks.json` lists every track (title, artist, source page). To add a track: download it from Pixabay,
cut an excerpt (`ffmpeg -ss 10 -t 40 -i in.mp3 -ac 2 -ar 44100 -b:a 160k out.mp3`), upload it to the
`social-music` bucket, and add it to `tracks.json` with its source URL.

| Track | Artist | Source |
|---|---|---|
| Oud Whisper Reverie | djovan | https://pixabay.com/music/world-oud-whisper-reverie-453951/ |
| Oud Agadir Antiquity | djovan | https://pixabay.com/music/world-oud-agadir-antiquity-453954/ |
| Desert Veil | djovan | https://pixabay.com/music/world-desert-veil-453959/ |
| Silent Riad Courtyard | djovan | https://pixabay.com/music/world-silent-riad-courtyard-453950/ |
| Rebab Essaouira Echo | djovan | https://pixabay.com/music/world-rebab-essaouira-echo-453953/ |
| Sand Serenade | djovan | https://pixabay.com/music/world-sand-serenade-453952/ |
| Echoes of the Oasis | djovan | https://pixabay.com/music/world-echoes-of-the-oasis-422858/ |
| Sands of Time | djovan | https://pixabay.com/music/world-sands-of-time-422862/ |
