import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const charactersRoot = path.join(projectRoot, 'assets/characters');
const manifestPath = path.join(projectRoot, 'assets_manifest.json');
const publicManifestPath = path.join(projectRoot, 'public/assets_manifest.json');

function extractLayers(svg) {
  const layers = new Map();
  const expression = /<g\b(?=[^>]*\bid="([^"]+)")[^>]*>[\s\S]*?<\/g>/g;
  for (const match of svg.matchAll(expression)) layers.set(match[1], match[0]);
  return layers;
}

function assetPrefix(characterId) {
  return characterId.toUpperCase().replaceAll('-', '-');
}

function stateNamesFor(partId, animationDefinitions) {
  const animationNames = Object.keys(animationDefinitions);
  if (partId.startsWith('face-')) {
    const faceState = partId.slice('face-'.length);
    if (faceState === 'idle') return animationNames;
    return animationNames.filter((state) => animationDefinitions[state].keyframes.some((frame) => (frame.parts?.[partId]?.alpha ?? 0) > 0));
  }
  if (partId === 'activation-ring') return animationNames.filter((state) => state === 'activate');
  if (partId === 'energy-orb') return animationNames.filter((state) => ['catch', 'activate'].includes(state));
  return animationNames;
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch {
    return { manifest_version: '1.0', project: 'REACTOR RUSH! — FU-DEVER Science Arena', manifest_status: 'Draft', last_reviewed: '2026-10-17', assets: [] };
  }
}

async function exportCharacter(characterDirectory) {
  const rigPath = path.join(characterDirectory, 'rig.json');
  const animationPath = path.join(characterDirectory, 'animations.json');
  const rig = JSON.parse(await readFile(rigPath, 'utf8'));
  const animations = JSON.parse(await readFile(animationPath, 'utf8'));
  const svgPath = path.join(projectRoot, rig.sourceSvg);
  const svg = await readFile(svgPath, 'utf8');
  const layers = extractLayers(svg);
  const characterPrefix = assetPrefix(rig.characterId);
  const records = [];

  for (const part of rig.parts) {
    const group = layers.get(part.groupId);
    if (!group) throw new Error(`${rig.characterId}: source group "${part.groupId}" is missing`);
    const { width, height } = rig.canvas;
    const isolatedSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${group}</svg>`);
    const { x, y, width: cropWidth, height: cropHeight } = part.bounds;
    if (x < 0 || y < 0 || x + cropWidth > width || y + cropHeight > height) {
      throw new Error(`${rig.characterId}/${part.id}: crop bounds exceed the authoring canvas`);
    }
    const fullPng = await sharp(isolatedSvg).png().toBuffer();
    const { data: pixels, info } = await sharp(fullPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let py = 0; py < height; py += 1) {
      for (let px = 0; px < width; px += 1) {
        if (pixels[(py * width + px) * info.channels + 3] === 0) continue;
        minX = Math.min(minX, px); minY = Math.min(minY, py);
        maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
      }
    }
    if (maxX < minX || maxY < minY) throw new Error(`${rig.characterId}/${part.id}: source group rendered empty`);
    if (minX < x + 1 || minY < y + 1 || maxX >= x + cropWidth - 1 || maxY >= y + cropHeight - 1) {
      throw new Error(`${rig.characterId}/${part.id}: crop would clip source pixels; alpha bounds are ${minX},${minY}–${maxX},${maxY}`);
    }
    const pngPath = path.join(projectRoot, part.png);
    await mkdir(path.dirname(pngPath), { recursive: true });
    await sharp(fullPng)
      .extract({ left: x, top: y, width: cropWidth, height: cropHeight })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(pngPath);

    const metadata = await sharp(pngPath).metadata();
    const fileStats = await stat(pngPath);
    if (!metadata.hasAlpha) throw new Error(`${part.png}: export has no alpha channel`);
    if (metadata.width !== cropWidth || metadata.height !== cropHeight) throw new Error(`${part.png}: export dimensions do not match rig bounds`);

    records.push({
      asset_id: `RR-${characterPrefix}-${part.id.toUpperCase()}`,
      source_uri: `${rig.sourceSvg}#${part.groupId}`,
      source_editable_uri: rig.sourceSvg,
      export_uri: part.png,
      owner: 'FU-DEVER project team; individual owner to confirm',
      status: 'In review',
      license: 'Project-authored vector redraw based on the selected concept sheets. Confirm team ownership and release terms before public distribution.',
      last_reviewed: '2026-10-17',
      width: metadata.width,
      height: metadata.height,
      pixel_ratio: 1,
      alpha: true,
      state_names: stateNamesFor(part.id, animations.animations),
      frame_count: 1,
      anchor_x: Number(((part.pivot.x - x) / cropWidth).toFixed(4)),
      anchor_y: Number(((part.pivot.y - y) / cropHeight).toFixed(4)),
      file_size_bytes: fileStats.size,
      qa_result: 'Exported from the named editable SVG group; alpha channel and cropped dimensions checked against rig.json.'
    });
  }

  for (const [state, definition] of Object.entries(animations.animations)) {
    records.push({
      asset_id: `RR-${characterPrefix}-ANIMATION-${state.toUpperCase()}`,
      source_uri: `${rig.characterId}/animations.json#${state}`,
      source_editable_uri: `${rig.characterId}/animations.json`,
      export_uri: `${rig.characterId}/animations.json#${state}`,
      owner: 'FU-DEVER project team; individual owner to confirm',
      status: 'In review',
      license: 'Project-authored cutout animation data for internal integration.',
      last_reviewed: '2026-10-17',
      width: null,
      height: null,
      pixel_ratio: 1,
      alpha: null,
      state_names: [state],
      frame_count: definition.keyframes.length,
      anchor_x: rig.anchor.x,
      anchor_y: rig.anchor.y,
      file_size_bytes: Buffer.byteLength(JSON.stringify(definition)),
      qa_result: `Cutout tween definition; ${definition.keyframes.length} authored keyframes over ${definition.durationMs}ms. Runtime evidence is recorded in docs/art/animation-production-report.md.`
    });
  }

  return records;
}

const manifest = await readManifest();
const characterDirectories = (await readdir(charactersRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(charactersRoot, entry.name));
let generatedRecords = [];

for (const directory of characterDirectories) {
  try {
    await readFile(path.join(directory, 'rig.json'));
    generatedRecords.push(...await exportCharacter(directory));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const productionPrefixes = new Set(generatedRecords.map((record) => record.asset_id.split('-').slice(0, 3).join('-')));
manifest.assets = manifest.assets.filter((asset) => ![...productionPrefixes].some((prefix) => asset.asset_id.startsWith(`${prefix}-`)));
manifest.assets.push(...generatedRecords);
manifest.note = 'The concept, model-sheet, and six-pose PNGs remain reference-only and are not production sprite sheets. The editable SVG cutout packs and exported parts are integration drafts; see docs/art/animation-production-report.md for runtime evidence and limits.';
manifest.production_batch = {
  status: 'Draft for integration review',
  technique: '2D cutout animation with Phaser tweens',
  source_references: [
    'assets/concepts/robots/direction-a-refined-model-sheet.png',
    'assets/concepts/robots/direction-a-action-pose-references.png'
  ],
  reference_pose_board_is_production_sprite_sheet: false,
  characters: {
    'p1-cyan': { rig: 'assets/characters/p1-cyan/rig.json', source: 'assets/characters/p1-cyan/source/rig.svg', part_count: 22 },
    'p2-pink': { rig: 'assets/characters/p2-pink/rig.json', source: 'assets/characters/p2-pink/source/rig.svg', part_count: 23 }
  },
  shared_coordinate_system: { width: 320, height: 360, anchor: { x: 0.5, y: 0.975 }, ground_baseline: 351 },
  animation_states: ['idle', 'move', 'catch', 'activate'],
  phaser_test_scene: 'index.html',
  runtime_report: 'docs/art/animation-production-report.md'
};
manifest.last_reviewed = '2026-10-17';
const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(manifestPath, manifestJson, 'utf8');
await mkdir(path.dirname(publicManifestPath), { recursive: true });
await writeFile(publicManifestPath, manifestJson, 'utf8');

console.log(`Exported ${generatedRecords.filter((record) => record.alpha === true).length} transparent PNG parts and ${generatedRecords.filter((record) => record.width === null).length} animation definitions.`);
