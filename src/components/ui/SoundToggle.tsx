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
        "flex h-9 w-9 items-center justify-center rounded-full border border-cream/25 text-cream transition-all duration-300 hover:scale-105 hover:border-cream hover:bg-cream/5",
        className
      )}
    >
      {!mounted || !muted ? <Volume2 size={15} /> : <VolumeX size={15} />}
    </button>
  );
}
