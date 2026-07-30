import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signAccessToken } from "../src/services/token.service";
import { resetDatabase, uniqueEmail, uniqueUsername } from "./helpers";

const app = createApp();

let seq = 0;
function next() {
  seq += 1;
  return seq;
}

async function createUser(overrides: { role?: "USER" | "ADMIN" } = {}) {
  const user = await prisma.user.create({
    data: {
      firstName: "User",
      lastName: `${next()}`,
      username: uniqueUsername("rpt"),
      email: uniqueEmail("rpt"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

async function createProduct() {
  const n = next();
  const seller = await createUser();
  const store = await prisma.store.create({
    data: {
      sellerId: seller.id,
      name: `Store ${n}`,
      slug: `rpt-store-${n}`,
      description: "desc",
      businessCategory: "General",
      phone: "+2340000000000",
      email: seller.email,
      location: "Lagos",
      status: "ACTIVE",
    },
  });
  const category = await prisma.category.create({ data: { name: `Category ${n}`, slug: `rpt-category-${n}`, status: "ACTIVE" } });
  return prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: category.id,
      name: `Product ${n}`,
      slug: `rpt-product-${n}`,
      description: "A product for report testing.",
      type: "PHYSICAL",
      price: 1000,
      stockQuantity: 10,
      shippingType: "FREE",
      status: "APPROVED",
    },
  });
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/product-reports", () => {
  it("requires authentication", async () => {
    const product = await createProduct();
    const res = await request(app).post("/api/v1/product-reports").send({ productId: product.id, reason: "OTHER" });
    expect(res.status).toBe(401);
  });

  it("404s an unknown product", async () => {
    const user = await createUser();
    const res = await request(app)
      .post("/api/v1/product-reports")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ productId: "does-not-exist", reason: "OTHER" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("submits a report and rejects a second active report from the same user for the same product", async () => {
    const product = await createProduct();
    const user = await createUser();
    const token = tokenFor(user);

    const res = await request(app)
      .post("/api/v1/product-reports")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, reason: "COUNTERFEIT", description: "Looks fake." });
    expect(res.status).toBe(201);
    expect(res.body.data.report.status).toBe("PENDING");

    const dupe = await request(app)
      .post("/api/v1/product-reports")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: product.id, reason: "OTHER" });
    expect(dupe.status).toBe(409);
    expect(dupe.body.error.code).toBe("ALREADY_REPORTED");
  });

  it("rejects an invalid reason", async () => {
    const product = await createProduct();
    const user = await createUser();
    const res = await request(app)
      .post("/api/v1/product-reports")
      .set("Authorization", `Bearer ${tokenFor(user)}`)
      .send({ productId: product.id, reason: "NOT_A_REAL_REASON" });
    expect(res.status).toBe(422);
  });
});

describe("Admin product report review", () => {
  it("requires admin access", async () => {
    const user = await createUser();
    const res = await request(app).get("/api/v1/admin/product-reports").set("Authorization", `Bearer ${tokenFor(user)}`);
    expect(res.status).toBe(403);
  });

  it("lists reports filtered by status, and resolves a pending one", async () => {
    const product = await createProduct();
    const reporter = await createUser();
    const admin = await createUser({ role: "ADMIN" });

    const submitRes = await request(app)
      .post("/api/v1/product-reports")
      .set("Authorization", `Bearer ${tokenFor(reporter)}`)
      .send({ productId: product.id, reason: "PROHIBITED_ITEM" });
    const reportId = submitRes.body.data.report.id;

    const listRes = await request(app)
      .get("/api/v1/admin/product-reports?status=PENDING")
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.reports).toHaveLength(1);
    expect(listRes.body.data.reports[0].id).toBe(reportId);

    const resolveRes = await request(app)
      .post(`/api/v1/admin/product-reports/${reportId}/resolve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ resolutionNote: "Confirmed and removed listing." });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.report.status).toBe("RESOLVED");
    expect(resolveRes.body.data.report.resolvedById).toBe(admin.id);

    // Already resolved -> can't be resolved/dismissed again.
    const again = await request(app)
      .post(`/api/v1/admin/product-reports/${reportId}/dismiss`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("REPORT_NOT_PENDING");
  });

  it("dismisses a report, and the same reporter can then file a new active report", async () => {
    const product = await createProduct();
    const reporter = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const reporterToken = tokenFor(reporter);

    const submitRes = await request(app)
      .post("/api/v1/product-reports")
      .set("Authorization", `Bearer ${reporterToken}`)
      .send({ productId: product.id, reason: "OTHER" });
    const reportId = submitRes.body.data.report.id;

    const dismissRes = await request(app)
      .post(`/api/v1/admin/product-reports/${reportId}/dismiss`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({});
    expect(dismissRes.status).toBe(200);
    expect(dismissRes.body.data.report.status).toBe("DISMISSED");

    // The partial unique index only blocks a second PENDING report — once
    // the first is terminal (DISMISSED), a new one is allowed.
    const secondRes = await request(app)
      .post("/api/v1/product-reports")
      .set("Authorization", `Bearer ${reporterToken}`)
      .send({ productId: product.id, reason: "MISLEADING_DESCRIPTION" });
    expect(secondRes.status).toBe(201);
  });
});
