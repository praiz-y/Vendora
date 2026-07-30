import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signAccessToken } from "../src/services/token.service";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

async function createUser(overrides: { role?: "USER" | "ADMIN" } = {}) {
  return prisma.user.create({
    data: {
      firstName: "Test",
      lastName: "User",
      username: uniqueUsername("prod"),
      email: uniqueEmail("prod"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
    },
  });
}

async function createActiveSeller() {
  const seller = await createUser();
  const store = await prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${seller.id}`,
      slug: `store-${seller.id}`,
      description: "desc",
      businessCategory: "General",
      phone: "+2340000000000",
      email: seller.email,
      location: "Lagos",
      status: "ACTIVE",
    },
  });
  return { seller, store };
}

async function createActiveCategory(name = `Category ${Date.now()}-${Math.random()}`) {
  return prisma.category.create({ data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), status: "ACTIVE" } });
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

const physicalPayload = (categoryId: string) => ({
  type: "PHYSICAL",
  name: "Ankara Shirt",
  description: "A comfortable, well-tailored Ankara shirt for everyday wear.",
  categoryId,
  price: 15000,
  stockQuantity: 10,
  shippingType: "FREE",
});

const digitalPayload = (categoryId: string) => ({
  type: "DIGITAL",
  name: "Business Plan Template",
  description: "A professional, ready-to-use business plan template.",
  categoryId,
  price: 5000,
  file: { fileKey: "templates/business-plan-v1.docx", fileType: "application/msword", fileSize: 204800 },
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/products", () => {
  it("creates a PHYSICAL product as DRAFT", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));

    expect(res.status).toBe(201);
    expect(res.body.data.product.status).toBe("DRAFT");
    expect(res.body.data.product.type).toBe("PHYSICAL");
    expect(res.body.data.product.slug).toBeTruthy();
  });

  it("creates a DIGITAL product with an initial file version, serializing fileSize as a string", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(digitalPayload(category.id));

    expect(res.status).toBe(201);
    expect(res.body.data.product.digitalVersions).toHaveLength(1);
    expect(res.body.data.product.digitalVersions[0].version).toBe(1);
    expect(res.body.data.product.digitalVersions[0].fileSize).toBe("204800");
    expect(typeof res.body.data.product.digitalVersions[0].fileSize).toBe("string");
  });

  it("rejects a FIXED-shipping physical product with no shippingFee", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send({ ...physicalPayload(category.id), shippingType: "FIXED" });

    expect(res.status).toBe(422);
  });

  it("accepts a FIXED-shipping physical product with a shippingFee", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send({ ...physicalPayload(category.id), shippingType: "FIXED", shippingFee: 2000 });

    expect(res.status).toBe(201);
  });

  it("rejects an unavailable (nonexistent) category", async () => {
    const { seller } = await createActiveSeller();
    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload("does-not-exist"));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CATEGORY_NOT_AVAILABLE");
  });

  it("rejects an archived category", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();
    await prisma.category.update({ where: { id: category.id }, data: { status: "ARCHIVED" } });

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CATEGORY_NOT_AVAILABLE");
  });

  it("blocks a buyer with no active store", async () => {
    const buyer = await createUser();
    const category = await createActiveCategory();

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`)
      .send(physicalPayload(category.id));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELLER_CAPABILITY_REQUIRED");
  });
});

describe("GET /api/v1/products/me and /me/:id", () => {
  it("lists only the caller's own products, optionally filtered by status", async () => {
    const { seller: sellerA } = await createActiveSeller();
    const { seller: sellerB } = await createActiveSeller();
    const category = await createActiveCategory();

    await request(app).post("/api/v1/products").set("Authorization", `Bearer ${tokenFor(sellerA)}`).send(physicalPayload(category.id));
    await request(app).post("/api/v1/products").set("Authorization", `Bearer ${tokenFor(sellerB)}`).send(physicalPayload(category.id));

    const res = await request(app).get("/api/v1/products/me").set("Authorization", `Bearer ${tokenFor(sellerA)}`);
    expect(res.body.data.products).toHaveLength(1);

    const filtered = await request(app)
      .get("/api/v1/products/me?status=PENDING_REVIEW")
      .set("Authorization", `Bearer ${tokenFor(sellerA)}`);
    expect(filtered.body.data.products).toHaveLength(0);
  });

  it("404s when fetching another seller's product by id", async () => {
    const { seller: sellerA } = await createActiveSeller();
    const { seller: sellerB } = await createActiveSeller();
    const category = await createActiveCategory();

    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(sellerA)}`)
      .send(physicalPayload(category.id));
    const productId = created.body.data.product.id;

    const res = await request(app)
      .get(`/api/v1/products/me/${productId}`)
      .set("Authorization", `Bearer ${tokenFor(sellerB)}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });
});

describe("product lifecycle: submit / moderate / edit / archive", () => {
  it("submits a DRAFT product for review, and rejects submitting a non-draft one", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));
    const productId = created.body.data.product.id;
    const token = tokenFor(seller);

    const submitted = await request(app).post(`/api/v1/products/me/${productId}/submit`).set("Authorization", `Bearer ${token}`);
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.product.status).toBe("PENDING_REVIEW");

    const secondSubmit = await request(app).post(`/api/v1/products/me/${productId}/submit`).set("Authorization", `Bearer ${token}`);
    expect(secondSubmit.status).toBe(409);
    expect(secondSubmit.body.error.code).toBe("PRODUCT_NOT_DRAFT");
  });

  it("admin approves a PENDING_REVIEW product and writes an audit log entry", async () => {
    const { seller } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));
    const productId = created.body.data.product.id;
    await request(app).post(`/api/v1/products/me/${productId}/submit`).set("Authorization", `Bearer ${tokenFor(seller)}`);

    const approved = await request(app)
      .post(`/api/v1/admin/products/${productId}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);

    expect(approved.status).toBe(200);
    expect(approved.body.data.product.status).toBe("APPROVED");

    const auditEntry = await prisma.auditLog.findFirst({
      where: { entityType: "Product", entityId: productId, action: "PRODUCT_APPROVED" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("admin rejects a PENDING_REVIEW product with a reason, and the seller can resubmit by editing", async () => {
    const { seller } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));
    const productId = created.body.data.product.id;
    const sellerToken = tokenFor(seller);
    await request(app).post(`/api/v1/products/me/${productId}/submit`).set("Authorization", `Bearer ${sellerToken}`);

    const rejected = await request(app)
      .post(`/api/v1/admin/products/${productId}/reject`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ reason: "Description too short and vague for buyers to evaluate." });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.product.status).toBe("REJECTED");

    const edited = await request(app)
      .patch(`/api/v1/products/me/${productId}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ description: "A much more detailed and specific description of this shirt for buyers." });

    expect(edited.status).toBe(200);
    expect(edited.body.data.product.status).toBe("PENDING_REVIEW");
    expect(edited.body.data.product.rejectionReason).toBeNull();
  });

  it("does not allow editing an APPROVED product, and rejects moderating a non-pending one twice", async () => {
    const { seller } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));
    const productId = created.body.data.product.id;
    const sellerToken = tokenFor(seller);
    const adminToken = tokenFor(admin);
    await request(app).post(`/api/v1/products/me/${productId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(app).post(`/api/v1/admin/products/${productId}/approve`).set("Authorization", `Bearer ${adminToken}`);

    const edited = await request(app)
      .patch(`/api/v1/products/me/${productId}`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ price: 20000 });
    expect(edited.status).toBe(409);
    expect(edited.body.error.code).toBe("PRODUCT_NOT_EDITABLE");

    const secondApprove = await request(app)
      .post(`/api/v1/admin/products/${productId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(secondApprove.status).toBe(409);
    expect(secondApprove.body.error.code).toBe("PRODUCT_NOT_PENDING_REVIEW");
  });

  it("rejects setting physical-only fields on a digital product", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(digitalPayload(category.id));
    const productId = created.body.data.product.id;

    const res = await request(app)
      .patch(`/api/v1/products/me/${productId}`)
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send({ stockQuantity: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_FIELD_FOR_PRODUCT_TYPE");
  });

  it("archives a product, and rejects archiving an already-archived one", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));
    const productId = created.body.data.product.id;
    const token = tokenFor(seller);

    const archived = await request(app).post(`/api/v1/products/me/${productId}/archive`).set("Authorization", `Bearer ${token}`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.product.status).toBe("ARCHIVED");

    const secondArchive = await request(app).post(`/api/v1/products/me/${productId}/archive`).set("Authorization", `Bearer ${token}`);
    expect(secondArchive.status).toBe(409);
    expect(secondArchive.body.error.code).toBe("PRODUCT_ALREADY_ARCHIVED");
  });
});

describe("admin product moderation authorization", () => {
  it("blocks non-admins from admin product routes", async () => {
    const buyer = await createUser();
    const res = await request(app).get("/api/v1/admin/products").set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ADMIN_REQUIRED");
  });

  it("lists and filters products for admin review", async () => {
    const { seller } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));
    await request(app)
      .post(`/api/v1/products/me/${created.body.data.product.id}/submit`)
      .set("Authorization", `Bearer ${tokenFor(seller)}`);

    const res = await request(app)
      .get("/api/v1/admin/products?status=PENDING_REVIEW")
      .set("Authorization", `Bearer ${tokenFor(admin)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0].store.sellerId).toBe(seller.id);
  });
});

describe("POST /api/v1/products/me/:id/digital-versions", () => {
  it("adds a new version to an APPROVED digital product without changing its status", async () => {
    const { seller } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(digitalPayload(category.id));
    const productId = created.body.data.product.id;
    const sellerToken = tokenFor(seller);
    await request(app).post(`/api/v1/products/me/${productId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(app).post(`/api/v1/admin/products/${productId}/approve`).set("Authorization", `Bearer ${tokenFor(admin)}`);

    const res = await request(app)
      .post(`/api/v1/products/me/${productId}/digital-versions`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ fileKey: "templates/business-plan-v2.docx", fileType: "application/msword", fileSize: 300000 });

    expect(res.status).toBe(201);
    expect(res.body.data.product.status).toBe("APPROVED");
    expect(res.body.data.product.digitalVersions).toHaveLength(2);
    expect(res.body.data.product.digitalVersions[0].version).toBe(2);
  });

  it("resubmits a REJECTED digital product to PENDING_REVIEW when a fixed version is uploaded", async () => {
    const { seller } = await createActiveSeller();
    const admin = await createUser({ role: "ADMIN" });
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(digitalPayload(category.id));
    const productId = created.body.data.product.id;
    const sellerToken = tokenFor(seller);
    await request(app).post(`/api/v1/products/me/${productId}/submit`).set("Authorization", `Bearer ${sellerToken}`);
    await request(app)
      .post(`/api/v1/admin/products/${productId}/reject`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ reason: "The uploaded file was corrupted." });

    const res = await request(app)
      .post(`/api/v1/products/me/${productId}/digital-versions`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ fileKey: "templates/business-plan-fixed.docx", fileType: "application/msword", fileSize: 250000 });

    expect(res.status).toBe(201);
    expect(res.body.data.product.status).toBe("PENDING_REVIEW");
    expect(res.body.data.product.rejectionReason).toBeNull();
  });

  it("rejects uploading a version for a PHYSICAL product", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(physicalPayload(category.id));

    const res = await request(app)
      .post(`/api/v1/products/me/${created.body.data.product.id}/digital-versions`)
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send({ fileKey: "irrelevant.pdf", fileType: "application/pdf", fileSize: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NOT_A_DIGITAL_PRODUCT");
  });

  it("rejects uploading a version for an ARCHIVED product", async () => {
    const { seller } = await createActiveSeller();
    const category = await createActiveCategory();
    const created = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${tokenFor(seller)}`)
      .send(digitalPayload(category.id));
    const productId = created.body.data.product.id;
    const sellerToken = tokenFor(seller);
    await request(app).post(`/api/v1/products/me/${productId}/archive`).set("Authorization", `Bearer ${sellerToken}`);

    const res = await request(app)
      .post(`/api/v1/products/me/${productId}/digital-versions`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({ fileKey: "irrelevant.pdf", fileType: "application/pdf", fileSize: 100 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("PRODUCT_ARCHIVED");
  });
});
