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
      username: uniqueUsername("onboard"),
      email: uniqueEmail("onboard"),
      passwordHash: "not-used-in-these-tests",
      role: overrides.role ?? "USER",
    },
  });
}

function tokenFor(user: { id: string; role: "USER" | "ADMIN" }) {
  return signAccessToken({ sub: user.id, role: user.role });
}

const applicationPayload = {
  storeName: "Ada's Fabrics",
  storeDescription: "Quality Ankara and lace fabrics sourced directly from local weavers.",
  businessCategory: "Fashion & Textiles",
  phone: "+2348012345678",
  email: "store@adafabrics.test",
  location: "Lagos, Nigeria",
};

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/v1/seller-applications", () => {
  it("lets a buyer submit a seller application", async () => {
    const buyer = await createUser();
    const token = tokenFor(buyer);

    const res = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${token}`)
      .send(applicationPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.application.status).toBe("PENDING");
    expect(res.body.data.application.storeName).toBe(applicationPayload.storeName);
  });

  it("rejects a second application from the same user", async () => {
    const buyer = await createUser();
    const token = tokenFor(buyer);

    await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${token}`)
      .send(applicationPayload);

    const second = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${token}`)
      .send(applicationPayload);

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("APPLICATION_ALREADY_EXISTS");
  });

  it("rejects an application from a user who already has a store", async () => {
    const seller = await createUser();
    await prisma.store.create({
      data: {
        sellerId: seller.id,
        name: "Existing Store",
        slug: `existing-store-${seller.id}`,
        description: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: seller.email,
        location: "Lagos",
      },
    });
    const token = tokenFor(seller);

    const res = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${token}`)
      .send(applicationPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_A_SELLER");
  });

  it("returns 422 for an invalid payload (missing required fields)", async () => {
    const buyer = await createUser();
    const token = tokenFor(buyer);

    const res = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeName: "A" });

    expect(res.status).toBe(422);
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/v1/seller-applications").send(applicationPayload);
    expect(res.status).toBe(401);
  });
});

describe("GET/PATCH /api/v1/seller-applications/me", () => {
  it("404s when the user has not applied yet", async () => {
    const buyer = await createUser();
    const token = tokenFor(buyer);

    const res = await request(app)
      .get("/api/v1/seller-applications/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SELLER_APPLICATION_NOT_FOUND");
  });

  it("lets a user edit a PENDING application without changing its status", async () => {
    const buyer = await createUser();
    const token = tokenFor(buyer);
    await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${token}`)
      .send(applicationPayload);

    const res = await request(app)
      .patch("/api/v1/seller-applications/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ storeDescription: "Updated description of at least ten characters." });

    expect(res.status).toBe(200);
    expect(res.body.data.application.status).toBe("PENDING");
    expect(res.body.data.application.storeDescription).toBe(
      "Updated description of at least ten characters."
    );
  });

  it("resubmits a REJECTED application back to PENDING and clears the rejection reason", async () => {
    const buyer = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const buyerToken = tokenFor(buyer);
    const adminToken = tokenFor(admin);

    const submitRes = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send(applicationPayload);
    const applicationId = submitRes.body.data.application.id;

    await request(app)
      .post(`/api/v1/admin/seller-applications/${applicationId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Store description too vague." });

    const editRes = await request(app)
      .patch("/api/v1/seller-applications/me")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ storeDescription: "A much more detailed and specific store description now." });

    expect(editRes.status).toBe(200);
    expect(editRes.body.data.application.status).toBe("PENDING");
    expect(editRes.body.data.application.rejectionReason).toBeNull();
  });

  it("does not allow editing an already-approved application", async () => {
    const buyer = await createUser();
    const admin = await createUser({ role: "ADMIN" });
    const buyerToken = tokenFor(buyer);
    const adminToken = tokenFor(admin);

    const submitRes = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send(applicationPayload);
    const applicationId = submitRes.body.data.application.id;

    await request(app)
      .post(`/api/v1/admin/seller-applications/${applicationId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const editRes = await request(app)
      .patch("/api/v1/seller-applications/me")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ storeDescription: "Trying to edit after approval, at least ten chars." });

    expect(editRes.status).toBe(409);
    expect(editRes.body.error.code).toBe("APPLICATION_ALREADY_APPROVED");
  });
});

describe("admin seller-application review", () => {
  it("blocks non-admins from the review endpoints", async () => {
    const buyer = await createUser();
    const token = tokenFor(buyer);

    const res = await request(app)
      .get("/api/v1/admin/seller-applications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ADMIN_REQUIRED");
  });

  it("lists applications and filters by status", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const adminToken = tokenFor(admin);
    const buyer = await createUser();
    await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`)
      .send(applicationPayload);

    const res = await request(app)
      .get("/api/v1/admin/seller-applications?status=PENDING")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.applications).toHaveLength(1);
    expect(res.body.data.applications[0].applicant.id).toBe(buyer.id);
    expect(res.body.data.meta.total).toBe(1);

    const approvedOnly = await request(app)
      .get("/api/v1/admin/seller-applications?status=APPROVED")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(approvedOnly.body.data.applications).toHaveLength(0);
  });

  it("approving a PENDING application creates an ACTIVE store and an audit log entry", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const submitRes = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`)
      .send(applicationPayload);
    const applicationId = submitRes.body.data.application.id;

    const approveRes = await request(app)
      .post(`/api/v1/admin/seller-applications/${applicationId}/approve`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.application.status).toBe("APPROVED");
    expect(approveRes.body.data.store.status).toBe("ACTIVE");
    expect(approveRes.body.data.store.name).toBe(applicationPayload.storeName);
    expect(approveRes.body.data.store.slug).toBeTruthy();

    const store = await prisma.store.findUnique({ where: { sellerId: buyer.id } });
    expect(store).not.toBeNull();

    const auditEntry = await prisma.auditLog.findFirst({
      where: { entityType: "SellerApplication", entityId: applicationId, action: "SELLER_APPLICATION_APPROVED" },
    });
    expect(auditEntry).not.toBeNull();
    expect(auditEntry!.actorId).toBe(admin.id);
  });

  it("rejecting a PENDING application records the reason and an audit log entry", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const submitRes = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`)
      .send(applicationPayload);
    const applicationId = submitRes.body.data.application.id;

    const rejectRes = await request(app)
      .post(`/api/v1/admin/seller-applications/${applicationId}/reject`)
      .set("Authorization", `Bearer ${tokenFor(admin)}`)
      .send({ reason: "Business category not permitted on the marketplace." });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.application.status).toBe("REJECTED");
    expect(rejectRes.body.data.application.rejectionReason).toBe(
      "Business category not permitted on the marketplace."
    );

    const auditEntry = await prisma.auditLog.findFirst({
      where: { entityType: "SellerApplication", entityId: applicationId, action: "SELLER_APPLICATION_REJECTED" },
    });
    expect(auditEntry).not.toBeNull();
  });

  it("rejects approving/rejecting an application that is not PENDING", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const buyer = await createUser();
    const submitRes = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`)
      .send(applicationPayload);
    const applicationId = submitRes.body.data.application.id;
    const adminToken = tokenFor(admin);

    await request(app)
      .post(`/api/v1/admin/seller-applications/${applicationId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const secondApprove = await request(app)
      .post(`/api/v1/admin/seller-applications/${applicationId}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(secondApprove.status).toBe(409);
    expect(secondApprove.body.error.code).toBe("APPLICATION_NOT_PENDING");

    const rejectAfterApprove = await request(app)
      .post(`/api/v1/admin/seller-applications/${applicationId}/reject`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Too late, already approved." });
    expect(rejectAfterApprove.status).toBe(409);
  });

  it("404s for an unknown application id", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const res = await request(app)
      .get("/api/v1/admin/seller-applications/does-not-exist")
      .set("Authorization", `Bearer ${tokenFor(admin)}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("SELLER_APPLICATION_NOT_FOUND");
  });

  it("generates a unique slug when two approved stores would otherwise share one", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const adminToken = tokenFor(admin);

    const buyerA = await createUser();
    const buyerB = await createUser();

    const appA = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${tokenFor(buyerA)}`)
      .send({ ...applicationPayload, storeName: "Same Name Store" });
    const appB = await request(app)
      .post("/api/v1/seller-applications")
      .set("Authorization", `Bearer ${tokenFor(buyerB)}`)
      .send({ ...applicationPayload, storeName: "Same Name Store" });

    const approveA = await request(app)
      .post(`/api/v1/admin/seller-applications/${appA.body.data.application.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);
    const approveB = await request(app)
      .post(`/api/v1/admin/seller-applications/${appB.body.data.application.id}/approve`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(approveA.body.data.store.slug).not.toBe(approveB.body.data.store.slug);
  });
});

describe("GET/PATCH /api/v1/stores/me", () => {
  it("requires an active seller capability", async () => {
    const buyer = await createUser();
    const res = await request(app)
      .get("/api/v1/stores/me")
      .set("Authorization", `Bearer ${tokenFor(buyer)}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELLER_CAPABILITY_REQUIRED");
  });

  it("lets an approved seller view and update their store, without changing the slug", async () => {
    const seller = await createUser();
    const store = await prisma.store.create({
      data: {
        sellerId: seller.id,
        name: "Original Name",
        slug: "original-slug",
        description: "Original description here.",
        businessCategory: "General",
        phone: "+2340000000000",
        email: seller.email,
        location: "Lagos",
      },
    });
    const token = tokenFor(seller);

    const getRes = await request(app).get("/api/v1/stores/me").set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.store.id).toBe(store.id);

    const updateRes = await request(app)
      .patch("/api/v1/stores/me")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Renamed Store" });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.store.name).toBe("Renamed Store");
    expect(updateRes.body.data.store.slug).toBe("original-slug");
  });

  it("blocks a suspended seller from viewing or editing their store", async () => {
    const seller = await createUser();
    await prisma.store.create({
      data: {
        sellerId: seller.id,
        name: "Suspended Store",
        slug: "suspended-store",
        description: "desc",
        businessCategory: "General",
        phone: "+2340000000000",
        email: seller.email,
        location: "Lagos",
        status: "SUSPENDED",
      },
    });

    const res = await request(app)
      .get("/api/v1/stores/me")
      .set("Authorization", `Bearer ${tokenFor(seller)}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("SELLER_CAPABILITY_REQUIRED");
  });
});
