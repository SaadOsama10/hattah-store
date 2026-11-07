import tracks from "../../automation/music/tracks.json";

export interface MusicTrack {
  file: string;
  title: string;
  bpm: number;
}

/** The licensed music tracks (the files themselves live in the private `social-music` bucket). */
export const MUSIC_TRACKS: MusicTrack[] = (tracks as { file: string; title: string; bpm: number }[]).map((t) => ({
  file: t.file,
  title: t.title,
  bpm: t.bpm,
}));
