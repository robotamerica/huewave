# Huewave Studio - Current HTML Version

This file contains the full HTML for the Huewave Studio build. The studio allows you to create sounds in your browser. It will also produce a JSON for you in the correct format for adding blog posts. Copy it into an `.html` file and open in your browser to use.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>huewave studio — ambient+ko33</title>
<style>
:root{ --bg:#0b0b0c; --fg:#e9e9ea; --muted:#a7aab3; --card:#131316; --accent:#6bcb77; --bad:#ff6f6f; --good:#7dd36f; }
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}
header{display:flex;gap:12px;align-items:center;padding:12px 14px;background:#0d0d10;position:sticky;top:0;z-index:2;border-bottom:1px solid #19191f}
header h1{margin:0;font-size:16px;letter-spacing:.3px;font-weight:600}
header .sp{flex:1}
header button,.btn{background:#1a1a22;color:var(--fg);border:1px solid #252531;border-radius:12px;padding:8px 10px;font:inherit;cursor:pointer}
header button:hover,.btn:hover{background:#202028}
main{display:grid;grid-template-columns:360px 1fr;gap:14px;padding:14px}
@media (max-width:980px){ main{grid-template-columns:1fr} }
.card{background:var(--card);border:1px solid #1f1f28;border-radius:16px;padding:12px}
fieldset{border:1px solid #23232c;border-radius:12px;padding:10px;margin:0 0 10px}
legend{padding:0 6px;color:var(--muted)}
label{display:block;font-size:12px;margin-top:8px;color:#aeb2bd}
input[type="text"],input[type="number"],select{width:100%;padding:8px 10px;border-radius:10px;border:1px solid #2a2a36;background:#0f0f14;color:#e9e9ea}
.row{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px}
.tile{position:relative;border-radius:14px;overflow:hidden;background:#111;min-height:110px;border:1px solid #1f1f28;cursor:pointer}
.tile .meta{position:absolute;left:8px;bottom:8px;font-size:11px;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6)}
.tile.playing{outline:2px solid var(--accent)}
.bad{color:var(--bad)} .good{color:var(--good)}
.small{font-size:12px;color:#8f93a0}
.flex{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.kitpill{display:inline-block;border:1px solid #272737;background:#121218;color:#cfd1d7;padding:6px 8px;border-radius:999px;cursor:pointer}
.kitpill.active{background:#1f1f2a;border-color:#3a3a56}
textarea.json{width:100%;height:180px;background:#0f0f14;color:#e6e6eb;border:1px solid #2a2a36;border-radius:10px;padding:10px;font-family:ui-monospace,Consolas,Menlo,monospace;font-size:12px}
.rowBtns{display:flex;gap:8px;flex-wrap:wrap}
.diag{position:fixed;right:8px;bottom:8px;background:rgba(0,0,0,.55);border:1px solid #222;border-radius:10px;padding:6px 8px;color:#bfc3cc;font:11px ui-monospace,Consolas,Menlo,monospace}
</style>
</head>
<body>
<header>
  <h1>huewave studio</h1>
  <span class="sp"></span>
  <button id="importBtn">import json</button>
  <button id="copyBtn">copy json</button>
</header>

<main>
  <!-- Left: editor -->
  <section class="card">
    <fieldset>
      <legend>post</legend>
      <div class="row">
        <label>date (YYYY-MM-DD)<input id="date" type="text" placeholder="2025-08-15"></label>
        <label>hex colour<input id="hex" type="text" placeholder="#F25C54"></label>
      </div>
      <div class="row">
        <label>base note<input id="base" type="text" placeholder="A3"></label>
        <label>mode
          <select id="mode">
            <option>ionian</option><option>dorian</option><option>phrygian</option><option>lydian</option>
            <option>mixolydian</option><option>aeolian</option><option>locrian</option>
            <option>pent_major</option><option>pent_minor</option>
          </select>
        </label>
      </div>
      <div class="row3">
        <label>bpm<input id="bpm" type="number" value="84" min="40" max="140"></label>
        <label>steps<input id="steps" type="number" value="16" min="8" max="32"></label>
        <label>octaves<input id="octaves" type="number" value="2" min="1" max="3"></label>
      </div>
      <div class="row3">
        <label>waveform
          <select id="waveform">
            <option>triangle</option><option>sine</option><option>square</option><option>sawtooth</option>
          </select>
        </label>
        <label>swing<input id="swing" type="number" step="0.01" value="0.14" min="0" max="0.3"></label>
        <label>kit
          <select id="kit">
            <option value="">(none)</option>
            <option>ko</option><option>jazz</option><option>lofi</option><option>arcade</option>
            <option>pad</option><option>drone</option>
          </select>
        </label>
      </div>
      <div class="row3">
        <label>drive<input id="drive" type="number" step="0.01" value="0.5" min="0" max="1.2"></label>
        <label>crush<input id="crush" type="number" step="0.01" value="0.22" min="0" max="1"></label>
        <label>dust<input id="dust" type="number" step="0.01" value="0.02" min="0" max="0.2"></label>
      </div>
      <div class="rowBtns">
        <button id="addBtn" class="btn">add/update post</button>
        <button id="playBtn" class="btn">play</button>
        <button id="stopBtn" class="btn">stop</button>
        <span id="status" class="small"></span>
      </div>
      <div class="small">pad loudness = <b>dust</b> · sample weirdness = <b>drive</b> · timing humanize = <b>swing</b>.</div>
    </fieldset>

    <fieldset>
      <legend>kits quick-pick</legend>
      <div id="kitQuick" class="flex">
        <span data-kit="ko" class="kitpill">ko</span>
        <span data-kit="jazz" class="kitpill">jazz</span>
        <span data-kit="lofi" class="kitpill">lofi</span>
        <span data-kit="arcade" class="kitpill">arcade</span>
        <span data-kit="pad" class="kitpill">pad</span>
        <span data-kit="drone" class="kitpill">drone</span>
        <span data-kit="" class="kitpill">(none)</span>
      </div>
    </fieldset>

    <fieldset>
      <legend>json (live)</legend>
      <textarea id="jsonOut" class="json" readonly></textarea>
      <div class="small">copy the JSON above into your site’s <code>data.json</code> when finished.</div>
    </fieldset>

    <div class="small">tip: warm → slower/darker pad; cool → brighter/airier pad. “ko33” layer adds tiny surprises.</div>
  </section>

  <!-- Right: list + preview tiles -->
  <section class="card">
    <div class="flex" style="justify-content:space-between;margin-bottom:8px;">
      <div class="small">posts</div>
      <div class="flex">
        <button id="newBtn" class="btn">new</button>
        <button id="clearBtn" class="btn">clear all</button>
      </div>
    </div>
    <div id="grid" class="grid"></div>
  </section>
</main>

<input id="fileInput" type="file" accept="application/json" hidden />
<div id="diag" class="diag">nodes:0 rms:0.000</div>

<script>
(() => {
  // ---------- helpers ----------
  const $=(q,el=document)=>el.querySelector(q);
  const todayISO=()=>{const t=new Date(),y=t.getFullYear(),m=String(t.getMonth()+1).padStart(2,"0"),d=String(t.getDate()).padStart(2,"0");return `${y}-${m}-${d}`;}
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const NOTE_INDEX={C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
  const A4=440,A4_MIDI=69,midiToFreq=m=>A4*Math.pow(2,(m-A4_MIDI)/12);
  const noteToMidi=n=>{const m=/^([A-G](?:#|b)?)\s*(-?\d+)$/.exec(String(n||"A3").trim()); if(!m) return 57; return (parseInt(m[2],10)+1)*12+(NOTE_INDEX[m[1]]??9);};
  const MODES={ionian:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],aeolian:[0,2,3,5,7,8,10],locrian:[0,1,3,5,6,8,10],pent_major:[0,2,4,7,9],pent_minor:[0,3,5,7,10]};
  const hexToHsl=(hex)=>{const m=/^#?([0-9a-f]{6})$/i.exec(hex||""); if(!m) return {h:0,s:0,l:0.5};
    const n=parseInt(m[1],16), r=((n>>16)&255)/255, g=((n>>8)&255)/255, b=(n&255)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2;
    let h=0,s=0; if(max!==min){const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}
      h/=6;} return {h,s,l}; };

  // ---------- audio globals (CORE chain) ----------
  let ctx=null,bus=null,preLP=null,agc=null,comp=null,limiter=null,dcBlock=null,master=null,analyser=null;
  let delay=null,delayWet=null,fbHP=null,fbGain=null;

  // EPHEMERAL registry: per-play nodes only
  const EPHEM=new Set(); const regE=n=> (n&&n.connect&&EPHEM.add(n),n);

  const diagEl=$("#diag"); const setDiag=(nodes,rms)=>diagEl.textContent=`nodes:${nodes} rms:${rms.toFixed(3)}`;

  function makeLimiter(){ const ws=ctx.createWaveShaper(); const N=2048,c=new Float32Array(N);
    for(let i=0;i<N;i++){const x=(i/(N-1))*2-1; c[i]=Math.max(-0.985,Math.min(0.985,x));}
    ws.curve=c; ws.oversample="4x"; return ws;
  }

  async function ensureCtx(){
    if(ctx){ if(ctx.state!=="running"){ try{await ctx.resume();}catch{} } return; }
    const AC=window.AudioContext||window.webkitAudioContext; ctx=new AC();

    bus=ctx.createGain(); bus.gain.value=0.9;
    preLP=ctx.createBiquadFilter(); preLP.type="lowpass"; preLP.frequency.value=16000; preLP.Q.value=0.5;
    agc=ctx.createGain(); agc.gain.value=1.0;
    comp=new DynamicsCompressorNode(ctx,{threshold:-18,knee:18,ratio:3,attack:0.006,release:0.16});
    limiter=makeLimiter();
    dcBlock=ctx.createBiquadFilter(); dcBlock.type="highpass"; dcBlock.frequency.value=25;
    master=ctx.createGain(); master.gain.value=0.9;
    analyser=ctx.createAnalyser(); analyser.fftSize=2048;

    bus.connect(preLP).connect(agc).connect(comp).connect(limiter).connect(dcBlock).connect(master).connect(ctx.destination);
    limiter.connect(analyser);

    rebuildDelay();
    document.addEventListener("visibilitychange",()=>{ if(ctx&&ctx.state!=="running") ctx.resume(); });
  }

  function makePreDelaySat(drive=1.04){ const ws=regE(ctx.createWaveShaper()); const N=1024,c=new Float32Array(N);
    for(let i=0;i<N;i++){const x=(i/N)*2-1; c[i]=Math.tanh(x*drive);} ws.curve=c; ws.oversample="2x"; return ws; }

  function rebuildDelay(){
    if(!ctx) return;
    try{delay&&delay.disconnect(); delayWet&&delayWet.disconnect(); fbHP&&fbHP.disconnect(); fbGain&&fbGain.disconnect();}catch{}
    delay=regE(ctx.createDelay(0.6)); delay.delayTime.value=0.16;
    delayWet=regE(ctx.createGain()); delayWet.gain.value=0.0;
    fbHP=regE(ctx.createBiquadFilter()); fbHP.type="highpass"; fbHP.frequency.value=150;
    fbGain=regE(ctx.createGain()); fbGain.gain.value=0.0;
    const preDelaySat=makePreDelaySat(1.04);
    bus.connect(preDelaySat).connect(delay);
    delay.connect(delayWet).connect(comp);
    delay.connect(fbHP).connect(fbGain).connect(delay);
    const t=ctx.currentTime+0.01; delayWet.gain.setTargetAtTime(0.08,t,0.05); fbGain.gain.setTargetAtTime(0.07,t,0.05);
  }

  const buf=new Uint8Array(2048);
  function rmsNow(){ if(!analyser) return 0; analyser.getByteTimeDomainData(buf); let s=0; for(let i=0;i<buf.length;i++){const v=(buf[i]-128)/128; s+=v*v;} const r=Math.sqrt(s/buf.length); setDiag(EPHEM.size,r); return r; }
  function waitForSilence(th=0.012,hold=160,timeout=900){ const start=performance.now(); let ok=0; return new Promise(res=>{ const id=setInterval(()=>{ const r=rmsNow(); ok = r<th ? ok+33 : 0; if(ok>=hold || performance.now()-start>timeout){ clearInterval(id); res(); } },33); }); }
  async function hardKillAll(){ if(!ctx) return; const now=ctx.currentTime; EPHEM.forEach(n=>{ try{n.stop&&n.stop(now);}catch{} try{n.gain&&n.gain.cancelScheduledValues&&n.gain.cancelScheduledValues(now);}catch{} try{n.frequency&&n.frequency.cancelScheduledValues&&n.frequency.cancelScheduledValues(now);}catch{} try{n.disconnect&&n.disconnect();}catch{} }); EPHEM.clear(); }

  // ---------- building blocks ----------
  const env=(t,a=0.006,d=0.06,s=0.6,r=0.14,g=0.22)=>{const gn=regE(ctx.createGain()); gn.gain.setValueAtTime(0.0001,t); gn.gain.linearRampToValueAtTime(g,t+a); gn.gain.linearRampToValueAtTime(g*s,t+a+d); gn.gain.exponentialRampToValueAtTime(0.0001,t+a+d+r); return gn;};
  const osc=(type,f)=>{const o=regE(ctx.createOscillator()); o.type=type; o.frequency.value=f; return o;};

  // Drums (conservative)
  function kick(t,v=0.72){const g=env(t,0.002,0.08,0,0.18,v); const o=osc("sine",150); o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(42,t+0.16); o.connect(g).connect(bus); o.start(t); o.stop(t+0.3);}
  function snare(t,v=0.42){const dur=0.16; const b=regE(ctx.createBuffer(1,Math.ceil(dur*ctx.sampleRate),ctx.sampleRate)); const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1; const s=regE(ctx.createBufferSource()); s.buffer=b; const hp=regE(ctx.createBiquadFilter()); hp.type="highpass"; hp.frequency.value=1500; const bp=regE(ctx.createBiquadFilter()); bp.type="bandpass"; bp.frequency.value=1400; bp.Q.value=0.9; const g=env(t,0.001,dur*0.6,0,dur*0.6,v); s.connect(hp).connect(bp).connect(g).connect(bus); s.start(t); s.stop(t+dur);}
  function hat(t,v=0.14,closed=true){const dur=closed?0.05:0.18; const b=regE(ctx.createBuffer(1,Math.ceil(dur*ctx.sampleRate),ctx.sampleRate)); const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1; const s=regE(ctx.createBufferSource()); s.buffer=b; const hp=regE(ctx.createBiquadFilter()); hp.type="highpass"; hp.frequency.value=7000; const g=env(t,0.001,closed?0.02:0.05,closed?0:0.3,closed?0.03:0.12,v); s.connect(hp).connect(g).connect(bus); s.start(t); s.stop(t+dur);}

  // Melody voice
  function blip(t,f,{wave="triangle",dur=0.22,gain=0.18,wobble=0.0025}={}){
    const o=osc(wave,f); const l=osc("sine",5.1); const lg=regE(ctx.createGain()); lg.gain.value=f*wobble; l.connect(lg).connect(o.frequency);
    const g=env(t,0.01,dur*0.4,0.55,Math.max(0.1,dur*0.55),gain);
    o.connect(g).connect(bus); o.start(t); l.start(t); o.stop(t+dur+0.05); l.stop(t+dur+0.05);
  }
  function chord(t,fs,{wave="triangle",gain=0.15,dur=0.4}={}){const g=env(t,0.012,0.12,0.45,0.26,gain); g.connect(bus); fs.forEach(f=>{const o=osc(wave,f); o.connect(g); o.start(t); o.stop(t+dur); });}

  // ---------- NEW LAYER: Ambient Pad ----------
  function startAmbientPad({hex, base="A3", padLevel=0.08}){
    // map colour brightness to filter and detune
    const {l} = hexToHsl(hex||"#6BCB77"); // 0..1
    const cutoff = 300 + l*5000; // darker = lower, brighter = airier
    const det = 0.4 + (1-l)*0.8; // darker colours detune a bit more

    const p = regE(ctx.createStereoPanner()); p.pan.value = 0;
    const pf = regE(ctx.createBiquadFilter()); pf.type="lowpass"; pf.frequency.value = cutoff; pf.Q.value = 0.5;
    const g = regE(ctx.createGain()); g.gain.value = padLevel; // overall level

    // two gentle oscillators slightly detuned
    const baseMidi = noteToMidi(base);
    const o1 = osc("sine", midiToFreq(baseMidi - 12));
    const o2 = osc("triangle", midiToFreq(baseMidi - 12) * (1 + det/100));

    // slow LFO for pan and cutoff
    const lfo1 = osc("sine", 0.05 + Math.random()*0.07); const lfoG1 = regE(ctx.createGain()); lfoG1.gain.value = 0.6; // pan
    const lfo2 = osc("sine", 0.03 + Math.random()*0.05); const lfoG2 = regE(ctx.createGain()); lfoG2.gain.value = 400 + 600*l; // cutoff wobble

    lfo1.connect(lfoG1).connect(p.pan);
    lfo2.connect(lfoG2).connect(pf.frequency);

    o1.connect(pf); o2.connect(pf);
    pf.connect(p).connect(g).connect(bus);

    const now = ctx.currentTime;
    [o1,o2,lfo1,lfo2].forEach(o=>o.start(now));

    // graceful stop hook
    return ()=>{ try{o1.stop();o2.stop();lfo1.stop();lfo2.stop();}catch{} };
  }

  // ---------- NEW LAYER: KO33-style Strange Samples ----------
  function startKOWeird({bpm=84, swing=0.14, drive=0.5, base="A3", mode="dorian"}){
    const scale = MODES[mode]||MODES.dorian;
    const baseMidi = noteToMidi(base);
    const spb = 60/bpm, six = spb/4;

    // probability tied to drive (0..1.2) → 0..35%
    const pHit = clamp(drive/1.2, 0, 1) * 0.35;

    let step=0, next=ctx.currentTime + 0.03;
    const id = setInterval(()=>{
      while(next < ctx.currentTime + 0.25){
        const hum = (step%2 ? six*swing : 0);
        const t = next + hum;

        if (Math.random() < pHit){
          // choose a “weird” voice
          const pick = Math.random();
          if (pick < 0.34) microPluck(t);
          else if (pick < 0.68) formantChirp(t);
          else bitNoiseTick(t);
        }

        step=(step+1)%16; next+=six;
      }
    }, 40);

    function microPluck(t){
      const deg = scale[Math.floor(Math.random()*scale.length)];
      const f = midiToFreq(baseMidi + deg + (Math.random()<0.5?0:12));
      const o = osc("square", f * (1 + (Math.random()*0.006-0.003)));
      const v = env(t, 0.004, 0.05, 0.0, 0.08, 0.16);
      const hp = regE(ctx.createBiquadFilter()); hp.type="highpass"; hp.frequency.value=300;
      o.connect(hp).connect(v).connect(bus); o.start(t); o.stop(t+0.12);
    }

    function formantChirp(t){
      // bandpass sweep for a “vowel-ish” blip
      const dur = 0.14;
      const b = regE(ctx.createBuffer(1, Math.ceil(dur*ctx.sampleRate), ctx.sampleRate));
      const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i] = (Math.random()*2-1) * 0.6;
      const s=regE(ctx.createBufferSource()); s.buffer=b;

      const bp=regE(ctx.createBiquadFilter()); bp.type="bandpass"; bp.Q.value=6;
      bp.frequency.setValueAtTime(600,t); bp.frequency.exponentialRampToValueAtTime(1600,t+0.12);

      const v=env(t,0.003,0.05,0.0,0.06,0.12);
      s.connect(bp).connect(v).connect(bus); s.start(t); s.stop(t+dur);
    }

    function bitNoiseTick(t){
      // tiny crushed click using WaveShaper
      const ws=regE(ctx.createWaveShaper()); const N=128, c=new Float32Array(N);
      for(let i=0;i<N;i++){ const x=(i/N)*2-1; c[i]=Math.sign(x) * Math.pow(Math.abs(x), 0.3); } ws.curve=c;
      const o=osc("sine", 1200 + Math.random()*800);
      const v=env(t,0.001,0.02,0,0.03,0.08);
      o.connect(ws).connect(v).connect(bus); o.start(t); o.stop(t+0.06);
    }

    return ()=>{ try{clearInterval(id);}catch{} };
  }

  // ---------- engines ----------
  function runEngine(post){
    const baseMidi=noteToMidi(post.base||"A3");
    const scale=MODES[post.mode||"dorian"]||MODES.dorian;
    const bpm=clamp(post.bpm??84,40,140);
    const spb=60/bpm, six=spb/4, swing=clamp(post.swing??0.14,0,0.3);
    const steps=clamp(post.steps??16,8,32);
    const wave=post.waveform||"triangle";

    // pad level from dust (0..0.2) → 0..0.28
    const padLevel = clamp((post.dust??0.02),0,0.2) * 1.4; // subtle by default
    const weirdDrive = clamp(post.drive??0.5, 0, 1.2);

    preLP.frequency.setValueAtTime(16000 - (post.crush??0.22)*3000, ctx.currentTime);

    let timer=null, stops=[];

    const startKO=()=>{ const patK=Array.from({length:16},(_,i)=>i%4===0); const patS=Array.from({length:16},(_,i)=>i%8===4);
      let step=0, next=ctx.currentTime+0.03;
      timer=setInterval(()=>{while(next<ctx.currentTime+0.25){
        const t=next+(step%2?six*swing:0);
        if(patK[step])kick(t,0.7); if(patS[step])snare(t,0.4); if(step%2===0)hat(t,0.13,true);
        if(step%2===0){ const deg=scale[(step/2)%scale.length|0]; blip(t, midiToFreq(baseMidi+deg), {wave, dur:six*1.2, gain:0.16}); }
        step=(step+1)%steps; next+=six;}},50);
    };
    const startJAZZ=()=>{ let step=0,next=ctx.currentTime+0.03; timer=setInterval(()=>{while(next<ctx.currentTime+0.25){
      const t=next+(step%2?six*swing:0); if(step%2===0)hat(t,0.12,true);
      if(step%8===0||step%8===4){ const root=baseMidi+scale[0], mids=[0,2,4].map(d=>midiToFreq(root+scale[d%scale.length]+12)); chord(t,mids,{wave:"triangle",gain:0.14,dur:0.42}); }
      step=(step+1)%16; next+=six;}},50); };
    const startLOFI=()=>{ let step=0,next=ctx.currentTime+0.03; timer=setInterval(()=>{while(next<ctx.currentTime+0.25){
      const t=next+(step%2?six*swing:0);
      if(step%4===0)kick(t,0.68); if(step%8===4)snare(t,0.38); if(step%2===0)hat(t,0.12,true);
      if(step%2===0){ const deg=scale[(step/2)%scale.length|0]; const m=baseMidi+deg+(Math.random()<0.5?0:12); blip(t, midiToFreq(m), {wave:"sine", dur:six*1.4, gain:0.15}); }
      step=(step+1)%steps; next+=six;}},50); };
    const startARCADE=()=>{ let step=0,next=ctx.currentTime+0.03; timer=setInterval(()=>{while(next<ctx.currentTime+0.25){
      const t=next+(step%2?six*swing:0);
      if(step%4===0)kick(t,0.7); if(step%8===4)snare(t,0.42); if(step%2===0)hat(t,0.13,true);
      if(step%2===0){ const deg=scale[(step/2)%scale.length|0]; blip(t, midiToFreq(baseMidi+deg+(Math.random()>0.6?12:0)), {wave:"square", dur:six*1.0, gain:0.16}); }
      step=(step+1)%steps; next+=six;}},50); };
    const startPAD=()=>{ const spawn=(t)=>{ const mids=[0,2,4].map(d=>midiToFreq(baseMidi+scale[d])); chord(t,mids,{wave:"sine",gain:0.14,dur:0.6}); };
      let next=ctx.currentTime+0.05; timer=setInterval(()=>{while(next<ctx.currentTime+0.5){spawn(next); next+=(60/bpm)*2;}},200); };
    const startDRONE=()=>{ const baseF=midiToFreq(baseMidi-12);
      const g=env(ctx.currentTime,0.6,1.0,0.85,1.2,0.19); const o1=osc("sine",baseF*0.999), o2=osc("triangle",baseF*1.002);
      o1.connect(g); o2.connect(g); g.connect(bus); o1.start(); o2.start();
      stops.push(()=>{ try{o1.stop();o2.stop();}catch{}; });
      timer=setInterval(()=>{ const deg=scale[Math.floor(Math.random()*scale.length)]; blip(ctx.currentTime+0.02, midiToFreq(baseMidi+deg), {wave:"sine", dur:(60/bpm)*1.6, gain:0.12}); }, (60/bpm)*1000); };

    // Start main kit
    const kit=(post.kit||"").trim().toLowerCase();
    if(!kit){ let step=0,next=ctx.currentTime+0.03; timer=setInterval(()=>{while(next<ctx.currentTime+0.25){
      const t=next; const deg=MODES[post.mode||"dorian"][step% (MODES[post.mode||"dorian"].length)]; blip(t, midiToFreq(baseMidi+deg), {wave, dur:(60/bpm)/2, gain:0.16}); step=(step+1)%steps; next+=(60/bpm)/4;}},50);
    } else if(kit==="ko") startKO(); else if(kit==="jazz") startJAZZ();
      else if(kit==="lofi") startLOFI(); else if(kit==="arcade") startARCADE();
      else if(kit==="pad") startPAD(); else if(kit==="drone") startDRONE();

    // Start ambient pad & weird samples (levels from dust/drive/swing)
    const stopPad = startAmbientPad({hex:post.hex, base:post.base, padLevel});
    const stopWeird = startKOWeird({bpm, swing, drive:weirdDrive, base:post.base, mode:post.mode});

    return {
      stop: ()=>{ try{ if(timer) clearInterval(timer); }catch{}; try{stopPad&&stopPad();}catch{}; try{stopWeird&&stopWeird();}catch{}; },
      bpm, kit
    };
  }

  // ---------- UI / state ----------
  let posts=[], currentPlay={type:"none", idx:-1, handle:null}, restartTimer=null;
  const grid=$("#grid"), status=$("#status"), jsonOut=$("#jsonOut");
  const fields={ date:$("#date"), hex:$("#hex"), base:$("#base"), mode:$("#mode"), bpm:$("#bpm"),
    steps:$("#steps"), octaves:$("#octaves"), waveform:$("#waveform"), swing:$("#swing"),
    drive:$("#drive"), crush:$("#crush"), dust:$("#dust"), kit:$("#kit") };

  function readForm(){ return { date: fields.date.value||todayISO(), hex: fields.hex.value, base: fields.base.value||"A3",
    mode: fields.mode.value, bpm:+fields.bpm.value||84, steps:+fields.steps.value||16, octaves:+fields.octaves.value||2,
    waveform: fields.waveform.value, swing:+fields.swing.value||0.14, drive:+fields.drive.value||0.5, crush:+fields.crush.value||0.22,
    dust:+fields.dust.value||0.02, kit: fields.kit.value||"" }; }
  function fillForm(p){ fields.date.value=p.date||todayISO(); fields.hex.value=p.hex||""; fields.base.value=p.base||"A3";
    fields.mode.value=p.mode||"dorian"; fields.bpm.value=p.bpm??84; fields.steps.value=p.steps??16; fields.octaves.value=p.octaves??2;
    fields.waveform.value=p.waveform||"triangle"; fields.swing.value=p.swing??0.14; fields.drive.value=p.drive??0.5;
    fields.crush.value=p.crush??0.22; fields.dust.value=p.dust??0.02; fields.kit.value=p.kit||""; }

  function updateJSON(){ const data={ posts: posts.filter(p=>/^#[0-9a-fA-F]{6}$/.test(p.hex)) }; jsonOut.value=JSON.stringify(data,null,2); }
  function redraw(){
    grid.innerHTML="";
    posts.filter(p=>/^#[0-9a-fA-F]{6}$/.test(p.hex)).sort((a,b)=> (a.date<b.date)?1:-1).forEach((p,i)=>{
      const tile=document.createElement("div"); tile.className="tile"; tile.dataset.idx=i;
      tile.style.background=p.hex; tile.innerHTML=`<div class="meta">${p.date}<br>${p.hex.toUpperCase()} ${p.kit?`<span class="small">· ${p.kit}</span>`:""}</div>`;
      tile.addEventListener("click", ()=> playTile(i));
      tile.addEventListener("contextmenu",(e)=>{e.preventDefault(); fillForm(p); document.querySelectorAll('.kitpill').forEach(el=>el.classList.toggle('active',el.dataset.kit===p.kit)); status.textContent="loaded post into form";});
      grid.appendChild(tile);
    });
    document.querySelectorAll(".tile").forEach(t=>t.classList.remove("playing"));
    if(currentPlay.type==="tile" && currentPlay.idx>=0 && posts[currentPlay.idx]) $(".tile[data-idx='"+currentPlay.idx+"']").classList.add("playing");
    updateJSON();
  }

  async function stopAudio(){
    if(currentPlay.handle){ try{currentPlay.handle.stop();}catch{} }
    currentPlay={ type:"none", idx:-1, handle:null };
    await hardKillAll();
    await waitForSilence(0.012,160);
    rebuildDelay();
    $("#playBtn").textContent="play"; if(status) status.textContent="stopped";
    document.querySelectorAll(".tile").forEach(el=>el.classList.remove("playing"));
  }

  // AGC downward only
  setInterval(()=>{ if(!ctx||!agc) return; const r=rmsNow(), target=0.17; if(r>target && agc.gain.value>0.8){ const next=Math.max(0.8, agc.gain.value-0.02); agc.gain.setValueAtTime(next, ctx.currentTime); } }, 250);

  async function startAdhoc(){
    const p=readForm(); if(!/^#[0-9a-fA-F]{6}$/.test(p.hex)){ if(status) status.innerHTML="<span class='bad'>hex must be #RRGGBB</span>"; return; }
    await ensureCtx(); await stopAudio(); const h=runEngine(p);
    currentPlay={ type:"adhoc", idx:-1, handle:h }; $("#playBtn").textContent="stop"; if(status) status.textContent=`playing preview (${p.kit||'none'}) @ ${h.bpm}bpm`;
  }
  async function playTile(idx){
    if(currentPlay.type==="tile" && currentPlay.idx===idx){ await stopAudio(); return; }
    await ensureCtx(); await stopAudio(); const p=posts[idx]; if(!p) return;
    const h=runEngine(p); currentPlay={ type:"tile", idx, handle:h };
    const tile=$(".tile[data-idx='"+idx+"']"); tile&&tile.classList.add("playing");
    if(status) status.textContent=`playing #${idx+1} (${p.kit||'none'}) @ ${h.bpm}bpm`;
  }

  function scheduleLiveRestart(){ if(currentPlay.type!=="adhoc") return; clearTimeout(restartTimer); restartTimer=setTimeout(startAdhoc, 260); }
  Object.values(fields).forEach(el=>{ el.addEventListener("input", scheduleLiveRestart); el.addEventListener("change", scheduleLiveRestart); });

  // buttons
  $("#addBtn").addEventListener("click", ()=>{ const p=readForm();
    if(!/^#[0-9a-fA-F]{6}$/.test(p.hex)){ if(status) status.innerHTML="<span class='bad'>hex must be #RRGGBB</span>"; return; }
    const i=posts.findIndex(x=>x.date===p.date && x.hex===p.hex); if(i>=0) posts[i]=p; else posts.unshift(p); redraw(); if(status) status.innerHTML="<span class='good'>saved</span>"; });
  $("#playBtn").addEventListener("click", async ()=>{ if(currentPlay.type==="adhoc"){ await stopAudio(); } else { await startAdhoc(); } });
  $("#stopBtn").addEventListener("click", stopAudio);
  $("#newBtn").addEventListener("click", ()=>{ fillForm({date:todayISO(),hex:"#6BCB77",base:"A3",mode:"dorian",bpm:84,steps:16,octaves:2,waveform:"triangle",swing:0.14,drive:0.5,crush:0.22,dust:0.02,kit:"ko"}); });
  $("#clearBtn").addEventListener("click", ()=>{ if(confirm("Clear all posts?")){ stopAudio(); posts=[]; redraw(); } });
  $("#kitQuick").addEventListener("click",(e)=>{ const el=e.target.closest(".kitpill"); if(!el) return; document.querySelectorAll('.kitpill').forEach(x=>x.classList.remove('active')); el.classList.add('active'); fields.kit.value=el.dataset.kit; scheduleLiveRestart(); });
  $("#importBtn").addEventListener("click", ()=> $("#fileInput").click());
  $("#fileInput").addEventListener("change", async (e)=>{ const f=e.target.files[0]; if(!f) return;
    try{ const txt=await f.text(); const obj=JSON.parse(txt);
      posts=(obj.posts||[]).map(p=>({ date:p.date||todayISO(), hex:p.hex, base:p.base, mode:p.mode, bpm:p.bpm, steps:p.steps,
        octaves:p.octaves, waveform:p.waveform, swing:p.swing, drive:p.drive, crush:p.crush, dust:p.dust, kit:p.kit||"" }))
        .filter(p=>/^#[0-9a-fA-F]{6}$/.test(p.hex));
      redraw(); if(status) status.textContent="imported";
    }catch(err){ if(status) status.innerHTML="<span class='bad'>invalid JSON</span>"; }
    e.target.value="";
  });
  $("#copyBtn").addEventListener("click", async ()=>{ try{ await navigator.clipboard.writeText(jsonOut.value); if(status) status.innerHTML="<span class='good'>json copied</span>"; }catch{ jsonOut.select(); document.execCommand("copy"); if(status) status.innerHTML="<span class='good'>json copied</span>"; } });

  // seed defaults
  posts=[
    {date:todayISO(), hex:"#F25C54", base:"C3", mode:"dorian",     bpm:86, steps:16, octaves:2, waveform:"triangle", swing:0.14, drive:0.55, crush:0.22, dust:0.03, kit:"ko"},
    {date:todayISO(), hex:"#4D96FF", base:"A2", mode:"phrygian",   bpm:70, steps:12, octaves:1, waveform:"sine",     swing:0.16, drive:0.40, crush:0.20, dust:0.02, kit:"jazz"},
    {date:todayISO(), hex:"#FFD93D", base:"E4", mode:"lydian",     bpm:92, steps:20, octaves:3, waveform:"square",   swing:0.12, drive:0.65, crush:0.20, dust:0.02, kit:"lofi"},
    {date:todayISO(), hex:"#6BCB77", base:"G3", mode:"pent_minor", bpm:78, steps:24, octaves:2, waveform:"triangle", swing:0.18, drive:0.60, crush:0.26, dust:0.03, kit:"arcade"},
    {date:todayISO(), hex:"#B983FF", base:"D3", mode:"mixolydian", bpm:64, steps:8,  octaves:1, waveform:"sine",     swing:0.10, drive:0.30, crush:0.16, dust:0.02, kit:"drone"},
    {date:todayISO(), hex:"#FF6F91", base:"B2", mode:"aeolian",    bpm:72, steps:8,  octaves:2, waveform:"triangle", swing:0.06, drive:0.35, crush:0.14, dust:0.02, kit:"pad"}
  ];
  fillForm(posts[0]); redraw();

  setInterval(()=>{ if(ctx) rmsNow(); }, 180);
})();
</script>
</body>
</html>
```
