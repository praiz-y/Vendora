import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function iconProps(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  );
}

export function HeartIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...iconProps(props)} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20.5s-7.2-4.6-9.8-9c-1.7-2.9-.9-6.5 2.2-7.8 2.5-1 5 .3 7.6 3 2.6-2.7 5.1-4 7.6-3 3.1 1.3 3.9 4.9 2.2 7.8-2.6 4.4-9.8 9-9.8 9Z" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 4h1.6l1.3 11.4a2 2 0 0 0 2 1.8h7.8a2 2 0 0 0 2-1.7L20 8H6.2" />
      <circle cx="9.5" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.2-3.7 4.2-6 7.5-6s6.3 2.3 7.5 6" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.3 5.6 1.9 6.2.3.3.1.8-.3.8H4.4c-.4 0-.6-.5-.3-.8C4.7 15.6 6 14 6 10Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5" />
    </svg>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="2.5" y="7" width="11" height="9" rx="1" />
      <path d="M13.5 10h3.5l3 3.2V16h-6.5" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </svg>
  );
}

export function RefundIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 12a8 8 0 1 0 2.6-5.9" />
      <path d="M4 4v4.5h4.5" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </svg>
  );
}

// Generic, simplified glyphs (not brand logos) — used only as illustrative
// placeholders in the Footer, since Vendora has no real social accounts yet.
export function SocialXIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function SocialCameraIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="6.5" width="18" height="13" rx="2.5" />
      <circle cx="12" cy="13" r="3.5" />
      <path d="M8.5 6.5 10 4h4l1.5 2.5" />
    </svg>
  );
}

export function SocialFlagIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M6 3v18" />
      <path d="M6 4.5c2-1.2 4-1.2 6 0s4 1.2 6 0v8c-2 1.2-4 1.2-6 0s-4-1.2-6 0Z" />
    </svg>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 20V10M11 20V4M18 20v-7" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)} fill="currentColor" stroke="none">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

export function StoreIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M4 9.5 5 4h14l1 5.5" />
      <path d="M3.5 9.5a2.3 2.3 0 0 0 4.5.7 2.3 2.3 0 0 0 4.5 0 2.3 2.3 0 0 0 4.5 0 2.3 2.3 0 0 0 4.5-.7" />
      <path d="M5 11v9h14v-9" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export function StarIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...iconProps(props)} fill={filled ? "currentColor" : "none"}>
      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8Z" />
    </svg>
  );
}
