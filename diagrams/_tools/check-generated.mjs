import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'diagrams/generated-images.json'), 'utf8'));
const sources = (await readdir(path.join(root, 'diagrams')))
  .filter(name => name.endsWith('.html')).map(name => name.slice(0, -5)).sort();
const records = manifest.diagrams;
const failures = [];
const seen = new Set();
const imageHashes = new Set();
const hash = data => createHash('sha256').update(data).digest('hex');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

if (!Array.isArray(records)) throw new Error('Manifest diagrams must be an array');
for (const record of records) {
  const { slug } = record;
  if (!sources.includes(slug) || seen.has(slug)) {
    failures.push(`${slug}: unexpected or duplicate diagram`);
    continue;
  }
  seen.add(slug);
  try {
    const expected = {
      source: `diagrams/${slug}.html`,
      prompt: `diagrams/prompts/${slug}.txt`,
      image: `.gitbook/assets/diagram-${slug}.png`,
    };
    const data = {};
    for (const [kind, filename] of Object.entries(expected)) {
      if (record[kind] !== filename) throw new Error(`unexpected ${kind} path`);
      data[kind] = await readFile(path.join(root, filename));
      if (hash(data[kind]) !== record[`${kind}_sha256`]) {
        failures.push(`${slug}: ${kind} checksum changed; update the image and review record`);
      }
    }
    if (!data.prompt.toString('utf8').trim()) failures.push(`${slug}: empty prompt`);
    const png = data.image;
    if (png.length < 24 || !png.subarray(0, 8).equals(signature)
        || png.subarray(12, 16).toString() !== 'IHDR') {
      failures.push(`${slug}: invalid PNG header`);
    } else if (png.readUInt32BE(16) < 1024 || png.readUInt32BE(20) < 768) {
      failures.push(`${slug}: image too small for readable documentation`);
    }
    const imageHash = hash(png);
    if (imageHashes.has(imageHash)) failures.push(`${slug}: duplicate image content`);
    imageHashes.add(imageHash);
    if (record.provider !== 'built-in image generator' || record.model_version !== 'unverified') {
      failures.push(`${slug}: generator provenance does not match this image set`);
    }
    if (record.visual_qa !== 'passed' || !record.qa_notes?.trim()) {
      failures.push(`${slug}: missing visual review`);
    }
  } catch (error) {
    failures.push(`${slug}: ${error.message}`);
  }
}
for (const slug of sources) {
  if (!seen.has(slug)) failures.push(`${slug}: missing manifest entry`);
}
if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`Verified ${records.length} diagrams: sources, prompts, PNGs, checksums and review records.`);
  console.log('Checksum checks do not replace visual inspection of labels, arrows and boundaries.');
}
