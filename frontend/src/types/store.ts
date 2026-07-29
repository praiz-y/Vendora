export type SellerApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type StoreStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface SellerApplication {
  id: string;
  userId: string;
  storeName: string;
  storeDescription: string;
  storeLogoUrl: string | null;
  storeBannerUrl: string | null;
  businessCategory: string;
  phone: string;
  email: string;
  location: string;
  businessRegistration: string | null;
  status: SellerApplicationStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedById: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SellerApplicationApplicant {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
}

export interface SellerApplicationWithApplicant extends SellerApplication {
  applicant: SellerApplicationApplicant;
}

export interface Store {
  id: string;
  sellerId: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  businessCategory: string;
  phone: string;
  email: string;
  location: string;
  businessRegistration: string | null;
  status: StoreStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
