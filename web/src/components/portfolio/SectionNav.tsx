export type NavItem = {
  id: string;
  label: string;
};

export type SectionNavProps = {
  items: NavItem[];
};

// Anchor links only — no scroll-spy / current-position highlight yet (O-08,
// deferred to SDD-04 alongside section detection). Every link is a same-page
// `#anchor` href, so navigating never issues a network request (INV-02).
export function SectionNav({ items }: SectionNavProps) {
  return (
    <nav aria-label="Section navigation" className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border py-4 text-sm">
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} className="text-text-muted transition-colors hover:text-text">
          {item.label}
        </a>
      ))}
    </nav>
  );
}
