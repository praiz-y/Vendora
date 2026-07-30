export interface EntitlementLatestVersion {
  version: number;
  fileType: string;
  fileSize: string;
  createdAt: string;
}

export interface DigitalEntitlement {
  id: string;
  userId: string;
  productId: string;
  orderItemId: string;
  grantedAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    images: { url: string }[];
    store: { id: string; name: string; slug: string };
  };
  latestVersion: EntitlementLatestVersion | null;
}

export interface DigitalDownload {
  fileKey: string;
  fileType: string;
  fileSize: string;
  version: number;
}
