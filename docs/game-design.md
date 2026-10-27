# Capture the Planet: Game Design Document (Draft v0.3)

> Status: **planning**. v0.3 adds walk-anywhere planets with gravity toward
> each planet's centre, web slinging as the only way to fly (no thrusters), and
> a match setting for VR-only, PC-only, or mixed lobbies. Checked against the
> AltspaceVR Creator SDK docs (https://altvr.app/docs/).
>
> Markers:
> - **[DECIDE]**: still needs an answer from the designer.
> - **[SPIKE]**: the docs suggest it works, but it needs a quick prototype to
>   confirm before we build on it.

## 1. Concept

Capture the Planet is a 5v5 capture-the-flag game set in **zero gravity**.
Players meet on an orbital station, pick teams, and launch into an open
stretch of space scattered with small planets. Each team has a home planet
with its flag. Players fly through the void, land on planets for cover,
steal the enemy flag, and bring it home. They fight with laser guns: three hits
sends a player to the brig (penalty box) for 30 seconds. A player holding
the flag can't shoot.

**Design pillars**
1. **Movement is the skill.** Web slinging from planet to planet, judging
   drift, and landing anywhere on a planet should feel great before a single
   shot is fired.
2. **Readable at a glance.** You can always tell team, health, and flag status
   without a menu, even while upside down in space.
3. **Carrying the flag is a choice.** The carrier is defenceless, so the team
   has to escort them.
4. **Social first.** The station lobby and the brig are places to hang out.

## 2. Decisions so far

| Topic | Decision |
|---|---|
| Teams | 5v5, 10 players |
| Theme | Space. Team names: **Red Planet vs Blue Planet** (final) |
| Platforms | Host picks per match: **VR only**, **PC only**, or **mixed** |
| Planets | **Land anywhere.** Gravity pulls toward the planet's centre and the player turns to stand on the surface |
| Flying | **Web slinging** only (no thrusters) |
| Carrier penalty | **Yes.** Slower web reel, and only one hand free to sling |
| Hit knockback | **Yes** |
| Win | First to **3 captures**, or most captures after **15 min** |
| Tie | **2-minute sudden death**: next capture wins. Still tied: draw |
| Shields | 3 pips. 1 pip regenerates after 10 s without a hit |
| Capture rule | Your own flag must be at home to score |
| Dropped flag | A defender's touch returns it home. Auto-return after 20 s. Any attacker can pick it up |
| Teleporting | Off in the arena. The SDK can disable it per player (section 9.6) |
| Min to start | 2v2 |
| Penalty | 30 s in the brig, then respawn at home with 3 s of spawn protection |

## 3. Players and teams

- **Team colours and shapes:** red with a ring icon vs blue with a crescent
  icon. The shapes help colour-blind players tell the teams apart.
- **Team marking:** each player wears a glowing team vest (an object attached
  to their avatar) that shows their 3 shield pips. In zero-g players are seen
  from every angle, so the vest glows on the front and the back.
- **Spectators:** the world capacity is set above 10 (for example 16) on
  altvr.app (**Edit world → Capacity**). Extra visitors watch from the
  station's observation deck.

## 4. World layout

```
                          ┌──────────────────────────┐
                          │   ORBITAL STATION         │  normal gravity
                          │   (lobby + observation)   │  
                          └────────────┬─────────────┘
                                       │ launch tubes
   ═══════════════════════ ARENA: open space, zero-g ═══════════════════════
                                                                            
     (RED HOME PLANET)        ○  asteroid        ○            (BLUE HOME PLANET)
       flag on deck      ◯ moon        ◯ moon            flag on deck
       5 spawn pods                ◉                      5 spawn pods
       [RED BRIG]            ◯   central      ◯           [BLUE BRIG]
                        ○      planet "Core"     ○
                                                                            
   ════════════════ soft boundary: energy fence (sphere / capsule) ═════════
```

### 4.1 Orbital station (lobby)
- **Normal gravity**, so new players can find their feet.
- **Arrival point:** a fixed spawn point, so everyone lands in the same spot.
- **Team pads:** two platforms with 5 slots each. Stand on one to ask to join.
  The referee (section 9.1) gives out the slots, so two players stepping on at
  the same moment can't make a team of 6.
- **Ready buttons**, a **rules board**, the **scoreboard**, and host controls
  for the world owner and moderators (force start, end match, shuffle teams).
- **Practice ring:** a small zero-g bubble off the side of the station. Players
  can try web slinging and walking on a small planet before a match. This matters because
  zero-g movement is new to most people.
- **Observation deck:** big windows onto the arena, for spectators.

### 4.2 The arena
- An open volume of space, roughly 120 m across. **[SPIKE]** Tune the size
  once movement speed is known.
- **Symmetric layout:** a home planet at each end, with a matching set of
  moons and asteroids in between. A large central planet ("Core") blocks
  the direct line between the bases.
- **Planets and moons:** round bodies you can land on **anywhere** and walk
  all the way around (see 5.3). Each has a gravity well: inside it, gravity
  pulls toward the planet's centre.
- **Asteroids:** small rocks with no gravity. Web anchors and cover only. They
  are spaced so that from anywhere in the arena there is always something
  within web range. Nobody gets stranded.
- **Home planet:** a flag stand in a "home zone" ring (the capture point),
  5 spawn pods, and the team's brig.
- **Boundary:** a soft energy fence that pushes players back toward the
  centre, with a warning hum. Drifting out never tags a player out; that would
  feel cruel in zero-g.
- **Floor rule:** keep the whole arena above Y = −250. Below that, the SDK
  resets synced objects (such as the flag) to their start position.

### 4.3 Brig (penalty box)
- One per team, attached to the home planet, with a glass dome looking over the
  arena.
- Normal gravity inside, a large 30 → 0 countdown on the wall, and room to
  chat. Brig players hear each other and can watch the match.
- At 0, the player is sent to a free spawn pod on their home planet.

## 5. Zero-g movement

This is the riskiest and most important part of the design.

### 5.1 Tools the SDK gives us
| Tool | What the docs say |
|---|---|
| **Web slinging** | Built in: the "grapple" (`EnableSpiderMan`). Fire a web with the trigger (Q/E on desktop), reel in with grip. Range, reel speed and springiness are adjustable |
| **Gravity** | `scene.Gravity(vector)` sets the gravity *direction and strength* for the local player. `(0,0,0)` is zero-g |
| **Pushes** | `scene.AddPlayerForce(...)` pushes the local player (used for knockback and the boundary) |
| **Air control** | `PhysicsAirControlSpeed` and `PhysicsAirControlAcceleration` set how much the stick steers in the air |
| **Drag** | `PhysicsDrag` sets air resistance on the player body |
| **Lockouts** | `SetCanTeleport`, `SetCanGrapple`, `SetCanJump`, `SetCanMove` per player |
| **Seats / vehicles** | `AttachedObject` with `AvatarAttachTo` puts the player *on* an object and holds them to it |
| **Input** | VR controller stick and button events reach the page, and can be blocked from their usual jobs. Desktop gets key presses only |

### 5.2 Web slinging (the only way to fly)
- **Range:** about 40 m, so players hop between rocks and can't reach the
  enemy base in one shot. **[SPIKE]** Tune.
- **Two hands = full speed.** With the gun holstered, a player can sling with
  both hands, Spider-Man style. With the gun drawn, they have one web hand.
  The choice between moving fast and being ready to shoot is a nice tension
  for every player, not just the carrier.
- **Gun hand:** while the gun is held, its trigger is blocked from firing a
  web, so pulling the trigger only shoots.
- **A little drag**, so players slowly come to a stop instead of drifting
  forever.
- **Stick air control kept low**, for fine adjustments only.
- **Never stranded:** asteroids are spaced so a web anchor is always in range.
  Each planet's gravity well also gently pulls in anyone drifting nearby.
- **Bird flight off** and **teleport off** in the arena.

### 5.3 Walk-anywhere planets
The goal: touch a planet anywhere and your body turns so your feet face the
planet, gravity pulls straight toward its centre, and you can walk all the
way around it.

**Gravity toward the centre: the docs support it.** Each player's page knows
where its own player is (`pose-update`, up to 30 times a second). It finds
the planet whose gravity well they're in and calls
`scene.Gravity(towardCentre × strength)`. Outside every well, it sets zero.
Small planets can have weaker gravity than big ones.

**Turning the player to the surface: not in the docs. This is the
biggest risk in the project.** There is no call to tilt a player's body or
"up" direction:
- `TeleportTo` and spawns only take a turn around the vertical axis.
- The settings page says "players don't tumble yet". The avatar appears to
  stay upright to the world, so on the side of a planet, players would
  stand sideways and slide off.

The same page lists a tumble-related setting as already applied in the app
"but players don't tumble yet", which suggests the developers are working on
free player rotation. Three paths, in order:

1. **Ask SideQuest first.** Ask whether player rotation (custom "up" or
   tumbling) is coming, and when. If it lands, this feature becomes simple.
2. **[SPIKE] "Planet walker" workaround.** When a player touches a planet,
   their page attaches them to an invisible walker object (`AttachedObject`
   with `AvatarAttachTo`, like a vehicle). The script keeps that object
   upright against the surface and moves it around the planet from the
   player's stick input (VR stick events, or keys on PC, with the normal
   stick movement blocked). Jumping or firing a web detaches the player back
   into free flight. Two things to find out: does the player's body and view
   *rotate* with the object, or only move with it? And does it feel OK?
3. **Fallback:** flat landing decks on each planet that face the same way, so
   the player never needs to tilt. This is v0.2's plan, which works with what
   the docs confirm today.

**Comfort:** in VR, turning the player's view without their control is a top
cause of motion sickness. The turn onto the surface should be quick (about
0.3 s) or hidden by a short fade, with a comfort option for each player.

### 5.3a Reference: the GravityRaycastSystem package
A community example package (`GravityRaycastSystem.unitypackage`, a Visual
Scripting graph plus a settings panel) was reviewed for this design.

**What it does:**
- Small marker objects are attached to the player's head, hips, and hands
  (`AttachedObject`).
- Every 0.01 s the graph casts short rays (2.5 m) from the head (and
  optionally the feet or a hand) at set angles.
- On a hit it sets `Physics.gravity = −(surface normal) × 9.81`.
- With no hit it resets gravity to normal (straight down).
- It does **not** rotate the player. Any tilting of the avatar has to come
  from the app's own player controller reacting to the new gravity direction.

**What we keep:** the approach. A local graph or script that changes
`Physics.gravity` from a raycast uses only SDK features (attachments,
`Physics.Raycast`, setting gravity), so it should pass the Builder's checks.

**What we change for planets:**
1. **No hit → zero-g, not normal gravity.** Inside a planet's gravity well,
   keep pulling toward the planet even when the ray misses. That stops a
   player who walks over a crater edge or jumps from losing gravity
   mid-step. Only leaving the well sets zero.
2. **Aim at the planet's centre, not the surface normal.** Normals jump
   around on rocks, crater walls, and low-poly facets. The ray (or the
   well's trigger) tells us *which* planet; gravity then points at that
   planet's centre. Use a sphere collider for each planet's gravity, with
   detailed mesh colliders only for what players stand on.
3. **Ignore players, flags and guns in the ray**, so a teammate or a held
   object can't flip someone's gravity. Give the rays their own layer mask.
4. **Port it to the game's JavaScript**, or keep it as a graph that reads the
   game's state, so the brig, lobby and arena can switch it on and off.
5. **Ignore the package's `WorldCanvas.cs`.** Custom C# scripts don't run in
   published worlds (only in Play mode), so the settings panel may need
   another way to face the player.

**Still open (S3):** whether the app turns the avatar to match a sideways
gravity direction. Checking this is the first test: drop the package into a
world, walk onto a wall in the headset, and see whether the body and view
tilt.

### 5.4 Flag carrier movement
- The flag takes one hand, so the carrier always slings with **one hand
  only**.
- **Reel speed drops to 60%** while carrying, so the defending team gets a
  fair chase and the escort has a job to do. Tune the percentage in
  playtests.

### 5.5 Platform modes
The host picks the mode in the lobby before team select:
- **VR only:** the team pads only accept players in a headset (`scene.IsVR()`).
  PC players can still spectate.
- **PC only:** the reverse.
- **Mixed:** anyone can join. The scoreboard shows a VR/PC icon next to each
  name so teams can balance themselves.

Things to know for PC players:
- Web slinging works with Q/E.
- Controller stick and button events don't fire on desktop, so the PC gun
  and the planet walker's movement need keyboard input. **[SPIKE]** Desktop
  only gets key presses, with no key-release event. That may make PC
  walking on planets awkward.
- PC aiming with a mouse is usually more accurate than VR aiming. If mixed
  matches feel unfair, a small aim assist for VR or a slightly longer PC fire
  cooldown is an option. Decide after playtests.

## 6. Match flow

```
LOBBY ─► TEAM SELECT ─► READY-UP ─► COUNTDOWN (5 s) ─► PLAYING (15 min) ─► RESULTS ─► LOBBY
                                                          │      ▲      │
                                              3 hits ─► BRIG (30 s)     │ tied at 0:00
                                                                        ▼
                                                              SUDDEN DEATH (2 min)
                                                              next capture wins,
                                                              else DRAW
```

1. **Lobby:** arrive, socialise, try the practice ring.
2. **Team select:** stand on a pad. The referee gives out the 5 slots per team.
   An optional auto-balance button is available to the host.
3. **Ready-up:** the match starts when all players are ready, at least 2 per
   team, or when the host forces a start.
4. **Countdown:** all players go to their home spawn pods. Guns stay locked
   until "GO".
5. **Playing:** first to 3 captures wins, or the higher score after 15 min.
6. **Sudden death:** if tied at 0:00, there are 2 more minutes and the next
   capture wins. Flags reset home at the start of sudden death. If it's still
   tied after 2 minutes, it's a draw.
7. **Results:** about 20 s on every scoreboard, with stats (captures, tags,
   returns, flag-carry time). Then everyone returns to the station with their
   teams kept, ready for a rematch.

## 7. Rules

### 7.1 Laser guns
- Each player has a gun holstered on their hip. Grab it to draw it.
- **Fire rate:** 1 shot per 0.5 s. No ammo.
- **Hit detection:** a straight beam. Planets and asteroids block shots, so
  they work as real cover.
- **Friendly fire:** off.
- **Spawn protection:** 3 s, ended early by shooting.
- **Knockback:** a hit gives the target a small push (`AddPlayerForce`). In
  zero-g it can knock a player off a planet or break their swing. Strength is
  tunable.

### 7.2 Shields
- 3 pips. Each hit removes one.
- 1 pip regenerates after 10 s without being hit.
- The third hit tags the player out. They go to the brig, their gun locks,
  and if they carried the flag it drops where they were hit.

### 7.3 The flag
- **Grab** the enemy flag from its stand or wherever it floats.
- **While holding it, your gun is locked.** Grabbing the flag puts your gun
  back in its holster. To shoot again, let go of the flag and draw the gun:
  a quick-draw moment.
- **Dropped flag:** it floats in place. It has heavy drag, so it doesn't drift
  away, and a light-pillar beacon marks it. Any attacker can grab it; a
  defender's touch sends it home; it returns home on its own after 20 s.
  A carrier can't grab the flag back for 1 s after letting go.
- **Capture:** bring it into your home zone while your own flag is at its
  stand.
- **Carrier visibility:** the carrier glows. Scoreboards show "TAKEN by *name*".

## 8. Feedback and HUD (in-world)
| Info | How it's shown |
|---|---|
| Team | Glowing vest + team icon (front and back) |
| Health | 3 pips on the vest |
| Got hit | Flash, sound, controller buzz (`SendHapticImpulse`), small knockback |
| Hit someone | "Ding" confirm sound for the shooter |
| Where's "down" | A soft glow ring on the planet under your feet; the planet's gravity well edge shimmers as you cross it |
| Flag status | Boards: HOME / TAKEN by *name* / DROPPED (countdown). Beacon on a dropped flag |
| Direction home | A faint guide line or arrow to your home planet, because zero-g is disorienting |
| Score & time | Boards on each home planet, on Core, in the station, on the observation deck |
| Brig timer | Big countdown inside the brig |
| Announcer | Short audio: "Red flag taken!", "Blue scores!", "Sudden death!" |

## 9. Technical design (Altspace Creator SDK)

The world is a **Unity 6 scene** plus a **JavaScript page**
(`Assets/WebRoot/index.html`) that runs the game logic. Visual Scripting is an
alternative; the plan below assumes JavaScript.

**Key fact from the docs:** there is **no game server**. Every player runs
their own copy of the page. Shared data moves through:
- **Synced objects:** position, sent by the object's owner.
- **One-shots:** messages to everyone else in the room right now.
- **Space state:** shared values for the space, kept 24 h. Anyone can write
  public values.
- **User state:** values per player. Only the player can write their own.

The design below is built around those limits.

### 9.1 Who's in charge: the referee
- One player's page acts as the **referee**: the player with the
  lowest `uid` among those in the room. Every page can work out who that is,
  so no handshake is needed. If the referee leaves, the next-lowest `uid` takes
  over and carries on from space state.
- **Only the referee writes match state** to space state: phase, roster, score,
  flag states, time left. The other pages *request* changes with one-shots
  (join team, ready, capture, flag return) and draw whatever space state says.
- **Timers:** the referee writes `timeLeft` once a second. Player clocks can
  disagree, so the game doesn't rely on them, and a new referee carries on from
  the last value.
- **Stale state:** space state lasts 24 h, even with nobody in the world. When
  a referee starts and the roster's players aren't in the room, it resets the
  match to LOBBY.

### 9.2 State layout
```
space state (written by the referee only)
  match.phase       "lobby" | "countdown" | "playing" | "suddenDeath" | "results"
  match.timeLeft    seconds
  match.score       { red: 0, blue: 0 }
  match.roster      { red: [uid,...], blue: [uid,...] }      // slot = index
  flag.red          { state: "home" | "carried" | "dropped", by: uid, droppedAt: timeLeft }
  flag.blue         { ... }
  stats.<uid>       { caps, tags, returns }

user state (each player writes their own)
  ready             true/false
  pips              0..3
  status            "lobby" | "alive" | "brig"
  carrying          true/false
```

### 9.3 Team vests and hit detection
- **Vests:** 10 vests are placed in the scene ahead of time (Red 1–5,
  Blue 1–5), each with a fixed id. A player attaches the vest for their slot
  to their chest using `AttachedObject` with `autoSync`, so everyone sees it on
  them.
- **Hitboxes:** each vest carries a capsule collider covering the body and head
  on a dedicated hitbox layer. It follows the avatar on every player's screen,
  so it works as that player's target.
- **Shooting:**
  1. The shooter's page casts a ray from the gun barrel (`scene.Raycast`)
     against the hitbox and environment layers. A planet hit first means a
     miss.
  2. If it hits an enemy vest, it sends a `hit` one-shot naming the target.
     Every shot also sends a `shot` one-shot so others can draw the beam.
  3. **The target's page applies the damage:** it checks spawn protection,
     drops a pip, and updates its own user state. On 0 pips it lets go of the
     flag (`ReleaseGrab`), moves the player to the brig (`TeleportTo`), and sends
     a `tagged` one-shot for the announcer and stats.
- This "shooter decides, victim applies" model favours the shooter, which
  feels right under lag.
- **Cheating:** a modified client could cheat (ignore hits, fake shots). The
  referee can sanity-check fire rate and distance. For a casual social game
  that's acceptable; mods can remove cheaters.

### 9.4 Guns
- Each gun is a grabbable object in a hip holster attached to the player.
- **Trigger:** the page tracks which hand holds the gun (from the `grab`
  event) and fires on that hand's trigger press (`button-pressed`). The gun is
  set to block that trigger from firing a web while held.
- **Locked** during countdown, in the brig, and while carrying the flag.
- **[SPIKE]** Confirm that a holstered (attached) object can be grabbed and
  put back. The fallback is a gun permanently attached to the hand.

### 9.5 Flags
- A synced, grabbable object. Ownership moves only on grab: walking or flying
  into it doesn't take it.
- `useGravity` off and high drag, so a dropped flag floats where it was let
  go.
- On grab:
  - **Enemy flag:** the page sends `flag-taken` to the referee, holsters the
    gun, and sets `carrying = true`.
  - **Own flag, dropped:** the grab is a return. The page lets go at once
    and sends `flag-return`.
  - **Own flag at home:** the page lets go.
- **Capture:** the home zone is a trigger volume. When a carrier enters it, the
  carrier's page sends `capture`. The referee checks the rules (own flag at
  home), updates the score, and resets the flag.
- **Auto-return:** the referee takes ownership of the flag and moves it back
  to the stand.

### 9.6 Settings by area
| Area | Gravity | Teleport | Web slinging | Jump/move |
|---|---|---|---|---|
| Station | normal | on | off | on |
| Practice ring | zero, plus a small practice planet | off | on | on |
| Arena (open space) | zero | **off** | on | on |
| Inside a planet's gravity well | toward planet centre, updated as the player moves | off | on | on (planet walker if S3 works) |
| Brig | normal | off | off | on |

Each page keeps **one** `BS.SceneSettings` object and resends it whenever the
player changes area, because `SetSettings` resets anything it doesn't include.
`SettingsLocked` must stay off, since the settings change mid-match.

### 9.7 Testing
- The SDK's **Local Multiplayer** window runs several players in the Unity
  Editor.
- Most movement settings (gravity, web slinging, forces, teleport lock) **only work
  in the app, not in Play mode**, so movement has to be tested in a headset.
- **[SPIKE]** The SDK has a **Bot SDK** (`altspace.js`) for bots that join
  worlds and move around. It could fill empty slots for 5v5 load tests.

## 10. Spikes (prototype first)
| # | Question | Why it matters |
|---|---|---|
| S1 | Do zero-g and web slinging feel good in a headset? Does anyone get stranded? | The whole game rests on it |
| S2 | Gravity toward a planet's centre, updated from the player's position: smooth, with no jitter? | Planet gravity |
| S3 | Does the app turn the avatar to match sideways gravity? Test with the GravityRaycastSystem package (5.3a) first, then ask SideQuest, then try the planet walker | Walk-anywhere planets. **Highest risk** |
| S4 | Can a raycast hit hitbox colliders attached to other avatars, and do those colliders stay out of the way of players' bodies? | Hit detection |
| S5 | Can a holstered gun be grabbed and re-holstered? | Gun / flag hand flow |
| S6 | One-shot volume: 10 players × 2 shots/s plus hits. Any rate limits? | Combat networking |
| S7 | How readable is the vest from all angles at 30–60 m? | Readability pillar |
| S8 | Comfort: motion sickness in zero-g and when turning onto a surface | Who can play at all |
| S9 | PC controls: gun, slinging, and walking on planets with key presses only | PC-only and mixed modes |

## 11. Tunable settings
| Setting | Default |
|---|---|
| Team size | 5 |
| Hits to tag out | 3 |
| Brig time | 30 s |
| Fire cooldown | 0.5 s |
| Pip regen delay | 10 s |
| Spawn protection | 3 s |
| Flag auto-return | 20 s |
| Flag re-grab cooldown | 1 s |
| Captures to win | 3 |
| Match time | 15 min |
| Sudden death | 2 min |
| Min per team | 2 |
| Platform mode | Mixed |
| Web range | 40 m |
| Carrier reel speed | 60% |
| Planet gravity | Scaled per planet size (tune in S2) |
| Gravity well radius | About 2× planet radius |
| Surface turn time | 0.3 s (or a fade) |
| Player drag | small (tune in S1) |
| Hit knockback | small (tune) |

## 12. Edge cases
- **Player disconnects mid-match:** the referee frees their slot; a flag they
  carried returns home. Late joiners can fill an open slot from the station.
- **Referee disconnects:** the next-lowest `uid` takes over from space state.
  At worst the timer pauses for about a second.
- **Carrier drifts past the boundary:** the fence pushes them back. If they
  are still outside after 5 s, the flag returns home.
- **Both flags taken (stalemate):** a team must tag the enemy carrier to get
  its flag back. The boards show "STALEMATE".
- **Sudden death starts:** both flags reset home and everyone keeps their
  current shields.
- **Guns in the lobby:** guns only work in the arena during PLAYING and
  SUDDEN DEATH.

## 13. Roadmap
| Phase | Goal | Output |
|---|---|---|
| 0. Spikes | Ask SideQuest about player rotation; S1, S2, S3, S4, S5 in a test world | Go/no-go on walk-anywhere planets, movement, and combat |
| 1. Graybox | Station, arena with simple planets, brigs | Flyable world |
| 2. Core loop | Referee, teams, guns, hits, brig, respawn | 2v2 playtest |
| 3. Flag | Grab, carry-locks-gun, drop, return, capture, sudden death | 5v5 playtest |
| 4. Polish | Space art, audio, announcer, boards, stats | Public beta |
| 5. Extras | More maps, modes, cosmetics | Post-launch |

## 14. Open decisions
1. **If player rotation isn't possible yet** (S3 fails and SideQuest has no
   date): launch with flat landing decks and add walk-anywhere later, or wait
   for it?
2. **Mixed-mode fairness tweaks** (VR aim assist or PC fire cooldown): decide
   after playtests.

## Sources
AltspaceVR Creator docs: https://altvr.app/docs/ (pages used: Multiplayer, User
& Multiplayer, Scene API, Scene Events, Scene Settings, VR Interaction, Special
Components, Spawn/Seats/Settings, Physics, Performance).
