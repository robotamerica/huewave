
# Huewave Studio — Build Guide
**Goal:** Create `huewavestudio.html` — a standalone, in-browser studio for **live sound creation**, previewing patterns, and generating JSON posts for `data.json`.

Works on mobile/desktop. Uses Web Audio (default) and optionally **Tone.js** for PO-style sequencing. No server required.

---

## 0) What You’ll Build
- A single static page: `huewavestudio.html`
- Left side: **Controls** (color, kit, mode, bpm, swing, steps, root note, octaves, waveform, drive, crush, dust).
- Middle: **Pattern grid** (16 steps) with parameter locks & microsteps.
- Right side: **Mixer** (master, pad, delay) + **Meters**.
- Bottom: **Transport** (Play/Stop) + **Export** (copy JSON) + **Preset** (save/load to localStorage).

Everything runs local. Exported JSON can be pasted into `data.json` for the main site.

---

## 1) Minimal Scaffolding

Create a new file `huewavestudio.html` in project root.

```html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Huewave Studio</title>

  <!-- Optional: pin Tone.js for the Tone engine mode -->
  <!-- <script src="https://cdn.jsdelivr.net/npm/tone@14/dist/Tone.js"></script> -->

  <style>
    :root{
      --bg:#0b0b0c; --fg:#e6e6e6; --muted:#9aa0a6; --ring:rgba(255,255,255,.12);
      --panel:#141416; --accent:#4BB1FF;
    }
    body{ margin:0; background:var(--bg); color:var(--fg);
      font:14px/1.45 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
    .wrap{ display:grid; grid-template-columns: 280px 1fr 280px; gap:12px; padding:12px; }
    .panel{ background:var(--panel); border:1px solid var(--ring); border-radius:14px; padding:12px; }
    h2{ font-size:13px; text-transform:uppercase; letter-spacing:.12em; opacity:.8; margin:0 0 8px }
    .row{ display:flex; gap:10px; align-items:center; margin:10px 0 }
    label{ font-size:12px; opacity:.8; min-width:90px }
    input[type="range"]{ width:100% }
    input[type="number"], select, input[type="text"]{
      background:#0f0f11; color:var(--fg); border:1px solid var(--ring);
      border-radius:10px; padding:6px 8px; width:100%;
    }
    .grid{ display:grid; grid-template-columns: repeat(16, 1fr); gap:6px; }
    .step{ aspect-ratio:1/1; border:1px solid var(--ring); border-radius:8px; background:#0f0f11;
      display:grid; place-items:center; cursor:pointer; transition:.15s; }
    .step.on{ background:color-mix(in oklab, var(--accent) 35%, black); }
    .transport{ position:sticky; bottom:0; left:0; right:0; background:rgba(0,0,0,.35);
      backdrop-filter: blur(8px) saturate(130%); border-top:1px solid var(--ring); padding:10px; display:flex; gap:10px; }
    button{ background:var(--panel); color:var(--fg); border:1px solid var(--ring); border-radius:10px; padding:8px 12px; cursor:pointer }
    .meters{ display:grid; gap:8px }
    .bar{ height:8px; background:#0f0f11; border-radius:99px; overflow:hidden }
    .bar > i{ display:block; height:100%; width:10%; background:var(--accent) }
    .pair{ display:grid; grid-template-columns: 1fr 1fr; gap:8px }
    .notegrid{ display:grid; grid-template-columns: repeat(8, 1fr); gap:4px; }
    .note{ border:1px dashed var(--ring); border-radius:8px; padding:4px; text-align:center; cursor:pointer }
    @media (max-width: 980px){
      .wrap{ grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="panel" id="left">
      <h2>Post</h2>
      <div class="row"><label>Color</label><input id="hex" type="text" value="#4BB1FF"></div>
      <div class="row"><label>Date</label><input id="date" type="text" placeholder="YYYY-MM-DD"></div>

      <h2>Synth</h2>
      <div class="row"><label>Kit</label>
        <select id="kit">
          <option value="">melodic</option>
          <option>ko</option><option>jazz</option><option>lofi</option>
          <option>arcade</option><option>pad</option><option>drone</option>
        </select>
      </div>
      <div class="row pair">
        <div><label>Base</label><input id="base" type="text" value="A3"></div>
        <div><label>Mode</label>
          <select id="mode">
            <option>ionian</option><option selected>dorian</option><option>phrygian</option><option>lydian</option><option>mixolydian</option><option>aeolian</option><option>locrian</option><option>pent_major</option><option>pent_minor</option>
          </select>
        </div>
      </div>
      <div class="row pair">
        <div><label>BPM</label><input id="bpm" type="number" min="40" max="140" value="84"></div>
        <div><label>Steps</label><input id="steps" type="number" min="8" max="32" value="16"></div>
      </div>
      <div class="row pair">
        <div><label>Octaves</label><input id="octaves" type="number" min="1" max="3" value="2"></div>
        <div><label>Wave</label><select id="waveform"><option>sine</option><option selected>triangle</option><option>square</option></select></div>
      </div>
      <div class="row pair">
        <div><label>Swing</label><input id="swing" type="range" step="0.01" min="0" max="0.3" value="0.14"></div>
        <div><label>Drive</label><input id="drive" type="range" step="0.01" min="0" max="1.2" value="0.5"></div>
      </div>
      <div class="row pair">
        <div><label>Crush</label><input id="crush" type="range" step="0.01" min="0" max="1" value="0.22"></div>
        <div><label>Dust</label><input id="dust" type="range" step="0.01" min="0" max="0.2" value="0.02"></div>
      </div>
      <div class="row"><button id="savePreset">Save Preset</button><button id="loadPreset">Load Preset</button></div>
    </section>

    <section class="panel" id="middle">
      <h2>Pattern</h2>
      <div class="grid" id="pattern"></div>
      <h2>Parameter Locks</h2>
      <div class="notegrid" id="locks">
        <!-- click to toggle micro-locks e.g., shorter decay on a given step -->
      </div>
    </section>

    <section class="panel" id="right">
      <h2>Mixer</h2>
      <div class="row"><label>Master</label><input id="master" type="range" min="0" max="1" step="0.01" value="0.9"></div>
      <div class="row"><label>Pad</label><input id="pad" type="range" min="0" max="0.25" step="0.01" value="0.04"></div>
      <div class="row"><label>Delay</label><input id="delay" type="range" min="0" max="0.3" step="0.01" value="0.08"></div>
      <div class="meters">
        <div class="bar"><i id="rms"></i></div>
      </div>
      <h2>Export</h2>
      <div class="row"><button id="copyJson">Copy JSON</button></div>
      <pre id="preview" style="white-space:pre-wrap; word-break:break-word; background:#0f0f11; padding:8px; border-radius:10px"></pre>
    </section>
  </div>

  <div class="transport">
    <button id="play">Play</button>
    <button id="stop">Stop</button>
    <label style="margin-left:auto"><input type="checkbox" id="useTone"> Use Tone.js Engine</label>
  </div>

  <script>
    // The studio JS: build a 16-step pattern, wire controls, and synth preview.
    // For brevity, this includes just the skeleton: fill in with your preferred engine (Web Audio or Tone.js).
    (function(){
      const pattern = document.getElementById('pattern');
      const steps = 16;
      const grid = Array.from({length:steps}, (_,i)=>{
        const el = document.createElement('div');
        el.className = 'step';
        el.textContent = i+1;
        el.addEventListener('click', ()=>{
          el.classList.toggle('on');
        });
        pattern.appendChild(el);
        return el;
      });

      // Export JSON preview
      const fields = ['hex','date','kit','base','mode','bpm','steps','octaves','waveform','swing','drive','crush','dust'];
      function read(){
        return {
          date: document.getElementById('date').value || new Date().toISOString().slice(0,10),
          hex: document.getElementById('hex').value || '#4BB1FF',
          kit: document.getElementById('kit').value || '',
          base: document.getElementById('base').value || 'A3',
          mode: document.getElementById('mode').value || 'dorian',
          bpm: +document.getElementById('bpm').value || 84,
          steps: +document.getElementById('steps').value || 16,
          octaves: +document.getElementById('octaves').value || 2,
          waveform: document.getElementById('waveform').value || 'triangle',
          swing: +document.getElementById('swing').value || 0.14,
          drive: +document.getElementById('drive').value || 0.5,
          crush: +document.getElementById('crush').value || 0.22,
          dust: +document.getElementById('dust').value || 0.02
        };
      }
      function updatePreview(){
        const o = read();
        document.getElementById('preview').textContent =
          JSON.stringify({ posts: [o] }, null, 2);
      }
      document.querySelectorAll('input,select').forEach(i=>i.addEventListener('input', updatePreview));
      updatePreview();

      // Clipboard export
      document.getElementById('copyJson').addEventListener('click', async()=>{
        try{
          await navigator.clipboard.writeText(document.getElementById('preview').textContent);
          alert('Copied JSON to clipboard.');
        }catch(e){
          alert('Copy failed. Select and copy manually.');
        }
      });

      // Presets (localStorage)
      document.getElementById('savePreset').addEventListener('click', ()=>{
        localStorage.setItem('huewave/studio/preset', JSON.stringify(read()));
        alert('Preset saved.');
      });
      document.getElementById('loadPreset').addEventListener('click', ()=>{
        const p = localStorage.getItem('huewave/studio/preset');
        if(!p) return alert('No preset saved yet.');
        const o = JSON.parse(p);
        fields.forEach(k=>{ const el=document.getElementById(k); if(el) el.value=o[k]; });
        updatePreview();
      });

      // Engine switch placeholder: wire to Web Audio or Tone.js as needed.
      document.getElementById('play').addEventListener('click', ()=>{
        // TODO: start transport (Web Audio or Tone.js)
        alert('Start playback (hook up your engine).');
      });
      document.getElementById('stop').addEventListener('click', ()=>{
        // TODO: stop and cleanup
        alert('Stop playback (hook up your engine).');
      });
    })();
  </script>
</body>
</html>
```

This scaffolding gives you the **UI shell** with JSON export. Next, connect audio.

---

## 2) Connecting the Web Audio Engine (match the site)

**Option A: Reuse the site’s `app.js` audio functions**  
- Copy the synth-building pieces (`ensureCtx`, `kick`, `snare`, `hat`, `blip`, `chord`, `startKO`, etc.) into a separate `<script>` in the studio, or import `app.js` and call a `startFromParams(params)` entry point.
- Map studio controls to the same fields as `data.json`, then call the same `startTile()` logic with a “fake tile.”
- Pros: sound matches the live site exactly.  
- Cons: you’re editing in two places if studio diverges.

**Option B: Keep studio isolated**  
- Duplicate only the audio parts into `studio.js`. When happy with a sound, copy the resulting JSON into `data.json`.  
- Pros: experiments won’t break the live site.  
- Cons: slight drift unless you sync periodically.

**Hook-up example:**
```js
// In studio <script> after UI:
const params = () => ({
  hex: hex.value, date: date.value,
  kit: kit.value, base: base.value, mode: mode.value,
  bpm: +bpm.value, steps: +steps.value,
  octaves: +octaves.value, waveform: waveform.value,
  swing: +swing.value, drive: +drive.value,
  crush: +crush.value, dust: +dust.value
});

play.onclick = async() => {
  await startFromParams(params()); // implement this to call your Web Audio engine
};
stop.onclick = async() => {
  await stopAudio();  // reuse the same cleanup routine
};
```

---

## 3) Connecting a Tone.js Engine (PO-style)

Tone.js speeds up step sequencing, parameter locks, and FX. Use it only in the studio (optional).

**Include Tone.js**:
```html
<script src="https://cdn.jsdelivr.net/npm/tone@14/dist/Tone.js"></script>
```

**Map UI to Tone**:
```js
async function toneStart(o){
  await Tone.start(); // mobile gesture gate
  Tone.Transport.bpm.value = o.bpm;
  Tone.Transport.swing = o.swing * 0.6;

  const limit = new Tone.Limiter(-1).toDestination();
  const comp = new Tone.Compressor(-18, 3).connect(limit);
  const bus = new Tone.Gain(0.9).connect(comp);

  const lp = new Tone.Filter(16000 - o.crush*3000, "lowpass").connect(bus);
  const delay = new Tone.FeedbackDelay(0.16, o.delay ?? 0.08).connect(lp);
  bus.connect(delay);

  const synth = new Tone.MonoSynth({
    oscillator:{ type:o.waveform||"triangle" },
    envelope:{ attack:0.01, decay:0.2, sustain:0.6, release:0.2 }
  }).connect(bus);

  const noise = new Tone.NoiseSynth({
    noise:{ type:"white" },
    envelope:{ attack:0.001, decay:0.06, sustain:0, release:0.03 }
  }).connect(bus);

  const kick = new Tone.MembraneSynth({ pitchDecay:0.03, octaves:6 }).connect(bus);

  // Sequence
  const steps = o.steps||16;
  const seq = new Tone.Sequence((time, step)=>{
    const swing = (step%2) ? Tone.Time("32n").toSeconds() * o.swing : 0;

    if (step%4===0) kick.triggerAttackRelease("C2", 0.05, time+swing);
    if (step%2===0) noise.triggerAttackRelease(0.02, time+swing);

    const f = Tone.Frequency(noteFromScale(o.base, o.mode, Math.floor(step/2), o.octaves)).toFrequency();
    synth.triggerAttackRelease(f, 0.2, time+swing);

    if (Math.random() < o.drive*0.3) synth.detune.rampTo((Math.random()-0.5)*12, 0.05);
  }, Array.from({length:steps}, (_,i)=>i), "16n").start(0);

  Tone.Transport.start();
  return () => { seq.stop(); seq.dispose(); [synth, noise, kick, delay, lp, comp, limit, bus].forEach(n=>n.dispose?.()); };
}

function noteFromScale(base, mode, step, octaves){
  const MODES={ionian:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],aeolian:[0,2,3,5,7,8,10],locrian:[0,1,3,5,6,8,10],pent_major:[0,2,4,7,9],pent_minor:[0,3,5,7,10]};
  const idx={C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
  const m=/^([A-G](?:#|b)?)\s*(-?\d+)$/.exec(base.trim()); const midi=(parseInt(m[2],10)+1)*12+(idx[m[1]]??9);
  const deg = (MODES[mode]||MODES.dorian)[step % (MODES[mode]||MODES.dorian).length];
  const lift = (octaves>1 && Math.random()>0.6) ? 12 : 0;
  return Tone.Frequency(midi + deg + lift, "midi");
}
```

Wire the checkbox:
```js
const useTone = document.getElementById('useTone');
let toneStop = null;

play.onclick = async()=>{
  const o = read();
  if(useTone.checked){
    toneStop && toneStop();
    toneStop = await toneStart(o);
  }else{
    await startFromParams(o); // your Web Audio path
  }
};

stop.onclick = async()=>{
  if(useTone.checked){
    toneStop && toneStop();
    Tone.Transport.stop();
    toneStop = null;
  }else{
    await stopAudio();
  }
};
```

---

## 4) Parameter Locks & Microsteps (Studio)

- Click a step to toggle **note-on**.
- Long-press (or right-click) to open a small **lock panel** for that step:
  - `decay`, `cutoff`, `detune`, `hatOpen`, `probability`, `velocity`, `micro` (+/− 32nd offset).
- Store locks in a `locks` object keyed by step index, e.g.:
  ```js
  const locks = { 7: { decay:0.05, micro:"32n", cutoff: 2200 } };
  ```
- In the engine callback (Web Audio or Tone.js), check for locks on the current step and apply them before triggering voices.

---

## 5) Exporting JSON

- The **preview** always shows the current post JSON:
  ```json
  { "posts": [ { /* fields */ } ] }
  ```
- Click **Copy JSON** to put it on clipboard. Paste this object into your site’s `data.json` (add to the `posts` array).
- Optionally, also export pattern strings and locks if you extend the site schema:
  ```json
  {
    "date":"2025-08-15","hex":"#4BB1FF","kit":"ko","base":"A3","mode":"dorian","bpm":84,
    "pattern":{"kick":"x---x---x---x---","snare":"----x-------x---","hat":"x-x-x-x-x-x-x-x-"},
    "locks":{"7":{"decay":0.05,"micro":"32n"}}
  }
  ```
  *(If you do this, update `app.js` to read and honor `pattern`/`locks`.)*

---

## 6) Mobile Considerations

- Must resume / start the audio engine **inside a user gesture** (`click/touch`) to satisfy autoplay policies.
- Keep CPU low: cap partials, use simple envelopes and low feedback.
- Use `Limiter` and `Compressor` (or the site’s soft limiter) to avoid speaker overload.
- UI: big hit targets (min 40×40px), simple color inputs, no tiny knobs.

---

## 7) Recording and Exporting Audio (Optional)

- **Web Audio path:** use `MediaStreamDestination` + `MediaRecorder` to capture master bus:
  ```js
  const dest = ctx.createMediaStreamDestination();
  master.connect(dest);
  const rec = new MediaRecorder(dest.stream);
  const chunks=[]; rec.ondataavailable = e=>chunks.push(e.data);
  rec.onstop = ()=> {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'huewave.webm';
    a.click();
  };
  rec.start(); // rec.stop() later
  ```
- **Tone.js path:** Tone.Recorder offers a convenience wrapper if desired.

---

## 8) Offline Support (Optional PWA)

- Add a service worker to cache `huewavestudio.html`, CSS, and JS so the studio opens offline.
- Audio still requires a tap to start. Recording also works offline.

---

## 9) Testing Checklist

- Desktop Chrome/Firefox/Safari + Android Chrome + iOS Safari.
- First tap starts audio with no errors.
- Play/Stop works repeatedly with no tail buildup.
- Meters show motion while playing.
- Exported JSON pastes into `data.json` and plays on the main site.

---

## 10) Maintenance & Versioning

- Pin Tone.js to a specific version in the `<script>` tag.
- Keep studio isolated (`huewavestudio.html`) to avoid breaking the live site.
- If reusing code from `app.js`, factor the audio engine into `engine.js` and import it in both places.

---

## 11) Ready-to-Use Snippets

**A) Local preset import/export**
```js
// Export preset string
function exportPreset(){
  const txt = JSON.stringify(read());
  navigator.clipboard.writeText(txt);
}
// Import from pasted string
function importPreset(txt){
  const o = JSON.parse(txt);
  Object.entries(o).forEach(([k,v])=>{
    const el = document.getElementById(k);
    if(el) el.value = v;
  });
  updatePreview();
}
```

**B) URL-shareable state**
```js
function stateToURL(){
  const s = new URLSearchParams(read()).toString();
  history.replaceState(null, "", "?" + s);
}
function stateFromURL(){
  const q = Object.fromEntries(new URLSearchParams(location.search).entries());
  Object.entries(q).forEach(([k,v])=>{
    const el = document.getElementById(k);
    if(el) el.value = v;
  });
  updatePreview();
}
window.addEventListener('load', stateFromURL);
```

**C) Simple meter** (connect your analyser):
```js
function setRMS(v){
  document.getElementById('rms').style.width = Math.min(100, (v*180)|0) + "%";
}
```

---

## 12) Next Steps

- Hook the **Play/Stop** to your preferred engine (Web Audio or Tone.js).
- Add a **mini piano roll** or **scale degree selector** under the pattern grid.
- Allow **sample uploads** (drag a short WAV) for PO33-style hits (studio only).
- Keep the exported JSON stable, and introduce optional fields only when you extend `app.js` to read them.

---

**Done.** Paste this file into your repo as `huewavestudio.html`, then iterate. Build sounds live, copy JSON into `data.json`, commit, and the website updates.
