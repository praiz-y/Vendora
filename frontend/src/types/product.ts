export type CategoryStatus = "ACTIVE" | "ARCHIVED";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
}

export type ProductType = "PHYSICAL" | "DIGITAL";
export type ShippingType = "FREE" | "FIXED";
export type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  publicId: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface DigitalProductVersion {
  id: string;
  productId: string;
  version: number;
  fileKey: string;
  fileType: string;
  fileSize: string;
  createdAt: string;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  type: ProductType;
  price: string;
  stockQuantity: number | null;
  shippingType: ShippingType | null;
  shippingFee: string | null;
  status: ProductStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
  digitalVersions: DigitalProductVersion[];
  category: { id: string; name: string; slug: string };
}

export interface AdminProduct extends Product {
  store: { id: string; name: string; slug: string; sellerId: string };
}

// The public/marketplace shape (GET /marketplace/products*) is deliberately
// narrower than Product — no status/rejectionReason/digitalVersions, see
// backend/src/modules/marketplace/marketplace.service.ts's publicProductSelect.
export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: ProductType;
  price: string;
  stockQuantity: number | null;
  shippingType: ShippingType | null;
  shippingFee: string | null;
  createdAt: string;
  images: { id: string; url: string; isPrimary: boolean }[];
  category: { id: string; name: string; slug: string };
  store: { id: string; name: string; slug: string };
}

// The public/marketplace store shape — no phone/email, see
// marketplace.service.ts's publicStoreSelect.
export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  businessCategory: string;
  location: string;
  createdAt: string;
}
