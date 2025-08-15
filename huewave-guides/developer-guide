# Huewave — Manual & Developer Guide

**Project:** huewave.xyz  
**Audience:** Non-engineers and engineers alike; teaches operation, editing, and extension from first principles.  
**Scope:** How the site works (HTML/CSS/JS/JSON), how to post and maintain, and how to open up the synth engine (Web Audio now; Tone.js path included).

---

## 0) Quick Start (Cheat Sheet)

**Post a new tile**
1. Edit `data.json`. Add a new object in `posts` with a color hex; other fields are optional:
   ```json
   {
     "date": "2025-08-15",
     "hex": "#4BB1FF",
     "kit": "lofi",
     "base": "A3",
     "mode": "dorian",
     "bpm": 84,
     "steps": 16,
     "octaves": 2,
     "waveform": "triangle",
     "swing": 0.14,
     "drive": 0.5,
     "crush": 0.22,
     "dust": 0.02
   }
   ```
2. Save, commit, and push. If you have `huepush` in Termux:
   ```bash
   huepush "add post #4BB1FF"
   ```
3. Cloudflare Pages redeploys automatically. Hard-refresh on mobile if you don’t see it.

**Play / stop**
- Tap a tile to play. Tap it again to stop. Tap a different tile to switch; the previous button pops back visually.
- Mute button soft-ramps to silence and back.

**Dark mode**
- Tap the sun/moon icon. Preference is remembered.

---

## 1) Architecture Overview

- **HTML (`index.html`)**: Provides structure and semantic hooks.
- **CSS (`styles.css`)**: Governs theme, layout, micro-interactions (including the “pressed” play button logic).
- **Content (`data.json`)**: Minimal “database” of posts. Pure static file.
- **Logic (`app.js`)**: UI wiring plus the **synth engine** (Web Audio API).
- **Hosting**: GitHub repo → Cloudflare Pages deploys on push.

Relationship:
```
data.json ──> app.js (fetch + render tiles)
          └─> app.js (maps post params → audio engine)
index.html + styles.css ← classes/ids referenced by app.js
```

---

## 2) File Layout

```
/               # project root
├─ index.html   # markup, controls, grid container
├─ styles.css   # theming, layout, play button logic
├─ app.js       # data loader, UI, audio engine
└─ data.json    # post entries (content + synth params)
```

Optional future:
```
/docs/guide.md  # this guide; can be committed to the repo
/assets/        # favicons, any static images (optional)
```

---

## 3) The Data Model (data.json)

Each entry in `posts` creates one tile. Only `hex` is required (invalid hex is ignored). Missing fields fall back to sensible defaults.

**Schema**
- `date` (string, `YYYY-MM-DD`): Optional; if omitted, defaults to today.
- `hex` (string, `#RRGGBB`): Required. Sets tile swatch and influences pad tone.
- `kit` (string): `"" | "ko" | "jazz" | "lofi" | "arcade" | "pad" | "drone"`
- `base` (string): Musical root (e.g., `"A3"`).
- `mode` (string): `ionian|dorian|phrygian|lydian|mixolydian|aeolian|locrian|pent_major|pent_minor`
- `bpm` (number): 40–140 recommended.
- `steps` (number): 8–32 sixteen‑steps per bar loop length.
- `octaves` (number): 1–3. Controls occasional octave jumps.
- `waveform` (string): `sine|triangle|square` for blips/chords.
- `swing` (number): 0–0.3; offsets every second sixteenth.
- `drive` (number): 0–1.2; probability/intensity for KO33 micro-events.
- `crush` (number): 0–1; lowers pre‑LP cutoff → darker tone.
- `dust` (number): 0–0.2; level of the ambient pad.

**Behavioral notes**
- No `kit` → melodic ticks only.
- `pad` kit focuses on chords, no drums.
- `drone` kit sustains low oscillators and sprinkles blips.
- `dust` raises pad level—keep modest on mobile.
- The engine clamps out-of-range values to safe ranges.

---

## 4) HTML: the essential hooks

Key ids/classes referenced by `app.js`:

- `#themeBtn` — toggles `<html data-theme="...">` (light/dark).
- `#muteBtn` — toggles master gain ramp to/from 0.
- `#toTop` — smooth-scroll button; shows after scrolling.
- `#moodTicker` / `#soundTicker` — rotating translations.
- `#grid` — where tiles are injected.

Generated tile structure:
```html
<article class="tile" data-idx="0" data-hex="#4BB1FF" data-date="2025-08-15">
  <div class="swatch" style="background:#4BB1FF">
    <div class="play"><!-- SVG icon injected here --></div>
  </div>
  <div class="meta">
    <div class="date">2025-08-15</div>
    <div class="hex">#4BB1FF</div>
  </div>
</article>
```

---

## 5) CSS: theming and pressed-state logic

- Theme tokens (`--bg`, `--fg`, …) define color system for dark/light.
- Grid uses `auto-fill` + `minmax` for responsive tiles.
- **Play button pressed look** uses **CSS `:has()`** when available:
  - When the pause icon SVG is present, `.play` gets a pressed style.
  - Fallback via `@supports not(selector(:has(*)))` uses `.tile.playing`.
- Tickers adapt at small widths; reduced motion disables animations.

Tip: if changing the pause/play SVG shapes, update the `:has()` selector accordingly.

---

## 6) JavaScript: the UI and data flow

**Load & render**
1. Fetch `data.json` with `cache:"no-store"`. Normalize and sort by date (newest first).
2. Build tiles and append to `#grid`.
3. Poll `HEAD` for `ETag`/`Last-Modified`. If changed, stop audio and re-render.

**Controls**
- Theme button saves preference to `localStorage`.
- Mute button ramps `master.gain` quickly to avoid clicks.
- “To top” shows when `scrollY > 240`.

**Tile click handling**
- A **lock** prevents race conditions under rapid taps.
- Clicking same tile: stop audio; reset the button.
- Clicking a different tile: stop previous; reset all visuals; start new; press new button.

**Translations**
- Two small loops rotate the “mood/sound” words with randomized intervals.

---

## 7) Audio Engine: Web Audio signal path

**Chain**
```
voices (kit + pad + KO33 micro) → bus
bus → preLP → AGC → compressor → soft limiter → DC-block → master → destination
                            ↘ analyser (RMS)
delay loop (pre-comp, subtle HP filtered feedback) → mix back into comp
```

**Why this order**
- `preLP`: gentle tone softening; `crush` maps to cutoff. Smoother highs = less harsh on phones.
- `AGC`: downward gain rider when RMS rises above target. Prevents surprise peaks between patterns.
- `compressor`: cohesive transient control.
- `soft limiter`: safety ceiling via WaveShaper, more transparent than hard clip.
- `DC-block`: removes low-frequency bias/rumble to protect small speakers.
- `delay`: very light ambience before dynamics; feedback is HP filtered to avoid mud.

**Voices**
- **Drums**: kick (sine drop), snare (noise + BP), hat (HP noise).
- **Melodic**: `blip()` plucks and `chord()` triads using ADSR envelopes.
- **Pad**: stereo, color‑aware filter cutoff; slow LFOs drive pan/cutoff.
- **KO33 micro**: probabilistic tiny events (micro plucks, formant chirps, bit ticks) controlled by `drive` and `swing`.

**Timing**
- `bpm → seconds/beat → sixteenth grid` with swing on every second step.
- `steps` defines loop length (modulo index).

**Cleanup**
- All per‑play nodes are registered; stop/disconnect/clear on stop.
- Wait for silence (RMS threshold with hold time), then rebuild delay.
- Prevents “buildup” artifacts when switching fast.

---

## 8) Operations & Maintenance

**Add / edit posts**
- Edit `data.json`; keep valid `#RRGGBB` hex.
- Commit & push. Cloudflare builds and deploys automatically.
- Site polls for updates; hard refresh to force immediate.

**Style changes**
- Adjust tokens at top of CSS for global theme.
- Change grid `minmax(180px, 1fr)` to alter density.

**Performance**
- If audio “pumps” or distorts on phones:
  - Lower `dust` (pad level) and `drive`.
  - Slightly relax the compressor (e.g., threshold −16 dB, ratio 2.5).
  - Keep delay wet/feedback conservative.

**Debug checklist**
- Button stuck pressed → ensure pause SVG matches the `:has()` selector; fallback uses `.tile.playing`.
- Silence on first tap (iOS) → must resume AudioContext inside click handler (already done).

---

## 9) Deep Dive: Adapting and Extending the Synth (Web Audio)

### 9.1 Envelopes (ADSR)
Defined in `env(t,a,d,s,r,g)`. Change how notes open/close:
- Softer attack: `a = 0.02–0.05`
- Longer tails: `r = 0.3–0.6`
- Pluckier: short `a` and `r`

### 9.2 Oscillator waveforms
Currently `sine`, `triangle`, `square`. Add custom partials:
```js
function oscTriSine(f){
  const o = ctx.createOscillator();
  const real = new Float32Array([0,0,1,0,0.3]);
  const imag = new Float32Array(real.length);
  o.setPeriodicWave(ctx.createPeriodicWave(real, imag));
  o.frequency.value = f;
  return regE(o);
}
```

### 9.3 New kits
Create `startMYKIT(cfg)` mirroring others. Schedule events in a 16-step loop, using `kick/snare/hat/blip/chord` building blocks.

### 9.4 Scales and modes
Extend the `MODES` object. Example harmonic minor:
```js
MODES.harm_minor = [0,2,3,5,7,8,11];
```

### 9.5 Pad design
Pad cutoff is derived from color lightness; can also factor in mode (`aeolian` darker, `lydian` brighter). Add a subtle chorus by slow LFO to the pan of two detuned oscillators.

### 9.6 Dynamics
- Softer: raise compressor threshold (less negative), lower ratio.
- Tighter: faster attack, slightly faster release.
- Limiter curve: replace the linear clip with `tanh` for smoother saturation.

### 9.7 Probabilistic micro-events
Change `drive` mapping to tune frequency of KO33-style hits. Add more functions (e.g. “grain blip,” “tape wow/flutter” using `OscillatorNode` modulating `playbackRate` of a short buffer).

---

## 10) Opening Up With Tone.js (Pocket‑Operator‑style Techniques)

Tone.js can simplify sequencing, synthesis, and effects. Two integration strategies:

### Strategy A — Side-by-side engine (recommended for learning)
Keep Web Audio engine for the site. Add a **studio mode** (a separate page or a dev flag) that uses Tone.js for experimentation. When satisfied, port patterns back into JSON-friendly params.

### Strategy B — Swap-in engine (advanced)
Replace per-voice builders with Tone.js equivalents under a feature flag. Keep the same JSON schema so content doesn’t change.

### 10.1 Including Tone.js
In a separate playground page (e.g., `studio.html`), include Tone.js (pin a version):
```html
<script src="https://cdn.jsdelivr.net/npm/tone@14/dist/Tone.js"></script>
```
*(Pin a specific version to avoid surprise breaks.)*

### 10.2 Mapping JSON → Tone graph
Example: build a pocket-operator‑like rig with mono synth, noise hats, sampler snare, and effects.

```js
// Transport
Tone.Transport.bpm.value = bpm;      // from JSON
Tone.Transport.swing = swing * 0.6;  // scale to taste

// Master safety (Tone has its own limiter & compressor)
const comp = new Tone.Compressor(-20, 3).toDestination();
const limit = new Tone.Limiter(-1).connect(comp);

// Pre-master bus (so one fader controls everything)
const bus = new Tone.Gain(0.9).connect(limit);

// Instruments
const synth = new Tone.MonoSynth({
  oscillator: { type: waveform || "triangle" },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.6, release: 0.2 }
}).connect(bus);

const noise = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.02 }
}).connect(bus);

const kick = new Tone.MembraneSynth({
  pitchDecay: 0.03, octaves: 6, oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.05 }
}).connect(bus);

// Optional snare sampler (replace with your own samples)
const snare = new Tone.Sampler({
  urls: { C4: "snare.wav" }    // host a small WAV in your repo
}).connect(bus);

// Effects
const lp = new Tone.Filter(16000 - crush*3000, "lowpass").connect(bus);
const delay = new Tone.FeedbackDelay(0.16, 0.08).connect(lp);
bus.connect(delay);

// Pattern helpers
function scaleFreq(base, modeDegrees, stepIndex, octaves=2){
  const baseMidi = noteToMidi(base);
  const deg = modeDegrees[stepIndex % modeDegrees.length];
  const lift = (octaves>1 && Math.random()>0.6) ? 12 : 0;
  return Tone.Frequency(baseMidi + deg + lift, "midi").toFrequency();
}

// Sequences (16‑step grid)
const seq = new Tone.Sequence((time, step) => {
  const t = time + ((step%2) ? (0.5/4 * swing) : 0); // swing on off‑sixteenths

  // KO-like: kick on quarters, snare on 3,7, hats on 8ths
  if (step % 4 === 0) kick.triggerAttackRelease("C2", 0.1, t);
  if (step % 8 === 4) snare.triggerAttackRelease("C4", 0.05, t);

  if (step % 2 === 0) noise.triggerAttackRelease(0.03, t);

  // melodic blip
  const f = scaleFreq(base, MODES[mode], Math.floor(step/2), octaves);
  synth.triggerAttackRelease(f, 0.2, t);

  // small chance of micro‑event
  if (Math.random() < drive*0.3) {
    synth.detune.rampTo((Math.random()-0.5)*12, 0.05);
  }
}, Array.from({length: steps||16}, (_,i)=>i), "16n");

seq.start(0);
```

Notes:
- Tone.Transport handles timing and swing.
- Tone nodes simplify effects (Filter, FeedbackDelay, Limiter).
- Use `Sampler` for PO‑33‑style micro-samples. Keep files tiny.

### 10.3 Parameter locks & microsteps (PO flavor)
- **Parameter Locks**: Change synth parameters on specific steps:
  ```js
  // inside Sequence callback
  if (step === 7) synth.envelope.decay = 0.05; // shorter blip on step 8
  if (step === 11) delay.delayTime.rampTo(0.12, 0.02);
  ```
- **Microsteps**: Trigger extra notes slightly offset inside a step:
  ```js
  if (step === 3){
    synth.triggerAttackRelease(f, 0.08, time + Tone.Time("32n")); // late microstep
  }
  ```
- **Choke groups**: For open/closed hats, stop one when the other plays:
  ```js
  const openHat = new Tone.NoiseSynth(...), closedHat = new Tone.NoiseSynth(...);
  // when closed hat triggers:
  openHat.triggerRelease();  // simple choke behavior
  ```

### 10.4 Porting back to JSON
After experimenting in Tone.js studio:
- Freeze decisions into JSON fields (`kit`, `bpm`, `swing`, `drive`, etc.).
- If a specific pattern is desired, encode it with a lightweight string field (e.g., `"pattern":"x---x---x---x---"` for kick), then extend `app.js` to interpret it.

---

## 11) Roadmap Ideas

- **PWA**: Add a Service Worker to cache `index.html`, `styles.css`, `app.js`, and `data.json` for offline viewing (audio still needs a user gesture).
- **Sampler pack**: Allow optional per‑post sample URLs; fall back to synth drums when absent.
- **Per‑post effects**: Extend JSON with `fx: { delay: 0.1, chorus: 0.2 }` and map to gains.
- **Accessibility**: Add `aria-labels` to play buttons with the hex and date; current `:has()` already leverages accessible states with minimal code changes.
- **Dev/studio toggle**: Query param `?engine=tone` to switch to Tone.js engine on a separate studio page.

---

## 12) Glossary (one‑liners)

- **ADSR**: Attack/Decay/Sustain/Release envelope shaping volume over time.
- **AGC**: Automatic Gain Control; reduces level when overall loudness rises.
- **Limiter**: Prevents output from exceeding a ceiling; avoids clipping.
- **DC‑block**: Removes near‑0 Hz energy; important for small speakers.
- **Swing**: Delays every second sixteenth for groove.
- **Mode**: Variant of a scale (Ionian = major; Aeolian = natural minor; others adjust degrees).

---

## 13) Maintenance Checklist

- **Before commit**: Validate hex codes and JSON syntax.
- **Audio sanity**: Test on at least one Android and one iOS device.
- **Pressed state**: If icons change, update the CSS `:has()` selector.
- **Performance**: Keep `drive`, `dust`, and `bpm` within moderate ranges to avoid mobile compression.
- **Version pinning**: When adding Tone.js or samples, pin versions and keep samples short/mono.

---

## Appendix A: Helper Functions (conceptual)

```js
// Note → MIDI → frequency
const A4 = 440, A4_MIDI = 69;
function noteToMidi(n){ /* parse "A3" etc.; returns 57 for A3 */ }
function midiToFreq(m){ return A4 * Math.pow(2, (m - A4_MIDI)/12); }

// ADSR
function env(t, a, d, s, r, g){ /* returns a GainNode with scheduled envelope */ }

// Cleanup protocol
async function stopAudio(){
  // stop intervals, stop & disconnect ephemeral nodes, wait for silence, rebuild delay
}
```

---

## Appendix B: Safe Parameter Ranges

- `bpm`: 60–110 (lofi sweet spot)
- `swing`: 0.08–0.18
- `drive`: 0.2–0.7
- `crush`: 0.1–0.35
- `dust`: 0.01–0.06 (higher can mask drums)

---

**End of Guide — Happy building.**
