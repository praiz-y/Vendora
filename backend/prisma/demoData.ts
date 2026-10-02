import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma, PrismaClient, SellerOrderStatus, OrderStatus } from "@prisma/client";

// Bulk demo content for the live site: ~120 real-looking products (catalog,
// photos, and descriptions from DummyJSON — https://dummyjson.com, a free
// fake-data API — snapshotted into demo-catalog.json so seeding never needs
// the network), extra stores, a few dozen buyers, and reviews. Every review
// is backed by a delivered order, since Review.orderItemId is required.
//
// A seeded PRNG keeps every run identical, and rows are inserted with
// createMany + pre-generated ids so the whole thing is a handful of round
// trips even against a remote database.

interface CatalogEntry {
  store: string;
  category: string;
  name: string;
  brand: string | null;
  description: string;
  priceUsd: number;
  stock: number;
  images: string[];
}

interface DemoContext {
  passwordHash: string;
  admin: { id: string };
  // The existing seller1 store — the public demo seller account gets the
  // electronics catalog so its dashboard has real data to show.
  ariaStore: { id: string; name: string };
  categories: Record<string, string>; // slug -> id
}

const NGN_PER_USD = 1500;
const DAY = 24 * 60 * 60 * 1000;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261002);
const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Naira prices that look like real listings: rounded to ₦500 (₦100 under ₦5k).
function toNaira(usd: number): number {
  const raw = usd * NGN_PER_USD;
  const step = raw < 5000 ? 100 : 500;
  return Math.max(step, Math.round(raw / step) * step);
}

const STORES = {
  threads: {
    name: "Lagos Threads",
    description: "Everyday clothing for men and women — shirts, tops, and dresses cut for Lagos weather.",
    businessCategory: "Fashion",
    location: "Yaba, Lagos",
    seller: ["Kemi", "Adebayo", "kemi_threads"],
    featured: true,
  },
  sole: {
    name: "Sole & Strap",
    description: "Shoes, bags, and sunglasses. Curated pieces that finish an outfit.",
    businessCategory: "Fashion",
    location: "Ikeja, Lagos",
    seller: ["Chidi", "Nwosu", "chidi_sole"],
    featured: false,
  },
  timeless: {
    name: "Timeless Accents",
    description: "Watches and jewellery for gifting or keeping. Every piece checked before it ships.",
    businessCategory: "Watches & Jewellery",
    location: "Victoria Island, Lagos",
    seller: ["Halima", "Bello", "halima_timeless"],
    featured: true,
  },
  ile: {
    name: "Ile Home Store",
    description: "Furniture, décor, and kitchen essentials to make a house feel like home.",
    businessCategory: "Home & Living",
    location: "Ibadan, Oyo",
    seller: ["Segun", "Afolabi", "segun_ile"],
    featured: true,
  },
  glow: {
    name: "Glow by Zainab",
    description: "Skincare, beauty, and fragrances — authentic products only, sourced from authorised distributors.",
    businessCategory: "Beauty & Personal Care",
    location: "Kano, Kano",
    seller: ["Zainab", "Musa", "zainab_glow"],
    featured: false,
  },
  fitzone: {
    name: "FitZone Sports",
    description: "Gear for football, basketball, tennis, and the gym.",
    businessCategory: "Sports & Outdoors",
    location: "Port Harcourt, Rivers",
    seller: ["Emeka", "Obi", "emeka_fitzone"],
    featured: false,
  },
} as const;

const BUYERS: [string, string][] = [
  ["Chioma", "Eze"], ["Ibrahim", "Lawal"], ["Funmi", "Ogunleye"], ["Obinna", "Okafor"],
  ["Aisha", "Mohammed"], ["Tobi", "Adewale"], ["Ngozi", "Nnamdi"], ["Yusuf", "Abubakar"],
  ["Bisi", "Coker"], ["Uche", "Onyekachi"], ["Fatima", "Sani"], ["Dayo", "Fashola"],
  ["Ifeoma", "Okeke"], ["Kunle", "Balogun"], ["Hauwa", "Garba"], ["Seun", "Oladipo"],
  ["Adaeze", "Umeh"], ["Musa", "Danjuma"], ["Yemi", "Alade"], ["Nneka", "Obi"],
  ["Gbenga", "Ojo"], ["Amina", "Yakubu"], ["Tolu", "Akinola"], ["Ebuka", "Igwe"],
];

const CITIES: [string, string][] = [
  ["Lagos", "Lagos"], ["Ikeja", "Lagos"], ["Lekki", "Lagos"], ["Abuja", "FCT"], ["Ibadan", "Oyo"],
  ["Port Harcourt", "Rivers"], ["Enugu", "Enugu"], ["Kano", "Kano"], ["Benin City", "Edo"], ["Abeokuta", "Ogun"],
];
const STREETS = ["Allen Avenue", "Admiralty Way", "Awolowo Road", "Herbert Macaulay Way", "Ring Road", "Aminu Kano Crescent", "Ogui Road", "Aba Road", "Sapele Road", "Adeola Odeku Street"];

const REVIEWS: Record<number, string[]> = {
  5: [
    "Exactly as described and arrived two days early. Very happy with it.",
    "Excellent quality for the price. Would definitely buy from this store again.",
    "Packaging was solid and the item was in perfect condition. Highly recommend.",
    "Bought this as a gift and they loved it. Looks even better in person.",
    "Second time ordering this. Still as good as the first one.",
    "The seller answered my questions quickly and delivery to Abuja was fast.",
    "Really impressed. This is my new favourite.",
    "Top quality. Worth every naira.",
    "Five stars — works perfectly and looks premium.",
    "Original product, sealed packaging. Seller is trustworthy.",
  ],
  4: [
    "Very good overall. Delivery took a little longer than expected, but the product is great.",
    "Good quality, just slightly different shade from the photos.",
    "Does the job well. Would be five stars with better packaging.",
    "Happy with this purchase. Fair price compared to other shops.",
    "Solid product. Took a day to get used to it but no complaints now.",
    "Nice item, arrived well packed. Rider called ahead which I appreciated.",
    "Good value. I'd buy again if it goes on sale.",
  ],
  3: [
    "It's okay. Works as expected but nothing special.",
    "Decent, but the size runs a bit different from what I expected.",
    "Average quality for the price. Delivery was fine.",
    "Product is fine, packaging was a bit damaged on arrival.",
  ],
  2: [
    "Not quite what I expected from the pictures. Returned it.",
    "Quality is below what I hoped for at this price.",
  ],
  1: ["Arrived late and didn't match the description. Disappointed."],
};

function randomRating(): number {
  const r = rand();
  if (r < 0.5) return 5;
  if (r < 0.8) return 4;
  if (r < 0.92) return 3;
  if (r < 0.97) return 2;
  return 1;
}

export async function seedDemoData(prisma: PrismaClient, ctx: DemoContext): Promise<void> {
  const catalog = JSON.parse(readFileSync(path.join(__dirname, "demo-catalog.json"), "utf8")) as CatalogEntry[];
  const now = Date.now();

  // --- Sellers, applications, stores ---------------------------------------

  const users: Prisma.UserCreateManyInput[] = [];
  const applications: Prisma.SellerApplicationCreateManyInput[] = [];
  const stores: Prisma.StoreCreateManyInput[] = [];
  const storeByKey: Record<string, { id: string; name: string }> = { aria: ctx.ariaStore };

  Object.entries(STORES).forEach(([key, s], i) => {
    const userId = randomUUID();
    const storeId = randomUUID();
    const email = `${s.seller[2].replace("_", ".")}@vendora.test`;
    const phone = `+234803${String(5550000 + i * 1111).padStart(7, "0")}`;
    const joined = new Date(now - int(150, 200) * DAY);
    users.push({
      id: userId,
      firstName: s.seller[0],
      lastName: s.seller[1],
      username: s.seller[2],
      email,
      passwordHash: ctx.passwordHash,
      createdAt: joined,
    });
    applications.push({
      userId,
      storeName: s.name,
      storeDescription: s.description,
      businessCategory: s.businessCategory,
      phone,
      email,
      location: `${s.location}, Nigeria`,
      status: "APPROVED",
      reviewedById: ctx.admin.id,
      reviewedAt: new Date(joined.getTime() + 2 * DAY),
      createdAt: joined,
    });
    stores.push({
      id: storeId,
      sellerId: userId,
      name: s.name,
      slug: slugify(s.name),
      description: s.description,
      businessCategory: s.businessCategory,
      phone,
      email,
      location: `${s.location}, Nigeria`,
      isFeatured: s.featured,
      createdAt: new Date(joined.getTime() + 2 * DAY),
    });
    storeByKey[key] = { id: storeId, name: s.name };
  });

  // --- Buyers + addresses ----------------------------------------------------

  const buyerIds: string[] = [];
  const addressByBuyer = new Map<string, string>();
  const addresses: Prisma.AddressCreateManyInput[] = [];

  for (const [first, last] of BUYERS) {
    const id = randomUUID();
    buyerIds.push(id);
    users.push({
      id,
      firstName: first,
      lastName: last,
      username: `${first}_${last}`.toLowerCase(),
      email: `${first}.${last}@vendora.test`.toLowerCase(),
      passwordHash: ctx.passwordHash,
      createdAt: new Date(now - int(130, 180) * DAY),
    });
    const [city, state] = pick(CITIES);
    const addressId = randomUUID();
    addressByBuyer.set(id, addressId);
    addresses.push({
      id: addressId,
      userId: id,
      fullName: `${first} ${last}`,
      phone: `+23480${int(10000000, 99999999)}`,
      addressLine1: `${int(1, 120)} ${pick(STREETS)}`,
      city,
      state,
      isDefault: true,
    });
  }

  await prisma.user.createMany({ data: users });
  await prisma.sellerApplication.createMany({ data: applications });
  await prisma.store.createMany({ data: stores });
  await prisma.address.createMany({ data: addresses });
  await prisma.cart.createMany({ data: users.map((u) => ({ userId: u.id! })) });

  // --- Products + images ------------------------------------------------------

  const products: Prisma.ProductCreateManyInput[] = [];
  const images: Prisma.ProductImageCreateManyInput[] = [];
  const productMeta: {
    id: string;
    name: string;
    price: number;
    shippingFee: number | null;
    store: { id: string; name: string };
    listedDaysAgo: number;
  }[] = [];

  const usedSlugs = new Set<string>();
  for (const entry of catalog) {
    const id = randomUUID();
    let slug = slugify(entry.name);
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${slugify(entry.name)}-${n}`;
    usedSlugs.add(slug);
    const store = storeByKey[entry.store];
    const price = toNaira(entry.priceUsd);
    const shippingFee = price < 20000 ? null : pick([1500, 2000, 2500, 3500]);
    // Most of the catalog is established; ~15% are new arrivals with
    // correspondingly little order history.
    const listedDaysAgo = rand() < 0.15 ? int(3, 25) : int(60, 140);
    const listed = new Date(now - listedDaysAgo * DAY);
    products.push({
      id,
      storeId: store.id,
      categoryId: ctx.categories[entry.category],
      name: entry.name,
      slug,
      description: entry.brand ? `${entry.description} Brand: ${entry.brand}.` : entry.description,
      type: "PHYSICAL",
      price,
      stockQuantity: Math.max(entry.stock, 5),
      shippingType: shippingFee === null ? "FREE" : "FIXED",
      shippingFee,
      status: "APPROVED",
      submittedAt: listed,
      reviewedById: ctx.admin.id,
      reviewedAt: new Date(listed.getTime() + DAY),
      createdAt: listed,
    });
    entry.images.forEach((url, i) => {
      images.push({
        productId: id,
        url,
        publicId: `demo/${slug}/${i + 1}`,
        sortOrder: i,
        isPrimary: i === 0,
      });
    });
    productMeta.push({ id, name: entry.name, price, shippingFee, store, listedDaysAgo });
  }

  await prisma.product.createMany({ data: products });
  await prisma.productImage.createMany({ data: images });

  // --- Orders (with reviews for delivered ones) ------------------------------

  const orders: Prisma.OrderCreateManyInput[] = [];
  const sellerOrders: Prisma.SellerOrderCreateManyInput[] = [];
  const orderItems: Prisma.OrderItemCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const reviews: Prisma.ReviewCreateManyInput[] = [];

  function addOrder(product: (typeof productMeta)[number], buyerId: string, requestedDaysAgo: number, withReview: boolean) {
    // Never before the product was listed.
    const daysAgo = Math.min(requestedDaysAgo, product.listedDaysAgo - 1);
    const placedAt = new Date(now - daysAgo * DAY - int(0, 12) * 60 * 60 * 1000);
    // Recent orders are still moving through fulfilment; older ones delivered.
    const sellerStatus: SellerOrderStatus =
      daysAgo > 10 ? "DELIVERED" : daysAgo > 5 ? pick(["SHIPPED", "DELIVERED"]) : daysAgo > 2 ? pick(["PROCESSING", "SHIPPED"]) : "PENDING";
    const orderStatus: OrderStatus =
      sellerStatus === "DELIVERED" ? "COMPLETED" : sellerStatus === "SHIPPED" ? "PARTIALLY_SHIPPED" : sellerStatus === "PROCESSING" ? "PARTIALLY_PROCESSING" : "PAID";
    const quantity = rand() < 0.85 ? 1 : 2;
    const subtotal = product.price * quantity;
    const shipping = product.shippingFee ?? 0;
    const total = subtotal + shipping;

    const orderId = randomUUID();
    const sellerOrderId = randomUUID();
    const orderItemId = randomUUID();
    orders.push({ id: orderId, buyerId, status: orderStatus, totalAmount: total, shippingAddressId: addressByBuyer.get(buyerId), placedAt, createdAt: placedAt });
    sellerOrders.push({ id: sellerOrderId, orderId, storeId: product.store.id, status: sellerStatus, subtotal, shippingFee: shipping, total, createdAt: placedAt });
    orderItems.push({
      id: orderItemId,
      sellerOrderId,
      productId: product.id,
      productNameSnapshot: product.name,
      priceSnapshot: product.price,
      quantity,
      productTypeSnapshot: "PHYSICAL",
      shippingFeeSnapshot: product.shippingFee,
      storeNameSnapshot: product.store.name,
      createdAt: placedAt,
    });
    payments.push({
      orderId,
      provider: "simulated",
      providerReference: `SIM-DEMO-${orderId.slice(0, 8).toUpperCase()}`,
      amount: total,
      status: "SUCCESS",
      paidAt: placedAt,
      createdAt: placedAt,
    });

    if (withReview && sellerStatus === "DELIVERED") {
      const rating = randomRating();
      const reviewedAt = new Date(Math.min(placedAt.getTime() + int(5, 12) * DAY, now - DAY));
      reviews.push({
        userId: buyerId,
        productId: product.id,
        orderItemId,
        rating,
        // A few ratings without a written comment, like real stores.
        comment: rand() < 0.15 ? null : pick(REVIEWS[rating]),
        createdAt: reviewedAt,
      });
    }
  }

  for (const product of productMeta) {
    // Popularity varies so Top Rated / Trending / best-selling have a spread:
    // most products get a handful of reviews, some many, a few none.
    const r = rand();
    const reviewCount = r < 0.1 ? 0 : r < 0.55 ? int(2, 5) : r < 0.9 ? int(5, 9) : int(10, 14);
    const reviewers = [...buyerIds].sort(() => rand() - 0.5).slice(0, reviewCount);
    for (const buyerId of reviewers) addOrder(product, buyerId, int(12, 120), true);

    // Recent, not-yet-reviewed orders — these drive the 30-day Trending row
    // and give sellers orders to process.
    const recent = rand() < 0.6 ? int(0, 4) : 0;
    for (let i = 0; i < recent; i++) addOrder(product, pick(buyerIds), int(0, 29), false);
  }

  await prisma.order.createMany({ data: orders });
  await prisma.sellerOrder.createMany({ data: sellerOrders });
  await prisma.orderItem.createMany({ data: orderItems });
  await prisma.payment.createMany({ data: payments });
  await prisma.review.createMany({ data: reviews });

  // --- Views + wishlists -----------------------------------------------------

  const views: Prisma.ProductViewCreateManyInput[] = [];
  for (const product of productMeta) {
    const n = int(3, 40);
    for (let i = 0; i < n; i++) {
      views.push({ productId: product.id, visitorId: `demo-visitor-${int(1, 400)}`, viewedAt: new Date(now - int(0, 60) * DAY) });
    }
  }
  await prisma.productView.createMany({ data: views });

  const wishlist = new Set<string>();
  for (const buyerId of buyerIds) {
    for (let i = 0; i < int(0, 5); i++) wishlist.add(`${buyerId}|${pick(productMeta).id}`);
  }
  await prisma.wishlistItem.createMany({
    data: [...wishlist].map((key) => {
      const [userId, productId] = key.split("|");
      return { userId, productId };
    }),
  });

  console.log(
    `Demo data: ${stores.length} stores, ${buyerIds.length} buyers, ${products.length} products, ` +
      `${orders.length} orders, ${reviews.length} reviews.`
  );
}
