// SPDX-License-Identifier: GPL-3.0-only
// Lumen OS browser installer — Copyright (c) 2026 28spawn.
// Adapted from jcuhnoio/re-nanocore (MIT License; see LICENSE-MIT-WEBUSB.txt).
import { WebUSBTransport, RawOS, USB_FILTER } from './dfu.js';
import { install, prepareRestore, sha256, validateImage } from './firmware.js';
import { get, put, recoveryTarget } from './storage.js';

const $ = id => document.getElementById(id);
let mode = 'install', busy = false, critical = false, imported = null, backupURL;
const patchPromise = fetch('./lumen-1.2.json').then(r => {
  if (!r.ok) throw new Error('Could not load Lumen patch manifest; reload and try again.');
  return r.json();
});
patchPromise.catch(() => {});
const supportsUSB = !!navigator.usb && !!navigator.requestMIDIAccess && isSecureContext;

function requireAudioDisconnected() {
  if (!$('audioDisconnected').checked)
    throw new Error('Physically unplug headphones and audio output cables, close ToneCommand, then check the confirmation before continuing.');
}
function updateControls() {
  for (const id of ['primary', 'restore', 'reconnect', 'recovery'])
    $(id).disabled = busy || !supportsUSB || !$('audioDisconnected').checked;
  for (const id of ['importBackup', 'audioDisconnected'])
    $(id).disabled = busy;
}
function status(text, detail = '') {
  $('status').textContent = text;
  $('detail').textContent = detail;
}
function progress({ phase, completed, total }) {
  const stage = { preflight: 'read', complete: 'ready' }[phase] || phase;
  $('progress').value = total ? (completed / total) * 100 : 0;
  for (const item of $('steps').children) item.classList.toggle('active', item.dataset.phase === stage);
  status({
    read: 'Reading your firmware',
    preflight: 'Checking the device again',
    write: 'Uploading — keep USB connected',
    verify: 'Verifying every byte',
    complete: 'Verified. Your NanoCore is restarting.',
  }[phase] || phase);
}
function linkBackup(bytes, version) {
  if (backupURL) URL.revokeObjectURL(backupURL);
  backupURL = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  $('backupLink').href = backupURL;
  $('backupLink').download = `nanocore-original-${version}-os.bin`;
  $('backupLink').hidden = false;
}
async function refresh() {
  const backup = await get('original');
  if (backup) {
    const state = await validateImage(backup.bytes, await patchPromise);
    if (state.kind !== 'stock') throw new Error('Saved original backup is not stock 1.2 firmware.');
    linkBackup(backup.bytes, state.version);
  }
  $('recovery').hidden = !(await get('pending'))?.active;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  $('error').hidden = true;
  updateControls();
  try { await fn(); }
  catch (e) {
    $('error').textContent = e.message;
    $('error').hidden = false;
    status('Stopped', critical
      ? 'If an upload was interrupted, keep the pedal in Lupgrader mode and use Recover interrupted upload.'
      : 'No upload completed. Check the message above before continuing.');
  } finally {
    critical = false;
    busy = false;
    updateControls();
    await refresh().catch(() => {});
  }
}
async function begin(nextMode) {
  requireAudioDisconnected();
  mode = nextMode;
  if (!supportsUSB) throw new Error('Open this page in desktop Chrome or Edge over HTTPS (or localhost).');
  if (mode === 'restore' && !imported && !(await get('original')))
    throw new Error('Use a backup file first, or use the browser where you installed Lumen.');
  const devices = await navigator.usb.getDevices();
  const boot = devices.filter(d => d.vendorId === USB_FILTER.vendorId && d.productId === USB_FILTER.productId);
  if (boot.length === 1) return upload(boot[0]);
  status('Connecting to NanoCore', 'Allow MIDI access, including system-exclusive messages.');
  try {
    const midi = await navigator.requestMIDIAccess({ sysex: true });
    const ports = [...midi.outputs.values()].filter(p => /nanocore/i.test(p.name));
    if (ports.length > 1) throw new Error('Connect only one NanoCore before continuing.');
    if (ports.length === 1) {
      await ports[0].open();
      ports[0].send([0xf0, 0x7d, 0x44, 0x46, 0x55, 0x01, 0xf7]);
      await new Promise(r => setTimeout(r, 1200));
      await ports[0].close();
    }
  } catch (e) { if (e.message.includes('only one')) throw e; }
  $('reconnect').hidden = false;
  status('Connect the bootloader', 'Click Connect bootloader and choose Livtra Lupgrader. If it is missing, allow MIDI SysEx and try Install again.');
}
async function upload(device) {
  requireAudioDisconnected();
  const patch = await patchPromise;
  const transport = await WebUSBTransport.open(device);
  $('connection').textContent = 'NanoCore · USB connected';
  $('reconnect').hidden = true;
  try {
    const dfu = new RawOS(transport, { onProgress: progress });
    const current = await dfu.readPartition();
    let target, version = '1.2';
    if (mode === 'recover') {
      const pending = await get('pending');
      if (!pending?.active) throw new Error('No interrupted upload saved in this browser.');
      target = recoveryTarget(current, pending);
    } else {
      const state = await validateImage(current, patch);
      version = state.version;
      if (mode === 'restore') {
        const backup = imported || (await get('original'))?.bytes;
        if (!backup) throw new Error('No original 1.2 backup saved. Use a matching backup file.');
        target = await prepareRestore(current, backup, patch);
      } else {
        if (state.kind === 'stock') {
          status('Saving your original firmware');
          const backup = { bytes: current, sha256: await sha256(current), version };
          await put('original', backup);
          linkBackup(current, version);
        }
        target = await install(current, patch);
      }
    }
    const pending = { active: true, current, target, mode, version, created: new Date().toISOString() };
    if (mode !== 'recover') await put('pending', pending);
    critical = true;
    const receipt = await dfu.program({
      expectedCurrent: current,
      target,
      backupSaved: async bytes => {
        if (mode === 'recover') await put('recovery-read', { bytes });
        else await put('pending', { ...pending, current: bytes });
        return true;
      },
      onVerified: async (_bytes, receipt) => { await put('receipt', receipt); },
    });
    await put('pending', { ...pending, active: false, receipt });
    if ($('log')) $('log').textContent = JSON.stringify(receipt, null, 2);
    status(
      mode === 'install' ? 'Lumen OS is ready.' : mode === 'restore' ? 'Original firmware restored.' : 'Previous firmware recovered.',
      'Every byte was verified. Wait for the pedal to restart before reconnecting audio at low volume.'
    );
    $('audioDisconnected').checked = false;
    $('connection').textContent = `Firmware ${version} · verified`;
  } finally { await transport.close(); }
}

$('primary').onclick = () => run(() => begin('install'));
$('restore').onclick = () => run(() => begin('restore'));
$('recovery').onclick = () => run(() => begin('recover'));
$('reconnect').onclick = () => run(async () => {
  requireAudioDisconnected();
  await upload(await navigator.usb.requestDevice({ filters: [USB_FILTER] }));
});
$('importBackup').onclick = () => $('backupFile').click();
$('backupFile').onchange = () => run(async () => {
  const file = $('backupFile').files[0];
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if ((await validateImage(bytes, await patchPromise)).kind !== 'stock')
    throw new Error('Choose an original stock 1.2 OS backup.');
  imported = bytes;
  status('Backup file ready', 'Use Restore original to return your pedal to stock 1.2.');
});
$('audioDisconnected').onchange = updateControls;
updateControls();
addEventListener('beforeunload', e => { if (critical) { e.preventDefault(); e.returnValue = ''; } });
refresh().catch(e => { $('error').hidden = false; $('error').textContent = `Local backup storage unavailable: ${e.message}`; });
if (!supportsUSB) status('Desktop Chrome or Edge required', 'Open this page in a browser with WebUSB and MIDI support over HTTPS.');
