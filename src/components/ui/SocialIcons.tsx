import type { SVGProps } from "react";

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M14.5 8.5h2V5.3c-.35-.05-1.5-.15-2.85-.15-2.82 0-4.75 1.72-4.75 4.88v2.47H6v3.5h3.4V21h3.6v-4.99h3.15l.5-3.5h-3.65V10.4c0-1.01.28-1.9 1.5-1.9Z"
        fill="currentColor"
      />
    </svg>
  );
}
