const STORAGE_KEY = "vendora_visitor_id";

// A stable anonymous id for Phase 11 view analytics — only ever read by the
// backend for a request with no access token attached (a logged-in view
// records against userId instead, see marketplace.service.recordProductView).
export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
