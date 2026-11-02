# Conductron

Conductron is a client-side virtual robot conductor. It reads intended tempo and meter from a MusicXML score, keeps a steady score-led beat, and displays the notation alongside a 3D conductor. Microphone analysis is planned and is not part of the current app.

## Implemented

- Load `.musicxml` and `.xml` files in the browser, or try the bundled Little Robot Waltz.
- Parse a single part's measures, meter, metronome tempo, and note onsets/durations into a shared timeline.
- Render the uploaded score with OpenSheetMusicDisplay.
- Animate a programmatic Three.js robot with 2/4, 3/4, and 4/4 patterns.
- Play, pause, resume, and reset against an AudioContext clock; the robot and notation cursor use the score timeline.
- Static Vite production build; no backend or external service is required.

## Development

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Use **Open MusicXML** to load a `.xml` or `.musicxml` file. Playback starts only after a user gesture because browsers gate AudioContext access. The bundled demo loads automatically when served through Vite.

## Commands

```sh
npm run typecheck
npm test
npm run build
npm run lint
```

## Technology

Vue 3, TypeScript, Vite, Three.js, OpenSheetMusicDisplay, Vitest, and the browser Web Audio API.

## Limitations

- Compressed `.mxl` archives are not supported yet.
- The parser currently targets single-part partwise scores and supports basic divisions, notes/rests, meter changes, and metronome tempo changes. Repeats, endings, polymeter, pickup measure interpretation, and expressive markings are not interpreted.
- Score cursor movement follows the shared measure/beat timeline, but complex voices/chords may not map one-to-one to cursor entries.
- Meters other than 2/4, 3/4, and 4/4 use the 4-beat gesture as a fallback.
- Microphone capture, pitch analysis, and musician-vs-score feedback are future work; no analysis is simulated.
- WebGL and Web Audio API support are required for the full experience. A clear fallback is shown if WebGL setup fails.
- The current production JavaScript is about 474 KB gzipped because the score renderer and 3D engine are included; code splitting is a useful follow-up.

See [PLAN.md](./PLAN.md) for architecture, milestones, risks, and implementation progress.
