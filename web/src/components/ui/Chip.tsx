import type { ReactNode } from "react";

// UI Refactoring §17 — the small rounded-pill "tag" look duplicated across
// CaseStudyCard tech tags/status pill and StarterPrompts. Renders a <span>
// when static (tags), or a <button> when `onClick` is supplied (StarterPrompts).
const TONE_CLASSES = {
  outline: "border border-border text-text-muted",
  solid: "bg-surface-muted font-medium text-text-muted",
} as const;

const SIZE_CLASSES = {
  tag: "px-2.5 py-0.5 text-xs",
  action: "px-2.5 py-1 text-[11px]",
} as const;

type ChipTone = keyof typeof TONE_CLASSES;
type ChipSize = keyof typeof SIZE_CLASSES;

type ChipBaseProps = {
  tone?: ChipTone;
  size?: ChipSize;
  className?: string;
  children: ReactNode;
};

export type ChipProps = ChipBaseProps & ({ onClick?: undefined; disabled?: undefined } | { onClick: () => void; disabled?: boolean });

export function Chip({ tone = "outline", size = "tag", className = "", children, ...rest }: ChipProps) {
  const classes = [
    "inline-flex items-center gap-1 rounded-pill transition-colors",
    TONE_CLASSES[tone],
    SIZE_CLASSES[size],
    rest.onClick
      ? "hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (rest.onClick) {
    return (
      <button type="button" onClick={rest.onClick} disabled={rest.disabled} className={classes}>
        {children}
      </button>
    );
  }

  return <span className={classes}>{children}</span>;
}
