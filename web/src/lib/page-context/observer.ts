import type { PageContextValue } from "./store";

// SDD-04 D-34 / DD-21 — one `IntersectionObserver` for both section- and
// Case-Study-level elements. Elements opt in via `data-agent-section="<id>"`
// / `data-agent-case-study="<id>"` (see the portfolio components that set
// these) rather than this module hardcoding SDD-01's content ids.

export type PageContextObserverOptions = {
  rootMargin?: string;
  threshold?: number[];
};

// A thin band near the top of the viewport — the section "at the top" is
// the active one, matching common scroll-spy behavior.
const DEFAULT_ROOT_MARGIN = "-10% 0px -70% 0px";
const DEFAULT_THRESHOLD = [0, 0.25, 0.5, 0.75, 1];

const SECTION_ATTR = "data-agent-section";
const CASE_STUDY_ATTR = "data-agent-case-study";

type Candidate = { id: string; ratio: number; order: number };

function pickBest(elements: HTMLElement[], attr: string, ratios: Map<Element, number>, order: Map<Element, number>): Candidate | null {
  let best: Candidate | null = null;
  for (const el of elements) {
    const ratio = ratios.get(el) ?? 0;
    if (ratio <= 0) continue;
    const id = el.getAttribute(attr);
    if (id === null) continue;
    const elOrder = order.get(el) ?? 0;
    // Max intersection ratio wins; ties break by document order (DD-21).
    if (best === null || ratio > best.ratio || (ratio === best.ratio && elOrder < best.order)) {
      best = { id, ratio, order: elOrder };
    }
  }
  return best;
}

/**
 * Starts observing and returns an unsubscribe function. Safe to call in
 * environments without `IntersectionObserver` (SSR / old browsers) — it
 * becomes a no-op rather than throwing.
 */
export function startPageContextObserver(
  onChange: (value: PageContextValue) => void,
  options: PageContextObserverOptions = {},
): () => void {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  const sectionEls = Array.from(document.querySelectorAll<HTMLElement>(`[${SECTION_ATTR}]`));
  const caseStudyEls = Array.from(document.querySelectorAll<HTMLElement>(`[${CASE_STUDY_ATTR}]`));
  if (sectionEls.length === 0 && caseStudyEls.length === 0) {
    return () => {};
  }

  const order = new Map<Element, number>();
  [...sectionEls, ...caseStudyEls].forEach((el, i) => order.set(el, i));
  const ratios = new Map<Element, number>();

  function commit(): void {
    // Case Study nesting (§DD-21): a Case Study winning means the section
    // is "experience" by definition, regardless of which top-level section
    // element is technically also intersecting.
    const bestCaseStudy = pickBest(caseStudyEls, CASE_STUDY_ATTR, ratios, order);
    if (bestCaseStudy !== null) {
      onChange({ section: "experience", caseStudy: bestCaseStudy.id });
      return;
    }
    const bestSection = pickBest(sectionEls, SECTION_ATTR, ratios, order);
    if (bestSection !== null) {
      onChange({ section: bestSection.id, caseStudy: null });
      return;
    }
    // SDD-08 DD-37 — nothing intersects (scrolled to a gap, or the
    // portfolio is hidden behind the mobile overlay via `display: none`,
    // which makes every observed element stop intersecting at once).
    // Report nothing rather than resetting to null: a visitor reading a
    // Case Study who opens the overlay must still get that Case Study's
    // context, not a wiped one (PRD §9.1's core scenario).
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0);
      }
      commit();
    },
    { rootMargin: options.rootMargin ?? DEFAULT_ROOT_MARGIN, threshold: options.threshold ?? DEFAULT_THRESHOLD },
  );

  for (const el of sectionEls) observer.observe(el);
  for (const el of caseStudyEls) observer.observe(el);

  return () => observer.disconnect();
}
