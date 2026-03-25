# Dragon Street

A canvas-based beat-em-up fighting game built with vanilla JavaScript.

## Project Structure

- `index.html` - Entry point, canvas setup (960x540), minimal styling
- `game.js` - Entire game in a single file (~2000 lines)

## Architecture

Single-file game with no build tools or dependencies. All rendering uses HTML5 Canvas 2D API with pixel-art style character drawing.

### Game States
`title` -> `charSelect` -> `playing` -> `levelClear` / `gameOver` / `victory`

### Key Systems
- **Character Roster**: 5 playable characters (GOKU, RYU, KIRA, BRUTUS, BLAZE) defined in `CHARACTERS` array with unique stats, hair styles, and special abilities
- **Special Abilities**: Combo-triggered transformations (each character has a combo threshold). State tracked in `specialAbility` object. Duration is 30s (1800 frames at 60fps)
- **Enemy Types**: grunt, brute, ninja, ki_user, boss - created via `createEnemy()` factory
- **Particle System**: `spawnParticle()` with types: hit, energy, dust, ki, levelup, death, aura, fire_aura, shadow, rage, transform
- **5 Levels**: City Streets, Dark Alley, Rooftops, The Dojo, Final Battle (with boss)

### Controls
- Arrow keys / WASD: Move
- Z/J: Punch, X/K: Kick, C/L: Energy blast
- Space: Jump

## Development

No build step. Open `index.html` in a browser or run:
```
python3 -m http.server 8080
```

## Code Conventions
- All game state is global variables at the top of game.js
- Drawing functions prefixed with `draw`, update functions with `update`
- Colors defined in `COLORS` object and per-character in `CHARACTERS` array
- Y-sorting for depth (characters sorted by y-position before drawing)
