import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Development-only credential. Every seeded user shares this password so the
// accounts are easy to log in with once Phase 2 implements auth. Override via
// SEED_USER_PASSWORD if you want something else locally. Never used outside
// this seed script, and never a real account.
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "VendoraDev123!";

async function resetData() {
  // Deletes in FK-safe (child-first) order. This is a dev-only database — see
  // README/phase reports — so a full wipe-and-reseed is the simplest way to
  // keep this script idempotent.
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.productReport.deleteMany();
  await prisma.review.deleteMany();
  await prisma.digitalEntitlement.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.paymentAttempt.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.stockReservation.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.sellerOrder.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productView.deleteMany();
  await prisma.digitalProductVersion.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();
  await prisma.sellerApplication.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetData();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  // --- Users --------------------------------------------------------------

  const admin = await prisma.user.create({
    data: {
      firstName: "Ada",
      lastName: "Okoro",
      username: "admin_ada",
      email: "admin@vendora.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const buyer = await prisma.user.create({
    data: {
      firstName: "Tunde",
      lastName: "Bakare",
      username: "tunde_buys",
      email: "buyer@vendora.test",
      passwordHash,
    },
  });

  const sellerOneUser = await prisma.user.create({
    data: {
      firstName: "Amara",
      lastName: "Chukwu",
      username: "amara_sells",
      email: "seller1@vendora.test",
      passwordHash,
    },
  });

  const sellerTwoUser = await prisma.user.create({
    data: {
      firstName: "Femi",
      lastName: "Adeyemi",
      username: "femi_sells",
      email: "seller2@vendora.test",
      passwordHash,
    },
  });

  // --- Addresses ------------------------------------------------------------

  const buyerAddress = await prisma.address.create({
    data: {
      userId: buyer.id,
      fullName: "Tunde Bakare",
      phone: "+2348012345678",
      addressLine1: "12 Marina Street",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      isDefault: true,
    },
  });

  // --- Seller applications + stores -----------------------------------------

  const sellerOneApplication = await prisma.sellerApplication.create({
    data: {
      userId: sellerOneUser.id,
      storeName: "Aria Electronics",
      storeDescription: "Quality consumer electronics at fair prices.",
      businessCategory: "Electronics",
      phone: "+2348011112222",
      email: "seller1@vendora.test",
      location: "Lagos, Nigeria",
      status: "APPROVED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  const sellerOneStore = await prisma.store.create({
    data: {
      sellerId: sellerOneUser.id,
      name: sellerOneApplication.storeName,
      slug: "aria-electronics",
      description: sellerOneApplication.storeDescription,
      businessCategory: sellerOneApplication.businessCategory,
      phone: sellerOneApplication.phone,
      email: sellerOneApplication.email,
      location: sellerOneApplication.location,
    },
  });

  const sellerTwoApplication = await prisma.sellerApplication.create({
    data: {
      userId: sellerTwoUser.id,
      storeName: "Nkem Books & Prints",
      storeDescription: "Books, e-books, and printable goods.",
      businessCategory: "Books & Media",
      phone: "+2348033334444",
      email: "seller2@vendora.test",
      location: "Abuja, Nigeria",
      status: "APPROVED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  const sellerTwoStore = await prisma.store.create({
    data: {
      sellerId: sellerTwoUser.id,
      name: sellerTwoApplication.storeName,
      slug: "nkem-books-prints",
      description: sellerTwoApplication.storeDescription,
      businessCategory: sellerTwoApplication.businessCategory,
      phone: sellerTwoApplication.phone,
      email: sellerTwoApplication.email,
      location: sellerTwoApplication.location,
    },
  });

  // --- Categories -----------------------------------------------------------

  const [electronics, homeAndLiving, digitalDownloads] = await Promise.all([
    prisma.category.create({ data: { name: "Electronics", slug: "electronics" } }),
    prisma.category.create({ data: { name: "Home & Living", slug: "home-living" } }),
    prisma.category.create({ data: { name: "Digital Downloads", slug: "digital-downloads" } }),
  ]);
  await Promise.all([
    prisma.category.create({ data: { name: "Fashion", slug: "fashion" } }),
    prisma.category.create({ data: { name: "Books & Media", slug: "books-media" } }),
  ]);

  // --- Products ---------------------------------------------------------------

  const earbuds = await prisma.product.create({
    data: {
      storeId: sellerOneStore.id,
      categoryId: electronics.id,
      name: "Wireless Earbuds Pro",
      slug: "wireless-earbuds-pro",
      description: "Noise-cancelling wireless earbuds with 30-hour battery life.",
      type: "PHYSICAL",
      price: 25000,
      stockQuantity: 50,
      shippingType: "FIXED",
      shippingFee: 1500,
      status: "APPROVED",
      submittedAt: new Date(),
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  const draftSpeaker = await prisma.product.create({
    data: {
      storeId: sellerOneStore.id,
      categoryId: electronics.id,
      name: "Bluetooth Speaker (Draft)",
      slug: "bluetooth-speaker-draft",
      description: "Portable speaker, still being written up by the seller.",
      type: "PHYSICAL",
      price: 18000,
      stockQuantity: 30,
      shippingType: "FREE",
      status: "DRAFT",
    },
  });

  const pendingSmartWatch = await prisma.product.create({
    data: {
      storeId: sellerOneStore.id,
      categoryId: electronics.id,
      name: "Smart Watch X",
      slug: "smart-watch-x",
      description: "Fitness tracking smart watch awaiting admin review.",
      type: "PHYSICAL",
      price: 42000,
      stockQuantity: 15,
      shippingType: "FIXED",
      shippingFee: 2000,
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
    },
  });

  const rejectedCharger = await prisma.product.create({
    data: {
      storeId: sellerOneStore.id,
      categoryId: electronics.id,
      name: "Fake Charger Bundle",
      slug: "fake-charger-bundle",
      description: "Charger bundle listing rejected by admin.",
      type: "PHYSICAL",
      price: 5000,
      stockQuantity: 0,
      shippingType: "FREE",
      status: "REJECTED",
      rejectionReason: "Product images did not match the actual item sold.",
      submittedAt: new Date(),
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  const archivedRouter = await prisma.product.create({
    data: {
      storeId: sellerOneStore.id,
      categoryId: electronics.id,
      name: "Old Model Router",
      slug: "old-model-router",
      description: "Discontinued router model, archived by the seller.",
      type: "PHYSICAL",
      price: 12000,
      stockQuantity: 0,
      shippingType: "FREE",
      status: "ARCHIVED",
      submittedAt: new Date(),
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  const ebook = await prisma.product.create({
    data: {
      storeId: sellerTwoStore.id,
      categoryId: digitalDownloads.id,
      name: "The Vendora Handbook (E-book)",
      slug: "the-vendora-handbook-ebook",
      description: "A practical guide to running a marketplace store.",
      type: "DIGITAL",
      price: 3500,
      status: "APPROVED",
      submittedAt: new Date(),
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  await prisma.digitalProductVersion.create({
    data: { productId: ebook.id, version: 1, fileKey: "digital/ebook/v1.pdf", fileType: "application/pdf", fileSize: 2_400_000 },
  });
  const ebookV2 = await prisma.digitalProductVersion.create({
    data: { productId: ebook.id, version: 2, fileKey: "digital/ebook/v2.pdf", fileType: "application/pdf", fileSize: 2_650_000 },
  });

  const toteBag = await prisma.product.create({
    data: {
      storeId: sellerTwoStore.id,
      categoryId: homeAndLiving.id,
      name: "Handwoven Tote Bag",
      slug: "handwoven-tote-bag",
      description: "Locally handwoven cotton tote bag.",
      type: "PHYSICAL",
      price: 8000,
      stockQuantity: 20,
      shippingType: "FREE",
      status: "APPROVED",
      submittedAt: new Date(),
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  // --- Product views (authenticated + anonymous) -----------------------------

  await prisma.productView.createMany({
    data: [
      { productId: earbuds.id, userId: buyer.id },
      { productId: earbuds.id, visitorId: "anon-session-1" },
      { productId: ebook.id, visitorId: "anon-session-2" },
    ],
  });

  // --- Cart & wishlist ---------------------------------------------------------

  const cart = await prisma.cart.create({ data: { userId: buyer.id } });
  await prisma.cartItem.create({ data: { cartId: cart.id, productId: toteBag.id, quantity: 1 } });
  await prisma.wishlistItem.create({ data: { userId: buyer.id, productId: toteBag.id } });

  // --- Order 1: single-vendor, completed ---------------------------------------

  const order1 = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      status: "COMPLETED",
      totalAmount: 26500,
      shippingAddressId: buyerAddress.id,
    },
  });

  const order1SellerOrder = await prisma.sellerOrder.create({
    data: {
      orderId: order1.id,
      storeId: sellerOneStore.id,
      status: "DELIVERED",
      subtotal: 25000,
      shippingFee: 1500,
      total: 26500,
    },
  });

  const order1Item = await prisma.orderItem.create({
    data: {
      sellerOrderId: order1SellerOrder.id,
      productId: earbuds.id,
      productNameSnapshot: earbuds.name,
      priceSnapshot: earbuds.price,
      quantity: 1,
      productTypeSnapshot: "PHYSICAL",
      shippingFeeSnapshot: earbuds.shippingFee,
      storeNameSnapshot: sellerOneStore.name,
    },
  });

  const order1Payment = await prisma.payment.create({
    data: {
      orderId: order1.id,
      provider: "simulated",
      providerReference: "SIM-REF-ORDER-1",
      amount: 26500,
      status: "SUCCESS",
      paidAt: new Date(),
    },
  });

  await prisma.paymentAttempt.create({
    data: {
      paymentId: order1Payment.id,
      provider: "simulated",
      providerReference: "SIM-REF-ORDER-1",
      amount: 26500,
      status: "SUCCESS",
    },
  });

  await prisma.stockReservation.create({
    data: {
      productId: earbuds.id,
      orderId: order1.id,
      quantity: 1,
      status: "CONFIRMED",
      expiresAt: new Date(Date.now() + 1000 * 60 * 30),
    },
  });

  await prisma.review.create({
    data: {
      userId: buyer.id,
      productId: earbuds.id,
      orderItemId: order1Item.id,
      rating: 5,
      comment: "Great sound quality, arrived on time.",
    },
  });

  await prisma.refund.create({
    data: {
      orderItemId: order1Item.id,
      amount: 26500,
      reason: "Buyer requested refund — wrong color received.",
      status: "REQUESTED",
      requestedById: buyer.id,
    },
  });

  // --- Order 2: multi-vendor (Store 1 physical + Store 2 digital) --------------

  const order2 = await prisma.order.create({
    data: {
      buyerId: buyer.id,
      status: "PARTIALLY_SHIPPED",
      totalAmount: 42000 + 3500,
      shippingAddressId: buyerAddress.id,
    },
  });

  const order2SellerOrderOne = await prisma.sellerOrder.create({
    data: {
      orderId: order2.id,
      storeId: sellerOneStore.id,
      status: "SHIPPED",
      subtotal: 40000,
      shippingFee: 2000,
      total: 42000,
    },
  });

  await prisma.orderItem.create({
    data: {
      sellerOrderId: order2SellerOrderOne.id,
      productId: pendingSmartWatch.id,
      productNameSnapshot: pendingSmartWatch.name,
      priceSnapshot: pendingSmartWatch.price,
      quantity: 1,
      productTypeSnapshot: "PHYSICAL",
      shippingFeeSnapshot: pendingSmartWatch.shippingFee,
      storeNameSnapshot: sellerOneStore.name,
    },
  });

  const order2SellerOrderTwo = await prisma.sellerOrder.create({
    data: {
      orderId: order2.id,
      storeId: sellerTwoStore.id,
      status: "DELIVERED",
      subtotal: 3500,
      shippingFee: 0,
      total: 3500,
    },
  });

  const order2EbookItem = await prisma.orderItem.create({
    data: {
      sellerOrderId: order2SellerOrderTwo.id,
      productId: ebook.id,
      productNameSnapshot: ebook.name,
      priceSnapshot: ebook.price,
      quantity: 1,
      productTypeSnapshot: "DIGITAL",
      storeNameSnapshot: sellerTwoStore.name,
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      provider: "simulated",
      providerReference: "SIM-REF-ORDER-2",
      amount: 45500,
      status: "SUCCESS",
      paidAt: new Date(),
    },
  });

  // Buyer purchased the digital product in order 2 -> gets an entitlement that
  // resolves to the *latest* version (v2), even though v1 existed at purchase time.
  await prisma.digitalEntitlement.create({
    data: {
      userId: buyer.id,
      productId: ebook.id,
      orderItemId: order2EbookItem.id,
    },
  });
  void ebookV2; // latest version is resolved by querying max(version); no direct FK needed.

  // --- Product report -----------------------------------------------------------

  await prisma.productReport.create({
    data: {
      reporterId: buyer.id,
      productId: rejectedCharger.id,
      reason: "MISLEADING_DESCRIPTION",
      description: "Listing photos don't match what was described.",
      status: "PENDING",
    },
  });

  // --- Notifications --------------------------------------------------------

  await prisma.notification.createMany({
    data: [
      {
        userId: buyer.id,
        type: "ORDER_PLACED",
        title: "Order placed",
        message: `Your order ${order1.id} has been placed.`,
        relatedEntityType: "Order",
        relatedEntityId: order1.id,
      },
      {
        userId: buyer.id,
        type: "PAYMENT_SUCCESS",
        title: "Payment successful",
        message: `Payment for order ${order1.id} was successful.`,
        relatedEntityType: "Order",
        relatedEntityId: order1.id,
        isRead: true,
      },
      {
        userId: sellerOneUser.id,
        type: "PRODUCT_APPROVED",
        title: "Product approved",
        message: `${earbuds.name} is now live on the marketplace.`,
        relatedEntityType: "Product",
        relatedEntityId: earbuds.id,
      },
    ],
  });

  // --- Audit logs -----------------------------------------------------------

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: "SELLER_APPLICATION_APPROVED",
        entityType: "SellerApplication",
        entityId: sellerOneApplication.id,
      },
      {
        actorId: admin.id,
        action: "PRODUCT_APPROVED",
        entityType: "Product",
        entityId: earbuds.id,
      },
      {
        actorId: admin.id,
        action: "PRODUCT_REJECTED",
        entityType: "Product",
        entityId: rejectedCharger.id,
        metadata: { reason: rejectedCharger.rejectionReason },
      },
    ],
  });

  console.log("Seed complete.");
  console.log(`Dev login password for all seeded users: ${SEED_PASSWORD}`);
  console.log("Seeded users:", {
    admin: admin.email,
    buyer: buyer.email,
    sellerOne: sellerOneUser.email,
    sellerTwo: sellerTwoUser.email,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
