import { useLayoutEffect, useState, type RefObject } from 'react';

/** Progressive enhancement: content is visible without observers or animations. */
export function useD2Motion(root: RefObject<HTMLDivElement | null>) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useLayoutEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);
  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    const enabled = !paused && !reduced && !document.documentElement.hasAttribute('data-d2-capture');
    page.setAttribute('data-d2-motion', enabled ? 'on' : 'off');
    if (!enabled || typeof page.animate !== 'function') return;
    const animations: Animation[] = [];
    const reveal = (element: Element, delay = 0) => {
      animations.push(element.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 520, delay, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'backwards' }));
    };
    page.querySelectorAll('.d2-hero-copy > *').forEach((element, index) => reveal(element, index * 65));
    reveal(page.querySelector('.d2-hero-art')!, 110);
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) {
          reveal(entry.target); observer?.unobserve(entry.target);
        }
      }, { threshold: .08 });
      page.querySelectorAll('[data-d2-reveal]').forEach(element => observer!.observe(element));
    }
    return () => {
      observer?.disconnect();
      animations.forEach(animation => animation.cancel());
      page.setAttribute('data-d2-motion', 'off');
    };
  }, [root, paused, reduced]);
  return { paused, reduced, toggle: () => setPaused(value => !value) };
}
