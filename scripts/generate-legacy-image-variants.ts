import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { cities } from "../src/data/cities";
import { lubeckPlaces } from "../src/data/places";
import {
  PUBLIC_IMAGE_VARIANT_SPECS,
  legacyImageVariantPath,
} from "../src/lib/media/imageVariants";
import type { PublicImageVariant } from "../src/lib/media/types";

const root = process.cwd();
const sources = [
  cities.lubeck.heroImage,
  ...lubeckPlaces.flatMap(({ image }) => image ? [image] : []),
];
const uniqueSources = [...new Set(sources)];

for (const source of uniqueSources) {
  const inputPath = path.join(root, "public", source.replace(/^\/+/, ""));
  const input = await readFile(inputPath);

  for (const [variant, spec] of Object.entries(PUBLIC_IMAGE_VARIANT_SPECS) as [
    PublicImageVariant,
    (typeof PUBLIC_IMAGE_VARIANT_SPECS)[PublicImageVariant],
  ][]) {
    const publicPath = legacyImageVariantPath(source, variant);
    const outputPath = path.join(root, "public", publicPath.replace(/^\/+/, ""));
    await mkdir(path.dirname(outputPath), { recursive: true });
    const output = await sharp(input, { failOn: "warning" })
      .rotate()
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: spec.quality, effort: 4 })
      .toBuffer();
    await writeFile(outputPath, output);
  }
}

console.log(
  `Generated ${uniqueSources.length * Object.keys(PUBLIC_IMAGE_VARIANT_SPECS).length} legacy image variants.`,
);
