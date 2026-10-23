import { notFound } from "next/navigation";

/** Any unknown URL under /{locale}/… renders the localized, site-styled 404 (see ../not-found.tsx). */
export default function CatchAll() {
  notFound();
}
