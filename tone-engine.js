// tone-engine.js
(() => {
    const T = window.Tone;
  
    // --- Utilities (match your legacy helpers) ---
    const NOTE_INDEX = {C:0,"C#":1,Db:1,D:2,"D#":3,Eb:3,E:4,F:5,"F#":6,Gb:6,G:7,"G#":8,Ab:8,A:9,"A#":10,Bb:10,B:11};
    const A4 = 440, A4_MIDI = 69;
    const midiToFreq = (m) => A4*Math.pow(2,(m-A4_MIDI)/12);
    function noteToMidi(n="A3"){
      const m=/^([A-G](?:#|b)?)\s*(-?\d+)$/.exec(String(n).trim()); if(!m) return 57;
      const[,nm,o]=m; return (parseInt(o,10)+1)*12+(NOTE_INDEX[nm]??9);
    }
    function midiNoteName(m){
      const pcs=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
      const pc = pcs[(m%12+12)%12]; const oct = Math.floor(m/12)-1; return pc+oct;
    }
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const MODES = {
      ionian:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10], phrygian:[0,1,3,5,7,8,10],
      lydian:[0,2,4,6,7,9,11], mixolydian:[0,2,4,5,7,9,10], aeolian:[0,2,3,5,7,8,10],
      locrian:[0,1,3,5,6,8,10], pent_major:[0,2,4,7,9], pent_minor:[0,3,5,7,10],
      harm_minor:[0,2,3,5,7,8,11], mel_minor:[0,2,3,5,7,9,11],
      whole_tone:[0,2,4,6,8,10], octatonic:[0,2,3,5,6,8,9,11], blues_minor:[0,3,5,6,7,10],
      harm_major:[0,2,4,5,7,8,11], neap_minor:[0,1,3,5,7,8,11], neap_major:[0,1,4,5,7,9,11],
      hungarian_minor:[0,2,3,6,7,8,11], double_harm:[0,1,4,5,7,8,11],
      arabic_hijaz:[0,1,4,5,7,8,11], in_sen:[0,1,5,7,10], yo:[0,2,5,7,9],
      whole_half_dim:[0,2,3,5,6,8,9,11], half_whole_dim:[0,1,3,4,6,7,9,10]
    };
  
    // --- Engine state ---
    let started = false;
    let transportStarted = false;
    let disposables = [];     // synths/effects to dispose/stop
    let parts = [];           // scheduled Parts/Sequences
    let playingTile = null;
  
    function addD(x){ if(!x) return x; disposables.push(x); return x; }
    function addP(p){ if(!p) return p; parts.push(p); return p; }
    function clearAll(){
      parts.forEach(p=>{ try{p.stop(); p.dispose();}catch{} });
      parts = [];
      disposables.forEach(d=>{ try{d.dispose?d.dispose():d.stop&&d.stop();}catch{} });
      disposables = [];
    }
  
    async function ensureToneStarted(){
      if (!started){
        await T.start();
        started = true;
      }
      if (!transportStarted){
        T.Transport.bpm.value = 100;
        T.Transport.start("+0.02");
        transportStarted = true;
      }
    }
  
    // --- FX chain builder from post knobs ---
    function buildFX(post){
      const chain = [];
      const crushBits = post.crushBits ?? 0; // 0 disables
      const drive     = clamp(post.drive ?? 0, 0, 1.2);
      const reverbAmt = clamp(post.reverb ?? 0, 0, 1);
      const delayAmt  = clamp(post.delay  ?? 0, 0, 1);
      const chorusAmt = clamp(post.chorus ?? 0, 0, 1);
      const phaserAmt = clamp(post.phaser ?? 0, 0, 1);
      const pitchShft = (post.pitchShift ?? 0) | 0;
  
      if (chorusAmt>0) chain.push(addD(new T.Chorus(4, 2.5, chorusAmt).start()));
      if (phaserAmt>0) chain.push(addD(new T.Phaser({frequency:0.5, octaves:3, baseFrequency:350, Q:8, wet:phaserAmt})));
      if (drive>0)     chain.push(addD(new T.Distortion({distortion: clamp(drive*0.6, 0, 1), wet: clamp(drive*0.7, 0, 1)})));
      if (crushBits>=2)chain.push(addD(new T.BitCrusher({bits: clamp(crushBits, 2, 8), wet: 0.5})));
      if (pitchShft)   chain.push(addD(new T.PitchShift({pitch: pitchShft})));
      if (delayAmt>0)  chain.push(addD(new T.PingPongDelay({time:"8n", feedback:0.25, wet:delayAmt})));
      if (reverbAmt>0) chain.push(addD(new T.JCReverb({roomSize: clamp(0.4+reverbAmt*0.5, 0, 1), wet: reverbAmt})));
  
      return chain;
    }
  
    // --- Drum kit builders (Tone has drum-ish synths) ---
    function makeKick(out){
      const k = addD(new T.MembraneSynth({ pitchDecay:0.03, octaves:6, oscillator:{type:"sine"}, envelope:{attack:0.001, decay:0.2, sustain:0.0, release:0.2}}));
      k.connect(out); return k;
    }
    function makeSnare(out){
      const n = addD(new T.NoiseSynth({ noise:{type:"white"}, envelope:{attack:0.001, decay:0.15, sustain:0} }));
      const bp= addD(new T.Filter(1800,"bandpass")); const hp= addD(new T.Filter(1500,"highpass"));
      n.connect(bp); bp.connect(hp); hp.connect(out); return n;
    }
    function makeHat(out, metal=false){
      if (metal){
        const m = addD(new T.MetalSynth({ frequency:400, envelope:{attack:0.001, decay:0.15, release:0.02}, harmonicity:5.1, modulationIndex:32, resonance:4000, octaves:1.5 }));
        m.connect(out); return m;
      }
      const h = addD(new T.NoiseSynth({ noise:{type:"white"}, envelope:{attack:0.001, decay:0.05, sustain:0}}));
      const hp = addD(new T.Filter(7000,"highpass"));
      h.connect(hp).connect(out); return h;
    }
    function makeClap(out){
      const c = addD(new T.NoiseSynth({ noise:{type:"white"}, envelope:{attack:0.002, decay:0.12, sustain:0} }));
      const bp= addD(new T.Filter(2200,"bandpass")); const hp= addD(new T.Filter(1800,"highpass"));
      c.connect(bp); bp.connect(hp); hp.connect(out); return c;
    }
  
    // --- Music voices ---
    function makeLead(post, out){
      const type = (post.leadType||"AMSynth").toLowerCase();
      const wave = post.leadWave || post.waveform || "triangle";
      let s;
      switch(type){
        case "fmsynth":  s = addD(new T.FMSynth({ oscillator:{type:wave} })); break;
        case "duosynth": s = addD(new T.DuoSynth({oscillator:{type:wave}})); break;
        case "monosynth":s = addD(new T.MonoSynth({ oscillator:{type:wave}, filter:{Q:8, type:"lowpass"}, envelope:{attack:0.01, decay:0.2, sustain:0.4, release:0.25} })); break;
        case "polysynth":s = addD(new T.PolySynth(T.Synth, { oscillator:{type:wave} })); break;
        default:         s = addD(new T.AMSynth({ oscillator:{type:wave} }));
      }
      s.connect(out); return s;
    }
    function makeBass(post, out){
      const wave = post.bassWave || "square";
      const port = clamp(post.portamento ?? 0.02, 0, 0.2);
      const b = addD(new T.MonoSynth({
        oscillator:{type:wave},
        filter:{type:"lowpass", rolloff:-24, Q:8},
        filterEnvelope:{attack:0.005, decay:0.12, sustain:0.2, release:0.2, baseFrequency:80, octaves:3.5},
        envelope:{attack:0.005, decay:0.12, sustain:0.3, release:0.25},
        portamento: port
      }));
      b.connect(out); return b;
    }
    function makePad(out){
      const p = addD(new T.PolySynth(T.Synth,{oscillator:{type:"fatsawtooth"}, envelope:{attack:0.4, decay:0.2, sustain:0.6, release:1.5}}));
      p.connect(out); return p;
    }
  
    // --- Sequencing helpers ---
    function seq(fn, steps=16, subdivision="16n"){
      const part = addP(new T.Sequence((time, step)=>fn(time, step), Array.from({length:steps}, (_,i)=>i), subdivision));
      part.start(0);
      return part;
    }
  
    // --- Engine runner per post (Tone kits) ---
    function startTone(post){
      // base params
      const baseMidi = noteToMidi(post.base || "A3");
      const scale = MODES[post.mode||"dorian"] || MODES.dorian;
      const bpm = clamp(post.bpm ?? 120, 40, 220);
      const steps = clamp(post.steps ?? 16, 4, 64);
      const swing = clamp(post.swing ?? 0.0, 0, 0.3);
      T.Transport.bpm.value = bpm;
      T.Transport.swing = swing;
      T.Transport.swingSubdivision = "8n";
  
      // mix & FX
      const mix = addD(new T.Gain(0.9));
      const fxChain = buildFX(post);
      const lpf = addD(new T.Filter(16000 - (post.crush ?? 0.22)*3000, "lowpass"));
      const comp = addD(new T.Compressor({threshold:-18, ratio:3}));
      const out = T.Destination;
      // connect chain
      if (fxChain.length) mix.chain(...fxChain, lpf, comp, out);
      else mix.chain(lpf, comp, out);
  
      // drum bus
      const drumBus = addD(new T.Gain(0.95)); drumBus.connect(mix);
      const kick = makeKick(drumBus);
      const snr  = makeSnare(drumBus);
      const hat  = makeHat(drumBus, false);
      const clap = makeClap(drumBus);
  
      // tonal buses
      const musicBus = addD(new T.Gain(0.9)); musicBus.connect(mix);
      const lead = makeLead(post, musicBus);
      const bass = makeBass(post, musicBus);
      const pad  = makePad(musicBus);
  
      const hatRolls = post.hatRolls ?? false;
      const prob = clamp(post.prob ?? 0.25, 0, 1);
  
      const kit = (post.kit||"").toLowerCase();
  
      // common melodic helper
      const degAt = (i, div=2)=> scale[(Math.floor(i/div)) % scale.length];
  
      if (kit === "tone_trap" || kit === "trap"){
        seq((time,i)=>{ if(i%4===0) kick.triggerAttackRelease("C1","8n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%8===4) clap.triggerAttackRelease("8n",time); }, 16, "16n");
        seq((time,i)=>{
          if (hatRolls && Math.random()<0.4) {
            for(let r=0;r<4;r++) hat.triggerAttackRelease("32n", time + T.Time("32n")*r);
          } else if (i%2===0) {
            hat.triggerAttackRelease("32n", time);
          }
        }, 16, "16n");
        seq((time,i)=>{
          const deg = degAt(i,2);
          bass.triggerAttackRelease(midiNoteName(baseMidi + deg - 12), "8n", time);
          if (Math.random() < prob*0.3){
            const d2 = scale[(deg+2)%scale.length];
            lead.triggerAttackRelease(midiNoteName(baseMidi + d2 + 12), "16n", time+T.Time("16n")*0.5);
          }
        }, 16, "16n");
      }
      else if (kit === "tone_909" || kit === "techno" || kit === "tone_techno"){
        seq((time,i)=>{ if(i%4===0) kick.triggerAttackRelease("C1","8n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%2===0) hat.triggerAttackRelease("16n",time); }, 16, "16n"); // off-beat-ish feel
        seq((time,i)=>{ if(i%8===4 && Math.random()<0.6) clap.triggerAttackRelease("16n",time); }, 16, "16n");
        seq((time,i)=>{
          const deg = degAt(i,1);
          // TB-ish mono lead pattern
          lead.triggerAttackRelease(midiNoteName(baseMidi + deg + (Math.random()<0.3?12:0)), "16n", time);
        }, 16, "16n");
      }
      else if (kit === "tone_dnb" || kit === "dnb"){
        T.Transport.swing = 0.0;
        seq((time,i)=>{ if(i%8===0) kick.triggerAttackRelease("C1","16n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%16===4 || i%16===12) snr.triggerAttackRelease("16n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%2===0) hat.triggerAttackRelease("32n",time); }, 16, "16n");
        seq((time,i)=>{
          const deg = degAt(i,2);
          const mm = baseMidi + deg - 12;
          bass.triggerAttackRelease(midiNoteName(mm), "8n", time);
          if (Math.random()<prob*0.4) lead.triggerAttackRelease(midiNoteName(mm+24), "32n", time+T.Time("32n"));
        }, 16, "16n");
      }
      else if (kit === "tone_pluck" || kit === "pluck"){
        seq((time,i)=>{ if(i%4===0) kick.triggerAttackRelease("C1","8n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%8===4) snr.triggerAttackRelease("16n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%2===0) hat.triggerAttackRelease("32n",time); }, 16, "16n");
        seq((time,i)=>{
          const chord = [0,2,4].map(d => baseMidi + scale[(i+d)%scale.length] + 12);
          chord.forEach((m,idx)=> lead.triggerAttackRelease(midiNoteName(m), "16n", time + idx*0.01));
        }, 16, "8n");
      }
      else if (kit === "tone_glitch" || kit === "glitch"){
        seq((time,i)=>{ if(Math.random()<0.4) kick.triggerAttackRelease("C1","32n",time); }, 16, "32n");
        seq((time,i)=>{ if(Math.random()<0.25) clap.triggerAttackRelease("32n",time); }, 16, "32n");
        seq((time,i)=>{
          if (Math.random()<0.5) hat.triggerAttackRelease("64n",time);
          if (Math.random()<prob){ const m = baseMidi + scale[(i+Math.floor(Math.random()*scale.length))%scale.length] + (Math.random()<0.5?12:24);
            lead.triggerAttackRelease(midiNoteName(m), "32n", time + (Math.random()*0.25));
          }
        }, 16, "32n");
      }
      else if (kit === "tone_ambientpad2" || kit === "ambientpad2" || kit === "ambient"){
        // simple pulsing pad + sparse notes
        seq((time,i)=>{
          if (i%4===0){
            const chord = [0,2,4].map(d => baseMidi + scale[(i+d)%scale.length] + 12);
            chord.forEach(m => pad.triggerAttackRelease(midiNoteName(m), "2n", time));
          }
        }, 16, "8n");
        seq((time,i)=>{
          if (Math.random()<0.25){
            const m = baseMidi + scale[(i)%scale.length] + 24;
            lead.triggerAttackRelease(midiNoteName(m), "8n", time + T.Time("16n")*0.5);
          }
        }, 16, "8n");
      }
      else {
        // default Tone pattern if kit not matched
        seq((time,i)=>{ if(i%4===0) kick.triggerAttackRelease("C1","8n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%8===4) snr.triggerAttackRelease("16n",time); }, 16, "16n");
        seq((time,i)=>{ if(i%2===0) hat.triggerAttackRelease("32n",time); }, 16, "16n");
        seq((time,i)=>{
          const deg = degAt(i,2);
          lead.triggerAttackRelease(midiNoteName(baseMidi + deg + 12), "16n", time);
        }, 16, "16n");
      }
    }
  
    // --- Public API used by legacy app.js ---
    window.huewaveTone = {
      async start(tile, post){
        // ensure Tone is ready
        await ensureToneStarted();
        // stop any existing tone run
        this.stop();
  
        playingTile = tile || null;
        // map a few legacy knobs
        const tonePost = Object.assign({}, post);
        // If user used legacy-only fields, still translate:
        if (tonePost.crush && tonePost.crushBits == null) {
          tonePost.crushBits = Math.round(clamp(2 + tonePost.crush*6, 2, 8));
        }
        startTone(tonePost);
      },
      stop(){
        clearAll();
        // keep Transport running; legacy app controls UI/stop state already
      }
    };
  })();
  