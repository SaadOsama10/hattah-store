# HATTAH — Redesign v2 report

## Simplicity and creativity (2026-11-20, latest) — **not merged**

**Principle**: less, but smarter. Each screen has one focus, generous empty space, and one meaningful motion.

### Addition: the word strip, back in a quiet form
- **What it is**: under the hero only (homepage, once): HATTAH · حطّة · غزة · تراث · هوية (EN/TR: Gaza, Heritage, Identity / Gazze, Miras, Kimlik).
- **Look**:
  - 48 px tall on desktop, 40 px on phones. No fill colour, just a faint 1 px line above and below.
  - The words use the page's body font (no extra font file) in the **muted text tone**, which looks like ~60% but keeps AA contrast.
  - Separators are small **cross-stitches (×) in the thread's red**. No gold.
- **Motion**: a 72-second linear loop, moving against the reading direction. It pauses on hover, focus, and while off screen; under reduced motion it's a still, centred line.
- **Relation to the thread**: the thread **passes behind the strip**, like a thread under fabric, and the strip fades out at both edges where the thread runs, so they never touch (checked in 8 screenshots).
- **Performance**: transform only. Its box is in the HTML with a fixed height (CLS 0), and its words mount only once the page is idle, so it costs nothing during the first load. The edges fade with static covers rather than a mask, which avoids repainting every frame.
  - In the Arabic hero, a late font swap was shifting the centred content (CLS 0.071). **Fixed**: the content is now anchored to the top, and the 600 weight (small labels only) uses `font-display: optional`.
- **Homepage Lighthouse after adding the strip** (mobile, **median of 5**): `/ar` **92** (runs 90–93), `/en` **92** (91–94), `/tr` **92** (88–93). CLS 0, accessibility 100, SEO 100. Before the strip (median of 3): 92 / 93 / 92. The difference on `/en` is within the run-to-run spread.
- **Screenshots** (outside the repo): `/private/tmp/claude-501/-Users-saadrady-Desktop-Hattah/e13c5be5-a043-4e92-bcb1-7dd86a6c95e2/scratchpad/marquee/` (`sheet-desktop.jpg`, `sheet-mobile.jpg`, 8 individual shots, and `marquee-ar-reduced-motion.png`).

### Removed (files and code, not just hidden)
- **Hero layers**: the particles canvas and floating gold dots (`HeroFx.tsx`), the rotating light rays, film grain, vignette, pulsing gold glows, the rotating ornament ring around the logo, the drawn kufiya net, the HATTAH letter reveal, the four rotating lines with their dots, the pause button, parallax, and the once-per-session intro.
- **Other homepage pieces**: the old marquee (`Marquee.tsx`, since brought back in a quiet form, see above), the "Why HATTAH" glass cards (`WhyHattah.tsx`, deleted because they repeated the meaning of "Our story"), and the decorative dividers between sections.
- **Card effects**: glass, gold glow, 3D tilt and the mouse spotlight (`Tilt.tsx`); the gold corner frames on the category cards; button shine.
- **Old component files**: the slowly turning seal (`BrandArt.tsx`), the kufiya texture (`KufiyaNet.tsx`), and the scroll-reactive ambient background (`AmbientBackground.tsx`).
- **Shown data**: product counts, arrows and rotating photos on the category cards; eyebrow labels and gold rules under headings; the category label on product cards; the "Featured" badge inside the featured section, where it repeated the section title.
- **Gold** now appears only on **the main call-to-action button**.
- **framer-motion** is completely gone from the storefront: the cart drawer slides with CSS. The admin still uses the library on its own, unchanged.

### The new idea: "the thread" (`src/components/ui/Thread.tsx`)
- One embroidery thread, 1.8 px wide (1.25 px on phones), in **earthy red**. It leaves the hero logo sideways and runs down the page edge in a gentle wave: **right in Arabic, left in English and Turkish**.
- It is **sewn as you scroll**: `stroke-dashoffset` follows a "needle" at 72% of the screen, which slides to the end as you reach the bottom. This uses requestAnimationFrame and a passive scroll listener, with no libraries.
- At the start of each main section, a small **cross-stitch** of three × marks appears when the thread reaches it. **One green stitch** sits at the final call to action. The thread ends in **a knot under the footer's HATTAH**.
- **Performance**: the geometry is built once after the page is idle, and only on resize. Scrolling writes a single style. The curve lengths are computed arithmetically (`pathLength`): the first version used the browser's path-measuring calls, and they cost up to 800 ms of blocking time, so they were dropped.
- Reduced motion: shown complete and still. Pages without a hero logo (product, shop…) have no thread.

### The new hero
- A calm background: in the dark theme, warm black with a gentle gradient; in the light theme, a clean warm cream. **A single static pool of light behind the text**, with no pulse.
- A medium-size logo (96 px desktop / 84 px phone) with no halo or ring.
- Then: the small badge, the large headline, **one fixed line** («هوديات، تطريز، لوحات، ميداليات وأكلات بطابع غزاوي» / EN / TR as given), and two buttons.
- The headline appears word by word within **1.2 s**. Then **one word is sewn underneath in red thread** («الفلسطيني», "Palestinian", "Filistin") and becomes the focus, and right after that the page thread starts from the logo.

### The rest of the page
- **Section headings**: a large title and one line, with no eyebrow or gold rule.
- **Category cards**: a large photo and the name, in different proportions. Hover: the photo grows to 1.03 and the name gets a thin underline.
- **Product cards**: photo, name, price. Badges only for "New" (added in the last 21 days) or "Featured", and only where they're real.
- **"Our story"**: a plain dark band with one large line that lights up word by word on scroll, plus a short paragraph and a link.
- **Final call**: a short line and the WhatsApp button, where the thread's green stitch sits.
- **Footer**: simple, with a very faint HATTAH watermark (3.5% opacity) and the thread's knot.
- **Spacing between sections**: about 120 px on desktop and 80 px on phones.
- **Remaining motions**: a soft reveal on scroll (once), the thread, and simple hovers. Nothing else.

### Performance (Lighthouse mobile, median of 3, local production build)
| Page | Before (last round) | After | Target |
|---|---|---|---|
| Home `/ar` | 86 | **92** | ≥ 92 |
| Home `/en` | 85 | **93** | ≥ 92 |
| Home `/tr` | 83 | **92** | ≥ 92 |
| Category `/ar/category/palestinian-food` | 88 | **91** | ≥ 88 |
| Product `/ar/product/dome-of-the-rock-model-a3b9cbda` | 89 | **93** | ≥ 88 |
| About `/ar/about` | 88 | **92** | ≥ 88 |

Accessibility **100**, SEO **100** and best practices **100** on every page. **CLS 0** everywhere. Homepage blocking time (TBT) is ~12 ms.

**Additional improvements this round**:
- Inter is now self-hosted: the Latin file plus a **3 KB** extension carrying only the Turkish letters and the lira sign. Before, the ₺ sign pulled in Google's 84 KB Latin-extended file.
- `next/font` is no longer used at all; each language preloads only its own fonts.
- The hero's subtitle line paints immediately: it was the LCP element on English pages.

### Checks
- build / lint / typecheck: pass (0 errors; the 4 warnings are old ones in admin files).
- The SEO check (every product page): 0 problems.
- **54/54** automated checks pass: cart, WhatsApp messages, price on request, priced options, 3 languages, both themes, admin (local test password, view only), and zero delivery words.
- No console errors.

### Screenshots (outside the repo, in the session's temporary folder)
- Before vs after for the homepage (hero + first 3 sections), dark/light × Arabic/English × desktop/mobile: 8 files in `/private/tmp/claude-501/-Users-saadrady-Desktop-Hattah/e13c5be5-a043-4e92-bcb1-7dd86a6c95e2/scratchpad/compare/` (`before-after-home-<lang>-<theme>-<d|m>.jpg`).
- No screenshot contains internal data (sales, inventory or admin).

### Decisions I made for you
1. **The stitched word**: «الفلسطيني» / "Palestinian" / "Filistin", the word that carries the identity.
2. **"Why HATTAH" deleted** rather than turned into text, since its meaning already lives in "Our story" and the final call.
3. **Kufiya pattern removed from the hero entirely**, since the thread itself is now the embroidery element. The light is one static pool with no pulse.
4. **Hero layout centred**: it works the same in both directions.
5. **No gold rules under headings**: you allowed them "if needed", and the thread does that job.
6. **The thread stays on the page edge** (in the gutter) so it never crosses text. On phones it's 7 px from the edge and thinner; in horizontal product rails, cards may pass beneath it as they scroll.
7. **"Featured" badge hidden inside "The HATTAH selection" only**, because every product there is featured. It still shows elsewhere.

---

## Previous status (2026-11-20, before simplification): paused, not merged

- **Branch**: `redesign-v2`, fully committed and pushed to GitHub.
- **Nothing was merged into `main`**, no tag was created, and nothing was published to production. The live site (https://hattah-store.vercel.app) is still on the old version.
- Local servers and tests are stopped.

### Done
- Every mention of delivery removed (3 languages, code + translations + SEO + JSON-LD + two database phrases); details below.
- The new About page (without the ring in "Who we are").
- Hero headline «متجرك للتراث الفلسطيني الأصيل» and the four rotating lines.
- The daylight theme as its own identity.
- Font fixes (each language preloads only its own files), SEO fix (the meta description always in `<head>`), contrast and heading-order fixes.

### Latest Lighthouse numbers (mobile, median of 3, local production build)
| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| `/ar` (default homepage) | 86 | 100 | 100 | 100 |
| `/en` | 85 | 100 | 100 | 100 |
| `/tr` | **83** | 100 | 100 | 100 |
| `/ar/category/palestinian-food` | 88 | 100 | 100 | 100 |
| `/ar/product/dome-of-the-rock-model-a3b9cbda` | 89 | 100 | 100 | 100 |
| `/ar/about` | 88 | 100 | 100 | 100 |
| `/en/about` | 93 | 100 | 100 | 100 |
| Desktop `/ar` / `/en` | 100 / 99 | 100 | 100 | 100 |

The per-run numbers vary by ±3 (for example `/ar`: 86/84/86, `/en`: 85/85/82).

### Not done yet / known issues
- **Deeper performance work**:
  - `/tr` is at 83 and `/en` sits right on 85; runs drop to 82–84.
  - What's left is mostly CPU and JavaScript time: the hero's client components, rails, cards with tilt/spotlight, framer-motion, which is still used by a few older components.
  - Further ideas: load the particles and parallax only after interaction, cut JS on the homepage, merge or subset the Latin fonts, and look at the image variants for the category tiles.
- The measurements are from a local build, because the preview requires a Vercel login. They need repeating on the live site after the merge.
- **Admin on the live site**: needs a check by you with your own password after the merge. Locally it was checked against the real data with a temporary test password.
- **Social automation**: its prompts still contain the word "delivery", but only as a prohibition; they weren't changed.

### Remaining steps before the merge
1. Raise performance to the targets on every page (≥ 85 consistently, including `/tr` and `/en`), then re-run the full test set (build, lint, typecheck, SEO check, the 54 automated tests).
2. Create the backup tag `pre-redesign-2026-11-20` on `main`.
3. Merge `redesign-v2` into `main` with a regular merge commit (no squash), wait for the Vercel deploy, and smoke-test the live site (pages, both themes, 3 languages, WhatsApp, admin, grep for delivery words).

---

## Final run-up to the merge (reference: what was done and checked)

### What changed in the last round
1. **No mention of delivery anywhere** (3 languages):
   - Removed from the FAQ (three questions), the SEO descriptions, the meta description, the product page, the privacy policy (now "address"/"complete the order" instead of "delivery address"/"deliver"), llms.txt, and the JSON-LD (`areaServed` removed; there was never `shippingDetails` or `hasMerchantReturnPolicy`).
   - Deleted the branch-only `/shipping` page (it was never live). "How to order" now links to `/about#order`.
   - In the database, I changed only two phrases that really talked about delivery: the English description of the "Palestinian Food" category ("…flavors, delivered" → "Authentic Palestinian flavors") and one product ("delivered ready to hang" → "ready to hang"). Other product descriptions use the verb "deliver" in the sense of "provide" ("delivers a radiant glow"), so I didn't touch them.
   - There's no delivery logic to remove: there's no checkout page or address field, and checkout is a WhatsApp message.
2. **About page, rebuilt**: a cinematic mini header (logo + ring + self-drawing kufiya net), then four sections:
   - **Who we are**: your text, in a centred ~720 px reading column. The ring is removed from this section only; it's still on the homepage in "Our story".
   - **What we offer**: cards with line icons linking to the real categories. Each card shows only if its category exists in the database.
   - **How to order**: 3 numbered steps plus a WhatsApp button, using the number from the settings.
   - **Contact us**: WhatsApp, email, Instagram, Facebook (real links only), then "Shop now" and "FAQ" buttons.
3. **Hero headline**: «متجرك للتراث الفلسطيني الأصيل» / "Your store for authentic Palestinian heritage." / "Özgün Filistin mirasının adresi.", with the four product lines rotating under it. No tashkeel. Sized for two balanced lines on phones and one or two on desktop. The old headlines were never used in the metadata or og:title, and a search of the code and translations finds no trace of them.
4. **Daylight theme as its own identity** ("morning light on old Jerusalem stone"):
   - **Hero**: ivory → honey sand, a soft sun glow with diagonal light from the upper corner, an olive-brown kufiya net, amber sun dust (drawn normally rather than additively, so it doesn't wash out to white), a warm shadow under the logo, an earthy ornament ring, warm dark-brown text and dark-olive rotating lines, a sandy vignette, finer grain, and an earth-brown primary button with an ivory label.
   - **Rest of the page**: ivory and honey-sand bands, one deep "night" band (Our story) and the deep final banner and footer, ivory product cards with sand hairlines, and layered brown shadows.
   - All text checked for **AA** contrast; terracotta and green were darkened slightly in daylight to pass on the sand band.
   - The theme switch cross-fades in 300 ms (View Transitions API), with no flash.

### Checks (all passed on the latest build)
| Check | Result |
|---|---|
| build / lint / typecheck | pass (0 errors; the 4 warnings are old ones in admin files) |
| SEO check (`scripts/seo-health.mjs`, every product page) | ok, 0 problems: Product JSON-LD on every page, price-on-request products without offers |
| Automated tests (54) | all pass: add to cart, cart WhatsApp message (product + total), priced option changes the price and the message, a sized product can't be ordered without choosing, price on request (no price, no cart, the WhatsApp message asks for the price, no offers in JSON-LD), theme switch + persistence, switching between the 3 languages (theme kept), 33 pages × 3 languages (200 status, one H1, **zero delivery words**), 404, admin pages |
| Admin (/admin, sales, inventory, social, seo, categories) | opened on a local server against the real data with a temporary test password (not the production password); all load normally, view only, with no changes to their logic |
| Console | no errors (only the expected 404 status on the deliberate 404 test) |

**Lighthouse (mobile, median of 3 runs, local production build)**:
| Page | Performance | Accessibility | Best practices | SEO |
|---|---|---|---|---|
| Home `/ar` (default) | **86** | 100 | 100 | 100 |
| Category `/ar/category/palestinian-food` | **88** | 100 | 100 | 100 |
| Product `/ar/product/dome-of-the-rock-model-a3b9cbda` | **89** | 100 | 100 | 100 |
| About `/ar/about` | **88** | 100 | 100 | 100 |
| About `/en/about` | 93 | 100 | 100 | 100 |
| Home `/en` | 85 | 100 | 100 | 100 |
| Home `/tr` | 83 (after the Turkish font preload; was 81) | 100 | 100 | 100 |
| Desktop: Home `/ar` and `/en` | 100 / 99 | 100 | 100 | 100 |

**Performance fixes in this round**:
- Each language preloads only its own fonts: Arabic gets Amiri + Plex; English and Turkish get self-hosted Playfair, plus the Latin-extended file for Turkish.
- Metadata always renders in `<head>` (`htmlLimitedBots`). Before this, the product and category pages sometimes lost their meta description from `<head>`.
- No LCP element is hidden by a scroll reveal.

**/tr home (83)**: it's not one of the gated pages. The gap is the extra Turkish font file; I'm noting it for follow-up rather than hiding it.

### Screenshots (in the repo: `docs/redesign-screenshots/`)
- Hero: `hero-day-desktop-ar-en-tr.jpg`, `hero-night-desktop-ar-en-tr.jpg`, `hero-day-mobile-ar-en-tr.jpg`, `hero-night-mobile-ar-en-tr.jpg`
- Homepage (all sections): `home-day-desktop-ar.jpg`, `home-night-desktop-ar.jpg`, `home-day-mobile-en.jpg`, `home-night-mobile-en.jpg`
- About: `about-who-offer-day-night.jpg` · Cart: `cart-day-desktop-ar.jpg`, `cart-night-mobile-en.jpg`
- The admin-page screenshots were deliberately not added to the repo (it's public and they show sales and inventory figures).

### Notes
- **Istanbul** appears only in your own About text and in the store's schema address. It isn't mentioned anywhere else.
- **Social automation**: its prompts still contain the word "delivery", but only as a prohibition ("don't claim delivery"), so I left them.
- **Admin on the live site**: I didn't sign in with your real password. On production I only confirmed the admin pages respond and redirect to the login page. The full admin check was done locally (above).


---

## History by round

## Preview

- Latest Vercel preview: see the live site above (after the merge)
- The preview requires a Vercel login (Deployment Protection), so it opens for you when you're signed in. That's why Lighthouse and the SEO check were run on a local production build (see Performance below).

## Commits

| Round | Content | Commit |
|---|---|---|
| A | Design system | `897d3d2` |
| B | Header, homepage, footer, policy pages | `075d631` |
| C | Shop and category pages | `ad50ce1` |
| D | Product page | `7a722aa` |
| Round 2 | Your feedback (live data, hero, copy, motion) + this report | see `git log` |

Before every commit: `tsc --noEmit` and `eslint` with no errors (the 4 warnings are old ones in admin files I didn't touch), and `next build` passed.

---

## Round 4: the rest of the site at the hero's level (latest)

### Shared systems (built first, reused everywhere)
1. **Page rhythm (`Band`)**:
   - Each homepage section sits on its own band: plain (page colour), cream, pattern (a faint kufiya net fading from the centre), or **deep**.
   - Deep is always the dark espresso palette with grain, even in light mode. It works by applying `data-theme="dark"` to that section only (the colour variables are re-derived in any element that carries `data-theme`).
   - Between sections there's a **thin rule with a small kufiya knot** in the middle (`SectionDivider`).
2. **Section headings**: a small spaced eyebrow in gold → a large title (Amiri/Playfair) → a short description → a **thin gold rule that draws itself** when the section appears. The title sharpens from a slight blur (`<Reveal blur>`).
3. **Scroll reveal**: one shared IntersectionObserver. Each item animates once, at most 600 ms, with a stagger inside grids and rails.
4. **Buttons, three tiers**:
   - **Primary**: gold, with a shine sweep on hover and a gold glow.
   - **Secondary**: transparent with a fine border that turns gold on hover.
   - **Text**: a link with a sliding arrow and an underline that draws in (`TextLink`).
   - The WhatsApp button keeps its green, with the same shine.
   - Keyboard focus shows a clear outline everywhere.
5. **Depth**: the shadows are now warm and layered, not grey. Important elements get a soft gold glow on hover (`shadow-glow-gold`).
6. **Grain** on deep sections only.
7. **Spotlight**: a warm gold halo under the mouse on product cards and category tiles, combined with the light 3D tilt. Mouse/pen only, never on touch.

### Homepage sections, in order
1. **Marquee**: thin, large wide-spaced lettering, slower (70 s per loop), pauses on hover.
2. **Categories (`#collection`)**:
   - Desktop: an asymmetric grid, one large card plus four small ones.
   - Phones: a horizontal **snap slider** with a peek of the next card.
   - Each card: a photo that cross-fades between the category's top 3 products, a dark gradient from the bottom, a large name, the **real product count** from the database, and a moving arrow.
   - On hover the photo grows slowly to 1.06 and a **thin gold frame draws in from the four corners**.
3. **The HATTAH selection (new)**: the products the admin marked **featured** (best sellers first), in a 4-column grid (2 on phones).
4. **Most ordered**: a carousel from the sales data.
5. **Our story (new)**, on a deep band:
   - The text says only what you gave me: "حطّة" is what Palestinians call the keffiyeh, and the store carries heritage and home food from Gaza. No dates, no numbers.
   - A large line, «نحمل فلسطين في التفاصيل», **lights up word by word as you scroll**.
   - On the other side: the logo with a gold halo, a slowly turning dotted ring, and a **small round seal** (a kufiya net inside, «HATTAH · حَطّة» around the rim, one small green arc and one small red arc). The seal turns slowly and the whole block has a light parallax.
6. **From Gaza to your home** (pattern band) and **Gifts that carry Palestine** (cream band).
7. **Why HATTAH (new)**:
   - Four **glass** cards, each with an icon I drew for this section at the same stroke width (1.25): authentic heritage, craftsmanship in the details, carefully chosen products, easy ordering on WhatsApp.
   - No delivery, numbers or promises.
8. **Just arrived**.
9. **Final call to action**: a wide dark banner with a slowly drifting warm glow, the kufiya net, one strong line («خلّي فلسطين قريبة منك») and a large WhatsApp button with a shine.
10. **Footer**:
    - Deep band, four columns: brand + description + social, categories, useful links, contact.
    - A giant **HATTAH** watermark at the bottom, about 5% opacity.
    - Social links are only the real ones in `lib/site.ts` (Instagram, Facebook).

The old trust strip, the old About section and the old WhatsApp panel were removed. Their content is now covered by "Why HATTAH", "Our story" and the final banner.

### Product card
- Fixed 4:5 ratio on a warm background, and the second photo on hover where one exists.
- A clear price.
- Badges **only from real data**:
  - "Featured" means the admin flag is on.
  - "New" means the product was added in the last 21 days (`NEW_DAYS` in `lib/storefront.ts`).
  - The sale badge appears only when the product actually has a sale price.
- **Price on request**: an elegant italic line plus an **"Ask for the price"** link that opens WhatsApp. There's no price and no cart button.
- **Quick actions**: on desktop they appear on hover or keyboard focus; on phones they're always visible, since there's no hover. The cart appears only for priced products with no option to choose; otherwise only WhatsApp.
- Skeletons now have a **warm moving shimmer**.

### Other pages
- **Shop and category**:
  - A real header banner (`PageHeader`): warm band, kufiya net, gold glow, breadcrumbs, eyebrow (the parent category's name on subcategories), a very large title, a gold rule and the description.
  - The filters and grid stay the same; the filter bar follows the header when it hides or shows.
- **Product page**:
  - Desktop: hover over the photo to **magnify toward the cursor**; click to open full screen. Phones keep swipe.
  - The option buttons are now refined squares with a gold ring on the selected one. The price still changes with the option.
  - **A sticky order bar on phones**: once the main buttons scroll out of view, a bar appears at the bottom with the price and the WhatsApp button. If an option hasn't been chosen, it scrolls back to the options and shows the error. Price-on-request products show "Ask for the price".
  - **The JSON-LD and the order and price logic are unchanged.**
- **Cart**: styling only. Warm palette, gold accents, larger buttons (44 px), the total in large Playfair. **No logic changed.** There's no separate checkout page: checkout is the cart's WhatsApp button, as before.
- **404, error and loading**: a design with the logo inside a slowly turning dotted ring over a faint kufiya net with a gold glow (`BrandStatus`, `LoadingScreen`), plus a product-page skeleton (`product/[id]/loading.tsx`).

### Transitions
- A short fade between pages (only after the first page, so the LCP isn't delayed).
- A **thin gold progress bar** at the top while a page loads (`NavProgress`). It starts on a click on an internal link and finishes when the new page renders.
- **Header**:
  - It shrinks (64→56 px) and turns to glass with a blur when you scroll.
  - It **hides while you scroll down and comes back as soon as you scroll up**.
  - The shop's sticky filters and the product buy box follow its position (`--header-offset`).
- **Back-to-top button**: appears after a screen and a half, with a gold edge, and sits above the product page's order bar.

### Performance (measures taken this round)
- next/font was **preloading all 6 fonts on every page** (Arabic and Latin together). Now only the Arabic faces are preloaded; Playfair and Inter load on demand with matched fallback metrics, so there's no layout shift.
- Sections below the fold use `content-visibility: auto`.
- No libraries: CSS, IntersectionObserver, SVG and one small canvas only.



---

## Round 3: new brand hero

**Decision applied**: the hero contains no product at all. No photo, no slider, no card. It's the logo, the kufiya, warm light, motion and words; products start in the first section below it. The "pick the priciest products" logic, the product carousel (`HeroCarousel`) and the old hero banners were deleted (`pickHeroProducts`, `topPrice`, `HERO_SLIDES`). The hero's content is fixed and comes from the translations (`messages/*.json` → `hero`).

### Layers (back to front)
1. A deep warm gradient (earth black `#0f0a07`→`#2b1d12`) with a large amber-gold glow behind the logo that **pulses every 6 seconds**.
2. A **kufiya net** (SVG). Each line is drawn with `stroke-dashoffset`, starting from the centre and moving outward, delayed by its distance from the logo. It then stays and breathes very lightly. A radial mask keeps it visible near the logo and fades it toward the edges.
3. Thin **light rays** (`repeating-conic-gradient` at low opacity) rotating once every **120 seconds**.
4. **Gold dust and embers** on a light canvas:
   - **70 particles on desktop, 30 on phones**, of different sizes and speeds with a soft glow. The glow sprite is drawn once, so there's no `shadowBlur` per frame.
   - The canvas starts only after the page has loaded and gone idle.
   - It stops when the hero leaves the screen (IntersectionObserver), when the tab is hidden, or when paused.
5. **Film grain** (SVG noise): 4% in dark, 2.5% in light.
6. A **vignette** on the edges.

### The logo
- The official round logo, unchanged. I used `hattah-logo-400.webp`, a plain 400 px resize of `hattah-logo.jpg` so it stays sharp at 164 px on retina screens. Nothing was redrawn or recoloured.
- 164 px on desktop and 110 px on phones, with a soft gold halo.
- Around it, a fine ornament ring (tiny diamonds + a dotted circle) rotating once every **120 seconds**. It carries the only flag-colour touches: a small green arc and a small red arc. There's no literal flag.
- **HATTAH** below it, in large, widely spaced letters, revealed letter by letter, then a single gold shine passes over the word.

### Entry sequence (≈3.2 s)
| Time | What happens |
|---|---|
| 0.0 s | The gold glow fades in |
| 0.3 s | The kufiya net draws itself from the centre outward |
| 0.9 s | The logo appears with a soft zoom (0.92→1), together with the badge |
| 1.4 s | HATTAH, letter by letter |
| 1.9 s | The headline, word by word (blur → sharp, with a short rise) |
| 2.6 s | The rotating line, then the two buttons |
| 3.0 s | The scroll indicator |

The intro plays **once per session** (`sessionStorage` inside try/catch). Coming back to the homepage in the same session shows the final state immediately, both on a full reload (an inline script runs before paint) and on in-app navigation.

### Interaction
- **Parallax**: the glow, net, rays and particles move at different rates with the mouse on desktop (at most 14 px). On phones they follow the gyroscope where it works without a permission prompt (Android); iOS asks for permission, so there it follows scrolling instead.
- **Scrolling down**: the hero content grows 1→1.06 and fades to 0.
- **Primary button**: a light shine passes every 5 seconds, plus a slight scale on hover. **Scroll indicator**: a thin line with a falling dot.
- **Rotating lines**: 4 lines cross-fade every 5 seconds, with small dots (24 px touch targets). The headline above them stays fixed.
- **Pause/play button**: small, in the hero's bottom corner. It freezes every animation in the hero and stops the particles.

### Copy (3 languages)
- **Badge**: «تراث فلسطيني من غزة» / PALESTINIAN HERITAGE FROM GAZA / GAZZE'DEN FİLİSTİN MİRASI.
- **Headline**: «غزة تحكى بالتفاصيل» / "Gaza, told in details." / "Gazze, ayrıntılarda yaşar." The Arabic headline is rendered **without tashkeel**: the damma in «تُحكى» is stripped in code, because you asked for no diacritics in the headline.
- **The four lines**, exactly as you wrote them.
- **Primary button** «اكتشف المجموعة»: scrolls to the categories section (`#collection`), the first product section.
- **Secondary button** «اطلب عبر واتساب»: transparent with a border, opens WhatsApp with the existing number and greeting.
- No numbers, ratings, delivery or cities, no emoji, and no solid green strip.

### Fonts and colours
- **Fonts**: the Arabic headline is Amiri bold at `clamp(2.6rem, 7vw, 6rem)`. English and Turkish use Playfair Display. Sub-lines use the site's body font. The HATTAH lettering is Playfair on every language; on Arabic pages it isn't preloaded, only the few Latin letters are fetched.
- **Contrast (AA or better)**:
  - Ivory text `#f6eedf` on dark: more than 14:1.
  - Gold badge `#e8b965` on dark: about 10:1.
  - In the light theme: text `#24180e` on old paper `#f6eedd` more than 14:1; gold `#835410` about 5.6:1.
- **Light theme**: not plain white. It's old-paper cream with a soft gold glow, an olive-earth net, gold particles at lower opacity, and finer grain.

### After the hero
- A thin **marquee strip**: HATTAH · حَطّة · غزة · تراث · هوية (in EN/TR: HATTAH · حَطّة · Gaza/Gazze · Heritage/Miras · Identity/Kimlik).
  - It moves in the right direction for each language: left in LTR, right in RTL.
  - It pauses on hover and stays still under reduced motion.
- Then the categories (`#collection`), best sellers, the story sections, and newest arrivals. The trust strip moved down, before "About HATTAH", so products come straight after the hero.
- The announcement bar is no longer solid green: it's now a quiet strip in the page colour with a hairline border.

### Performance and accessibility
- No libraries: CSS, SVG and a simple canvas (no Three.js, no GSAP).
- Everything visible in the hero is server-rendered HTML/SVG/CSS. The headline is the LCP element and paints with the HTML: its reveal animation starts at near-invisible opacity (0.01) rather than 0, so the browser counts it as painted immediately.
- The canvas starts after load. Every animation stops when the hero is off screen or paused. Sections below the fold use `content-visibility: auto`.
- `prefers-reduced-motion`: the final state is shown, settled. No particles, rotation, rays, pulse, entry animation or automatic line switching (the first line stays; the dots still let you browse).



---

## Round 2: your earlier feedback (still applies, except the hero, replaced in round 3)

### 1) No fixed product or image anywhere
- The `HERO` setting (fixed product id + photo number) is gone, and so is `HOME_SECTIONS` (fixed category keys). Nothing in the storefront names a product, slug or image path anymore. Everything is computed from the database on every request (`src/lib/storefront.ts`).
- **Category tiles**: each tile's photo comes from that category's own products: the main photo of its top 3 (featured first, then best sellers from /admin/sales, then newest). The photos cross-fade every ~5 seconds, offset from tile to tile so they don't all change at once. The rotation only runs while the tile is on screen, and the 2nd and 3rd photos are requested only when their turn comes.
- **Homepage sections** pick their categories by the **icon the admin set on the category** (/admin/categories) instead of a fixed key:
  - «من غزة إلى بيتك» uses the plate or coffee icon.
  - «هدايا تحمل فلسطين» uses the lamp, home, gift, flower or star icon.
  - Renaming or recreating a category keeps the section working; if no category matches, the section is hidden.
- «الأكثر طلباً» comes from /admin/sales and «وصل حديثاً» from each product's created date. Both update by themselves.

### 2) ~~Hero rotates between the premium pieces~~ (replaced by the brand hero in round 3)
- **Selection** (automatic, live):
  - The product has a price; price-on-request products are excluded.
  - It has a main photo.
  - Its price is at least **half the store's most expensive product**. For products with options, the price used is the **most expensive option**.
  - Products with 2+ photos come first.
  - Sorted by price, highest first; **featured products win when prices are equal**, then the one with more photos.
  - **At most 2 per subcategory**, so you don't get five thobes in a row.
  - 5 slides. With today's data: two red-embroidered thobes, the wooden Palestine map, the keffiyeh coffee cup set, and the gold Palestine map with olive branch figurine.
  - With fewer than 3 eligible products, the priciest products with photos fill the gap.
- **Display**:
  - A soft cross-fade with a slow Ken Burns zoom.
  - The chip «من المتجر › اسم المنتج» changes with each slide and links to it.
  - Dots that double as progress bars, previous/next buttons, a pause button (desktop), and swipe on phones.
  - It pauses on mouse hover, on keyboard focus, and when the tab is in the background.
  - Only the visible photo and the next one are loaded.

### 3) Headline (replaced in round 3 by «غزة تحكى بالتفاصيل»; the no-tashkeel rule still applies)
- **New headline**: «حكاية فلسطين في كل قطعة» (EN "Palestine's story in every piece", TR "Her parçada Filistin'in hikâyesi"). The old one, «…إلى بيتك», hinted at delivery.
- Diacritics (tashkeel) are stripped from the headline in code as well, so it stays clean even if the text is edited later.
- The line-height was raised to 1.3 (1.25 on desktop) with a small top padding, so no glyph reaches the badge above it.
- Checked in screenshots in 3 languages × 2 themes × phone (390), tablet (768) and desktop (1440).

### 4) No delivery mentions or unconfirmed information
- **Announcement bar**: three general phrases that cross-fade:
  - «منتجات فلسطينية أصيلة»
  - «تراث فلسطين في كل تفصيلة»
  - «اكتشف أحدث القطع في المتجر»
  - Same in English and Turkish.
- **Trust strip**: «تراث غزّاوي أصيل» and «قطع مختارة بعناية (من الأكل إلى الديكور والملابس)» replace the two delivery items. «طلب سريع عبر واتساب» and «منتجات فلسطينية أصيلة» stay.
- Removed:
  - The city (Istanbul) from the hero badge, the About section and the footer.
  - "To all of Turkey" from the footer.
  - The phone number under the final CTA (it stays in the footer as a contact detail).
  - The product counts on the category tiles.
- The footer line «صُنع بحب من تركيا» became «صُنع بحب».
- The footer link «التوصيل» became **«كيف تطلب»**, so the word delivery doesn't appear on the homepage. Checked in code: the homepage text contains none of «توصيل / نوصّل / باشاكشهير / إسطنبول».
- **Delivery page (/shipping, now titled "كيف تطلب")**: two short paragraphs. How to order, and that the address, delivery method and its cost are confirmed with you on WhatsApp before the order is placed. No cities, durations or fees.
- **Returns page (/returns)**: one line. If anything about your order isn't right, contact us on WhatsApp or by email and we'll agree on a solution. No specific conditions. I kept both pages because they could be written without any claims.
- **Product page**: the "Delivery & ordering" block became "Ordering". It covers ordering on WhatsApp with a ready message, and that delivery and payment details are agreed on WhatsApp. The free-delivery area was removed.
- **Not changed** (older content, outside the design scope): the FAQ, the About page, the SEO meta descriptions and llms.txt still mention free delivery in باشاكشهير and Turkey. These came before the redesign. If you want them generalized too, tell me and I'll update them in one pass.

### 5) Motion
- **Hero**:
  - Staggered entry: badge → headline word by word → the kufiya divider draws itself → description → button.
  - The photo has a light parallax on scroll, plus a mouse parallax on desktop.
  - The kufiya texture behind it drifts very slowly.
- **Tiles and product cards**:
  - A light 3D tilt (4°) with a soft sheen that follows the mouse (mouse/pen only).
  - A staggered fade-in on scroll in rails, tiles and the shop grid. The first row of the shop isn't delayed, because it holds the LCP image.
- **Buttons**: the arrow nudges on hover, the existing soft glow stays, and the button scales down slightly when pressed.
- **Section headings**: the kufiya divider draws from the centre out when the section appears, and the heading fades up.
- **Announcement bar** cross-fades between phrases; **trust strip** items appear one after another.
- **Pages**: a soft fade between storefront pages (not on the first page load, so the LCP isn't delayed). Card photos fade in over a skeleton, in pre-sized boxes, so nothing jumps.
- Everything is CSS/transform/opacity with no new library, all of it stops under `prefers-reduced-motion`, and there are no counters.

### 6) The dark element on the right edge
- It's `<vercel-live-feedback>`, the **Vercel Toolbar**. Vercel adds it automatically on preview links, only for signed-in members of the Vercel team. **Customers never see it, and it doesn't exist on the live site.** You can drag it or hide it from its own menu.
- I didn't hide it in code or turn it off in the Vercel settings, because it's your tool and changing project settings is your call.
- While checking, I found the closed phone menu sitting just outside the screen edge, with its shadow able to leak in. It's now fully hidden when closed.

---

## Round 1 (summary of what's still in place)

- **Design system**:
  - Color, type, spacing, radius, shadow and motion tokens for both themes in `globals.css`.
  - Text contrast is AA or better everywhere.
  - The dark theme uses warm espresso with ivory text.
  - Headings use Playfair Display / Amiri (Amiri is a self-hosted 40 KB subset).
  - The theme toggle is visible on every screen size and follows the device setting on the first visit.
  - The kufiya divider is my own design.
- **Header**: sticky with a blur effect, a slide-in phone menu and a categories dropdown. **Footer**: full, with columns.
- **Shop and category pages**:
  - A sticky filter bar (categories, subcategories, search, sort), with price-on-request products always last in the price sorts.
  - Loading skeletons and an empty state.
- **Product card**:
  - The second photo appears on hover.
  - A "Price on request" badge, "From X" for priced options, and a quick WhatsApp button.
  - A cart button only for priced products with no options.
- **Product page**:
  - A swipe gallery with zoom and a sticky buy box. The price changes with the option, and the WhatsApp message contains the option, price and link.
  - Similar products.
  - The JSON-LD is unchanged.
- **Best sellers**: computed from `sale_items`. Lines with a product_id count directly; free-text lines are matched against product names. Only the order reaches the page, never a figure (`src/lib/supabase/bestsellers.ts`).

---

## Verification (round 2)

- `npm run build`, `npm run lint`, `npm run typecheck`: pass.
- **SEO check** (`scripts/seo-health.mjs`) on a local production build, all product pages included: **ok = true, 0 problems**. I used a copy of the script that doesn't write to the `seo_health` table.
- **Screenshots**:
  - Homepage: 18 (3 languages × 2 themes × phone/tablet/desktop).
  - Round 1: 72 more (home, a category with price-on-request products, a category with sizes, and three product types).
- **Tested in the browser**:
  - The hero switches slides and its chip changes ("next" moves from the white thobe to the black one).
  - The headline renders without tashkeel.
  - The announcement bar shows its 3 new phrases.
  - The homepage text contains no delivery or city mention.

Performance results for this round are in the final table at the top.

---

## Decisions and assumptions

1. **The Arabic headline**: you wrote «غزة تُحكى بالتفاصيل» with a damma, and also asked for no tashkeel in the headline. I followed the second instruction, so it shows «غزة تحكى بالتفاصيل». The text in `messages/ar.json` keeps the damma; only the display strips it.
2. **"Scrolls to the products section"**: the categories section is now the first section after the marquee (`#collection`). The primary button and the scroll indicator both go there.
3. **The trust strip moved** below the product sections, so products come right after the hero.
4. **The headline counts as painted from the start** so the LCP isn't delayed: its reveal starts at opacity 0.01 instead of 0, with a blur that clears.
5. **The marquee in English and Turkish**: I translated the words (Gaza/Heritage/Identity), keeping HATTAH and حَطّة as they are.
6. **Gyroscope**: only where the browser allows it without a permission prompt (Android). On iOS, the parallax follows scrolling, because a permission prompt would be intrusive.
7. **Homepage sections** pick their categories by the icon set on each category in /admin/categories (plate/coffee → «من غزة إلى بيتك»; lamp/home/gift/flower/star → «هدايا تحمل فلسطين»). This removes the fixed category keys without any database change.
8. **"Active product"**: there's no active/hidden column in the database, so every product is treated as active.
9. **Free-delivery area**: the new design shows no area. Older pages (FAQ, About, SEO descriptions) still mention باشاكشهير. I didn't change them because they came before the redesign; I can generalize them in one pass if you want.

## Not done, and why

- **Lighthouse on the Vercel preview**: it needs a Vercel login. Measuring it would need a Protection Bypass token, i.e. a project settings change. The measurement compares two local production builds (`main` vs `redesign-v2`) on the same machine.
- **The admin panel**: I didn't log in, because the admin password is the real production password. Admin changes are limited to class names (white text on filled buttons → `text-on-accent`). A quick look at /admin/social, /admin/sales and /admin/inventory before merging is recommended.
- **Turkish body text**: Inter uses the Latin subset only, as before the redesign, to save ~85 KB of fonts. The letters ğ ş ı in body text use the system font. Headings include Turkish letters.
