#!/usr/bin/env node
/**
 * Seeds a Supabase project with clearly-fake demo data: categories, products
 * (with sizes / colors / quantity options / a sale price), generated
 * placeholder artwork in Storage, and a small inventory ledger.
 *
 *   npm run seed                 # reads .env.local
 *   npm run seed -- --reset      # wipes products + inventory first
 *
 * It is a development tool. It refuses to run against anything that is not a
 * local Supabase unless ALLOW_REMOTE_SEED=1 is set, because --reset deletes
 * every product — never point it at a store with real data.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const host = new URL(url).hostname;
const isLocal = ["localhost", "127.0.0.1", "::1", "host.docker.internal"].includes(host);
if (!isLocal && process.env.ALLOW_REMOTE_SEED !== "1") {
  console.error(
    `Refusing to seed ${host}: it is not a local Supabase.\n` +
      "Set ALLOW_REMOTE_SEED=1 only for a throwaway project that holds no real data."
  );
  process.exit(1);
}

const reset = process.argv.includes("--reset");
const db = createClient(url, key, { auth: { persistSession: false } });
const BUCKET = "product-images";

const must = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

// ── Placeholder artwork ─────────────────────────────────────────
// A cross-stitch (tatreez-style) motif in the brand palette, so demo
// screenshots look intentional without shipping anyone's product photos.
const PALETTES = [
  ["#F4EBDA", "#5C6B45", "#C17A45"],
  ["#EFE2C8", "#8A3B2A", "#2F3B2A"],
  ["#E8E2D0", "#3F5A47", "#C9893F"],
  ["#F1E4D3", "#A4472F", "#5C6B45"],
];

function artwork(seed, label) {
  const [bg, a, b] = PALETTES[seed % PALETTES.length];
  const cell = 14;
  const cols = 9;
  let marks = "";
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = Math.abs(x - 4);
      const dy = Math.abs(y - 4);
      const on = (dx + dy <= 4 && (dx + dy) % 2 === 0) || (dx === 4 && dy === 4);
      if (!on) continue;
      const px = 150 + (x - 4) * cell * 2.2 - cell / 2;
      const py = 130 + (y - 4) * cell * 2.2 - cell / 2;
      const c = (x + y) % 3 === 0 ? b : a;
      marks +=
        `<path d="M${px} ${py}l${cell} ${cell}M${px + cell} ${py}l${-cell} ${cell}" ` +
        `stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="900" height="900">` +
    `<rect width="300" height="300" fill="${bg}"/>` +
    `<rect x="12" y="12" width="276" height="276" rx="10" fill="none" stroke="${a}" stroke-opacity=".35" stroke-width="2"/>` +
    marks +
    `<text x="150" y="268" text-anchor="middle" font-family="Georgia,serif" font-size="15" letter-spacing="3" fill="${a}">${label}</text>` +
    `</svg>`
  );
}

async function uploadArt(productId, index, label) {
  const path = `demo/${productId}-${index}.svg`;
  await must(
    db.storage
      .from(BUCKET)
      .upload(path, artwork(index + productId.charCodeAt(0), label), {
        contentType: "image/svg+xml",
        upsert: true,
      }),
    "upload"
  );
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// ── Demo catalogue (fake products, fake prices) ─────────────────
const T = (ar, en, tr) => ({ ar, en, tr });
const PRODUCTS = [
  {
    name: T("ثوب مطرز يدويًا (عيّنة)", "Hand-Embroidered Dress (demo)", "El Işlemeli Elbise (demo)"),
    desc: T(
      "قطعة تجريبية لعرض المتجر.",
      "A demo item that shows what a listing looks like.",
      "Mağazanın nasıl göründüğünü gösteren örnek ürün."
    ),
    price: 1450, category: "dresses-abayas", featured: true, sizes: ["S", "M", "L", "XL"],
  },
  {
    name: T("تيشيرت فلسطين (عيّنة)", "Palestine T-Shirt (demo)", "Filistin Tişört (demo)"),
    desc: T("قطن ناعم بتصميم تجريبي.", "Soft cotton with a demo graphic.", "Demo baskılı yumuşak pamuk."),
    price: 650, sale: 520, category: "palestine-tshirts", featured: true, sizes: ["S", "M", "L", "XL", "2XL"],
    colors: [T("أسود", "Black", "Siyah"), T("أبيض", "White", "Beyaz")],
  },
  {
    name: T("كوفية كلاسيكية (عيّنة)", "Classic Keffiyeh (demo)", "Klasik Kefiye (demo)"),
    desc: T("نسيج تقليدي.", "Traditional weave.", "Geleneksel dokuma."),
    price: 480, category: "keffiyehs-knitted-shawls", featured: true,
    colors: [T("أسود", "Black", "Siyah"), T("أحمر", "Red", "Kırmızı"), T("زيتي", "Olive", "Zeytin")],
  },
  {
    name: T("شال أكتاف مطرز (عيّنة)", "Embroidered Shoulder Shawl (demo)", "Nakışlı Omuz Şalı (demo)"),
    desc: T("شال خفيف للمواسم الانتقالية.", "A light shawl for in-between seasons.", "Ara mevsimler için hafif şal."),
    price: 890, category: "shoulder-shawls", featured: true,
  },
  {
    name: T("سلسلة بخط عربي (عيّنة)", "Arabic Calligraphy Necklace (demo)", "Arapça Hat Kolye (demo)"),
    desc: T("سلسلة بسيطة.", "A simple pendant.", "Sade bir kolye."),
    price: 320, sale: 250, category: "necklaces-bracelets", featured: true,
  },
  {
    name: T("حقيبة قماشية مطرزة (عيّنة)", "Embroidered Tote Bag (demo)", "Nakışlı Bez Çanta (demo)"),
    desc: T("حقيبة يومية.", "An everyday tote.", "Günlük bez çanta."),
    price: 380, category: "bookmarks-bags-wallets",
  },
  {
    name: T("زعتر بلدي (عيّنة)", "Za'atar Blend (demo)", "Zahter Karışımı (demo)"),
    desc: T("خلطة تجريبية بأحجام متعددة.", "A demo blend sold by weight.", "Gramajla satılan demo karışım."),
    price: 0, category: "palestinian-food", featured: true,
    quantities: [
      { label: T("٢٥٠ غ", "250 g", "250 g"), price: 120 },
      { label: T("٥٠٠ غ", "500 g", "500 g"), price: 220 },
      { label: T("١ كغ", "1 kg", "1 kg"), price: 400 },
    ],
  },
  {
    name: T("زيت زيتون بكر (عيّنة)", "Extra-Virgin Olive Oil (demo)", "Naturel Sızma Zeytinyağı (demo)"),
    desc: T("زيت تجريبي.", "A demo oil.", "Demo zeytinyağı."),
    price: 0, category: "palestinian-food",
    quantities: [
      { label: T("٥٠٠ مل", "500 ml", "500 ml"), price: 350 },
      { label: T("١ لتر", "1 L", "1 L"), price: 640 },
    ],
  },
  {
    name: T("طقم قهوة عربية (عيّنة)", "Arabic Coffee Set (demo)", "Arap Kahvesi Seti (demo)"),
    desc: T("دلة وفناجين.", "Dallah and cups.", "Cezve ve fincanlar."),
    price: 1250, category: "coffee-tea",
  },
  {
    name: T("لوحة جدارية تراثية (عيّنة)", "Heritage Wall Art (demo)", "Miras Duvar Panosu (demo)"),
    desc: T("لوحة مطرزة للجدار.", "Embroidered wall piece.", "Duvar için nakış pano."),
    price: 1100, sale: 880, category: "wall-decorations",
  },
  {
    name: T("علم فلسطين (عيّنة)", "Palestine Flag (demo)", "Filistin Bayrağı (demo)"),
    desc: T("علم قماشي.", "A cloth flag.", "Kumaş bayrak."),
    price: 150, category: "flags", sizes: ["60×90", "90×150"],
  },
  {
    name: T("لعبة ذكاء تراثية (عيّنة)", "Heritage Brain Game (demo)", "Miras Zeka Oyunu (demo)"),
    desc: T("لعبة للعائلة.", "A family game.", "Aile oyunu."),
    price: 420, category: "brain-games",
  },
];

const BATCHES = [
  {
    title: "Demo supplier invoice — spring", batch_date: "2026-03-12", amount_paid: 6000, notes: "Fake data for screenshots",
    lines: [
      { item_description: "Embroidered dresses (assorted)", quantity: 10, unit_cost: 700, status: "partially_sold", quantity_sold: 6, unit_sale_price: 1450, last_sale_date: "2026-04-02" },
      { item_description: "Cotton T-shirts", quantity: 40, unit_cost: 190, status: "partially_sold", quantity_sold: 22, unit_sale_price: 520, last_sale_date: "2026-04-18" },
      { item_description: "Keffiyehs", quantity: 25, unit_cost: 160, status: "sold_out", quantity_sold: 25, unit_sale_price: 480, last_sale_date: "2026-05-06" },
    ],
  },
  {
    title: "Demo food shipment", batch_date: "2026-05-20", amount_paid: 2000, notes: null,
    lines: [
      { item_description: "Za'atar 250 g jars", quantity: 60, unit_cost: 55, status: "in_stock", quantity_sold: 0, unit_sale_price: null, last_sale_date: null },
      { item_description: "Olive oil 1 L", quantity: 24, unit_cost: 400, original_currency: "EGP", original_unit_cost: 950, status: "partially_sold", quantity_sold: 5, unit_sale_price: 640, last_sale_date: "2026-06-01" },
    ],
  },
];

async function main() {
  console.log(`Seeding ${host}${reset ? " (with --reset)" : ""}…`);

  if (reset) {
    await must(db.from("inventory_batches").delete().not("id", "is", null), "reset batches");
    await must(db.from("products").delete().not("id", "is", null), "reset products");
  } else {
    const { count } = await db.from("products").select("id", { count: "exact", head: true });
    if (count) {
      console.error(`The database already has ${count} products. Re-run with --reset to wipe and reseed.`);
      process.exit(1);
    }
  }

  // Categories created from the dashboard rather than schema.sql.
  await must(
    db.from("categories").upsert(
      [
        {
          key: "palestinian-food", label_ar: "مأكولات فلسطينية", label_en: "Palestinian Food",
          label_tr: "Filistin Yemekleri", sort_order: 22, parent_key: null,
          description_ar: "نكهات فلسطين الأصيلة بين يديك",
          description_en: "Authentic Palestinian flavors, delivered",
          description_tr: "Otantik Filistin lezzetleri elinizin altında",
          icon_key: "utensils",
        },
      ],
      { onConflict: "key", ignoreDuplicates: true }
    ),
    "categories"
  );

  let order = 0;
  for (const p of PRODUCTS) {
    const hasQ = !!p.quantities;
    const row = await must(
      db
        .from("products")
        .insert({
          name_ar: p.name.ar, name_en: p.name.en, name_tr: p.name.tr,
          description_ar: p.desc.ar, description_en: p.desc.en, description_tr: p.desc.tr,
          price: p.price, sale_price: p.sale ?? null, category: p.category,
          is_featured: !!p.featured, has_sizes: !!p.sizes, has_colors: !!p.colors, has_quantities: hasQ,
          // Stagger so "newest first" ordering is stable.
          created_at: new Date(Date.now() - order++ * 3600_000).toISOString(),
        })
        .select("id")
        .single(),
      `product ${p.name.en}`
    );

    const images = [];
    for (let i = 0; i < 2; i++) {
      images.push({ product_id: row.id, sort_order: i, image_url: await uploadArt(row.id, i, "HATTAH · DEMO") });
    }
    await must(db.from("product_images").insert(images), "images");
    if (p.sizes) await must(db.from("product_sizes").insert(p.sizes.map((label, i) => ({ product_id: row.id, label, sort_order: i }))), "sizes");
    if (p.colors) await must(db.from("product_colors").insert(p.colors.map((c, i) => ({ product_id: row.id, label_ar: c.ar, label_en: c.en, label_tr: c.tr, sort_order: i }))), "colors");
    if (hasQ) await must(db.from("product_quantities").insert(p.quantities.map((q, i) => ({ product_id: row.id, label_ar: q.label.ar, label_en: q.label.en, label_tr: q.label.tr, price: q.price, sort_order: i }))), "quantities");
  }

  for (const { lines, ...batch } of BATCHES) {
    const b = await must(db.from("inventory_batches").insert(batch).select("id").single(), "batch");
    await must(db.from("inventory_log").insert(lines.map((l) => ({ ...l, batch_id: b.id, entry_date: batch.batch_date }))), "inventory lines");
  }

  console.log(`Done: ${PRODUCTS.length} demo products, ${BATCHES.length} inventory batches.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
