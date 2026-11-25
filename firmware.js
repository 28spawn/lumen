// SPDX-License-Identifier: GPL-3.0-only
// Lumen OS firmware delta engine — Copyright (c) 2026 28spawn.
// Adapted from jcuhnoio/re-nanocore (MIT License; see LICENSE-MIT-WEBUSB.txt). No USB access and no vendor firmware image.
function bytes(value) {
  if (value instanceof Uint8Array) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new Error('Expected firmware bytes.');
}
function hex(value) {
  if (typeof value !== 'string' || !/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error('Invalid patch hex.');
  return Uint8Array.from(value.match(/../g), n => parseInt(n, 16));
}
function equal(a, b) { return a.length === b.length && a.every((v, i) => v === b[i]); }
export async function sha256(value) {
  const result = await crypto.subtle.digest('SHA-256', bytes(value));
  return Array.from(new Uint8Array(result), b => b.toString(16).padStart(2, '0')).join('');
}
function extendedSchema(p) {
  const integer = Number.isSafeInteger, digest = s => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);
  if (p?.schemaVersion !== 2 || p.firmwareVersion !== '1.2' || p.effect !== 'LUMEN_V14' ||
      ![p.osSize, p.stockFitSize, p.installedFitSize, p.protectedOffset].every(integer) ||
      !(0 < p.stockFitSize && p.stockFitSize < p.installedFitSize && p.installedFitSize <= p.protectedOffset && p.protectedOffset <= p.osSize) ||
      !digest(p.stockNormalizedSha256) || !digest(p.installedNormalizedSha256) ||
      p.timestamp?.size !== 4 || !integer(p.timestamp.offset) || p.timestamp.offset < 0 || p.timestamp.offset + 4 > p.stockFitSize ||
      !Array.isArray(p.patches) || !p.patches.length || p.append?.offset !== p.stockFitSize)
    throw new Error('Unsupported patch manifest.');
  const ranges = [p.timestamp];
  for (const e of p.patches) {
    const a = hex(e.beforeHex), b = hex(e.afterHex);
    if (a.length !== b.length || !integer(e.offset) || e.offset < 0 || e.offset + a.length > p.stockFitSize ||
        ranges.some(r => e.offset < r.offset + r.size && r.offset < e.offset + a.length))
      throw new Error('Invalid or overlapping patch.');
    ranges.push({ offset: e.offset, size: a.length });
  }
  if (hex(p.append.afterHex).length !== p.installedFitSize - p.stockFitSize)
    throw new Error('Invalid appended payload.');
}
async function normalizedPrefix(image, size, timestamp) {
  const prefix = image.slice(0, size);
  prefix.fill(0, timestamp.offset, timestamp.offset + timestamp.size);
  return sha256(prefix);
}
// An earlier Lumen build changes stock 1.2 only inside this manifest's patch ranges and the appended module.
// Writing every patch's beforeHex back must therefore give exactly the stock FIT (same hash check as stock).
function revertPatches(image, patch) {
  const out = image.slice();
  for (const entry of patch.patches) out.set(hex(entry.beforeHex), entry.offset);
  return out;
}
export async function validateImage(value, patch) {
  extendedSchema(patch);
  const image = bytes(value);
  if (image.length !== patch.osSize) throw new Error(`Expected a complete ${patch.osSize}-byte OS partition.`);
  for (const kind of ['stock', 'installed'])
    if (await normalizedPrefix(image, patch[kind + 'FitSize'], patch.timestamp) === patch[kind + 'NormalizedSha256'])
      return { kind, version: patch.firmwareVersion };
  if (await normalizedPrefix(revertPatches(image, patch), patch.stockFitSize, patch.timestamp) === patch.stockNormalizedSha256)
    return { kind: 'upgrade', version: patch.firmwareVersion };
  throw new Error('Unknown or unsupported firmware (Lumen requires stock 1.2 or an earlier Lumen build); nothing will be written.');
}
export async function install(value, patch) {
  const image = bytes(value), state = await validateImage(image, patch);
  const output = state.kind === 'upgrade' ? revertPatches(image, patch) : image.slice();
  if (state.kind === 'installed') return output;
  for (const entry of [...patch.patches, patch.append]) output.set(hex(entry.afterHex), entry.offset);
  if ((await validateImage(output, patch)).kind !== 'installed') throw new Error('Patched firmware verification failed.');
  return output;
}
export async function prepareRestore(current, backup, patch) {
  const original = bytes(backup), live = bytes(current);
  if ((await validateImage(original, patch)).kind !== 'stock') throw new Error('Restore requires a stock 1.2 firmware backup.');
  const state = await validateImage(live, patch);
  const t = patch.timestamp;
  if (state.kind === 'upgrade') {                 // an earlier Lumen build: its reverted FIT and the untouched tail must match
    const reverted = revertPatches(live, patch);
    reverted.set(original.subarray(t.offset, t.offset + t.size), t.offset);
    if (!equal(reverted.subarray(0, patch.stockFitSize), original.subarray(0, patch.stockFitSize)) ||
        !equal(live.subarray(patch.protectedOffset), original.subarray(patch.protectedOffset)))
      throw new Error('Backup does not match this device’s current OS contents.');
    return original.slice();
  }
  const expected = state.kind === 'installed' ? await install(original, patch) : original.slice();
  expected.set(live.subarray(t.offset, t.offset + t.size), t.offset);
  if (!equal(expected, live)) throw new Error('Backup does not match this device’s current OS contents.');
  return original.slice();
}
