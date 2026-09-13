import type { SVGProps } from "react";

const paths = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  settings: "M9.5 3h5l.6 2.4 2 .9 2.2-.8 2.5 4.3-1.6 1.7v2.3l1.6 1.7-2.5 4.3-2.2-.8-2 .9-.6 2.1h-5l-.6-2.1-2-.9-2.2.8-2.5-4.3 1.6-1.7v-2.3L1.7 9.8l2.5-4.3 2.2.8 2-.9L9.5 3ZM15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z",
  plus: "M12 5v14M5 12h14",
  search: "m21 21-5-5M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  close: "m6 6 12 12M18 6 6 18",
  download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",
  documentPlus: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 14h6M12 11v6",
  check: "m5 12 4 4L19 6",
  chevron: "m6 9 6 6 6-6",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  edit: "m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z",
  monitor: "M3 3h18v14H3zM12 17v4M8 21h8",
} as const;

interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof paths;
  size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
