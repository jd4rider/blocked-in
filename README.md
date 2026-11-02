# Blocked In

A sliding-block puzzle: drag blocks along their lanes to free the red key block through the exit. Built with Phaser 4, Vite and Electron — playable in the browser and as a desktop app for macOS, Windows and Linux.

- Play in your browser: <https://jd4rider.github.io/blocked-in/play/>
- Downloads: <https://github.com/jd4rider/blocked-in/releases/latest>

## How to play

- Drag a block along its lane (horizontal blocks slide sideways, vertical blocks up and down). One drag of any length is one move.
- **Spinners** (blue, circular arrow) turn 90° when tapped, if the cell they swing into is empty.
- **Magnets** tow the block directly behind them (on the same axis) as they slide. **Stone** blocks never move.
- In later worlds the **exit gate patrols** the right wall, one step after every move. Time it, or use Wait.
- 200 levels (seeded, each checked solvable by a solver) across 5 worlds. Undo (U), hint (H), wait (W), restart (R), Esc for levels.

## Develop

```sh
npm install
npm run dev      # web dev server
npm test         # level generator and solver tests
npm start        # build and open in Electron
npm run dist:mac # package an installer (also dist:win, dist:linux)
```

## Release

Push a tag like `v0.1.0` and the **Release apps** workflow builds the macOS, Windows and Linux installers. Every push to `main` deploys the web version to GitHub Pages.
