import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { useDemoDialog } from './useDemoDialog';
const showDescriptor=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'showModal');
const closeDescriptor=Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype,'close');
let originalBody='',originalHtml='';
function Fixture(){const dialog=useRef<HTMLDialogElement>(null);const open=useDemoDialog(dialog);return <><button onClick={open}>Open demo</button><dialog ref={dialog}><button onClick={()=>dialog.current?.close()}>Close demo</button></dialog></>;}
beforeEach(()=>{
 originalBody=document.body.style.cssText;originalHtml=document.documentElement.style.cssText;
 vi.stubGlobal('scrollX',12);vi.stubGlobal('scrollY',420);vi.stubGlobal('scrollTo',vi.fn());
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(this:HTMLDialogElement){this.open=true;}});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(this:HTMLDialogElement){this.open=false;this.dispatchEvent(new Event('close'));}});
});
afterEach(()=>{cleanup();document.body.style.cssText=originalBody;document.documentElement.style.cssText=originalHtml;for(const [key,descriptor] of [['showModal',showDescriptor],['close',closeDescriptor]] as const){if(descriptor)Object.defineProperty(HTMLDialogElement.prototype,key,descriptor);else Reflect.deleteProperty(HTMLDialogElement.prototype,key);}vi.unstubAllGlobals();});
describe('native demo dialog page-lock lifecycle',()=>{
 it('restores previous styles, exact scroll and the connected opener after closing',()=>{
  document.body.style.setProperty('position','relative','important');document.documentElement.style.overflow='auto';render(<Fixture/>);const opener=screen.getByRole('button',{name:'Open demo'});opener.focus();fireEvent.click(opener);
  expect(document.body.style.position).toBe('fixed');expect(document.body.style.top).toBe('-420px');expect(document.documentElement.style.overflow).toBe('hidden');
  fireEvent.click(opener);expect(document.body.style.top).toBe('-420px');const close=screen.getByRole('button',{name:'Close demo'});close.focus();fireEvent.click(close);
  expect(document.body.style.position).toBe('relative');expect(document.body.style.getPropertyPriority('position')).toBe('important');expect(document.documentElement.style.overflow).toBe('auto');expect(window.scrollTo).toHaveBeenCalledWith({left:12,top:420,behavior:'instant'});expect(document.activeElement).toBe(opener);
 });
 it('unlocks the page when the component unmounts while open',()=>{
  const view=render(<Fixture/>);fireEvent.click(screen.getByRole('button',{name:'Open demo'}));view.unmount();expect(document.body.style.position).not.toBe('fixed');expect(window.scrollTo).toHaveBeenCalled();
 });
 it('does not let an old queued close event unlock a newly reopened modal',()=>{
  render(<Fixture/>);const opener=screen.getByRole('button',{name:'Open demo'});opener.focus();fireEvent.click(opener);const dialog=document.querySelector('dialog')!;
  dialog.open=false;fireEvent.click(opener);dialog.dispatchEvent(new Event('close'));expect(dialog.open).toBe(true);expect(document.body.style.position).toBe('fixed');
  fireEvent.click(screen.getByRole('button',{name:'Close demo'}));expect(document.body.style.position).not.toBe('fixed');
 });
});
