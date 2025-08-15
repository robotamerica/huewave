(() => {
  // Select a single element
  const $ = (q, el = document) => el.querySelector(q);

  // --- Play/Pause icon helpers and tile UI state ---
  const PLAY_SVG  = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7-11-7z"></path></svg>`;
  const PAUSE_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h5v14H6zM13 5h5v14h-5z"></path></svg>`;
  function setTilePlaying(tile, isOn) {
    if (!tile) return;
    tile.classList.toggle("playing", !!isOn);
    const btn = tile.querySelector(".play");
    if (btn) btn.innerHTML = isOn ? PAUSE_SVG : PLAY_SVG;
  }
  // Reset UI state for all tiles marked as playing
  function resetAllTilesUI() {
    document.querySelectorAll(".tile.playing").forEach(t => setTilePlaying(t, false));
  }
  // Prevent overlapping play/stop sequences under rapid taps
  let playBusy = false;

  // --- Theme, to-top, and mute state ---
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

  let muted = JSON.parse(localStorage.getItem("huewave/muted") || "false");
  $("#muteBtn")?.addEventListener("click", () => { ensureCtx(); setMuted(!muted); });

  // --- Text tickers for “mood” and “sound” (translations only) ---
  const MOOD = ["mood","estado de ánimo","humeur","stimmung","umore","humor","stemming","humör","humør","mieliala","nastrój","nálada","hangulat","stare","настроение","настрій","διάθεση","ruh hali","مزاج","מצב רוח","मूड","মুড","気分","기분","心情","心情","tâm trạng","suasana","suasana hati","damdamin","sauti ya hisia","አመለካከት"];
  const SOUND = ["sound","sonido","son","klang","suono","som","geluid","ljud","lyd","ääni","dźwięk","zvuk","hang","sunet","звук","звук","ήχος","ses","صوت","צליל","ध्वनि","শব্দ","音","소리","声音","聲音","âm thanh","bunyi","tunog","sauti","ድምፅ"];
  function cycle(el, words, base=2200, jitter=900){
    if(!el) return;
    let i=0;
    const step=()=>{ el.style.opacity=0; setTimeout(()=>{ el.textContent=words[i%words.length]; el.style.opacity=1; i++; setTimeout(step, base+Math.floor(Math.random()*jitter)); },220); };
    el.textContent=words[0];
    setTimeout(step, base+Math.floor(Math.random()*jitter));
  }
  cycle($("#moodTicker"), MOOD, 2200, 800);
  cycle($("#soundTicker"), SOUND, 3000, 1200);

  // --- Color utility (HEX to HSL) ---
  function hexToHsl(hex){
    const m=/^#?([0-9a-f]{6})$/i.exec(hex||""); if(!m) return {h:0,s:0,l:0.5};
    const n=parseInt(m[1],16), r=((n>>16)&255)/255, g=((n>>8)&255)/255, b=(n&255)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2; let h=0,s=0;
    if(max!==min){ const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;} h/=6; }
    return {h,s,l};
  }

  // --- Music theory helpers ---
  const NOTE_INDEX={C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
  const A4=440,A4_MIDI=69, midiToFreq=m=>A4*Math.pow(2,(m-A4_MIDI)/12);
  function noteToMidi(n="A3"){ const m=/^([A-G](?:#|b)?)\s*(-?\d+)$/.exec(String(n).trim()); if(!m) return 57; const[,nm,o]=m; return (parseInt(o,10)+1)*12+(NOTE_INDEX[nm]??9); }
  const MODES={ionian:[0,2,4,5,7,9,11],dorian:[0,2,3,5,7,9,10],phrygian:[0,1,3,5,7,8,10],lydian:[0,2,4,6,7,9,11],mixolydian:[0,2,4,5,7,9,10],aeolian:[0,2,3,5,7,8,10],locrian:[0,1,3,5,6,8,10],pent_major:[0,2,4,7,9],pent_minor:[0,3,5,7,10]};
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

  // --- Audio graph: matches studio chain exactly ---
  let AudioCtx = window.AudioContext||window.webkitAudioContext;
  let ctx=null, bus=null, preLP=null, agc=null, comp=null, limiter=null, dcBlock=null, master=null, analyser=null;
  let delay=null, delayWet=null, fbHP=null, fbGain=null, padBus=null;

  // --- Registry of ephemeral nodes for clean teardown ---
  const EPHEM=new Set(); const regE=n=>(n&&n.connect&&EPHEM.add(n),n);

  // --- Mute state with smooth ramping ---
  function setMuted(v){
    muted=!!v;
    if(master && ctx){ const t=ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.linearRampToValueAtTime(muted?0.0:0.96, t+0.06); }
    localStorage.setItem("huewave/muted", JSON.stringify(muted));
    const icon=$("#muteBtn svg"); if(icon) icon.style.opacity=muted?0.5:1;
  }
  setMuted(muted);

  // --- Soft limiter waveshaper (safety ceiling) ---
  function makeLimiter(){ const ws=ctx.createWaveShaper(); const N=2048,c=new Float32Array(N);
    for(let i=0;i<N;i++){ const x=(i/(N-1))*2-1; c[i]=Math.max(-0.985, Math.min(0.985, x)); } ws.curve=c; ws.oversample="4x"; return ws; }

  // --- Ensure AudioContext and core chain exist and run ---
  async function ensureCtx(){
    if(ctx){ if(ctx.state!=="running"){ try{await ctx.resume();}catch{} } return; }
    ctx=new AudioCtx({latencyHint:"interactive"});
    bus    = ctx.createGain();        bus.gain.value=0.9;
    preLP  = ctx.createBiquadFilter();preLP.type="lowpass"; preLP.frequency.value=16000; preLP.Q.value=0.5;
    agc    = ctx.createGain();        agc.gain.value=1.0;
    comp   = new DynamicsCompressorNode(ctx,{threshold:-18,knee:18,ratio:3,attack:0.006,release:0.16});
    limiter= makeLimiter();
    dcBlock= ctx.createBiquadFilter();dcBlock.type="highpass"; dcBlock.frequency.value=25;
    master = ctx.createGain();        master.gain.value = muted?0.0:0.96;
    analyser = ctx.createAnalyser();  analyser.fftSize=2048;
    padBus  = ctx.createGain();       padBus.gain.value=0.0;

    padBus.connect(bus);
    bus.connect(preLP).connect(agc).connect(comp).connect(limiter).connect(dcBlock).connect(master).connect(ctx.destination);
    limiter.connect(analyser);

    rebuildDelay();
    document.addEventListener("visibilitychange",()=>{ if(ctx && ctx.state!=="running") ctx.resume(); });
  }

  // --- Gentle pre-delay saturator for thickness without harshness ---
  function makePreDelaySat(drive=1.04){ const ws=regE(ctx.createWaveShaper()); const N=1024,c=new Float32Array(N);
    for(let i=0;i<N;i++){ const x=(i/N)*2-1; c[i]=Math.tanh(x*drive);} ws.curve=c; ws.oversample="2x"; return ws; }

  // --- Delay loop builder with feedback and wet mix ---
  function rebuildDelay(){
    if(!ctx) return;
    try{ delay && delay.disconnect(); delayWet && delayWet.disconnect(); fbHP && fbHP.disconnect(); fbGain && fbGain.disconnect(); }catch{}
    delay    = regE(ctx.createDelay(0.6)); delay.delayTime.value = 0.16;
    delayWet = regE(ctx.createGain());     delayWet.gain.value   = 0.08;
    fbHP     = regE(ctx.createBiquadFilter()); fbHP.type="highpass"; fbHP.frequency.value=150;
    fbGain   = regE(ctx.createGain());     fbGain.gain.value     = 0.07;

    const preDelaySat = makePreDelaySat(1.04);
    bus.connect(preDelaySat).connect(delay);
    delay.connect(delayWet).connect(comp);
    delay.connect(fbHP).connect(fbGain).connect(delay);
  }

  // --- Output RMS meter for AGC ---
  const buf=new Uint8Array(2048);
  function rmsNow(){ if(!analyser) return 0; analyser.getByteTimeDomainData(buf); let s=0; for(let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; s+=v*v; } return Math.sqrt(s/buf.length); }
  setInterval(()=>{ if(!ctx||!agc) return; const r=rmsNow(), target=0.17; if(r>target && agc.gain.value>0.8){ const t=ctx.currentTime; agc.gain.setValueAtTime(Math.max(0.8, agc.gain.value-0.02), t); } }, 250);

  // --- Wait until output is quiet to avoid tail buildup ---
  function waitForSilence(th=0.012, hold=160, timeout=900){
    const start=performance.now(); let ok=0;
    return new Promise(res=>{
      const id=setInterval(()=>{
        const r=rmsNow(); ok = r<th ? ok+33 : 0;
        if(ok>=hold || performance.now()-start>timeout){ clearInterval(id); res(); }
      },33);
    });
  }

  // --- Stop and disconnect all ephemeral nodes ---
  async function hardKillAll(){
    if(!ctx) return;
    const now=ctx.currentTime;
    EPHEM.forEach(n=>{
      try{ n.stop && n.stop(now); }catch{}
      try{ n.gain && n.gain.cancelScheduledValues && n.gain.cancelScheduledValues(now); }catch{}
      try{ n.frequency && n.frequency.cancelScheduledValues && n.frequency.cancelScheduledValues(now); }catch{}
      try{ n.disconnect && n.disconnect(); }catch{}
    });
    EPHEM.clear();
  }

  // --- Envelope generator (ADSR) ---
  function env(t,a=0.006,d=0.06,s=0.6,r=0.14,g=0.22){ const gn=regE(ctx.createGain()); gn.gain.setValueAtTime(0.0001,t); gn.gain.linearRampToValueAtTime(g,t+a); gn.gain.linearRampToValueAtTime(g*s,t+a+d); gn.gain.exponentialRampToValueAtTime(0.0001,t+a+d+r); return gn; }

  // --- Oscillator constructor ---
  function osc(type,f){ const o=regE(ctx.createOscillator()); o.type=type; o.frequency.value=f; return o; }

  // --- Drum voices (kick, snare, hat) ---
  function kick(t,v=0.72){ const g=env(t,0.002,0.08,0,0.18,v); const o=osc("sine",150); o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(42,t+0.16); o.connect(g).connect(bus); o.start(t); o.stop(t+0.3); }
  function snare(t,v=0.42){ const dur=0.16; const b=regE(ctx.createBuffer(1,Math.ceil(dur*ctx.sampleRate),ctx.sampleRate)); const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1; const s=regE(ctx.createBufferSource()); s.buffer=b; const hp=regE(ctx.createBiquadFilter()); hp.type="highpass"; hp.frequency.value=1500; const bp=regE(ctx.createBiquadFilter()); bp.type="bandpass"; bp.frequency.value=1400; bp.Q.value=0.9; const g=env(t,0.001,dur*0.6,0,dur*0.6,v); s.connect(hp).connect(bp).connect(g).connect(bus); s.start(t); s.stop(t+dur); }
  function hat(t,v=0.14,closed=true){ const dur=closed?0.05:0.18; const b=regE(ctx.createBuffer(1,Math.ceil(dur*ctx.sampleRate),ctx.sampleRate)); const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1; const s=regE(ctx.createBufferSource()); s.buffer=b; const hp=regE(ctx.createBiquadFilter()); hp.type="highpass"; hp.frequency.value=7000; const g=env(t,0.001,closed?0.02:0.05,closed?0:0.3,closed?0.03:0.12,v); s.connect(hp).connect(g).connect(bus); s.start(t); s.stop(t+dur); }

  // --- Melodic note and chord builders ---
  function blip(t,f,{wave="triangle",dur=0.22,gain=0.18,wobble=0.0025}={}){ const o=osc(wave,f); const l=osc("sine",5.1); const lg=regE(ctx.createGain()); lg.gain.value=f*wobble; l.connect(lg).connect(o.frequency); const g=env(t,0.01,dur*0.4,0.55,Math.max(0.1,dur*0.55),gain); o.connect(g).connect(bus); o.start(t); l.start(t); o.stop(t+dur+0.05); l.stop(t+dur+0.05); }
  function chord(t,fs,{wave="triangle",gain=0.15,dur=0.4}={}){ const g=env(t,0.012,0.12,0.45,0.26,gain); g.connect(bus); fs.forEach(f=>{ const o=osc(wave,f); o.connect(g); o.start(t); o.stop(t+dur); }); }

  // --- Ambient pad generator (stereo, color-aware) ---
  function startAmbientPad({hex="#6BCB77", base="A3", level=0.08}){
    const {l}=hexToHsl(hex); const cutoff=300 + l*5000; const det=0.4 + (1-l)*0.8;
    const baseMidi=noteToMidi(base); const f0=midiToFreq(baseMidi-12);
    const o1=osc("sine",f0*0.999), o2=osc("triangle", f0*(1+det/100));
    const pf=regE(ctx.createBiquadFilter()); pf.type="lowpass"; pf.frequency.value=cutoff; pf.Q.value=0.6;
    const p=regE(ctx.createStereoPanner()); p.pan.value=0;
    const g=regE(ctx.createGain()); g.gain.value=level;
    const lfo1=osc("sine",0.05+Math.random()*0.07), lfoG1=regE(ctx.createGain()); lfoG1.gain.value=0.6;
    const lfo2=osc("sine",0.03+Math.random()*0.05), lfoG2=regE(ctx.createGain()); lfoG2.gain.value=300+600*l;
    lfo1.connect(lfoG1).connect(p.pan); lfo2.connect(lfoG2).connect(pf.frequency);
    o1.connect(pf); o2.connect(pf); pf.connect(p).connect(g).connect(padBus);
    const now=ctx.currentTime; [o1,o2,lfo1,lfo2].forEach(o=>o.start(now));
    return ()=>{ try{o1.stop();o2.stop();lfo1.stop();lfo2.stop();}catch{} };
  }

  // --- KO33-style micro-sample layer (quirky ear candy) ---
  function startKOWeird({bpm=84, swing=0.14, drive=0.5, base="A3", mode="dorian"}){
    const scale=MODES[mode]||MODES.dorian; const baseMidi=noteToMidi(base); const spb=60/bpm, six=spb/4;
    const pHit=clamp(drive/1.2,0,1)*0.35; let step=0, next=ctx.currentTime+0.03;
    const id=setInterval(()=>{ while(next<ctx.currentTime+0.25){ const t=next+(step%2?six*swing:0); if(Math.random()<pHit){ const pick=Math.random(); if(pick<0.34) microPluck(t); else if(pick<0.68) formantChirp(t); else bitNoiseTick(t); } step=(step+1)%16; next+=six; }},40);
    function microPluck(t){ const deg=scale[Math.floor(Math.random()*scale.length)]; const midi=clamp(baseMidi+deg+(Math.random()<0.5?0:12),36,96); const o=osc("square",midiToFreq(midi)*(1+(Math.random()*0.006-0.003))); const v=env(t,0.004,0.05,0,0.08,0.16); o.connect(v).connect(bus); o.start(t); o.stop(t+0.12); }
    function formantChirp(t){ const dur=0.14; const b=regE(ctx.createBuffer(1,Math.ceil(dur*ctx.sampleRate),ctx.sampleRate)); const ch=b.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=(Math.random()*2-1)*0.6; const s=regE(ctx.createBufferSource()); s.buffer=b; const bp=regE(ctx.createBiquadFilter()); bp.type="bandpass"; bp.Q.value=6; bp.frequency.setValueAtTime(600,t); bp.frequency.exponentialRampToValueAtTime(1600,t+0.12); const v=env(t,0.003,0.05,0,0.06,0.12); s.connect(bp).connect(v).connect(bus); s.start(t); s.stop(t+dur); }
    function bitNoiseTick(t){ const ws=regE(ctx.createWaveShaper()); const N=128,c=new Float32Array(N); for(let i=0;i<N;i++){ const x=(i/N)*2-1; c[i]=Math.sign(x)*Math.pow(Math.abs(x),0.3);} ws.curve=c; const o=osc("sine",1200+Math.random()*800); const v=env(t,0.001,0.02,0,0.03,0.08); o.connect(ws).connect(v).connect(bus); o.start(t); o.stop(t+0.06); }
    return ()=>{ try{clearInterval(id);}catch{} };
  }

  // --- Pattern engines (kits) ---
  function startKO(cfg){ const {baseMidi, scale, steps, sixteenth, swingAmt, octaves, wave}=cfg;
    let step=0,next=ctx.currentTime+0.03;
    const timer=setInterval(()=>{ while(next<ctx.currentTime+0.25){ const t=next+(step%2?sixteenth*swingAmt:0);
      if(step%4===0)kick(t,0.7); if(step%8===4)snare(t,0.4); if(step%2===0)hat(t,0.14,true);
      if(step%2===0){ const deg=scale[(step/2)%scale.length|0]; const midi=baseMidi+deg+(octaves>1&&Math.random()>0.6?12:0); blip(t, midiToFreq(midi), {wave, dur:sixteenth*1.2, gain:0.16}); }
      step=(step+1)%steps; next+=sixteenth; }},50);
    return {timer,stops:[]};
  }
  function startJAZZ(cfg){ const {baseMidi, scale, sixteenth, swingAmt}=cfg; let step=0,next=ctx.currentTime+0.03;
    const timer=setInterval(()=>{ while(next<ctx.currentTime+0.25){ const t=next+(step%2?sixteenth*swingAmt:0); if(step%2===0)hat(t,0.12,true);
      if(step%8===0||step%8===4){ const root=baseMidi+scale[0], mids=[0,2,4].map(d=>midiToFreq(root+scale[d%scale.length]+12)); chord(t,mids,{wave:"triangle",gain:0.14,dur:0.42}); }
      step=(step+1)%16; next+=sixteenth; }},50); return {timer,stops:[]}; }
  function startLOFI(cfg){ const {baseMidi, scale, steps, sixteenth, swingAmt}=cfg; let step=0,next=ctx.currentTime+0.03;
    const timer=setInterval(()=>{ while(next<ctx.currentTime+0.25){ const t=next+(step%2?sixteenth*swingAmt:0);
      if(step%4===0)kick(t,0.68); if(step%8===4)snare(t,0.38); if(step%2===0)hat(t,0.13,true);
      if(step%2===0){ const deg=scale[(step/2)%scale.length|0]; const midi=baseMidi+deg+(Math.random()<0.5?0:12); blip(t, midiToFreq(midi), {wave:"sine", dur:sixteenth*1.4, gain:0.15}); }
      step=(step+1)%steps; next+=sixteenth; }},50); return {timer,stops:[]}; }
  function startARCADE(cfg){ const {baseMidi, scale, steps, sixteenth, swingAmt}=cfg; let step=0,next=ctx.currentTime+0.03;
    const timer=setInterval(()=>{ while(next<ctx.currentTime+0.25){ const t=next+(step%2?sixteenth*swingAmt:0);
      if(step%4===0)kick(t,0.72); if(step%8===4)snare(t,0.44); hat(t,0.14,true);
      if(step%2===0){ const deg=scale[(step/2)%scale.length|0]; const midi=baseMidi+deg+(Math.random()>0.6?12:0); blip(t, midiToFreq(midi), {wave:"square", dur:sixteenth*1.0, gain:0.16}); }
      step=(step+1)%steps; next+=sixteenth; }},50); return {timer,stops:[]}; }
  function startPAD(cfg){ const {baseMidi, scale, spb}=cfg; const spawn=(t)=>{ const mids=[0,2,4].map(d=>midiToFreq(baseMidi+scale[d]+12)); chord(t,mids,{wave:"sine",gain:0.14,dur:0.6}); };
    let next=ctx.currentTime+0.05; const timer=setInterval(()=>{ while(next<ctx.currentTime+0.5){ spawn(next); next+=spb*2; } },200); return {timer,stops:[]}; }
  function startDRONE(cfg){ const {baseMidi, scale, spb}=cfg; const baseF=midiToFreq(baseMidi-12);
    const g=env(ctx.currentTime,0.6,1.0,0.85,1.2,0.19); const o1=osc("sine",baseF*0.999), o2=osc("triangle",baseF*1.002);
    o1.connect(g); o2.connect(g); g.connect(bus); o1.start(); o2.start();
    const timer=setInterval(()=>{ const deg=scale[Math.floor(Math.random()*scale.length)]; blip(ctx.currentTime+0.02, midiToFreq(baseMidi+deg), {wave:"sine", dur:spb*1.6, gain:0.12}); }, spb*1000);
    return {timer,stops:[()=>{try{o1.stop();o2.stop();}catch{}}]}; }

  // --- Global playback state ---
  let current={tile:null, timer:null, stops:[]};

  // --- Stop playback and reset processing chain ---
  async function stopAudio(){
    if(current.timer) try{clearInterval(current.timer);}catch{};
    current.stops.forEach(fn=>{try{fn()}catch{}});
    if (current.tile) setTilePlaying(current.tile, false);
    current={tile:null,timer:null,stops:[]};
    resetAllTilesUI();
    await hardKillAll();
    await waitForSilence(0.012,160);
    rebuildDelay();
  }

  // --- Restore output levels after starting a tile ---
  function restoreLevels(dust=0.03){
    if(!ctx) return;
    const now=ctx.currentTime;
    if(master && !muted){ master.gain.cancelScheduledValues(now); master.gain.setValueAtTime(0.0, now); master.gain.linearRampToValueAtTime(0.96, now+0.08); }
    if(padBus){ padBus.gain.cancelScheduledValues(now); padBus.gain.linearRampToValueAtTime(clamp(dust,0,0.2)*1.4, now+0.08); }
  }

  // --- Start playback for a specific tile and post settings ---
  async function startTile(tile, post){
    await ensureCtx(); await ctx.resume();
    await stopAudio();

    const crush = post.crush ?? 0.22;
    preLP.frequency.setValueAtTime(16000 - crush*3000, ctx.currentTime);

    const baseMidi = noteToMidi(post.base || "A3");
    const scale = MODES[post.mode || "dorian"] || MODES.dorian;
    const bpm = clamp(post.bpm ?? 84, 40, 140);
    const spb = 60/bpm, sixteenth = spb/4, swingAmt = clamp(post.swing ?? 0.14, 0, 0.3);
    const steps = clamp(post.steps ?? 16, 8, 32);
    const octaves = clamp(post.octaves ?? 2, 1, 3);
    const wave = post.waveform || "triangle";

    const cfg = { baseMidi, scale, spb, steps, sixteenth, swingAmt, octaves, wave };
    const kit = (post.kit||"").toLowerCase().trim();
    let run=null;

    if(!kit){
      let step=0, next=ctx.currentTime+0.03;
      const timer=setInterval(()=>{ while(next<ctx.currentTime+0.25){ const t=next; const deg=scale[step%scale.length]; blip(t, midiToFreq(baseMidi+deg), {wave, dur:spb/2, gain:0.16}); step=(step+1)%steps; next+=spb/4; }},50);
      run={timer,stops:[]};
    } else if(kit==="ko") run=startKO(cfg);
    else if(kit==="jazz") run=startJAZZ(cfg);
    else if(kit==="lofi") run=startLOFI(cfg);
    else if(kit==="arcade") run=startARCADE(cfg);
    else if(kit==="pad") run=startPAD(cfg);
    else if(kit==="drone") run=startDRONE(cfg);

    const dust = clamp(post.dust ?? 0.02, 0, 0.2);
    const drive = clamp(post.drive ?? 0.5, 0, 1.2);
    const stopPad   = startAmbientPad({hex:post.hex, base:post.base || "A3", level: dust*1.4});
    const stopWeird = startKOWeird({bpm, swing: swingAmt, drive, base: post.base || "A3", mode: post.mode || "dorian"});

    run.stops = (run.stops||[]).concat([stopPad, stopWeird]);
    current = { tile, timer: run.timer||null, stops: run.stops||[] };
    setTilePlaying(tile, true);
    restoreLevels(dust);
  }

  // --- Date helper for fallback formatting ---
  function todayISO(){ const t=new Date(), y=t.getFullYear(), m=String(t.getMonth()+1).padStart(2,"0"), d=String(t.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; }

  // --- Tile factory for a post object ---
  const grid=$("#grid");
  function makeTile(post, idx){
    const tile=document.createElement("article"); tile.className="tile"; tile.dataset.idx=String(idx); tile.dataset.hex=post.hex; tile.dataset.date=post.date;
    const sw=document.createElement("div"); sw.className="swatch"; sw.style.background=post.hex;
    const play=document.createElement("div"); play.className="play"; play.innerHTML=PLAY_SVG; sw.appendChild(play);
    const meta=document.createElement("div"); meta.className="meta";
    const dEl=document.createElement("div"); dEl.className="date"; dEl.textContent=post.date;
    const hEl=document.createElement("div"); hEl.className="hex"; hEl.textContent=post.hex.toUpperCase();
    meta.append(dEl,hEl);

    sw.addEventListener("click", async ()=>{
      if (playBusy) return;
      playBusy = true;
      try {
        ensureCtx(); await ctx.resume();

        if(current.tile===tile){
          await stopAudio();
          resetAllTilesUI();
          return;
        }
        if(current.tile) setTilePlaying(current.tile,false);
        await stopAudio();
        resetAllTilesUI();

        await startTile(tile, post);
        setTilePlaying(tile,true);
        current.tile = tile;
      } finally {
        playBusy = false;
      }
    });

    tile.append(sw, meta); return tile;
  }

  // --- Load JSON, render tiles, and poll for updates ---
  fetch("data.json?v="+Date.now(), {cache:"no-store"})
    .then(r=>r.json())
    .then(data=>{
      const posts=(data.posts||[])
        .map(p=>({ date:p.date||todayISO(), hex:p.hex, base:p.base, mode:p.mode, bpm:p.bpm, steps:p.steps, octaves:p.octaves, waveform:p.waveform, swing:p.swing, drive:p.drive, crush:p.crush, dust:p.dust, kit:p.kit }))
        .filter(p=>/^#[0-9a-fA-F]{6}$/.test(p.hex))
        .sort((a,b)=> (a.date<b.date)?1:-1);
      posts.forEach((p,i)=> grid.appendChild(makeTile(p,i)));
    })
    .catch(()=>{});

  (function(){
    const POLL=60; let tag=null;
    async function headTag(){ try{ const r=await fetch("data.json",{method:"HEAD",cache:"no-store"}); return r.headers.get("etag") || r.headers.get("last-modified") || String(Math.random()); }catch{return null;} }
    async function load(){ const r=await fetch("data.json?v="+Date.now(),{cache:"no-store"}); const d=await r.json(); return (d.posts||[]).filter(p=>/^#[0-9a-fA-F]{6}$/.test(p.hex)).map(p=>({ date:p.date||todayISO(), hex:p.hex, base:p.base, mode:p.mode, bpm:p.bpm, steps:p.steps, octaves:p.octaves, waveform:p.waveform, swing:p.swing, drive:p.drive, crush:p.crush, dust:p.dust, kit:p.kit })).sort((a,b)=> (a.date<b.date)?1:-1); }
    async function rerender(posts){ try{ await stopAudio(); }catch{} while(grid.firstChild) grid.removeChild(grid.firstChild); posts.forEach((p,i)=> grid.appendChild(makeTile(p,i))); }
    async function poll(){ const t=await headTag(); if(!t) return; if(tag===null){ tag=t; return;} if(t!==tag){ try{ const posts=await load(); await rerender(posts); tag=t; }catch{} } }
    setInterval(poll, POLL*1000); setTimeout(poll, 5000);
  })();

  // --- Expose mute setter for external toggles if needed ---
  window.huewaveSetMuted = setMuted;
})();