# Lumen OS

Custom firmware UI and browser WebUSB flasher for the **Livtra NanoCore** guitar pedal, created by **[28spawn](https://github.com/28spawn)**.

**Live site & WebUSB installer:** https://28spawn.github.io/lumen/

> **Independent interoperability project.** Not affiliated with Livtra or NanoCore. No vendor firmware, amp models, cab IRs, or presets are distributed in this repository.

## Features

- **Scope Aperture boot animation** — hands straight over to the live UI with no placeholder screen; audio muted during boot, then faded in.
- **Pedal-board home screen** — 8 effect blocks with custom icons, input/output meters, preset name, volume, battery, and live CPU load.
- **Block editor** — block/type/ON-OFF header with three parameter tiles per page, or six in the COMPACT layout.
- **Live preset browsing** — presets load as you turn the selector, looping 64 ↔ 1, with icons following each preset's blocks.
- **Chain reordering** — grab and swap effect blocks directly on the pedal.
- **Quick actions** — hold the SELECTOR on a pedal (or in the editor) to switch it on/off; on BT to toggle Bluetooth.
- **Save panel with cancel** — hold MASTER, pick a slot, push to save (overwriting asks first); MASTER push or hold cancels.
- **Auto power-off** — OFF or 5/10/20/30/60 min without knobs or signal (input, output, USB audio), with a 30 s warning.
- **Settings & built-in tuner** — Synth Mode, USB Loopback, Input Gain, USB/BT Volume, MIDI Channel (`OMNI`), Auto Off, Editor Layout, firmware version `1.2 (L16)`, and tuner.
- **Full ToneCommand & MIDI compatibility** — runs on top of the stock 1.2 sound engine, so all USB-MIDI commands, preset renames, app sync, and ToneCommand workflows remain intact.

## Flashing from the browser

1. Open **https://28spawn.github.io/lumen/** in desktop **Chrome or Edge** (Windows or macOS).
2. Unplug headphones/audio cables from the NanoCore and close ToneCommand or any DAW holding the MIDI port.
3. Click **Install Lumen OS**, allow the MIDI SysEx and USB prompts, and wait for backup, flash, and byte-for-byte verification to finish.
4. Click **Download backup** to keep a copy of your original stock 1.2 OS partition.

### Recovery & Disclaimer

Only the OS partition is written; the bootloader is never touched and the final partial erase sector is protected. You can restore stock 1.2 anytime from the browser, or power-cycle the pedal **3× within 20 seconds** to enter update mode.

**Use at your own risk:** Lumen OS is unofficial, experimental firmware provided as-is with no warranty. Flashing writes to your pedal's flash storage, carries the usual risks of interrupted writes or unexpected behavior, and may void the manufacturer's warranty. Always unplug audio outputs before entering update mode, download your original backup, and keep USB connected until verification finishes.

## License & Credits

- **Lumen OS, UI design, showcase media, and website:** Copyright (c) 2026 **28spawn** — licensed under **GNU GPL v3.0** (see [LICENSE](LICENSE)). Any redistribution or derivative work must preserve attribution and be released under GPL-3.0.
- **WebUSB DFU & local backup modules** (`dfu.js`, `storage.js`, and adapted portions of `firmware.js` and `app.js`): adapted from [jcuhnoio/re-nanocore](https://github.com/jcuhnoio/re-nanocore) under the MIT License (see [LICENSE-MIT-WEBUSB.txt](LICENSE-MIT-WEBUSB.txt)).
