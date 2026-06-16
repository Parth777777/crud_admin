/** Minimal inline SVG icons (no icon library needed). */
import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
);
export const BookIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M19 19H6" /></svg>
);
export const ChefIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 13a4 4 0 1 1 1-7.87A4 4 0 0 1 15 4a4 4 0 0 1 3 8" /><path d="M7 13h10v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /></svg>
);
export const BagIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M6 7h12l-1 13H7z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
);
export const PantryIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 12h16M10 6v2M10 15v2" /></svg>
);
export const HeartIcon = (p: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base(p)} fill={p.filled ? "currentColor" : "none"}>
    <path d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.5 0 5 3 3.5 6.5C19 15.65 12 20 12 20z" />
  </svg>
);
export const StarIcon = (p: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base(p)} fill={p.filled ? "currentColor" : "none"}>
    <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13h10l1-13" /></svg>
);
export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
);
export const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
);
export const ShuffleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
);
export const ShieldIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const ImageIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="9" r="1.5" /><path d="m21 16-5-5-7 7" /></svg>
);
