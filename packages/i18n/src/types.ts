import type en from "./locales/en.json";
export type MessageTree = { readonly [key: string]: string | MessageTree };
type Paths<T> = { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];
export type TranslationKey = Paths<typeof en>;
export type TranslationValues = Readonly<Record<string, string | number>>;
export type Dictionary = typeof en;
export type KeyMap = { readonly [key: string]: TranslationKey | KeyMap };
export type TranslatedMap<T> = { readonly [K in keyof T]: T[K] extends string ? string : TranslatedMap<T[K]> };
