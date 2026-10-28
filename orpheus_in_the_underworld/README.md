# Orpheus in the Underworld — the game

A mobile-friendly story game for students learning Jacques Offenbach's opéra bouffe
*Orphée aux enfers* (Paris, 1858). Players travel the whole plot — Thebes → Mount Olympus →
the Underworld — through dialogue, comprehension questions and mini-games, hosted by a ghostly
Offenbach.

Open `index.html` (no build step, no external assets besides Google Fonts). All art is generated
SVG and all music/sound is synthesized with the Web Audio API — including the real *Galop infernal*
(the can-can), which is public domain.

## Teacher notes
- **Unlock every scene:** add `?teacher` to the URL, or turn on *Teacher mode* in the ☰ menu.
- Progress, the student's name and their roses are saved in the browser (localStorage) on that device.
- Every mini-game can be skipped from its instruction card (no roses awarded), so no student gets stuck.
- The finale ends with an 8-question review quiz and a certificate screen students can screenshot.

## Scenes
| # | Scene | Mini-game |
|---|-------|-----------|
| 0 | Overture (Offenbach & Public Opinion) | — |
| 1 | Thebes: a marriage on the rocks | The Concerto Duel |
| 2 | The shepherd next door (Aristaeus = Pluto) | Wheat-field runner · The Farewell Note |
| 3 | What will people say? | Excuse debate (choices) |
| 4 | Stairway to Olympus | Sky runner |
| 5 | The bored gods | Gods & their symbols |
| 6 | Revolt on Olympus | Rondo of the Metamorphoses (memory) |
| 7 | Orpheus arrives | Keep Up Appearances |
| 8 | The great descent | Descent runner |
| 9 | Pluto's boudoir & John Styx | — |
| 10 | The Fly Duet | Buzz-back memory |
| 11 | The infernal party | Dress the Bacchante |
| 12 | Galop infernal | Can-can rhythm game |
| 13 | Don't look back! | Walk-out (resist temptation) |
| 14 | Finale | Curtain call · Critics' quiz · Certificate |

Code: `js/story.js` (script & quiz bank), `js/engine.js` (stage, dialogue, saving), `js/games.js`
(mini-games), `js/art.js` (characters, sets, map), `js/audio.js` (music & sound).
