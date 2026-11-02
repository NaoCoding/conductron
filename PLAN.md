# Conductron Development Plan

## Vision and primary use cases

Conductron is a browser-based virtual robot conductor driven by the intended performance encoded in MusicXML. A musician loads a score, follows a steady score-derived conductor, and keeps the notation cursor in view. Later versions can compare microphone input with the score and offer practice feedback. The conductor must never follow a musician's tempo automatically in this MVP.

## Requirements

### Functional

- Load `.musicxml` and `.xml` files, with a bundled score available immediately.
- Parse meter, tempo, measures, and note timing into a reusable musical timeline.
- Render the score, show playback position, and keep it synchronized with conducting.
- Animate a recognizable 3D robot using meter-specific beat gestures.
- Play, pause, resume, and reset deterministically from a score-derived clock.
- Display current measure, beat, tempo, and meter; report unsupported/missing metadata gracefully.
- Remain fully client-side and build as a static site.

### Non-functional

- Vue 3 and TypeScript with strict checking; modular separation of parsing, timing, rendering, and animation.
- Clean up browser resources and tolerate malformed input without taking down the app.
- No backend, paid services, model downloads, or unnecessary runtime dependencies.
- Usable on desktop and narrow screens; document browser support and limitations.

## Stack and rationale

The repository was inspected before choosing a stack and is currently empty (no existing app conventions or dependencies). Use Vue 3 + TypeScript + Vite for a small static frontend, OpenSheetMusicDisplay for MusicXML notation rendering, Three.js for the programmatic robot, and Vitest for isolated musical-logic tests. Use the Web Audio API clock as the authoritative playback clock; `requestAnimationFrame` only paints the current state. Avoid compression support for `.mxl` in the first milestone unless it is low effort after the complete path works.

## High-level architecture

- `src/music`: MusicXML normalization, timeline types, timeline generation.
- `src/conductor`: beat pattern definitions and score-clock playback engine.
- `src/components`: Vue-facing upload, score viewer, controls, and robot renderer.
- `src/audio`: reserved for future live analysis; no fake analysis in MVP.
- `public/examples`: original bundled demo MusicXML.
- `App.vue`: coordinates shared playback position and presents the focused practice screen.

The parser produces one timeline consumed by both the engine and score cursor. Vue state is an observer of the engine, not its time source. Three.js owns its scene and animation lifecycle inside its component.

## MusicXML parsing strategy

Parse the XML with the browser's `DOMParser`; reject parser errors and missing score structure. Read the first part's measure stream and account for divisions, beats, beat-type, and metronome markings. Carry forward the active meter and tempo through later measures. Convert note durations from divisions into quarter-note units; derive beat count from the meter denominator so compound or non-quarter meters retain meaningful durations. Initially support common single-part scores without repeats or alternate endings. Supply clearly surfaced defaults (4/4, 100 BPM) only when the score omits a value; mark the source as a default in the UI. Grace notes and complex polymeter are out of scope.

## Musical timeline and synchronization

Represent musical positions in quarter-note units and seconds, with measure/beat indices, beat unit, meter, BPM, and note onset data. Tempo changes divide the timeline into tempo segments. The playback engine schedules/anchors time using `AudioContext.currentTime`; pause stores elapsed musical time and resume re-anchors without drift. Reset returns to time zero. A position query maps elapsed seconds back to a measure and fractional beat; both the cursor and conductor read that same position. Rendering cadence cannot change musical time.

## Virtual conductor animation

Keep patterns independent of Three.js. Define normalized beat poses for 2/4 (down/up), 3/4 (down/out/up), and 4/4 (down/in/out/up). The first beat is a clear low/down gesture. Interpolate poses smoothly using fractional beat progress and display the beat index. The robot is built from basic geometry with articulated shoulders/elbows and optional baton; no external assets.

## Score rendering and cursor synchronization

OpenSheetMusicDisplay renders the original XML. Associate generated measure positions with OSMD graphical measures and move a visible cursor/highlight from the shared playback position. Scroll the current system into view as needed. Clear and reinitialize OSMD on replacement uploads, and restore the cursor to the beginning on reset. If a particular cursor API proves unreliable, preserve the full notation display and show a synchronized measure/beat indicator while documenting cursor limitations.

## Future audio analysis architecture

Reserve a separate browser-only analyzer interface that can accept microphone audio and compare extracted events/features against expected score events. A future implementation may use AudioWorklet, lightweight onset/pitch extraction, and online alignment. Keep this independent from the conductor clock. No microphone processing, simulated metrics, or adaptive tempo is part of Milestone 1.

## MVP scope and acceptance criteria

Milestone 1 includes upload, parser, timeline, notation rendering, demo score, robot, common conducting patterns, shared playback position, play/pause/resume/reset, tests, static production build, and documentation. Acceptance is tracked in the checklist below. Any checkbox left incomplete must have a reason.

## Milestones and priorities

1. **Functional Virtual Conductor MVP:** upload and parse MusicXML; generate timeline; render score and cursor; robot patterns; synchronized playback controls; demo score; unit tests; docs. This is the active milestone.
2. **Improved Musical Interpretation:** tempo changes, dynamics, articulations, cresc./dim., fermatas, compound meters, repeats/endings, richer gestures.
3. **Real-Time Performance Analysis:** microphone access, audio processing, score alignment, tempo deviation, early/late note and reliable pitch feedback.
4. **Advanced Features:** reports, optional adaptive practice mode, expressive robot customization, broader instruments, polyphonic analysis.

## Risks and limitations

- MusicXML is broad; a small, explicit subset is needed for predictable first release behavior.
- Notation renderer cursor APIs and score layout vary by score; mapping must be resilient to line/system changes.
- Browser audio context may require a user gesture and can be suspended by the OS; controls must recover gracefully.
- WebGL may be unavailable on some devices; provide a clear fallback state.
- The initial production JavaScript is about 474 KB gzipped with OSMD and Three.js together; code splitting can reduce initial transfer cost.
- Tempo marks can use varying beat units; convert to quarter-note tempo for the shared clock while preserving the displayed mark.
- MXL archives, repeats, pickup measures, polymeter, and complex notation are deferred unless specifically implemented and tested.

## Future improvements

Support compressed MXL, repeats and alternate endings, richer tempo/dynamic interpretation, improved cursor mapping for multiple parts, accessibility and keyboard control, configurable conductor style, offline PWA packaging, and opt-in browser-only practice analysis.

## Progress checklist

### Milestone 1

- [x] Inspect repository conventions and preserve existing work (the repository was empty).
- [x] Create this plan before implementation.
- [x] Build upload and bundled demo score flow.
- [x] Parse metadata and generate a normalized musical timeline.
- [x] Render score and synchronize playback cursor with the shared position; verified on the demo score.
- [x] Render robot and meter-aware 2/4, 3/4, and 4/4 conducting gestures.
- [x] Implement AudioContext-clock playback and play, pause, resume, and reset controls.
- [x] Add unit tests for parser, timeline, patterns, state transitions, and tempo timing.
- [x] Run tests, type checking, linting, and static production build.
- [x] Document actual features and limitations in README.
- [x] Verify the MVP flow in a browser, including bundled score rendering, conducting, and reset.

### Milestone 1 acceptance

- [x] Application starts with the documented Vite development command.
- [x] Users can select `.xml` and `.musicxml` files through the upload control.
- [x] MusicXML is displayed by OpenSheetMusicDisplay.
- [x] Meter and tempo are extracted; missing values have explicit defaults.
- [x] Programmatic virtual robot is visible and conducts by meter.
- [x] Conducting speed follows score timing.
- [x] Play, pause, resume, and reset work.
- [x] Score cursor and robot use the shared score timeline; demo flow was visually checked.
- [x] Bundled example loads without a manual upload.
- [x] Vite produces a static production build.
- [x] No backend service is required.
- [x] Tests, type checking, and linting pass.
- [x] README and this plan describe the current implementation and limitations.

### Milestones 2–4

- [ ] Improved musical interpretation.
- [ ] Browser-only real-time performance analysis.
- [ ] Advanced practice features and customization.
