(() => {
  // ---------- DOM ----------
  const $ = (q, el = document) => el.querySelector(q);

  // ---------- theme + to-top ----------
  const THEME_KEY = "huewave/theme";
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem(THEME_KEY);
  document.documentElement.setAttribute("data-theme", savedTheme || (prefersDark ? "dark" : "light"));

  $("#themeBtn")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const nxt = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nxt);
    localStorage.setItem(THEME_KEY, nxt);
    const meta = document.querySelector('meta[name="theme-color"]');
    meta && meta.setAttribute("content", getComputedStyle(document.body).backgroundColor);
  });

  const toTop = $("#toTop");
  const onScroll = () => toTop?.classList.toggle("visible", window.scrollY > 240);
  toTop?.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
  document.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // ---------- tickers ("mood" / "sound") ----------
  const MOOD_WORDS = ["mood","estado","humeur","Stimmung","umore","humor","stemming","humör","humør","mieliala","nastrój","nálada","hangulat","stare","настроение","настрій","διάθεση","ruh hali","مزاج","מצב רוח","मूड","মুড","気分","기분","心情","聲情","tâm trạng","suasana","suasana hati","tunog? (mood)","moyo","አመለካከት"];
  const SOUND_WORDS = ["sound","sonido","son","Klang","suono","som","geluid","ljud","lyd","ääni","dźwięk","zvuk","hang","sunet","звук","ήχος","ses","صوت","צליל","ध्वनि","শব্দ","音","소리","声音","聲音","âm thanh","bunyi","tunog","sauti","ድምፅ"];

  function cycleTicker(el, words, base = 2200, jitter = 900){
    if (!el) return;
    let i = Math.floor(Math.random() * words.length);
    const step = () => {
      el.style.opacity = 0;
      setTimeout(() => {
        el.textContent = words[i % words.length];
        el.style.opacity = 1;
        i++;
        setTimeout(step, base + Math.floor(Math.random() * jitter));
      }, 220);
    };
    el.textContent = words[i % words.length];
    el.style.opacity = 1;
    i++;
    setTimeout(step, base + Math.floor(Math.random() * jitter));
  }
  cycleTicker(document.getElementById("moodTicker"), MOOD_WORDS, 2200, 800);
  cycleTicker(document.getElementById("soundTicker"), SOUND_WORDS, 3000, 1200);

  // ---------- audio core ----------
  let AudioCtx = window.AudioContext || window.webkitAudioContext;
  let ctx, master, bus, comp, lp, sat, delay, noiseBed, noiseGain;
  let current = { tile: null, timer: null, stops: [] };
  let muted = JSON.parse(localStorage.getItem("huewave/muted") || "false");

  function makeSaturator(drive = 1.4) {
    const _ctx = ctx || new AudioCtx();
    const ws = _ctx.createWaveShaper();
    const N = 1024, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = (i / N) * 2 - 1; curve[i] = Math.tanh(x * drive); }
    ws.curve = curve; ws.oversample = "2x"; return ws;
  }

  function ensureCtx() {
    if (ctx) return;
    ctx = new AudioCtx();

    // Core processing
    sat = makeSaturator(1.3);
    lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200; lp.Q.value = 0.5;
    delay = ctx.createDelay(0.6);  delay.delayTime.value = 0.18;
    const delayWet = ctx.createGain(); delayWet.gain.value = 0.12;
    const delayFB = ctx.createGain(); delayFB.gain.value = 0.18;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.16;

    // Buses
    bus = ctx.createGain(); bus.gain.value = 0.9; // music pre-master
    master = ctx.createGain(); master.gain.value = muted ? 0.0 : 1.0; // MASTER controls everything

    // Dust / hiss
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.25;
    noiseBed = ctx.createBufferSource(); noiseBed.buffer = buf; noiseBed.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 700;
    noiseGain = ctx.createGain(); noiseGain.gain.value = 0.03;

    // Music chain → comp → MASTER
    bus.connect(sat).connect(lp).connect(comp);
    // Delay send
    sat.connect(delay).connect(delayWet).connect(comp);
    delay.connect(delayFB).connect(delay);
    // Noise chain → MASTER
    noiseBed.connect(hp).connect(noiseGain).connect(master);
    // Comp out → MASTER
    comp.connect(master);
    // MASTER → destination
    master.connect(ctx.destination);
    noiseBed.start();
  }

  // Mute toggles MASTER so everything is silenced (music, crackle, tails)
  const setMuted = (v) => {
    muted = !!v;
    const now = ctx ? ctx.currentTime : 0;
    if (master) {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value || (muted ? 0 : 1), now);
      master.gain.linearRampToValueAtTime(muted ? 0.0 : 1.0, now + 0.05);
    }
    $("#muteBtn svg") && ($("#muteBtn svg").style.opacity = muted ? 0.5 : 1);
    localStorage.setItem("huewave/muted", JSON.stringify(muted));
  };
  $("#muteBtn")?.addEventListener("click", () => { ensureCtx(); setMuted(!muted); });
  setMuted(muted);

  // ---------- theory & utils ----------
  const NOTE_INDEX = { C:0, "C#":1, Db:1, D:2, "D#":3, Eb:3, E:4, F:5, "F#":6, Gb:6, G:7, "G#":8, Ab:8, A:9, "A#":10, Bb:10, B:11 };
  const A4 = 440, A4_MIDI = 69;
  const midiToFreq = m => A4 * Math.pow(2, (m - A4_MIDI) / 12);
  function noteToMidi(n="A3"){ const m=/^([A-G](?:#|b)?)\s*(-?\d+)$/.exec(String(n).trim()); if(!m) return 57; const[,name,o]=m; return (parseInt(o,10)+1)*12+(NOTE_INDEX[name]??9); }
  const MODES = {
    ionian:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10],
    lydian:[0,2,4,6,7,9,11], mixolydian:[0,2,4,5,7,9,10], aeolian:[0,2,3,5,7,8,10],
    locrian:[0,1,3,5,6,8,10], pent_major:[0,2,4,7,9], pent_minor:[0,3,5,7,10]
  };
  const clamp = (x,min,max)=>Math.max(min,Math.min(max,x));
  function xorshift32(seed){ let x=seed>>>0 || 123456789; return ()=>{ x^=x<<13; x^=x>>>17; x^=x<<5; return (x>>>0)/0xFFFFFFFF; }; }
  function strSeed(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }

  function makeEnv({a=0.01,d=0.06,s=0.6,r=0.18, gain=0.25, t=ctx.currentTime}={}){
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t+a);
    g.gain.linearRampToValueAtTime(gain*s, t+a+d);
    g.gain.exponentialRampToValueAtTime(0.0001, t+a+d+r);
    return g;
  }
  const osc = (type="triangle", freq=220) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o; };
  const localSat = (drive=1.4) => makeSaturator(1.0+drive);

  // ---------- drum pieces ----------
  function drumKick(t, vol=0.9){
    const g = makeEnv({a:0.002,d:0.09,s:0.0,r:0.22,gain:vol,t});
    const o = osc("sine", 150);
    o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(40,t+0.18);
    o.connect(g).connect(bus); o.start(t); o.stop(t+0.32);
  }
  function drumSnare(t, vol=0.5, soft=false){
    const dur = soft?0.14:0.18, hpF=soft?1200:1800, bpF=soft?900:1500;
    const buf = ctx.createBuffer(1, Math.ceil(dur*ctx.sampleRate), ctx.sampleRate);
    const ch = buf.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=(Math.random()*2-1);
    const src = ctx.createBufferSource(); src.buffer=buf;
    const hp = ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=hpF;
    const bp = ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=bpF; bp.Q.value=0.9;
    const g = makeEnv({a:0.001,d:dur*0.6,s:0,r:dur*0.6,gain:vol,t});
    src.connect(hp).connect(bp).connect(g).connect(bus); src.start(t); src.stop(t+dur);
  }
  function drumHat(t, vol=0.22, closed=true){
    const dur = closed?0.06:0.2;
    const buf = ctx.createBuffer(1, Math.ceil(dur*ctx.sampleRate), ctx.sampleRate);
    const ch = buf.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=(Math.random()*2-1);
    const src = ctx.createBufferSource(); src.buffer=buf;
    const hp = ctx.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=6000;
    const g = makeEnv({a:0.001,d:closed?0.02:0.05,s:closed?0.0:0.3,r:closed?0.03:0.12,gain:vol,t});
    src.connect(hp).connect(g).connect(bus); src.start(t); src.stop(t+dur);
  }
  function rimClick(t, vol=0.35){
    const o=osc("square", 1000), g=makeEnv({a:0.001,d:0.01,s:0,r:0.03,gain:vol,t});
    o.connect(g).connect(bus); o.start(t); o.stop(t+0.05);
  }

  // ---------- melodic ----------
  function blip(t, freq, {wave="triangle", dur=0.22, gain=0.22, wobble=0.004, drive=0.6}={}){
    const o = osc(wave, freq);
    const l = osc("sine", 5.2); const lGain = ctx.createGain(); lGain.gain.value = freq*wobble; l.connect(lGain).connect(o.frequency);
    const g = makeEnv({a:0.01,d:dur*0.4,s:0.5,r:Math.max(0.12, dur*0.6),gain, t});
    const s = localSat(drive);
    o.connect(g).connect(s).connect(bus); o.start(t); l.start(t); o.stop(t+dur+0.05); l.stop(t+dur+0.05);
  }
  function chordStab(t, freqs=[], {wave="triangle", gain=0.18, dur=0.35, drive=0.7}={}){
    const g = makeEnv({a:0.01,d:0.12,s:0.4,r:0.25,gain,t});
    const s = localSat(drive); g.connect(s).connect(bus);
    freqs.forEach(f=>{ const o=osc(wave,f); o.connect(g); o.start(t); o.stop(t+dur); });
  }
  const detunePair = f => [f*0.997, f*1.003];

  // ---------- kits (engines) ----------
  function startKO(seed, cfg){
    const {baseMidi, scale, steps, sixteenth, swingAmt, octaves, wave} = cfg;
    const rnd = xorshift32(seed);
    const patKick  = Array.from({length:16}, (_,i)=> (i%4===0) || (rnd()>0.85 && i%2===0));
    const patSnare = Array.from({length:16}, (_,i)=> (i%8===4) || (rnd()>0.92 && i%4===2));
    const patHat   = Array.from({length:16}, (_,i)=> (i%2===0) || (rnd()>0.88));
    const patMel   = Array.from({length:16}, (_,i)=> (i%2===0 && rnd()>0.2) || (rnd()>0.92));
    let step=0, nextTime=ctx.currentTime+0.03;
    const timer=setInterval(()=> {
      while (nextTime < ctx.currentTime + 0.25){
        const t = nextTime + (step%2 ? sixteenth*swingAmt : 0);
        if (patKick[step])  drumKick(t, 0.85);
        if (patSnare[step]) drumSnare(t, 0.5);
        if (patHat[step])   drumHat(t, 0.22);
        if (patMel[step]) {
          const deg = scale[Math.floor(rnd()*scale.length)];
          const oct = (Math.floor(rnd()*octaves)-Math.floor(octaves/2))*12;
          const midi = clamp(baseMidi + deg + oct, 36, 96);
          blip(t, midiToFreq(midi), {wave, dur:sixteenth*(Math.random()>0.7?2.0:1.2), gain:0.18+Math.random()*0.08, wobble:0.002+Math.random()*0.004, drive:0.6});
        }
        step=(step+1)%steps; nextTime += sixteenth;
      }
    }, 50);
    return {timer, stops:[]};
  }

  function startJAZZ(seed, cfg){
    const {baseMidi, scale, sixteenth, swingAmt} = cfg;
    const rnd = xorshift32(seed);
    const hatP = Array.from({length:16},(_,i)=> (i%2===0) || (rnd()>0.92 && i%4===3));
    const rimP = Array.from({length:16},(_,i)=> (i%4===2) && (rnd()>0.3));
    let step=0, nextTime=ctx.currentTime+0.03;
    function chordFromScale(rootMidi){
      const degs = [0,2,4,6];
      const mids = degs.map(d=> rootMidi + (scale[(d)%scale.length]) + 12);
      return mids.map(m=> midiToFreq(clamp(m,45,100)));
    }
    const timer=setInterval(()=>{
      while (nextTime < ctx.currentTime + 0.25){
        const t = nextTime + (step%2 ? sixteenth*swingAmt : 0);
        if (hatP[step]) drumHat(t, 0.16, true);
        if (rimP[step]) rimClick(t, 0.28);
        if (step%8===0 || step%8===4) {
          const rootMidi = baseMidi + scale[0];
          chordStab(t, chordFromScale(rootMidi), {wave:"triangle", gain:0.16, dur:0.42, drive:0.4});
        }
        step=(step+1)%16; nextTime += sixteenth;
      }
    },50);
    return {timer, stops:[]};
  }

  function startLOFI(seed, cfg){
    const {baseMidi, scale, steps, sixteenth, swingAmt} = cfg;
    const rnd = xorshift32(seed);
    let step=0, nextTime=ctx.currentTime+0.03;
    const timer=setInterval(()=>{
      while (nextTime < ctx.currentTime + 0.25){
        const t = nextTime + (step%2 ? sixteenth*swingAmt : 0);
        if (step%4===0) drumKick(t, 0.75);
        if (step%8===4) drumSnare(t, 0.42, true);
        if (step%2===0) drumHat(t, 0.16, true);
        if (step%2===0 && Math.random()>0.25){
          const deg = scale[Math.floor(rnd()*scale.length)];
          const midi = clamp(baseMidi + deg + (Math.random()<0.5?0:12), 36, 90);
          const [f1,f2]=detunePair(midiToFreq(midi));
          blip(t, f1, {wave:"sine", dur:sixteenth*1.4, gain:0.16, wobble:0.003, drive:0.7});
          blip(t+0.01, f2, {wave:"sine", dur:sixteenth*1.4, gain:0.12, wobble:0.003, drive:0.7});
        }
        step=(step+1)%steps; nextTime += sixteenth;
      }
    },50);
    return {timer, stops:[]};
  }

  function startARCADE(seed, cfg){
    const {baseMidi, scale, steps, sixteenth, swingAmt} = cfg;
    const rnd = xorshift32(seed);
    let step=0, nextTime=ctx.currentTime+0.03;
    const timer=setInterval(()=>{
      while (nextTime < ctx.currentTime + 0.25){
        const t = nextTime + (step%2 ? sixteenth*swingAmt : 0);
        if (step%4===0) drumKick(t, 0.8);
        if (step%8===4) drumSnare(t, 0.5);
        drumHat(t, 0.18, true);
        if (step%2===0){
          const deg = scale[Math.floor(rnd()*scale.length)];
          const midi = clamp(baseMidi + deg + (Math.random()>0.6?12:0), 48, 100);
          blip(t, midiToFreq(midi), {wave:"square", dur:sixteenth*1.0, gain:0.18, wobble:0.001, drive:0.8});
        }
        step=(step+1)%steps; nextTime += sixteenth;
      }
    },50);
    return {timer, stops:[]};
  }

  // ---------- ambient ----------
  function startPAD(seed, cfg){
    const {baseMidi, scale, spb} = cfg;
    const rnd = xorshift32(seed);
    const lfo = ctx.createOscillator(); lfo.type="sine"; lfo.frequency.value = 0.06 + rnd()*0.06;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 800; lfo.connect(lfoGain).connect(lp.frequency);
    const stops=[];
    function spawnPad(t){
      const degs = [0,2,4].map(()=> scale[Math.floor(rnd()*scale.length)]);
      const mids = degs.map(d => clamp(baseMidi + d + 12, 36, 96));
      const g = makeEnv({a:0.8,d:1.2,s:0.7,r:2.0,gain:0.18,t});
      const s = localSat(0.4); g.connect(s).connect(bus);
      mids.forEach(m=>{ const [f1,f2]=detunePair(midiToFreq(m)); const o1=osc("sine",f1), o2=osc("triangle",f2); o1.connect(g); o2.connect(g); o1.start(t); o2.start(t); o1.stop(t+6); o2.stop(t+6); });
      stops.push(()=>{ g.gain.cancelScheduledValues(ctx.currentTime); g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05); });
    }
    let next = ctx.currentTime + 0.05;
    const timer=setInterval(()=>{ while(next < ctx.currentTime + 0.5){ spawnPad(next); next += spb*4; } }, 200);
    lfo.start();
    return {timer, stops:[()=>lfo.stop()].concat(stops)};
  }

  function startDRONE(seed, cfg){
    const {baseMidi, scale, spb} = cfg;
    const rnd = xorshift32(seed);
    const base = midiToFreq(clamp(baseMidi - 12, 30, 70));
    const o1 = osc("sine", base*0.999), o2 = osc("triangle", base*1.003);
    const g = makeEnv({a:1.0,d:1.5,s:0.9,r:2.0,gain:0.22,t:ctx.currentTime});
    const s = localSat(0.5);
    o1.connect(g); o2.connect(g); g.connect(s).connect(bus);
    o1.start(); o2.start();

    const timer = setInterval(()=>{
      const deg = scale[Math.floor(rnd()*scale.length)];
      const midi = clamp(baseMidi + deg + 12, 48, 96);
      const f = midiToFreq(midi);
      blip(ctx.currentTime + 0.02, f, {wave:"sine", dur: spb*1.8, gain:0.12, wobble:0.002, drive:0.4});
    }, spb*1200);

    return {timer, stops:[()=>{ try{o1.stop();o2.stop();}catch(e){} }]};
  }

  // ---------- hard stop / restore ----------
  function hardStop() {
    if (!ctx) return;
    if (current.timer) { clearInterval(current.timer); current.timer = null; }
    current.stops.forEach(fn => { try { fn(); } catch {} });
    current.stops = [];
    if (current.tile) { current.tile.classList.remove("playing"); current.tile = null; }
    const now = ctx.currentTime;
    if (master) {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0, now + 0.06); // kill all audio quickly
    }
  }
  function restoreLevels(dust=0.03){
    if (!ctx) return;
    const now = ctx.currentTime;
    if (master && !muted) {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0.0, now);
      master.gain.linearRampToValueAtTime(1.0, now + 0.08);
    }
    noiseGain && (noiseGain.gain.cancelScheduledValues(now), noiseGain.gain.linearRampToValueAtTime(dust, now + 0.08));
  }

  // ---------- dispatcher ----------
  function startKit(tile, post){
    ensureCtx(); ctx.resume();

    // chain params (defaults if missing)
    const drive = post.drive ?? 0.6, crush = post.crush ?? 0.3, dust = post.dust ?? 0.03;
    sat = makeSaturator(1.2 + drive);
    // reconnect: bus → sat → lp → comp (already wired), comp → MASTER, noise → MASTER
    lp.frequency.setValueAtTime(3800 - (crush*1200), ctx.currentTime);
    noiseGain.gain.setValueAtTime(dust, ctx.currentTime);

    // timing/scale with safe fallbacks
    const baseMidi = noteToMidi(post.base || "A3");
    const scale = MODES[post.mode || "dorian"] || MODES.dorian;
    const bpm = clamp(post.bpm ?? 84, 40, 140);
    const spb = 60 / bpm;
    const sixteenth = spb / 4;
    const swingAmt = clamp(post.swing ?? 0.16, 0, 0.3);
    const steps = clamp(post.steps ?? 16, 8, 32);
    const octaves = clamp(post.octaves ?? 2, 1, 3);
    const wave = (post.waveform || "triangle");

    const seed = strSeed((tile.dataset.hex||"")+(tile.dataset.date||"")+(post.kit||"")+(bpm)+wave);
    const cfg = { baseMidi, scale, spb, steps, sixteenth, swingAmt, octaves, wave };

    const kit = (post.kit || "").toLowerCase().trim();
    if (!kit) return null;               // missing kit → intentional silence
    if (kit === "ko")     return startKO(seed, cfg);
    if (kit === "jazz")   return startJAZZ(seed, cfg);
    if (kit === "lofi")   return startLOFI(seed, cfg);
    if (kit === "arcade") return startARCADE(seed, cfg);
    if (kit === "pad")    return startPAD(seed, cfg);
    if (kit === "drone")  return startDRONE(seed, cfg);
    return null; // unknown string → silence
  }

  // ---------- data + render ----------
  const grid = $("#grid");
  const todayISO = () => {
    const t = new Date(), y = t.getFullYear(), m = String(t.getMonth()+1).padStart(2,"0"), d = String(t.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  };

  fetch("data.json?v=" + Date.now(), { cache: "no-store" })
    .then(r => r.json())
    .then(data => {
      const posts = (data.posts || [])
        .map(p => ({
          date: p.date || todayISO(),
          hex: p.hex,
          base: p.base,
          mode: p.mode,
          bpm: p.bpm,
          steps: p.steps,
          octaves: p.octaves,
          waveform: p.waveform,
          swing: p.swing,
          drive: p.drive,
          crush: p.crush,
          dust: p.dust,
          kit: p.kit // may be undefined/empty → deliberate silence
        }))
        .filter(p => /^#[0-9a-fA-F]{6}$/.test(p.hex))
        .sort((a,b)=> (a.date<b.date)?1:-1);

      posts.forEach((p,i) => grid.appendChild(makeTile(p,i)));
    })
    .catch(() => { /* silent */ });

  function makeTile(post, idx){
    const tile = document.createElement("article");
    tile.className = "tile"; tile.dataset.idx = String(idx); tile.dataset.hex = post.hex; tile.dataset.date = post.date;

    const sw = document.createElement("div"); sw.className = "swatch"; sw.style.background = post.hex;
    const playBtn = document.createElement("div"); playBtn.className = "play";
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7-11-7z"></path></svg>`;
    sw.appendChild(playBtn);

    sw.addEventListener("pointermove", (e) => {
      const r = sw.getBoundingClientRect();
      sw.style.setProperty("--x", `${e.clientX - r.left}px`);
      sw.style.setProperty("--y", `${e.clientY - r.top}px`);
    }, { passive: true });

    const meta = document.createElement("div"); meta.className = "meta";
    const date = document.createElement("div"); date.className = "date"; date.textContent = post.date;
    const hex = document.createElement("div"); hex.className = "hex"; hex.textContent = post.hex.toUpperCase();
    meta.append(date, hex);

    const toggle = async () => {
      ensureCtx(); await ctx.resume();

      if (current.tile === tile) { hardStop(); return; }         // toggle OFF if same
      const run = startKit(tile, post);                          // attempt to start this tile
      if (!run) return;                                          // kit missing/unknown → do nothing

      if (current.tile) hardStop();                              // stop previous
      current = { tile, timer: run.timer || null, stops: run.stops || [] };
      tile.classList.add("playing");
      restoreLevels(post.dust ?? 0.03);
    };

    sw.addEventListener("click", toggle);
    tile.append(sw, meta); return tile;
  }
})();