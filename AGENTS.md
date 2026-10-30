# burako

Static site on GitHub Pages: `index.html` (UI + sync), `game.js` (rules, state), `bot.js` (rule-based bot).

## Deploying without breaking live games
Players keep the full game state in localStorage and peers may run different versions for a while.
- State stays `schema: 1`. Only add fields, with defaults filled in `migrate()` in `game.js`. Never rename, drop or change the meaning of a field.
- Rules changes must accept states produced by the previous version mid-hand.
- Bump the same version string in `index.html` (`VERSION` and every `?v=` import) and `version.txt`; the `?v=` query stops browsers from mixing cached old modules with new ones.
- Before pushing: run an old-format state through `migrate` + `act` in node.

## Text
UI text is English in the code; `ES` in `index.html` maps each English string to Spanish, picked by `navigator.language`. New strings go through `t()` and get an `ES` entry. Game log goes in `s.ev` (`[template, ...args]`) so each peer shows it in its own language; `s.log` keeps the English text for older clients.
