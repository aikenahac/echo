import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

// Line glyphs drawn for the redesign (matched to the mobile mockup). Lucide stays
// in use only for user-chosen collection icons, which are data.
const paths = {
  books: <path d="M4 4.5h4v15H4zM10 4.5h4v15h-4zM15.6 5.3l3.8-1 3.6 14.4-3.8 1z" />,
  friends: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 13.6c2.6 0 4.3 1.6 4.8 4" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5 20 20" />
    </>
  ),
  minus: <path d="M6 12h12" />,
  plus: <path d="M12 6v12M6 12h12" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      <circle cx="18" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </>
  ),
  list: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  back: <path d="M15 5l-7 7 7 7" />,
  forward: <path d="M9 5l7 7-7 7" />,
  heart: (
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
  ),
  chev: <path d="M7 10l5 5 5-5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  star: (
    <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
  ),
  addPerson: (
    <>
      <circle cx="10" cy="8" r="3.4" />
      <path d="M3.5 19.5c.7-3.4 3.2-5.4 6.5-5.4 1.5 0 2.8.4 3.9 1.1M18 13v6M15 16h6" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.4 2.4 2.4 13.6 0 16M12 4c-2.4 2.4-2.4 13.6 0 16" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" />
    </>
  ),
  pen: <path d="M5 19l1-4L16 5l3 3L9 18z" />,
  folder: <path d="M4 7.5V18h16V9H11.5L9.5 6.5H4z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16M9.9 6A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-2.8 3.6M6.3 7.4A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9" rx="1.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="6" width="17" height="12.5" rx="1.5" />
      <path d="M4 7l8 6.5L20 7" />
    </>
  ),
  external: <path d="M9 5H5.5v13.5H19V15M13 5h6v6M19 5l-8.5 8.5" />,
  shield: <path d="M12 3.5l7 2.8v5.3c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6.3z" />,
  trash: <path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" />,
  sort: <path d="M7 5v14M4 8l3-3 3 3M17 19V5M14 16l3 3 3-3" />,
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
    </>
  ),
  premium: <path d="M4 18h16M5 16l-1-9 5 4 3-6 3 6 5-4-1 9z" />,
  sparkle: <path d="M12 3.5Q13 11 20.5 12Q13 13 12 20.5Q11 13 3.5 12Q11 11 12 3.5z" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 22,
  className,
  strokeWidth = 1.8,
  filled,
  ...props
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
} & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("block flex-none", className)}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

/** The two-ribbon Echo mark: an ink ribbon over a pink-ink one. */
export function EchoMark({
  className,
  height = 32,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <svg
      viewBox="124 0 98 250"
      height={height}
      width={(height * 98) / 250}
      aria-hidden
      className={cn("block flex-none", className)}
    >
      <path
        d="M150 0h70v226l-35-30-35 30z"
        fill="var(--plate)"
        transform="translate(28 0)"
      />
      <path d="M124 0h70v250l-35-30-35 30z" fill="var(--ink)" />
    </svg>
  );
}
