export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED";
export type StoreStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

export interface SellerCapability {
  status: StoreStatus;
  storeId: string;
  storeSlug: string;
  storeName: string;
}

export interface SafeUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  isAdmin: boolean;
  seller: SellerCapability | null;
}

export interface Address {
  id: string;
  userId: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
