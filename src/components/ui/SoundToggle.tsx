"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/cn";
import { isSoundMuted, setSoundMuted } from "@/lib/sound";

export function SoundToggle({ className }: { className?: string }) {
  const [muted, setMuted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMuted(isSoundMuted());
    setMounted(true);
  }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      suppressHydrationWarning
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full text-cream transition-colors duration-300 hover:bg-cream/8",
        className
      )}
    >
      {!mounted || !muted ? <Volume2 size={18} strokeWidth={1.75} /> : <VolumeX size={18} strokeWidth={1.75} />}
    </button>
  );
}
