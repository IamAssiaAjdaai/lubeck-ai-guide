import sharp, { type OverlayOptions } from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import type { Brief } from "./contract";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export const digest = (value: unknown) =>
  createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(canonical(value)),
    )
    .digest("hex");
export const mockDisclosure = "MOCK – OHNE KI GENERIERT";
export const MAX_UPLOAD = 3 * 1024 * 1024;
export async function normalizeImage(bytes: Buffer, mime: string) {
  if (!bytes.length || bytes.length > MAX_UPLOAD)
    throw new Error("IMAGE_SIZE_LIMIT");
  const allowed: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/webp": "webp",
  };
  if (!allowed[mime]) throw new Error("IMAGE_TYPE_REJECTED");
  // Reject active formats before invoking ANY native format auto-detection/parser.
  const signature =
    mime === "image/png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === "image/jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
          bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!signature) throw new Error("IMAGE_MAGIC_REJECTED");
  const image = sharp(bytes, {
    limitInputPixels: 16_777_216,
    failOn: "warning",
    animated: true,
  });
  const meta = await image.metadata();
  if (
    meta.format !== allowed[mime] ||
    !meta.width ||
    !meta.height ||
    meta.width < 16 ||
    meta.height < 16 ||
    meta.width > 4096 ||
    meta.height > 4096 ||
    (meta.pages ?? 1) !== 1
  )
    throw new Error("IMAGE_FORMAT_OR_DIMENSIONS_REJECTED");
  // Decode + re-encode, strip EXIF/GPS/active content; never serve submitted bytes.
  const normalized = await image
    .rotate()
    .png()
    .toBuffer({ resolveWithObject: true });
  if (normalized.data.length > 8 * 1024 * 1024)
    throw new Error("NORMALIZED_IMAGE_SIZE_LIMIT");
  return normalized;
}
export interface ImageProvider {
  readonly id: "mock";
  background(brief: Brief): Promise<Buffer>;
}
/** Authored procedural illustration. No SDK, fetch, credential or vendor route exists. */
export const mockImageProvider: ImageProvider = {
  id: "mock",
  async background(brief) {
    const [width, height] = dimensions(brief.ratio);
    const [ink, sage, lime, lilac = "#C8BCEE"] = brief.kit.colors;
    const styleShift =
      brief.creative?.style === "editorial"
        ? 30
        : brief.creative?.style === "geometrisch"
          ? 60
          : 0;
    const shift =
      styleShift +
      (brief.objective === "leistung_erklaeren"
        ? 0
        : brief.objective === "gespraech_anregen"
          ? 90
          : 180);
    return sharp(
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${sage}"/><circle cx="${width * 0.72}" cy="${height * 0.47}" r="${width * 0.3}" fill="${lime}"/><rect x="${width * 0.12}" y="${height * 0.28}" width="${width * 0.48}" height="${height * 0.35}" rx="${40 + shift / 4}" fill="${ink}"/><circle cx="${width * 0.48}" cy="${height * 0.55}" r="${width * 0.13}" fill="${lilac}"/></svg>`,
      ),
    )
      .png()
      .toBuffer();
  },
};
export function dimensions(ratio: Brief["ratio"]): [number, number] {
  return ratio === "4:5"
    ? [800, 1000]
    : ratio === "16:9"
      ? [960, 540]
      : [800, 800];
}
/** Exact brand layers are deterministic; provider background never draws the logo/text. */
let fontSetup: Promise<void> | undefined;
async function fonts() {
  fontSetup ??= (async () => {
    const directory = join(tmpdir(), "marketing-creative-fonts");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const file = join(directory, "fonts.conf");
    const fontDir = fileURLToPath(
      new URL("../../../marketing-saas/public/brand/fonts", import.meta.url),
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;");
    await writeFile(
      file,
      `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd"><fontconfig><dir>${fontDir}</dir><cachedir>${directory}</cachedir></fontconfig>`,
      { mode: 0o600 },
    );
    process.env.FONTCONFIG_FILE = file;
  })();
  await fontSetup;
}
export async function compose(
  brief: Brief,
  background: Buffer,
  logo?: Buffer,
  mock = true,
) {
  await fonts();
  const [width, height] = dimensions(brief.ratio);
  const fontfile = fileURLToPath(
    new URL(
      `../../../marketing-saas/public/brand/fonts/${brief.kit.typography.toLowerCase()}.woff2`,
      import.meta.url,
    ),
  );
  const label = await sharp({
    text: {
      text: '<span foreground="#162D2C">DEMO · SYNTHETISCHE ILLUSTRATION</span>',
      font: "Manrope 22",
      fontfile: fileURLToPath(
        new URL(
          "../../../marketing-saas/public/brand/fonts/manrope.woff2",
          import.meta.url,
        ),
      ),
      rgba: true,
    },
  })
    .png()
    .toBuffer();
  const mockLabel = await sharp({
    text: {
      text: `<span foreground="#162D2C" weight="bold">${mock ? mockDisclosure : "KI – SYNTHETISCHE ILLUSTRATION"}</span>`,
      font: "Manrope Bold 28",
      fontfile: fileURLToPath(
        new URL(
          "../../../marketing-saas/public/brand/fonts/manrope.woff2",
          import.meta.url,
        ),
      ),
      rgba: true,
    },
  })
    .png()
    .toBuffer();
  const heading = await sharp({
    text: {
      text:
        brief.objective === "leistung_erklaeren"
          ? "Raum für deine Leistung."
          : brief.objective === "gespraech_anregen"
            ? "Zeit für ein Gespräch."
            : "Deine Marke. Klar erkennbar.",
      font: `${brief.kit.typography} 30`,
      fontfile,
      rgba: true,
      width: width - 80,
    },
  })
    .png()
    .toBuffer();
  const layers: OverlayOptions[] = [
    {
      input: await sharp({
        create: { width, height: 200, channels: 4, background: "#F0F3EC" },
      })
        .png()
        .toBuffer(),
      top: height - 200,
      left: 0,
    },
    { input: heading, top: height - 174, left: 32 },
    { input: mockLabel, top: height - 112, left: 32 },
    { input: label, top: height - 48, left: 32 },
  ];
  if (logo)
    layers.push({
      input: await sharp(logo)
        .resize({ width: 110, height: 80, fit: "inside" })
        .png()
        .toBuffer(),
      top: 24,
      left: 32,
    });
  return sharp(background).composite(layers).png().toBuffer();
}
