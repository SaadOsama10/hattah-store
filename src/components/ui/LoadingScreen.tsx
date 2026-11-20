import Image from "next/image";

/** Branded loading state: logo inside a slowly turning dotted ring, a thin sweep below. */
export function LoadingScreen() {
  return (
    <div role="status" aria-busy="true" className="flex min-h-[70vh] flex-col items-center justify-center gap-8 bg-bg-primary">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 200 200" aria-hidden className="absolute -inset-[35%] h-[170%] w-[170%] animate-spin [animation-duration:2.4s]">
          <circle cx="100" cy="100" r="92" fill="none" stroke="var(--color-line-strong)" strokeWidth="1.2" strokeDasharray="2 7" />
          <path d="M100 8 A92 92 0 0 1 192 100" fill="none" stroke="var(--color-terracotta)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <Image src="/images/hattah-logo-sm.webp" alt="HATTAH — حَطّة" width={80} height={80} className="relative rounded-full" priority />
      </div>
      <div className="h-px w-28 overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-[loading-sweep_1.4s_ease-in-out_infinite] bg-terracotta" />
      </div>
    </div>
  );
}
