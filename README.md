# HATTAH — حَطّة

A luxury, museum-quality e-commerce showcase for HATTAH, a Turkey-based brand selling
authentic Palestinian heritage products. Built with Next.js 15 (App Router), Tailwind
CSS v4, next-intl (Arabic / English / Turkish), and Supabase. Ordering happens entirely
via WhatsApp — there is no payment gateway or shopping cart.

This README is written for a non-developer owner to follow step by step.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. Once it's ready, open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
   `products`, `product_images`, and `categories` tables, sets up security rules so
   the public can only ever *read* data, and creates a public `product-images`
   storage bucket for your photos.
3. Open **Project Settings → API**. You'll need three values from this page in the
   next step: the **Project URL**, the **anon public** key, and the
   **service_role** key (click "reveal" to see it — keep this one secret).

## 2. Configure environment variables

Copy `.env.example` to a new file named `.env.local` and fill in every value.
Each variable is explained with a comment directly in that file. In short:

- The two Supabase keys + URL connect the site to your database and photo storage.
- `NEXT_PUBLIC_WHATSAPP_NUMBER` is the number customers' orders are sent to.
- `ADMIN_PASSWORD` is the password you'll use to log in to `/admin`.
- `ADMIN_SESSION_SECRET` can be any long random string (it just needs to be secret —
  run `openssl rand -hex 32` in Terminal to generate one, or mash your keyboard).

## 3. Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll land on the Arabic
homepage (the default language). Try `/en` and `/tr` for the other languages, and
`/admin` to log in and add your first products.

## 4. Add your products

Go to `/admin`, log in with your `ADMIN_PASSWORD`, and click **Add New Product**.
Upload one or more photos, fill in the name and description in all three languages,
set a price and category, and save. Products appear immediately on the homepage and
shop page — no rebuild needed.

## 5. Deploy to Vercel

1. Push this project to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import that repository.
3. In the "Environment Variables" step, add every variable from your `.env.local`
   file (the same names and values).
4. Click Deploy. That's it — no other configuration is required.

Every time you push a change to GitHub, Vercel will redeploy automatically. Adding,
editing, or deleting products through `/admin` does **not** require a redeploy —
that data lives in Supabase and updates live.

## Project structure, briefly

- `src/app/[locale]/(site)` — the public site: homepage, shop, product pages.
- `src/app/[locale]/admin` — the password-protected admin dashboard.
- `src/components` — the reusable design system (buttons, cards, header, footer,
  product gallery, admin forms, etc.), organized by area.
- `messages/{ar,en,tr}.json` — every piece of static UI text, per language. Edit
  these to change any label, button, or paragraph on the site.
- `supabase/schema.sql` — the full database schema, safe to re-run any time.
- `src/lib/whatsapp.ts` — builds the WhatsApp order link from
  `NEXT_PUBLIC_WHATSAPP_NUMBER`, so the number only needs to be set in one place.
