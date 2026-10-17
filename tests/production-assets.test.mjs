import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(projectRoot, 'assets_manifest.json');
const publicManifestPath = path.join(projectRoot, 'public/assets_manifest.json');
const characters = ['p1-cyan', 'p2-pink'];
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestById = new Map(manifest.assets.map((asset) => [asset.asset_id, asset]));

test('the served manifest is synchronized with the source manifest', () => {
  assert.equal(readFileSync(publicManifestPath, 'utf8'), readFileSync(manifestPath, 'utf8'));
});

test('the manifest lists face layers in every animation that reveals them', () => {
  assert.deepEqual(manifestById.get('RR-P1-CYAN-FACE-CATCH')?.state_names, ['catch', 'activate']);
  assert.deepEqual(manifestById.get('RR-P2-PINK-FACE-CATCH')?.state_names, ['catch']);
  assert.deepEqual(manifestById.get('RR-P2-PINK-FACE-ACTIVATE')?.state_names, ['activate']);
});
const readCharacter = (id) => {
  const root = path.join(projectRoot, 'assets/characters', id);
  return {
    root,
    rig: JSON.parse(readFileSync(path.join(root, 'rig.json'), 'utf8')),
    animations: JSON.parse(readFileSync(path.join(root, 'animations.json'), 'utf8'))
  };
};

for (const id of characters) {
  test(`${id} rig shares authoring proportions, baseline, and expected cutout parts`, () => {
    const { rig } = readCharacter(id);
    assert.equal(rig.characterId, id);
    assert.deepEqual({ width: rig.canvas.width, height: rig.canvas.height }, { width: 320, height: 360 });
    assert.deepEqual(rig.anchor, { x: 0.5, y: 0.975 });
    assert.equal(rig.groundBaseline, 351);
    assert.ok(existsSync(path.join(projectRoot, rig.sourceSvg)), 'editable layered SVG source is missing');
    assert.ok(rig.parts.length >= 20, 'rig should use separated, animatable body parts');
    assert.equal(new Set(rig.parts.map((part) => part.id)).size, rig.parts.length, 'part ids must be unique');
    for (const part of rig.parts) {
      assert.ok(part.bounds.x >= 0 && part.bounds.y >= 0, `${part.id} crop begins outside the canvas`);
      assert.ok(part.bounds.x + part.bounds.width <= rig.canvas.width, `${part.id} crop exceeds canvas width`);
      assert.ok(part.bounds.y + part.bounds.height <= rig.canvas.height, `${part.id} crop exceeds canvas height`);
      assert.ok(part.pivot.x >= part.bounds.x && part.pivot.x < part.bounds.x + part.bounds.width, `${part.id} x pivot is outside its crop`);
      assert.ok(part.pivot.y >= part.bounds.y && part.pivot.y < part.bounds.y + part.bounds.height, `${part.id} y pivot is outside its crop`);
    }
  });

  test(`${id} defines Idle, Move, Catch, and Activate with valid one-shot/loop timing`, () => {
    const { rig, animations } = readCharacter(id);
    const ids = new Set(rig.parts.map((part) => part.id));
    assert.equal(animations.characterId, id);
    for (const state of ['idle', 'move', 'catch', 'activate']) {
      const animation = animations.animations[state];
      assert.ok(animation, `missing ${state} animation`);
      assert.ok(animation.durationMs > 0, `${state} duration must be positive`);
      assert.ok(animation.keyframes.length >= 3, `${state} needs authored keyframes`);
      assert.equal(animation.keyframes[0].atMs, 0, `${state} must start at time zero`);
      assert.equal(animation.keyframes.at(-1).atMs, animation.durationMs, `${state} must end at its duration`);
      for (let i = 1; i < animation.keyframes.length; i += 1) {
        assert.ok(animation.keyframes[i].atMs > animation.keyframes[i - 1].atMs, `${state} times must increase`);
      }
      for (const frame of animation.keyframes) {
        for (const partId of Object.keys(frame.parts ?? {})) assert.ok(ids.has(partId), `${state} refers to unknown part ${partId}`);
      }
    }
    assert.equal(animations.animations.idle.loop, true);
    assert.equal(animations.animations.move.loop, true);
    assert.equal(animations.animations.catch.loop, false);
    assert.equal(animations.animations.activate.loop, false);
  });

  test(`${id} PNG parts have alpha, no clipped/touching crop edges, and exact manifest records`, async () => {
    const { rig } = readCharacter(id);
    const prefix = `RR-${id.toUpperCase()}`;
    const svg = readFileSync(path.join(projectRoot, rig.sourceSvg), 'utf8');
    const layers = new Map([...svg.matchAll(/<g\b(?=[^>]*\bid="([^"]+)")[^>]*>[\s\S]*?<\/g>/g)].map((match) => [match[1], match[0]]));

    for (const part of rig.parts) {
      const exportPath = path.join(projectRoot, part.png);
      assert.ok(existsSync(exportPath), `missing PNG export ${part.png}`);
      const png = readFileSync(exportPath);
      assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${part.png} is not PNG`);
      const metadata = await sharp(png).metadata();
      const stats = await sharp(png).stats();
      assert.equal(metadata.hasAlpha, true, `${part.png} must retain an alpha channel`);
      assert.equal(metadata.width, part.bounds.width, `${part.png} width differs from rig contract`);
      assert.equal(metadata.height, part.bounds.height, `${part.png} height differs from rig contract`);
      assert.ok(stats.channels[3].min < 255 && stats.channels[3].max > 0, `${part.png} must contain both transparent and visible pixels`);

      if (part.id.startsWith('foot-')) {
        const { data: footPixels, info: footInfo } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        let lastVisibleY = -1;
        for (let y = 0; y < footInfo.height; y += 1) {
          for (let x = 0; x < footInfo.width; x += 1) {
            if (footPixels[(y * footInfo.width + x) * footInfo.channels + 3] > 0) lastVisibleY = y;
          }
        }
        assert.equal(part.bounds.y + lastVisibleY, rig.groundBaseline, `${part.id} should rest on the shared ground baseline`);
      }

      const fullSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${rig.canvas.width}" height="${rig.canvas.height}" viewBox="0 0 ${rig.canvas.width} ${rig.canvas.height}">${layers.get(part.groupId)}</svg>`);
      const { data, info } = await sharp(fullSvg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let minX = rig.canvas.width, minY = rig.canvas.height, maxX = -1, maxY = -1;
      for (let y = 0; y < rig.canvas.height; y += 1) {
        for (let x = 0; x < rig.canvas.width; x += 1) {
          if (data[(y * rig.canvas.width + x) * info.channels + 3] === 0) continue;
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      assert.ok(minX >= part.bounds.x + 1, `${part.id} is clipped or touches its left crop edge`);
      assert.ok(minY >= part.bounds.y + 1, `${part.id} is clipped or touches its top crop edge`);
      assert.ok(maxX < part.bounds.x + part.bounds.width - 1, `${part.id} is clipped or touches its right crop edge`);
      assert.ok(maxY < part.bounds.y + part.bounds.height - 1, `${part.id} is clipped or touches its bottom crop edge`);

      const record = manifestById.get(`${prefix}-${part.id.toUpperCase()}`);
      assert.ok(record, `manifest record missing for ${part.id}`);
      assert.equal(record.export_uri, part.png);
      assert.equal(record.width, part.bounds.width);
      assert.equal(record.height, part.bounds.height);
      assert.equal(record.alpha, true);
      assert.equal(record.file_size_bytes, png.byteLength);
    }
  });
}
