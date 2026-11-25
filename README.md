# Lumen OS

Custom firmware UI and browser WebUSB flasher for the **Livtra NanoCore** guitar pedal, created by **[28spawn](https://github.com/28spawn)**.

**Live site & WebUSB installer:** https://28spawn.github.io/lumen/

> **Independent interoperability project.** Not affiliated with Livtra or NanoCore. No vendor firmware, amp models, cab IRs, or presets are distributed in this repository.

## Features

- **Scope Aperture boot animation** — hands straight over to the live UI with no placeholder screen.
- **Pedal-board home screen** — 8 effect blocks with custom icons, input/output meters, preset name, volume, battery, and live CPU load.
- **Block editor** — block/type/ON-OFF header with three parameter tiles per page.
- **Live preset browsing** — presets load as you turn the selector, looping 64 ↔ 1, with icons following each preset's blocks.
- **Chain reordering** — grab and swap effect blocks directly on the pedal.
- **Settings & built-in tuner** — Synth Mode, USB Loopback, Input Gain, USB/BT Volume, MIDI Channel (`OMNI`), and tuner.
- **Full ToneCommand & MIDI compatibility** — runs on top of the stock 1.2 sound engine, so all USB-MIDI commands, preset renames, app sync, and ToneCommand workflows remain intact.

## Flashing from the browser

1. Open **https://28spawn.github.io/lumen/** in desktop **Chrome or Edge** (Windows or macOS).
2. Unplug headphones/audio cables from the NanoCore and close ToneCommand or any DAW holding the MIDI port.
3. Click **Install Lumen OS**, allow the MIDI SysEx and USB prompts, and wait for backup, flash, and byte-for-byte verification to finish.
4. Click **Download backup** to keep a copy of your original stock 1.2 OS partition.

### Recovery

Only the OS partition is written; the bootloader is never touched and the final partial erase sector is protected. You can restore stock 1.2 anytime from the browser, or power-cycle the pedal **3× within 20 seconds** to enter update mode.

## License & Credits

- **Lumen OS, UI design, showcase media, and website:** Copyright (c) 2026 **28spawn** — licensed under **GNU GPL v3.0** (see [LICENSE](LICENSE)). Any redistribution or derivative work must preserve attribution and be released under GPL-3.0.
- **WebUSB DFU & local backup modules** (`dfu.js`, `storage.js`, and adapted portions of `firmware.js` and `app.js`): adapted from [jcuhnoio/re-nanocore](https://github.com/jcuhnoio/re-nanocore) under the MIT License (see [LICENSE-MIT-WEBUSB.txt](LICENSE-MIT-WEBUSB.txt)).
