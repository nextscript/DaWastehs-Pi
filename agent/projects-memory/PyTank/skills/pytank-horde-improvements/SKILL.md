---
name: "pytank-horde-improvements"
description: "Fixes for PyTank horde mode: enemy AI, spawn types, map UI navigation"
version: 12
created: "2026-05-31"
updated: "2026-06-28"
---
## When to Use
When working on PyTank game improvements, especially horde mode, enemy AI, or menu navigation.

## Procedure
## Procedure
1. Enemy AI uses EnemyAI class with state machine (PATROL/CHASE/ATTACK/RETREAT)
2. Current mode architecture: GameMode has FFA, HORDE, MISSIONS; Co-op is `GameManager.coop_enabled`, not a GameMode.
3. FFA uses `Config.FFA_TOTAL_TANKS`; solo is one player plus AI solo teams, Co-op is two player tanks plus paired AI teams.
4. FFA round length is mode-specific via `Config.FFA_TIME_LIMIT` and `GameManager._time_limit_for_mode()`; do not shorten it by changing the shared `Config.TIME_LIMIT`.
5. Horde/Mission defense target uses the `Eagle` class with health (`Config.EAGLE_MAX_HEALTH`), short hit invulnerability, and wave repair (`Config.EAGLE_WAVE_REPAIR`) instead of one-shot destruction.
6. Difficulty is `Difficulty.EASY/MEDIUM/HARD/MIXED`; mixed uses per-enemy variants (FFA builds a shuffled pool so all three appear, Horde resolves randomly per spawn).
7. Horde spawning is telegraphed: `WaveManager.spawn_enemy()` no longer creates the Enemy immediately. It picks a fair position via `_pick_spawn_position()` (fixed top spawn pillars at WIDTH*{0.18,0.5,0.82}, y=GRID_SIZE*2; falls back to top-half random then full-grid scan) and pushes a `pending_spawns` dict {x,y,timer,max_timer,enemy_type,difficulty}. `WaveManager.update()` ticks each pending spawn's `timer` and only then appends the real `Enemy` (decrementing `enemies_to_spawn`). Markers are drawn by `GameManager._draw_spawn_markers(pending)`.
8. Difficulty scales Horde cadence: `_spawn_interval_frames` (Easy x1.4, Hard x0.75), `_telegraph_frames` (Easy x1.4), `_max_concurrent` live+pending cap (Easy 4 / Medium 6 / Hard 9). Easy also reduces each enemy's HP by 1 in `Enemy._apply_ai_difficulty` (Scout stays 1, Gunner 2->1, Brute 4->3).
9. Mission mode uses `Config.MISSION_ORDER`, `Config.MISSION_DATA`, and MapGenerator mission maps (`mission_1..3`) with comic text panels.
10. Map select uses mode-specific `_selectable_map_keys()`, K_UP/K_DOWN for navigation, ESC to back, mouse hover to select, and number keys should cover the full `Config.MAP_ORDER` length.
11. Arena maps now live in `Config.MAP_ORDER` with eight curated entries: classic, industrial, desert, arena, crossfire, islands, depot, citadel.
12. When adding or changing maps, update `Config.MAPS`, `Config.MAP_ORDER`, `MapGenerator.generate()`, `_map_trait_chips()`, `BackgroundRenderer.THEMES`, and keyboard number-key handling together.
13. All code in single pytank.py file, requires .venv with Python 3.12 (pygame incompatible with 3.14)
14. Run with: `.venv\Scripts\python.exe pytank.py`
15. In level select, `D` is documented = difficulty toggle; horizontal map nav is Right-arrow only (K_a still moves left). Do NOT rebind `K_d` to map navigation or it collides with the difficulty handler.
16. Player tanks draw a faint aim reticle in `last_direction` (Player.draw_tank) and the HUD shows a pulsing red vignette (`_draw_low_hp_warning`) when any player has health<=2.
## Pitfalls
## Pitfalls
- Python 3.14 not compatible with pygame - always use .venv with Python 3.12
- Do not reintroduce Co-op as `GameMode.COOP`; it must stay an add-on flag usable by FFA, Horde, and Missions.
- Enemy rotation_angle must be updated for cannon visual alignment
- WaveManager update checks wave_complete every frame, not just on spawn timer. Wave completion needs `enemies_to_spawn==0 AND pending_spawns empty AND no live enemies` (otherwise telegraphed spawns block the wave from finishing).
- Map button positions in `_handle_menu_mouse_click` must match `_draw_level_select` / `_level_select_layout` calculations
- Enemy shoot_cooldown and AI._attack both tried to shoot - AI now handles ATTACK shooting
- For FFA, bullets need `team_id`/`source` so AI teams can fight enemies without friendly-fire/self-hit bugs.
- Powerup spawn validation must use the inflated powerup hitbox, not only the top-left point; otherwise powerups can overlap walls on curated maps.
- Pygame `Rect.collidepoint` excludes right/bottom edges; slider edge clicks need inclusive bounds if max/min endpoints should work.
- In LEVEL_SELECT, `K_d` is caught by the difficulty handler (`elif event.key == pygame.K_d and mode != MISSIONS`) BEFORE the map-nav elif, so binding `K_d` to "move selection right" is dead code. Keep Right-arrow for horizontal nav.
- ruff RET501: if a method no longer returns a value, give it `-> None` and use bare `return` (explicit `return None` is flagged).
- flake8 E402 is enforced project-wide (existing tests wrap imports in try-block). `.flake8` now also ignores E402 so tests doing `sys.path` setup can import pytank cleanly without a try-wrapper. ruff does not enable E402, so a bare `# noqa: E402` would trip ruff RUF100 (unused noqa) — prefer the .flake8 ignore over noqa.
## Verification
## Verification
- Run `.venv\Scripts\python.exe -m py_compile pytank.py`
- Run `.venv\Scripts\python.exe -m ruff check pytank.py tests`
- Run `.venv\Scripts\python.exe -m mypy pytank.py tests`
- Run `.venv\Scripts\python.exe -m flake8 pytank.py tests/ --count --select=E9,F63,F7,F82 --show-source --statistics` and `.venv\Scripts\python.exe -m flake8 pytank.py tests/ --count --statistics --max-line-length=120`
- Run `SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy .venv\Scripts\python.exe tests/test_start.py`
- Run `SDL_VIDEODRIVER=dummy SDL_AUDIODRIVER=dummy .venv\Scripts\python.exe tests/test_maps.py` (generates every MAP_ORDER+MISSION_ORDER map x3 seeds, checks spawn/eagle cells unblocked + >=95% open-cell connectivity, and asserts Horde telegraph spawning + wave progression work).
- For map changes, generate every `Config.MAP_ORDER` and `Config.MISSION_ORDER` map headlessly and verify spawn/eagle cells are unblocked and all open cells are connected.
- Test horde mode: verify SCOUT (orange), GUNNER (red), BRUTE (brown) all spawn across waves and difficulty affects behavior; confirm a red pulsing spawn-marker telegraph appears at a top pillar before each enemy.
- Test FFA solo: one player + 7 AI, all solo teams fight each other; no Eagle/base objective.
- Test FFA Co-op: two players + 6 AI, AI teams are paired and total tank count stays 8.
- Test missions: mission_1..3 load their own maps, show comic briefing, and progress with the next-mission overlay.
- Test map select: UP/DOWN arrows cycle maps, ESC returns to menu, mouse hover selects, number keys select every arena map; D cycles difficulty (NOT map-right).
- Verify enemies don't disappear when new ones spawn
- Check enemy cannon rotates to face target during attack