import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

// UI Refactoring §13/§17 — the two pill-button "families" repeated across
// the app (solid accent / bordered) with inconsistent padding per call site.
// Neither `portfolio` nor `agent` may import each other (SDD-01 §6.3), so
// this lives in the neutral `components/ui` module both sides can import.
const VARIANT_CLASSES = {
  primary: "bg-accent text-accent-foreground hover:opacity-90",
  secondary: "border border-border text-text hover:bg-surface-muted",
} as const;

const SIZE_CLASSES = {
  md: "px-5 py-2.5 text-sm",
  sm: "px-3.5 py-2 text-xs",
} as const;

const BASE_CLASSES =
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40";

type ButtonVariant = keyof typeof VARIANT_CLASSES;
type ButtonSize = keyof typeof SIZE_CLASSES;

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export type ButtonProps =
  | (CommonProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">)
  | (CommonProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">);

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className = "", children, ...rest } = props;
  const classes = [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].join(" ").trim();

  if (rest.href !== undefined) {
    const { href, ...anchorRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {children}
      </a>
    );
  }

  const { type = "button", ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {children}
    </button>
  );
}
