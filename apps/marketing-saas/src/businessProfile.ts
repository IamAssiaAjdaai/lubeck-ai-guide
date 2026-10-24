import { z } from 'zod';
import type { BrandContext } from '@marketing/core';
export const serviceCitySchema = z.string().trim().max(160, 'Bitte höchstens 160 Zeichen für den Einsatzort verwenden.')
  .refine(value => !Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127), 'Bitte einen Ort ohne Steuerzeichen eingeben.');
const cityIds = new Set(['owner-service-city', 'owner-city']);
export function serviceCity(context: BrandContext | null) {
  return context?.markets.find(m => cityIds.has(m.id))?.name ?? '';
}
export function withServiceCity(context: BrandContext | null, input: string) {
  const city = serviceCitySchema.parse(input);
  const markets = (context?.markets ?? []).filter(m => !cityIds.has(m.id));
  return city ? [...markets, { id: 'owner-service-city', name: city }] : markets;
}
