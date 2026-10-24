import { useEffect, useRef, type RefObject } from 'react';

/** Native modal semantics, plus reversible page lock and exact opener restoration. */
export function useDemoDialog(dialog: RefObject<HTMLDialogElement | null>) {
  const restore = useRef<(() => void) | null>(null);
  useEffect(() => {
    const node = dialog.current;
    const release = () => { restore.current?.(); restore.current = null; };
    const close = () => { if (!node?.open) release(); };
    node?.addEventListener('close', close);
    return () => { node?.removeEventListener('close', close); release(); };
  }, [dialog]);
  return () => {
    const node = dialog.current;
    if (!node || node.open) return;
    // A close event may still be queued when a user immediately reopens.
    restore.current?.(); restore.current = null;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const x = window.scrollX, y = window.scrollY;
    const body = document.body, html = document.documentElement;
    const bodyKeys = ['position','top','left','width','overflow'] as const;
    const htmlKeys = ['overflow','scrollbar-gutter'] as const;
    const previous = (element: HTMLElement, keys: readonly string[]) => keys.map(key => [key, element.style.getPropertyValue(key), element.style.getPropertyPriority(key)]);
    const bodyStyles = previous(body, bodyKeys), htmlStyles = previous(html, htmlKeys);
    const reset = (element: HTMLElement, values: string[][]) => values.forEach(([key,value,priority]) => value ? element.style.setProperty(key,value,priority) : element.style.removeProperty(key));
    restore.current = () => {
      reset(body, bodyStyles); reset(html, htmlStyles);
      window.scrollTo({ left: x, top: y, behavior: 'instant' });
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    html.style.setProperty('scrollbar-gutter','stable');
    html.style.setProperty('overflow','hidden');
    body.style.setProperty('position','fixed');
    body.style.setProperty('top',`${-y}px`);
    body.style.setProperty('left',`${-x}px`);
    body.style.setProperty('width','100%');
    body.style.setProperty('overflow','hidden');
    try { node.showModal(); } catch (error) {
      restore.current?.(); restore.current = null; throw error;
    }
  };
}
