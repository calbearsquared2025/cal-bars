#!/usr/bin/env node

import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PHOTO_DEFAULTS = Object.freeze({
  maxWidth: 1600,
  quality: 82,
  targetKb: 500,
  minQuality: 60,
  qualityStep: 6,
  publicBaseUrl: 'https://calgoldenbars.com/assets/venues'
});

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');

function valueAfter(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function positiveInteger(value, flag, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${flag} must be an integer from ${min} to ${max}`);
  }
  return number;
}

export function normalizeVenueSlug(value) {
  const slug = String(value || '').trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('--slug must use the canonical lowercase kebab-case venue slug');
  }
  return slug;
}

export function normalizeOptionalHttpUrl(value, flag = '--credit-url') {
  if (!value) return '';
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${flag} must be an http(s) URL`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${flag} must be an http(s) URL`);
  }
  return parsed.href;
}

export function parsePhotoArgs(argv) {
  const options = {
    input: '',
    slug: '',
    caption: '',
    credit: '',
    creditUrl: '',
    maxWidth: PHOTO_DEFAULTS.maxWidth,
    quality: PHOTO_DEFAULTS.quality,
    targetKb: PHOTO_DEFAULTS.targetKb,
    force: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    const value = valueAfter(argv, index, arg);
    index += 1;
    switch (arg) {
      case '--input':
        options.input = value;
        break;
      case '--slug':
        options.slug = normalizeVenueSlug(value);
        break;
      case '--caption':
        options.caption = value.trim();
        break;
      case '--credit':
        options.credit = value.trim();
        break;
      case '--credit-url':
        options.creditUrl = normalizeOptionalHttpUrl(value, arg);
        break;
      case '--max-width':
        options.maxWidth = positiveInteger(value, arg, { min: 400, max: 4000 });
        break;
      case '--quality':
        options.quality = positiveInteger(value, arg, { min: PHOTO_DEFAULTS.minQuality, max: 100 });
        break;
      case '--target-kb':
        options.targetKb = positiveInteger(value, arg, { min: 100, max: 2000 });
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }
  }

  if (!options.help) {
    if (!options.input) throw new Error('--input is required');
    if (!options.slug) throw new Error('--slug is required');
  }
  return options;
}

export function venuePhotoOutputPath(slug, repoRoot = REPO_ROOT) {
  return path.join(repoRoot, 'assets', 'venues', `${normalizeVenueSlug(slug)}.webp`);
}

export function venuePhotoPublicUrl(slug) {
  return `${PHOTO_DEFAULTS.publicBaseUrl}/${normalizeVenueSlug(slug)}.webp`;
}

export function helpText() {
  return `Process an approved venue photo into a public CGB asset.\n\nUsage:\n  node scripts/process-venue-photo.mjs --input <path> --slug <venue-slug> [options]\n\nRequired:\n  --input <path>       Approved source photo outside the public repo asset folder\n  --slug <slug>        Canonical lowercase kebab-case Venue slug\n\nOptional:\n  --caption <text>     Print proposed photo_caption metadata\n  --credit <text>      Print proposed photo_credit metadata\n  --credit-url <url>   Print proposed photo_credit_url metadata (http/https only)\n  --max-width <px>     Maximum output width; default ${PHOTO_DEFAULTS.maxWidth}\n  --quality <60-100>   Starting WebP quality; default ${PHOTO_DEFAULTS.quality}\n  --target-kb <kb>     Compression target ceiling; default ${PHOTO_DEFAULTS.targetKb}\n  --force              Allow overwriting an existing assets/venues/<slug>.webp\n  --help, -h           Show this help\n\nThe script preserves source aspect ratio. Venue Detail handles the visible 3:2 presentation.\n`;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadSharp() {
  try {
    const module = await import('sharp');
    return module.default || module;
  } catch (error) {
    throw new Error('sharp is not installed. Run npm install from the repository root before processing photos.', { cause: error });
  }
}

async function encodeAtQuality(sharp, inputPath, maxWidth, quality) {
  return sharp(inputPath, { failOn: 'error' })
    .rotate()
    .resize({
      width: maxWidth,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
}

export async function processVenuePhoto(options, { repoRoot = REPO_ROOT } = {}) {
  const inputPath = path.resolve(options.input);
  const outputPath = venuePhotoOutputPath(options.slug, repoRoot);

  if (inputPath === path.resolve(outputPath)) {
    throw new Error('input must be the private/source photo, not the final public asset path');
  }
  if (!(await fileExists(inputPath))) throw new Error(`input file does not exist: ${inputPath}`);
  if (!options.force && await fileExists(outputPath)) {
    throw new Error(`output already exists: ${outputPath}\nRe-run with --force only after reviewing the replacement.`);
  }

  const sharp = await loadSharp();
  const targetBytes = options.targetKb * 1024;
  let quality = options.quality;
  let encoded = await encodeAtQuality(sharp, inputPath, options.maxWidth, quality);

  while (encoded.data.length > targetBytes && quality > PHOTO_DEFAULTS.minQuality) {
    quality = Math.max(PHOTO_DEFAULTS.minQuality, quality - PHOTO_DEFAULTS.qualityStep);
    encoded = await encodeAtQuality(sharp, inputPath, options.maxWidth, quality);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, encoded.data, { flag: options.force ? 'w' : 'wx' });

  return {
    inputPath,
    outputPath,
    publicUrl: venuePhotoPublicUrl(options.slug),
    width: encoded.info.width,
    height: encoded.info.height,
    bytes: encoded.data.length,
    quality,
    targetKb: options.targetKb,
    targetMet: encoded.data.length <= targetBytes,
    caption: options.caption,
    credit: options.credit,
    creditUrl: options.creditUrl
  };
}

function relativeDisplayPath(filePath) {
  return path.relative(REPO_ROOT, filePath).split(path.sep).join('/');
}

export function formatResult(result) {
  const lines = [
    `Created: ${relativeDisplayPath(result.outputPath)}`,
    `Resolution: ${result.width} x ${result.height}`,
    `File size: ${Math.round(result.bytes / 1024)} KB`,
    `WebP quality: ${result.quality}`
  ];
  if (!result.targetMet) {
    lines.push(`Warning: output is still above the ${result.targetKb} KB target at the minimum quality floor.`);
  }
  lines.push(
    '',
    'Venue metadata:',
    `photo_url: ${result.publicUrl}`,
    `photo_caption: ${result.caption || ''}`,
    `photo_credit: ${result.credit || ''}`,
    `photo_credit_url: ${result.creditUrl || ''}`
  );
  return lines.join('\n');
}

async function main() {
  try {
    const options = parsePhotoArgs(process.argv.slice(2));
    if (options.help) {
      console.log(helpText());
      return;
    }
    const result = await processVenuePhoto(options);
    console.log(formatResult(result));
  } catch (error) {
    console.error(`Photo processing failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
