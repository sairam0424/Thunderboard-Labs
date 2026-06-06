/*
 * Aegis Edge - Web Bluetooth Dashboard logic
 * ==========================================
 * Connects to a Silicon Labs Thunderboard Sense 2 (BRD4166A / EFR32MG12)
 * running the Edge Impulse gesture-inference firmware, starts/stops
 * inference, and renders the live classification streamed over BLE.
 *
 * BLE UUIDs - PRIMARY-SOURCE VERIFIED from the EI firmware GATT config:
 *   Service          DDA4D145-FC52-4705-BB93-DD1F295AA522
 *   Control (write)  02AA6D7D-23B4-4C84-AF76-98A7699F7FE2   (0x01 start / 0x00 stop)
 *   Results (notify) 61A885A4-41C3-60D0-9A53-6D652A70D29C
 *
 * IMPORTANT - notify payload format is NOT fully documented:
 *   The byte layout of the results notification is "confirm-on-device".
 *   Our best-guess assumption is {byte0 = class index, byte1 = confidence
 *   (0..255 -> 0..100%)}, but we parse DEFENSIVELY: we handle other lengths,
 *   try alternative interpretations, and always surface the raw hex so the
 *   true format can be reverse-engineered against a live board. Nothing here
 *   should crash on an unexpected frame - it degrades gracefully.
 *
 * Build / test status: NOT tested against a live board. Web Bluetooth needs
 * Chrome/Edge over https or localhost; unsupported on iOS Safari / Firefox.
 */

'use strict';

/* ------------------------------------------------------------------ *
 * Constants - verified UUIDs and class map
 * ------------------------------------------------------------------ */

// Web Bluetooth requires lowercase 128-bit UUIDs.
const SERVICE_UUID = 'dda4d145-fc52-4705-bb93-dd1f295aa522';
const CONTROL_CHAR_UUID = '02aa6d7d-23b4-4c84-af76-98a7699f7fe2';
const RESULTS_CHAR_UUID = '61a885a4-41c3-60d0-9a53-6d652a70d29c';

// Control payloads (single byte): start vs stop inference on the board.
const CMD_START = Uint8Array.of(0x01);
const CMD_STOP = Uint8Array.of(0x00);

// Class index -> { slug, label } for the 5 gesture classes, in the order the
// EI model emits them. The slug drives per-class accent coloring in CSS.
// Suggested LED colors (board side): circle=blue, zigzag=green, updown=red,
// leftright=purple, none=off.
const CLASS_MAP = Object.freeze([
  { slug: 'circle', label: 'Circle' },     // index 0
  { slug: 'zigzag', label: 'Zigzag' },     // index 1
  { slug: 'updown', label: 'Up / Down' },  // index 2
  { slug: 'leftright', label: 'Left / Right' }, // index 3
  { slug: 'none', label: 'None' },         // index 4
]);

/* ------------------------------------------------------------------ *
 * Immutable BLE connection state
 * ------------------------------------------------------------------ *
 * Per the project immutability rule we never mutate this object in place;
 * each transition produces a fresh state via setState().
 */
let state = Object.freeze({
  device: null, // BluetoothDevice
  server: null, // BluetoothRemoteGATTServer
  controlChar: null, // control write characteristic (0x01 start / 0x00 stop)
  resultsChar: null, // results notify characteristic
  connected: false,
  running: false, // is inference currently started?
});

function setState(patch) {
  state = Object.freeze({ ...state, ...patch });
  return state;
}

/* ------------------------------------------------------------------ *
 * DOM references
 * ------------------------------------------------------------------ */
const els = {
  connectBtn: document.getElementById('connectBtn'),
  inferenceBtn: document.getElementById('inferenceBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  statusPill: document.getElementById('statusPill'),
  statusText: document.getElementById('statusText'),
  gestureName: document.getElementById('gestureName'),
  confidenceFill: document.getElementById('confidenceFill'),
  confidenceValue: document.getElementById('confidenceValue'),
  rawFrame: document.getElementById('rawFrame'),
  logList: document.getElementById('logList'),
  clearLogBtn: document.getElementById('clearLogBtn'),
};

/* ------------------------------------------------------------------ *
 * Logging + status helpers
 * ------------------------------------------------------------------ */

/**
 * Append a timestamped line to the on-screen event log (and the console).
 * @param {string} message
 * @param {'info'|'success'|'warn'|'error'} [level]
 */
function log(message, level = 'info') {
  const li = document.createElement('li');
  li.className = `log__item log__item--${level}`;

  const time = document.createElement('span');
  time.className = 'log__time';
  time.textContent = new Date().toLocaleTimeString();

  const text = document.createElement('span');
  text.className = 'log__text';
  text.textContent = message;

  li.append(time, text);
  els.logList.prepend(li); // newest on top

  // Cap the log so it never grows unbounded during a long session.
  while (els.logList.childElementCount > 200) {
    els.logList.lastElementChild.remove();
  }

  // Mirror to console for debugging in DevTools.
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[aegis] ${message}`);
}

/**
 * Update the connection status pill.
 * @param {'disconnected'|'connecting'|'connected'} kind
 * @param {string} text
 */
function setStatus(kind, text) {
  els.statusPill.classList.remove('is-disconnected', 'is-connecting', 'is-connected');
  els.statusPill.classList.add(`is-${kind}`);
  els.statusText.textContent = text;
}

/** Reflect current state onto the button enabled/labels. */
function syncControls() {
  els.connectBtn.disabled = state.connected;
  els.disconnectBtn.disabled = !state.connected;

  els.inferenceBtn.disabled = !state.connected;
  els.inferenceBtn.dataset.running = String(state.running);
  els.inferenceBtn.textContent = state.running ? 'Stop inference' : 'Start inference';
}

/* ------------------------------------------------------------------ *
 * Gesture rendering
 * ------------------------------------------------------------------ */

/**
 * Render a parsed inference result into the big display + confidence bar.
 * @param {{slug:string,label:string,confidence:number}} result
 *        confidence is a 0..1 fraction.
 */
function renderGesture(result) {
  els.gestureName.textContent = result.label;
  els.gestureName.dataset.class = result.slug;

  const pct = Math.max(0, Math.min(100, Math.round(result.confidence * 100)));
  els.confidenceFill.style.width = `${pct}%`;
  els.confidenceValue.textContent = `${pct}%`;
}

/** Reset the live display to its idle look. */
function resetGesture() {
  els.gestureName.textContent = '\u2014'; // em dash placeholder (matches index.html idle state)
  els.gestureName.dataset.class = 'none';
  els.confidenceFill.style.width = '0%';
  els.confidenceValue.textContent = '--%';
}

/* ------------------------------------------------------------------ *
 * Defensive notify-payload parser
 * ------------------------------------------------------------------ *
 * The true on-wire format is undocumented (confirm-on-device). This parser:
 *   1. Always computes a hex dump for display/diagnostics.
 *   2. Tries the PRIMARY assumption: byte0 = class index (0..4),
 *      byte1 = confidence (0..255 mapped to 0..1).
 *   3. Falls back to a single-byte frame (class index only, confidence
 *      unknown -> shown as 0).
 *   4. As a last resort, tries to interpret the buffer as ASCII text that
 *      matches one of the known class slugs/labels (some EI builds emit a
 *      human-readable string).
 *   5. Returns slug 'unknown' (but still the hex) if nothing matches, so the
 *      UI degrades gracefully instead of throwing.
 */

/** @param {DataView} view */
function toHex(view) {
  const bytes = [];
  for (let i = 0; i < view.byteLength; i++) {
    bytes.push(view.getUint8(i).toString(16).padStart(2, '0'));
  }
  return bytes.length ? bytes.join(' ') : '(empty)';
}

/** Map a 0-based class index to its entry, or null if out of range. */
function classFromIndex(index) {
  return index >= 0 && index < CLASS_MAP.length ? CLASS_MAP[index] : null;
}

/**
 * @param {DataView} view  raw notification bytes
 * @returns {{slug:string,label:string,confidence:number,hex:string,note:string}}
 */
function parseResult(view) {
  const hex = toHex(view);
  const len = view.byteLength;

  // ---- Primary assumption: [classIndex, confidencePercent0..100, ...] ----
  // Contract with firmware-option-b/src/aegis_inference.cpp: byte1 is a PERCENT
  // (0..100), not 0..255. CONFIRM-ON-DEVICE: the exact byte layout of the stock
  // Edge Impulse firmware's notify payload is undocumented; this matches our
  // Option-B firmware. The hex fallback below covers any other layout.
  if (len >= 2) {
    const idx = view.getUint8(0);
    const cls = classFromIndex(idx);
    if (cls) {
      const confidence = Math.min(view.getUint8(1), 100) / 100; // 0..100% -> 0..1
      return { ...cls, confidence, hex, note: 'parsed [idx,conf%]' };
    }
  }

  // ---- Single-byte frame: class index only ----
  if (len === 1) {
    const idx = view.getUint8(0);
    const cls = classFromIndex(idx);
    if (cls) {
      return { ...cls, confidence: 0, hex, note: 'parsed [idx] (no confidence byte)' };
    }
  }

  // ---- ASCII fallback: some firmwares notify a readable label string ----
  try {
    const text = new TextDecoder('utf-8', { fatal: false }).decode(view).trim().toLowerCase();
    if (text) {
      const cls = CLASS_MAP.find((c) => text.includes(c.slug) || text.includes(c.label.toLowerCase()));
      if (cls) {
        // Try to scrape a trailing numeric confidence like "circle 0.94".
        const num = text.match(/([01](?:\.\d+)?|0?\.\d+|\d{1,3})\s*%?$/);
        let confidence = 0;
        if (num) {
          const v = parseFloat(num[1]);
          confidence = v > 1 ? Math.min(v / 100, 1) : v; // handle 0..100 or 0..1
        }
        return { ...cls, confidence, hex, note: 'parsed ASCII label' };
      }
    }
  } catch (_) {
    // Non-text payload - fall through to unknown.
  }

  // ---- Unknown: keep the UI alive, show raw hex ----
  return {
    slug: 'unknown',
    label: 'Unknown frame',
    confidence: 0,
    hex,
    note: `unrecognized ${len}-byte payload`,
  };
}

/* ------------------------------------------------------------------ *
 * Notification handler
 * ------------------------------------------------------------------ */
function onResultsNotification(event) {
  // event.target.value is a DataView of the notification payload.
  const view = event.target.value;
  if (!view) return;

  const result = parseResult(view);

  // Always show the raw frame so the real format can be confirmed on-device.
  els.rawFrame.textContent = result.hex;

  if (result.slug === 'unknown') {
    log(`Unparsed frame (${result.note}): ${result.hex}`, 'warn');
    // Show the literal hex in the big display rather than pretending a gesture.
    els.gestureName.textContent = 'Unknown';
    els.gestureName.dataset.class = 'none';
    els.confidenceFill.style.width = '0%';
    els.confidenceValue.textContent = '--%';
    return;
  }

  renderGesture(result);
}

/* ------------------------------------------------------------------ *
 * Connect / disconnect
 * ------------------------------------------------------------------ */

async function connect() {
  // Feature detection - bail early on unsupported browsers (iOS/Firefox).
  if (!('bluetooth' in navigator)) {
    log('Web Bluetooth is not available. Use Chrome or Edge on desktop or Android, served over https or localhost.', 'error');
    setStatus('disconnected', 'Unsupported browser');
    return;
  }

  try {
    setStatus('connecting', 'Requesting device...');
    log('Opening device chooser (filtering on the Aegis Edge service)...');

    // requestDevice MUST be called from a user gesture (the click handler).
    // We filter on the verified service UUID and also list it in
    // optionalServices so getPrimaryService() is permitted after connect.
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    });

    setState({ device });
    log(`Selected device: ${device.name || '(unnamed)'} [${device.id}]`);

    // React to the board dropping the link (out of range, power off, etc.).
    device.addEventListener('gattserverdisconnected', onUnexpectedDisconnect);

    setStatus('connecting', 'Connecting GATT...');
    const server = await device.gatt.connect();
    log('GATT server connected.', 'success');

    setStatus('connecting', 'Discovering service...');
    const service = await server.getPrimaryService(SERVICE_UUID);

    const controlChar = await service.getCharacteristic(CONTROL_CHAR_UUID);
    const resultsChar = await service.getCharacteristic(RESULTS_CHAR_UUID);
    log('Control + results characteristics resolved.', 'success');

    // Wire the notify handler now; we only call startNotifications() on Start.
    resultsChar.addEventListener('characteristicvaluechanged', onResultsNotification);

    setState({ server, controlChar, resultsChar, connected: true, running: false });
    setStatus('connected', `Connected${device.name ? ' - ' + device.name : ''}`);
    syncControls();
    resetGesture();
    log('Ready. Press "Start inference" to begin streaming results.', 'success');
  } catch (err) {
    // User cancelling the chooser throws NotFoundError - treat as benign.
    if (err && err.name === 'NotFoundError') {
      log('Device selection cancelled.', 'warn');
      setStatus('disconnected', 'Disconnected');
    } else {
      log(`Connection failed: ${err && err.message ? err.message : err}`, 'error');
      setStatus('disconnected', 'Connection failed');
    }
    await safeTeardown();
  }
}

/** Stop inference (best effort), stop notifications, drop the GATT link. */
async function disconnect() {
  log('Disconnecting...');
  try {
    if (state.running) {
      await stopInference({ silent: true });
    }
  } catch (_) {
    /* ignore - we are tearing down anyway */
  }
  await safeTeardown();
  setStatus('disconnected', 'Disconnected');
  log('Disconnected.', 'success');
}

/**
 * Tear down listeners + GATT without throwing. Used by both intentional
 * disconnect and error recovery.
 */
async function safeTeardown() {
  const { device, resultsChar } = state;

  if (resultsChar) {
    resultsChar.removeEventListener('characteristicvaluechanged', onResultsNotification);
    try {
      await resultsChar.stopNotifications();
    } catch (_) {
      /* characteristic may already be gone */
    }
  }

  if (device) {
    device.removeEventListener('gattserverdisconnected', onUnexpectedDisconnect);
    if (device.gatt && device.gatt.connected) {
      try {
        device.gatt.disconnect();
      } catch (_) {
        /* ignore */
      }
    }
  }

  setState({
    device: null,
    server: null,
    controlChar: null,
    resultsChar: null,
    connected: false,
    running: false,
  });
  syncControls();
  resetGesture();
}

/** Fired when the board disconnects on its own (range/power/etc.). */
function onUnexpectedDisconnect() {
  log('Board disconnected unexpectedly (out of range or powered off?).', 'warn');
  safeTeardown();
  setStatus('disconnected', 'Disconnected');
}

/* ------------------------------------------------------------------ *
 * Start / stop inference
 * ------------------------------------------------------------------ */

/**
 * Write to the control characteristic, preferring the explicit write-with-response
 * variant (writeValue() is deprecated). Falls back to writeValueWithoutResponse()
 * if the characteristic is configured write-without-response, and finally to the
 * legacy writeValue() for older browsers.
 * @param {BufferSource} value
 */
async function writeControl(value) {
  const c = state.controlChar;
  if (typeof c.writeValueWithResponse === 'function') {
    try {
      return await c.writeValueWithResponse(value);
    } catch (_) {
      if (typeof c.writeValueWithoutResponse === 'function') {
        return await c.writeValueWithoutResponse(value);
      }
      throw _;
    }
  }
  return c.writeValue(value); // legacy fallback
}

async function startInference() {
  if (!state.connected || !state.controlChar || !state.resultsChar) {
    log('Cannot start - not connected.', 'warn');
    return;
  }
  try {
    // Web Bluetooth requires startNotifications() before the device's CCCD is
    // enabled and notifications begin flowing.
    await state.resultsChar.startNotifications();
    log('Subscribed to results notifications.');

    // Tell the firmware to begin running the classifier: control char <- 0x01.
    await writeControl(CMD_START);
    setState({ running: true });
    syncControls();
    log('Inference started (sent 0x01 to control characteristic).', 'success');
  } catch (err) {
    log(`Failed to start inference: ${err && err.message ? err.message : err}`, 'error');
    // Roll back the subscription if the write failed.
    try {
      await state.resultsChar.stopNotifications();
    } catch (_) {
      /* ignore */
    }
    setState({ running: false });
    syncControls();
  }
}

/**
 * Stop inference: control char <- 0x00, then stop notifications.
 * @param {{silent?:boolean}} [opts]
 */
async function stopInference(opts = {}) {
  if (!state.controlChar) return;
  try {
    await writeControl(CMD_STOP);
    if (!opts.silent) log('Inference stopped (sent 0x00 to control characteristic).', 'success');
  } catch (err) {
    if (!opts.silent) log(`Failed to send stop: ${err && err.message ? err.message : err}`, 'error');
  }

  try {
    if (state.resultsChar) await state.resultsChar.stopNotifications();
  } catch (_) {
    /* ignore */
  }

  setState({ running: false });
  syncControls();
  resetGesture();
}

/** Single toggle button -> start or stop depending on current state. */
async function toggleInference() {
  if (state.running) {
    await stopInference();
  } else {
    await startInference();
  }
}

/* ------------------------------------------------------------------ *
 * Wire up the UI
 * ------------------------------------------------------------------ */
els.connectBtn.addEventListener('click', connect);
els.disconnectBtn.addEventListener('click', disconnect);
els.inferenceBtn.addEventListener('click', toggleInference);
els.clearLogBtn.addEventListener('click', () => {
  els.logList.replaceChildren();
});

// Startup feature check so the user is told immediately on unsupported browsers.
if (!('bluetooth' in navigator)) {
  setStatus('disconnected', 'Web Bluetooth unsupported');
  els.connectBtn.disabled = true;
  log('This browser does not support Web Bluetooth. Use Chrome or Edge (desktop or Android), served over https or localhost. iOS Safari and Firefox are NOT supported.', 'error');
} else {
  log('Ready. Click "Connect to board" to choose your Thunderboard Sense 2.');
}
