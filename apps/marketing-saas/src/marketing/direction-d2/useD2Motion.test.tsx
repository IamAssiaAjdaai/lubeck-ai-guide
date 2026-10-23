import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useD2Motion } from './useD2Motion';
const cancellations: ReturnType<typeof vi.fn>[]=[];
let change: (()=>void) | undefined;
const query={matches:false,addEventListener:vi.fn((_event:string,fn:()=>void)=>{change=fn;}),removeEventListener:vi.fn()};
const disconnect=vi.fn();
const originalAnimate=Object.getOwnPropertyDescriptor(Element.prototype,'animate');
function Fixture(){const ref=useRef<HTMLDivElement>(null);const motion=useD2Motion(ref);return <div ref={ref} data-testid="page"><div className="d2-hero-copy"><h1>Visible title</h1><p>Visible copy</p></div><div className="d2-hero-art"/><section data-d2-reveal>Visible content</section><button onClick={motion.toggle}>Pause</button></div>;}
beforeEach(()=>{
 cancellations.length=0;query.matches=false;change=undefined;vi.clearAllMocks();
 vi.stubGlobal('matchMedia',()=>query);
 vi.stubGlobal('IntersectionObserver',class {observe=vi.fn();unobserve=vi.fn();disconnect=disconnect;});
 Object.defineProperty(Element.prototype,'animate',{configurable:true,value:()=>{const cancel=vi.fn();cancellations.push(cancel);return {cancel} as unknown as Animation;}});
});
afterEach(()=>{cleanup();if(originalAnimate)Object.defineProperty(Element.prototype,'animate',originalAnimate);else Reflect.deleteProperty(Element.prototype,'animate');document.documentElement.removeAttribute('data-d2-capture');vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('D2 native motion progressive enhancement',()=>{
 it('reveals without hiding baseline content and cancels on pause/unmount',()=>{
  const view=render(<Fixture/>);expect(screen.getByTestId('page').dataset.d2Motion).toBe('on');expect(cancellations.length).toBe(3);
  expect(screen.getByText('Visible content').getAttribute('style')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Pause'}));
  expect(screen.getByTestId('page').dataset.d2Motion).toBe('off');expect(cancellations.every(c=>c.mock.calls.length===1)).toBe(true);expect(disconnect).toHaveBeenCalled();view.unmount();
 });
 it('honors initial and live reduced-motion preferences',()=>{
  query.matches=true;render(<Fixture/>);expect(cancellations).toHaveLength(0);
  act(()=>{query.matches=false;change!();});expect(cancellations).toHaveLength(3);
  act(()=>{query.matches=true;change!();});expect(cancellations.every(c=>c.mock.calls.length===1)).toBe(true);expect(screen.getByTestId('page').dataset.d2Motion).toBe('off');
 });
 it('suppresses entrances during explicit automated capture',()=>{
  document.documentElement.setAttribute('data-d2-capture','true');render(<Fixture/>);expect(cancellations).toHaveLength(0);expect(screen.getByText('Visible title')).toBeTruthy();
 });
 it('keeps content visible when observers are unavailable',()=>{
  vi.stubGlobal('IntersectionObserver',undefined);render(<Fixture/>);expect(screen.getByText('Visible content').getAttribute('style')).toBeNull();
 });
});
