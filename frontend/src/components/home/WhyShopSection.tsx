import { CheckCircleIcon, HeartIcon, RefundIcon, UserIcon } from "@/components/icons";

// Static, no backend — a trust-building "breather" row between browsing
// sections (Part 3). Deliberately grounded in things Vendora actually does
// (vetting, approval, refunds) rather than generic marketplace filler, and
// deliberately excludes any "secure payments" claim — no payment provider
// is finalized yet, so that copy would overclaim something not true.
const VALUE_PROPS = [
  {
    icon: UserIcon,
    title: "Vetted Sellers",
    description: "Every seller application is reviewed by an admin before a store can open.",
  },
  {
    icon: CheckCircleIcon,
    title: "Every Product Reviewed",
    description: "Products go through admin approval before going live, not posted instantly.",
  },
  {
    icon: RefundIcon,
    title: "Buyer Protection",
    description: "Real refund and product-report flows exist if something goes wrong.",
  },
  {
    icon: HeartIcon,
    title: "Support Independent Sellers",
    description: "Shop small and artisan sellers building their business on Vendora.",
  },
] as const;

export function WhyShopSection() {
  return (
    <section className="flex flex-col gap-6 rounded-lg bg-surface-alt px-4 py-10 sm:px-8">
      <h2 className="text-center text-lg font-semibold text-heading">Why Shop on Vendora</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <p className="text-sm font-semibold text-heading">{title}</p>
            <p className="text-xs text-muted">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
