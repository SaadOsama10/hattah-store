import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const SIZES = {
  sm: 40,
  md: 56,
  lg: 88,
  xl: 140,
} as const;

export function Logo({
  size = "md",
  className,
  linkToHome = true,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  linkToHome?: boolean;
}) {
  const px = SIZES[size];

  const image = (
    <Image
      src="/images/hattah-logo.jpg"
      alt="HATTAH — حَطّة"
      width={px}
      height={px}
      className={cn(
        "rounded-full object-contain ring-1 ring-cream/10 transition-shadow duration-300",
        className
      )}
      priority
    />
  );

  if (!linkToHome) return image;

  return (
    <Link href="/" aria-label="HATTAH">
      {image}
    </Link>
  );
}
