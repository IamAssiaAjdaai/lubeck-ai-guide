import { describe, expect, it } from 'vitest';
import { createBrandContext } from '@marketing/core';
import { serviceCity, serviceCitySchema, withServiceCity } from './businessProfile';
const context = () => createBrandContext({rawText:'Fiktive Firma',identity:{name:'Fiktiv'},markets:[{id:'region',name:'Norddeutschland'},{id:'owner-city',name:'Lübeck'}]}, {contextId:'ctx',projectId:'project',briefSourceId:'manual',createdAt:'2026-10-23T00:00:00Z'});
describe('optional service city in existing markets contract',()=>{
 it('reads historical city, edits without mutating other markets, and clears only the city',()=>{
  const c=context();expect(serviceCity(c)).toBe('Lübeck');
  expect(withServiceCity(c,'  Düsseldorf  ')).toEqual([{id:'region',name:'Norddeutschland'},{id:'owner-service-city',name:'Düsseldorf'}]);
  expect(c.markets[1].name).toBe('Lübeck');expect(withServiceCity(c,'')).toEqual([{id:'region',name:'Norddeutschland'}]);
 });
 it('allows optional and international names but rejects overlong and control-character input',()=>{
  for(const city of ['', 'Frankfurt am Main','Köln / Bonn','Saint-Étienne'])expect(serviceCitySchema.safeParse(city).success).toBe(true);
  for(const city of ['x'.repeat(161),'Düssel\u0000dorf'])expect(serviceCitySchema.safeParse(city).success).toBe(false);
  expect(serviceCity(null)).toBe('');expect(withServiceCity(null,'')).toEqual([]);
 });
});
