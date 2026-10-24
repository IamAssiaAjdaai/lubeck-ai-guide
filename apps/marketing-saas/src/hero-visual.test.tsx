import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import WorkspaceHeroVisual from './WorkspaceHeroVisual';
afterEach(cleanup);
const photo={url:'/api/projects/a/creative/assets/own',alt:'Eigene freigegebene Geschäftsaufnahme',postIndex:0,role:'business_photo'};
function hero(source:Parameters<typeof WorkspaceHeroVisual>[0]['photo']=photo,projectId:string|undefined='a') {return <figure><WorkspaceHeroVisual photo={source} projectId={projectId}/></figure>;}
describe('Context-safe workspace hero',()=>{
 it('renders a brand illustration with no photograph or D2 asset when no approved source exists',()=>{
  render(<figure><WorkspaceHeroVisual projectId="a"/></figure>);
  expect(screen.getByRole('img',{name:/Abstrakte Markenillustration/})).toBeTruthy();
  expect(document.querySelector('img')).toBeNull();expect(screen.getByText('Markenillustration · kein Unternehmensfoto')).toBeTruthy();
 });
 it('renders only the selected tenant-authorized business photo passed from exact reviewed source selection',()=>{
  render(hero());expect(screen.getByRole('img',{name:photo.alt}).getAttribute('src')).toBe(photo.url);
  expect(screen.getByText('Freigegebene eigene Bildquelle')).toBeTruthy();expect(document.querySelector('svg')).toBeNull();
 });
 it('rejects logos, other asset roles and missing role metadata',()=>{
  for(const role of ['logo','style_reference',undefined]){
   const view=render(hero({...photo,role}));expect(document.querySelector('img')).toBeNull();view.unmount();
  }
 });
 it('rejects another project, external URLs and missing selected-project identity',()=>{
  for(const url of ['/api/projects/b/creative/assets/own','https://example.test/photo.png','/landing-d2/HERO-02.webp']){
   const view=render(hero({...photo,url}));expect(document.querySelector('img')).toBeNull();view.unmount();
  }
  render(<WorkspaceHeroVisual photo={photo}/>);expect(document.querySelector('img')).toBeNull();
 });
 it('falls back safely on deleted, denied or changed source responses and never retries a failed URL automatically',()=>{
  const view=render(hero());fireEvent.error(screen.getByRole('img',{name:photo.alt}));
  expect(document.querySelector('img')).toBeNull();expect(screen.getByText('Bild nicht verfügbar · Markenillustration')).toBeTruthy();
  view.rerender(hero());expect(document.querySelector('img')).toBeNull();
  view.rerender(hero({...photo,url:'/api/projects/a/creative/assets/new'}));expect(screen.getByRole('img',{name:photo.alt})).toBeTruthy();
 });
 it('discards a previous tenant photo immediately when the selected project changes',()=>{
  const view=render(hero());view.rerender(hero(photo,'b'));expect(document.querySelector('img')).toBeNull();
  expect(screen.getByRole('img',{name:/kein Foto eines Unternehmens/})).toBeTruthy();
 });
});
