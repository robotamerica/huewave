This is a little non-language blog. It sets a mood with colour and sound, depending on how I am and 
where I am during a given day. There are build guides in the huewave-guides folder if you are 
interested in building something like this on your own.

Otherwise, here is how the sound works based on the data.json file in coordination with app.js:
 
    huewave :: data.json field guide

    File: data.json
    Structure:
    {
      "posts": [
        { 
          "hex": "#RRGGBB",    // required: tile color
          "date": "YYYY-MM-DD",// optional: defaults to today
          "base": "A3",        // optional: tonic note (A0–C8)
          "mode": "dorian",    // optional: scale/mode name
          "bpm": 84,           // optional: tempo (beats per minute)
          "waveform": "triangle", // optional: triangle, sine, square, sawtooth
          "octaves": 2,        // optional: pitch spread (1–3)
          "steps": 16,         // optional: pattern length (8–32)
          "swing": 0.16,       // optional: groove feel (0.00–0.30)
          "drive": 0.6,        // optional: saturation (0.0–1.5)
          "crush": 0.3,        // optional: lo-fi darkening (0.0–1.0)
          "dust": 0.03,        // optional: hiss level (0.0–0.12)
          "kit": "ko"          // optional: drum/sound set (see list below)
        }
      ]
    }

    Behavior when fields are missing:
      - Missing "hex"   = post ignored (must have a color)
      - Missing "date"  = uses today's date
      - Missing "kit"   = no drums/percussion loaded (ambient silence unless other sound sources exist)
      - Missing any synth param = falls back to safe default

    Kit options:
      * ko     → minimal PO-33 style beats (short percussion + mono synth)
      * jazz   → swing drums, warm chords, brushed hats
      * lofi   → detuned notes, low-pass filter, tape hiss
      * arcade → retro 8-bit squarewave + chip percussion
      * drone  → long evolving bass + airy harmonic swell (no drums)
      * pad    → warm sustained chords fading in/out (no drums)

    Modes (intervals in semitones from tonic):
      - ionian (major)     : [0, 2, 4, 5, 7, 9, 11]
      - dorian             : [0, 2, 3, 5, 7, 9, 10]
      - phrygian           : [0, 1, 3, 5, 7, 8, 10]
      - lydian             : [0, 2, 4, 6, 7, 9, 11]
      - mixolydian         : [0, 2, 4, 5, 7, 9, 10]
      - aeolian (nat minor): [0, 2, 3, 5, 7, 8, 10]
      - locrian            : [0, 1, 3, 5, 6, 8, 10]
      - pent_major         : [0, 2, 4, 7, 9]
      - pent_minor         : [0, 3, 5, 7, 10]

    Tips:
      - Warmer colors → slower bpm, more drive/dust
      - Cooler colors → faster bpm, cleaner sound
      - drone/pad kits are ideal for atmospheric mood posts
      - Click = start sound, click again = stop sound
      - All posts are mobile-tap friendly (no auto-play)
