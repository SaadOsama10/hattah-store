import Image from "next/image";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-primary">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-terracotta/20" />
        <span className="absolute inset-0 rounded-full ring-1 ring-cream/15" />
        <Image
          src="/images/hattah-logo.jpg"
          alt="HATTAH — حَطّة"
          width={80}
          height={80}
          className="relative rounded-full object-contain"
          priority
        />
      </div>
      <div className="h-px w-24 overflow-hidden bg-cream/10">
        <div className="h-full w-1/3 animate-[loading-sweep_1.4s_ease-in-out_infinite] bg-terracotta" />
      </div>
    </div>
  );
}
