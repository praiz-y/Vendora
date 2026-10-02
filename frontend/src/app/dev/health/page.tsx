import { notFound } from "next/navigation";
import { HealthCheckClient } from "./HealthCheckClient";

// Setup/verification aid only — 404 in production builds.
export default function HealthCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <HealthCheckClient />;
}
