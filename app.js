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

  // ---------- tickers (clean translations) ----------
  const MOOD_WORDS = [
    "mood","estado de ánimo","humeur","stimmung","umore","humor","stemming","humör","humør","mieliala",
    "nastrój","nálada","hangulat","stare","настроение","настрій","διάθεση","ruh hali",
    "مزاج","מצב רוח","मूड","মুড","気分","기분","心情","心情","tâm trạng","suasana","suasana hati",
    "damdamin","sauti ya hisia","አመለካከት"
  ];
  const SOUND_WORDS = [
    "sound","sonido","son","klang","suono","som","geluid","ljud","lyd","ääni",
    "dźwięk","zvuk","hang","sunet","звук","звук","ήχος","ses",
    "صوت","צליל","ध्वनि","শব্দ","音","소리","声音","聲音","âm thanh","bunyi",
    "tunog","sauti","ድምፅ"
  ];
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
  let ctx, master, bus, comp, lp, sat, delay, padBus;
  let current = { tile: null, timer: null, stops: [] };
  let muted = JSON.parse(localStorage.getItem("huewave/muted") || "false");

  // palette helpers
  function hexToHsl(hex){
    const m=/^#?([0-9a-f]{6})$/i.exec(hex||""); if(!m) return {h:0,s:0,l:0.5};
    const n=parseInt(m[1],16), r=((n>>16)&255)/255, g=((n>>8)&255)/255, b=(n&255)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2;
    let h=0,s=0; if(max!==min){const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;} h/=6;}
    return {h,s,l};
  }

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

    sat = makeSaturator(1.3);
    lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 4200; lp.Q.value = 0.5;
    delay = ctx.createDelay(0.6);  delay.delayTime.value = 0.18;
    const delayWet = ctx.createGain(); delayWet.gain.value = 0.12;
    const delayFB = ctx.createGain(); delayFB.gain.value = 0.18;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 18; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.16;

    bus = ctx.createGain(); bus.gain.value = 0.9;
    padBus = ctx.createGain(); padBus.gain.value = 0.0; // ambient pad master
    master = ctx.createGain(); master.gain.value = muted ? 0.0 : 1.0;

    // routing
    // padBus mixes into bus so pads go through same chain
    padBus.connect(bus);
    bus.connect(sat).connect(lp).connect(comp);
    sat.connect(delay).connect(delayWet).connect(comp);
    delay.connect(delayFB).connect(delay);
    comp.connect(master);
    master.connect(ctx.destination);

    // resume on visibility (Android can suspend contexts)
    document.addEventListener("visibilitychange", () => { if (ctx && ctx.state !== "running") ctx.resume(); });
  }

  const setMuted = (v) => {
    muted = !!v;
    const now = ctx ? ctx.currentTime : 0;
    if (master) {
      master.gain.cancelScheduledValues(now);
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
  const detunePair = f => [f*0.997, f*1.003];

  // ---------- NEW: Ambient Pad (color + dust) ----------
  function startAmbientPad({hex="#6BCB77", base="A3", level=0.06}){
    const {l} = hexToHsl(hex);
    const cutoff = 300 + l*5000;       // darker→lower, brighter→airier
    const detPct = 0.4 + (1-l)*0.8;    // darker→more detune
    const baseMidi = noteToMidi(base);
    const f0 = midiToFreq(clamp(baseMidi-12, 24, 72));
    const o1 = osc("sine", f0*0.999), o2 = osc("triangle", f0*(1+detPct/100));
    const pf = ctx.createBiquadFilter(); pf.type="lowpass"; pf.frequency.value = cutoff; pf.Q.value = 0.6;
    const pan = ctx.createStereoPanner(); pan.pan.value = 0;
    const g = ctx.createGain(); g.gain.value = level; // master for pad voice

    // slow LFOs
    const lfo1 = osc("sine", 0.05 + Math.random()*0.07); const lfoG1 = ctx.createGain(); lfoG1.gain.value = 0.6;    // pan
    const lfo2 = osc("sine", 0.03 + Math.random()*0.05); const lfoG2 = ctx.createGain(); lfoG2.gain.value = 300+600*l; // cutoff wobble
    lfo1.connect(lfoG1).connect(pan.pan);
    lfo2.connect(lfoG2).connect(pf.frequency);

    o1.connect(pf); o2.connect(pf);
    pf.connect(pan).connect(g).connect(padBus);

    const now = ctx.currentTime; [o1,o2,lfo1,lfo2].forEach(o=>o.start(now));

    // stop hook
    return () => { try{o1.stop();o2.stop();lfo1.stop();lfo2.stop();}catch{} };
  }

  // ---------- NEW: KO33-style weird micro-samples (drive + swing) ----------
  function startKOWeird({bpm=84, swing=0.14, drive=0.5, base="A3", mode="dorian"}){
    const scale = MODES[mode]||MODES.dorian;
    const baseMidi = noteToMidi(base);
    const spb = 60/bpm, six = spb/4;
    // event probability ~ 0..35% scaled by drive (0..1.2)
    const pHit = clamp(drive/1.2,0,1)*0.35;

    let step=0, next=ctx.currentTime+0.03;
    const id = setInterval(()=>{
      while(next < ctx.currentTime + 0.25){
        const t = next + (step%2 ? six*swing : 0);
        if (Math.random() < pHit){
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
      const midi = clamp(baseMidi + deg + (Math.random()<0.5?0:12), 36, 96);
      const o = osc("square", midiToFreq(midi)*(1 + (Math.random()*0.006-0.003)));
      const v = makeEnv({a:0.004,d:0.05,s:0.0,r:0.08,gain:0.16,t});
      o.connect(v).connect(bus); o.start(t); o.stop(t+0.12);
    }
    function formantChirp(t){
      const dur = 0.14;
      const b = ctx.createBuffer(1, Math.ceil(dur*ctx.sampleRate), ctx.sampleRate);
      const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i] = (Math.random()*2-1)*0.6;
      const s=ctx.createBufferSource(); s.buffer=b;
      const bp=ctx.createBiquadFilter(); bp.type="bandpass"; bp.Q.value=6;
      bp.frequency.setValueAtTime(600,t); bp.frequency.exponentialRampToValueAtTime(1600,t+0.12);
      const v=makeEnv({a:0.003,d:0.05,s:0.0,r:0.06,gain:0.12,t});
      s.connect(bp).connect(v).connect(bus); s.start(t); s.stop(t+dur);
    }
    function bitNoiseTick(t){
      const ws=ctx.createWaveShaper(); const N=128, c=new Float32Array(N);
      for(let i=0;i<N;i++){ const x=(i/N)*2-1; c[i]=Math.sign(x)*Math.pow(Math.abs(x),0.3); } ws.curve=c;
      const o=osc("sine", 1200 + Math.random()*800);
      const v=makeEnv({a:0.001,d:0.02,s:0,r:0.03,gain:0.08,t});
      o.connect(ws).connect(v).connect(bus); o.start(t); o.stop(t+0.06);
    }

    return () => { try{clearInterval(id);}catch{} };
  }

  // ---------- drums ----------
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

  // ---------- kits (run until toggled off) ----------
  function startKO(seed, cfg){
    const {baseMidi, scale, steps, sixteenth, swingAmt, octaves, wave} = cfg;
    const rnd = xorshift32(seed);
    const patKick  = Array.from({length:16}, (_,i)=> (i%4===0) || (rnd()>0.85 && i%2===0));
    const patSnare = Array.from({length:16}, (_,i)=> (i%8===4) || (rnd()>0.92 && i%4===2));
    const patHat   = Array.from({length:16}, (_,i)=> (i%2===0) || (rnd()>0.88));
    let step=0, nextTime=ctx.currentTime+0.03;
    const timer=setInterval(()=> {
      while (nextTime < ctx.currentTime + 0.25){
        const t = nextTime + (step%2 ? sixteenth*swingAmt : 0);
        if (patKick[step])  drumKick(t, 0.85);
        if (patSnare[step]) drumSnare(t, 0.5);
        if (patHat[step])   drumHat(t, 0.22);
        if (rnd()>0.55){
          const deg = scale[Math.floor(rnd()*scale.length)];
          const oct = (Math.floor(rnd()*2)-1)*12 * (octaves>1?1:0);
          const midi = clamp(baseMidi + deg + oct, 36, 96);
          blip(t, midiToFreq(midi), {wave, dur:sixteenth*(rnd()>0.7?2.0:1.2), gain:0.18+Math.random()*0.08, wobble:0.002+Math.random()*0.004, drive:0.6});
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
          const f = midiToFreq(midi);
          blip(t, f*0.997, {wave:"sine", dur:sixteenth*1.4, gain:0.16, wobble:0.003, drive:0.7});
          blip(t+0.01, f*1.003, {wave:"sine", dur:sixteenth*1.4, gain:0.12, wobble:0.003, drive:0.7});
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
      master.gain.linearRampToValueAtTime(0.0, now + 0.06);
    }
    // fade padBus down to avoid tails
    if (padBus) { padBus.gain.cancelScheduledValues(now); padBus.gain.linearRampToValueAtTime(0.0, now + 0.06); }
  }
  function restoreLevels(dust=0.03){
    if (!ctx) return;
    const now = ctx.currentTime;
    if (master && !muted) {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0.0, now);
      master.gain.linearRampToValueAtTime(1.0, now + 0.08);
    }
    // dust now = ambient pad level (subtle)
    if (padBus) {
      padBus.gain.cancelScheduledValues(now);
      padBus.gain.linearRampToValueAtTime(clamp(dust,0,0.2)*1.4, now + 0.08);
    }
  }

  // ---------- dispatcher ----------
  function startKit(tile, post){
    ensureCtx();
    ctx.resume();

    // chain params (audible now)
    const drive = post.drive ?? 0.6, crush = post.crush ?? 0.3, dust = post.dust ?? 0.03;
    sat = makeSaturator(1.2 + drive);
    lp.frequency.setValueAtTime(3800 - (crush*1200), ctx.currentTime);

    // timing/scale
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
    if (!kit) return null;

    // main kit engine
    let run = null;
    if (kit === "ko")     run = startKO(seed, cfg);
    else if (kit === "jazz")   run = startJAZZ(seed, cfg);
    else if (kit === "lofi")   run = startLOFI(seed, cfg);
    else if (kit === "arcade") run = startARCADE(seed, cfg);
    else if (kit === "pad")    run = startPAD(seed, cfg);
    else if (kit === "drone")  run = startDRONE(seed, cfg);
    if (!run) return null;

    // add Ambient Pad (level from dust) and KO33 weird (drive/swing)
    const padLevel = clamp(dust,0,0.2)*1.4;
    const stopPad = startAmbientPad({hex: post.hex, base: post.base || "A3", level: padLevel});
    const stopWeird = startKOWeird({bpm, swing: swingAmt, drive, base: post.base || "A3", mode: post.mode || "dorian"});

    run.stops = (run.stops || []).concat([stopPad, stopWeird]);

    return run;
  }

  // ---------- data + render ----------
  const grid = $("#grid");
  const todayISO = () => {
    const t = new Date(), y = t.getFullYear(), m = String(t.getMonth()+1).padStart(2,"0"), d = String(t.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  };

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

      // if same tile → toggle OFF
      if (current.tile === tile) { hardStop(); return; }

      // stop previous first, then start fresh
      if (current.tile) hardStop();

      const run = startKit(tile, post);
      if (!run) return;

      current = { tile, timer: run.timer || null, stops: run.stops || [] };
      tile.classList.add("playing");
      restoreLevels(post.dust ?? 0.03);
    };

    sw.addEventListener("click", toggle);
    tile.append(sw, meta); return tile;
  }

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
          kit: p.kit
        }))
        .filter(p => /^#[0-9a-fA-F]{6}$/.test(p.hex))
        .sort((a,b)=> (a.date<b.date)?1:-1);

      posts.forEach((p,i) => grid.appendChild(makeTile(p,i)));
    })
    .catch(() => { /* silent */ });

  // --- live update polling for data.json ---
  (() => {
    const POLL_SEC = 60;
    let lastTag = null;
    async function headTag() {
      try {
        const r = await fetch("data.json", { method: "HEAD", cache: "no-store" });
        return r.headers.get("etag") || r.headers.get("last-modified") || String(Date.now());
      } catch { return null; }
    }
    async function loadData() {
      const r = await fetch("data.json?v=" + Date.now(), { cache: "no-store" });
      const data = await r.json();
      return (data.posts || [])
        .filter(p => /^#[0-9a-fA-F]{6}$/.test(p.hex))
        .map(p => ({
          date: p.date || (new Date()).toISOString().slice(0,10),
          hex: p.hex, base: p.base, mode: p.mode, bpm: p.bpm, steps: p.steps,
          octaves: p.octaves, waveform: p.waveform, swing: p.swing, drive: p.drive, crush: p.crush, dust: p.dust, kit: p.kit
        }))
        .sort((a,b)=> (a.date<b.date)?1:-1);
    }
    async function rerender(posts){
      try { typeof hardStop === "function" && hardStop(); } catch {}
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      posts.forEach((p,i) => grid.appendChild(makeTile(p,i)));
    }
    async function poll() {
      const tag = await headTag();
      if (!tag) return;
      if (lastTag === null) { lastTag = tag; return; }
      if (tag !== lastTag) {
        try { const posts = await loadData(); await rerender(posts); lastTag = tag; } catch {}
      }
    }
    setInterval(poll, POLL_SEC * 1000);
    setTimeout(poll, 5000);
  })();
})();