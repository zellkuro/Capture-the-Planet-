# Capture the Planet: Game Design Document (Draft v0.1)

> Status: **planning**. This draft builds out the starting concept. Items marked
> **[DECIDE]** need an answer from the designer. Items marked **[PLATFORM]**
> depend on what the relaunched AltspaceVR supports and need checking against
> the platform docs.

## 1. Concept

Capture the Planet is a 5v5 capture-the-flag game for AltspaceVR. Players meet
in a lobby, pick teams, and teleport into an arena. Each team tries to steal the
other team's flag and bring it home. Players fight with laser guns. Three hits
send a player to a 30-second penalty box. A player carrying the flag can't shoot.

**Design pillars**
1. **Social first.** The lobby and the penalty box are places to hang out, not
   just waiting rooms. Altspace is a social platform, so downtime should be fun.
2. **Readable at a glance.** You can always tell team, health, and flag status
   without a menu.
3. **Carrying the flag is a choice.** The flag carrier is defenceless, so the
   team has to escort them. That is the core tension of the game.

## 2. Player count and teams

| Setting | Value |
|---|---|
| Team size | 5 |
| Total players | 10 |
| Minimum to start | 2v2 (configurable) **[DECIDE]** |
| Spectators | Anyone else in the world, watching from the gallery |

- **Team names and colours:** Red Planet (Mars) vs Blue Planet (Neptune) is
  the working theme **[DECIDE]**. Use colour *and* shape/icon so colour-blind
  players can tell the teams apart (for example, a ring icon vs a crescent icon).
- **Team marking:** each player gets a team-coloured attachment (vest, halo, or
  armband) when they join a team. **[PLATFORM]** Can we attach objects to avatars?

## 3. World layout

```
 ┌──────────────────────────── WORLD ─────────────────────────────┐
 │                                                                 │
 │   LOBBY / STAGING              SPECTATOR GALLERY (raised)       │
 │   ┌───────────────────┐        ┌───────────────────────────┐    │
 │   │ Spawn point       │        │ windows looking onto arena │    │
 │   │ Rules board       │        └───────────────────────────┘    │
 │   │ [RED PAD] [BLUE PAD]                                       │
 │   │ Ready button      │                                         │
 │   │ Scoreboard        │                                         │
 │   └───────────────────┘                                         │
 │                                                                 │
 │   ARENA                                                         │
 │   ┌───────────────────────────────────────────────────────┐    │
 │   │ RED BASE        MIDFIELD (cover, lanes)     BLUE BASE  │    │
 │   │ [flag stand]   ▓▓    ▓▓    ▓▓    ▓▓       [flag stand] │    │
 │   │ [spawn x5]       ▓▓   [ centre ]  ▓▓        [spawn x5] │    │
 │   │ [gun rack]     ▓▓    ▓▓    ▓▓    ▓▓        [gun rack]  │    │
 │   │ [RED PENALTY BOX]                   [BLUE PENALTY BOX]  │    │
 │   └───────────────────────────────────────────────────────┘    │
 └─────────────────────────────────────────────────────────────────┘
```

### 3.1 Lobby / staging area
- **Spawn point:** where everyone arrives when they enter the world.
- **Team pads:** two large coloured platforms. Stand on one to join that team.
  Each pad shows 5 slots that fill as players join. A full pad rejects new
  players with a "Team full" message.
- **Ready-up:** a big button or lever per team. The match starts when every
  player on both teams is ready (or when the host forces a start).
- **Rules board:** a short illustrated summary of the rules (section 5).
- **Scoreboard and last-match results.**
- **Host controls (moderator only):** force start, end match, shuffle teams,
  kick a player from a team.

### 3.2 Arena
- **Symmetric** so neither side has an advantage. A target size of about
  60 m × 30 m keeps it small enough for 10 players to stay in contact
  **[PLATFORM]** (check teleport range and how big worlds can be).
- **Bases:** each has a flag stand, 5 spawn points, and a gun rack. A small
  "home zone" around the flag is the capture point.
- **Midfield:** low and high cover, at least three lanes (left, centre,
  right), and one elevated sniper perch per side.
- **Bounds:** invisible walls or kill-volumes. Leaving the arena counts as being
  tagged out.

### 3.3 Penalty boxes
- One per team, on that team's side of the arena, behind glass with a clear view
  of the action. Being tagged out still means watching the game.
- A large countdown timer on the wall (30 → 0).
- Penalty-box players **can talk to each other and to the teammates nearby**.
  It's a social hangout, not a punishment cell.
- At 0, the player teleports to a free spawn point at their base.

### 3.4 Spectator gallery
- An elevated room that overlooks the arena, with a live scoreboard. It is
  reachable from the lobby, so extra visitors (more than 10) have something to do.

## 4. Match flow

```
LOBBY ──► TEAM SELECT ──► READY-UP ──► COUNTDOWN (5s) ──► PLAYING ──► RESULTS ──► LOBBY
                                                            │   ▲
                                              3 hits ──► PENALTY BOX (30s)
```

1. **Lobby:** players arrive, socialise, and read the rules.
2. **Team select:** players stand on a pad. Optional auto-balance button.
3. **Ready-up:** all players ready, or the host forces a start.
4. **Countdown:** 5 s, then everyone teleports to their base spawns. Guns are
   locked until "GO".
5. **Playing:** see section 5.
6. **Win condition** **[DECIDE]**: first to **3 captures**, or the most
   captures when the **15-minute** timer runs out. On a tie: sudden death (next
   capture wins) or a draw.
7. **Results:** about 20 s on the arena scoreboard, with MVP stats (captures,
   tags, returns). Then everyone teleports back to the lobby with their teams
   kept, ready for a rematch.

## 5. Rules and mechanics

### 5.1 Laser guns
- Every player gets one gun at the start of the match: auto-equipped or taken
  from the base rack **[PLATFORM]**.
- **Fire rate:** 1 shot per 0.5 s (tunable). No ammo. Possibly an overheat
  meter later.
- **Hit detection:** a straight beam (raycast) from the barrel. The shot is
  visible as a bright beam for about 0.1 s and plays a "zap" sound for everyone
  nearby.
- **Friendly fire:** off.
- **Spawn protection:** 3 s of invulnerability after respawning, shown by a
  shimmer effect. Shooting ends the protection early.

### 5.2 Hits and health
- Each player has **3 shield pips**, shown on their team marker so other players
  can see them.
- Each hit removes one pip. A flash and a sound tell both the shooter and the
  target.
- **Pip regeneration** **[DECIDE]**: recommended. Restore 1 pip after 10 s
  without being hit, so that long fights don't feel random. Without it, damage
  builds up all match until a player is tagged out.
- **Third hit:** the player is "tagged out" and teleported straight to their
  team's penalty box. Their gun is locked. If they carried the flag, it drops
  (5.4).

### 5.3 Penalty box
- **Duration:** 30 s (configurable).
- When the timer ends, pips reset to 3 and the player respawns at a base spawn
  with spawn protection.
- Players can't leave early. **[PLATFORM]** Can we confine or re-teleport a
  player who tries to leave?

### 5.4 The flag
- **Pick up:** touch or grab the enemy flag at its stand or wherever it lies.
- **Carrying:** while a player holds the flag, **their gun is disabled**. The
  flag occupies the gun hand, or the gun is holstered automatically.
- **Dropping to shoot:** the carrier can drop the flag at any time. It falls
  where they stand and they can shoot again right away. To pick it back up they
  must touch it again, with a short pickup cooldown of 1 s so they can't
  instantly juggle it.
- **Dropped flag** **[DECIDE]**, recommended behaviour:
  - Any attacker can pick it up, so teammates can pass it along.
  - When a **defender touches** their own dropped flag, it returns home
    instantly.
  - If nobody touches it for **20 s**, it **returns home automatically**.
  - A beacon (light pillar) marks a dropped flag so everyone can find it.
- **Carrier tagged out:** the flag drops where they were hit.
- **Capture:** carry the enemy flag into your home zone. **[DECIDE]** Must your
  own flag be at home to score? That's the classic rule. It allows stalemates,
  but it makes defence matter.
- **Carrier visibility:** the carrier glows, and the flag shows on a mini-map
  or arena board so the defending team can always tell who to chase.

### 5.5 Movement and anti-exploit **[PLATFORM]**
Altspace has historically supported **teleport locomotion**, which can break
CTF because a carrier could teleport across the map in a few hops. Options:
- **A. Flag carriers can't teleport.** They walk or smooth-move only. This is
  the best option if the platform allows it.
- **B. Teleport drops the flag.** If a carrier teleports, the flag drops at
  their starting point.
- **C. Speed cap.** If the carrier moves faster than X m/s, the flag drops.
  This is a server-side check that works even if teleport can't be controlled.

Desktop (2D mode) vs VR players: aiming with a mouse is usually easier than
aiming with a VR controller. Decide whether to allow both, or to show
"VR-only" on the team pads **[DECIDE]**.

## 6. Feedback and HUD (in-world)
| Info | How it's shown |
|---|---|
| Team | Coloured marker + icon on avatar |
| Health | 3 pips on the marker, visible to all |
| Got hit | Flash + sound + controller haptic if supported |
| Hit someone | "Ding" confirm sound for shooter |
| Flag status | Arena board: HOME / TAKEN by *name* / DROPPED (timer) |
| Score & time | Large boards at each base, midfield, lobby, and gallery |
| Penalty timer | Big countdown inside each penalty box |
| Announcer | Short audio cues: "Red flag taken!", "Blue scores!" |

## 7. Technical approach (to verify)

Not yet confirmed against the 2026 platform docs. **The documents mentioned in
the planning request were not in the repository**, so this section is based on
how the original AltspaceVR worked:
- The original platform supported custom worlds built from world-building kits
  and Unity-built world templates. It supported scripted interactive content
  through the **Mixed Reality Extension (MRE) SDK**, a Node.js/TypeScript
  server that runs the game logic and syncs actors to every client.
- An MRE model fits this game well, because a server-authoritative design
  handles cheating and shared state:
  - **The server owns all game state:** teams, pips, flag position, timers,
    score.
  - **Hit validation runs on the server.** The client reports a shot (origin
    and direction), and the server casts the ray against player hitboxes.
  - **Teleporting players** into the arena, penalty box, and lobby.
- **Key [PLATFORM] questions to answer from the docs:**
  1. Can scripts teleport a user to a specific location?
  2. Can we attach objects to a user (team marker, gun, flag)?
  3. Can we read user position and hand/controller pose at a useful rate?
  4. Can we detect trigger or controller-button presses on a held object?
  5. Can we raycast, or do we need our own simple hitbox math (for example,
     capsules around avatar positions)?
  6. Can we restrict or detect teleport locomotion per user?
  7. What is the maximum number of users per world/instance, and does
     spectating count?
  8. Is there a moderator/host role we can query?
  9. Can we play spatial audio and use controller haptics?
  10. What is the world size and polygon budget?

## 8. Tunable settings
| Setting | Default |
|---|---|
| Team size | 5 |
| Hits to tag out | 3 |
| Penalty duration | 30 s |
| Fire cooldown | 0.5 s |
| Pip regen delay | 10 s (0 = off) |
| Spawn protection | 3 s |
| Flag auto-return | 20 s |
| Flag re-pickup cooldown | 1 s |
| Captures to win | 3 |
| Match time limit | 15 min |
| Min players to start | 2 per team |

## 9. Edge cases
- **Player disconnects mid-match:** their slot opens. If they carried the flag,
  it drops. Allow late join from the lobby into the short-handed team.
- **Uneven teams:** allow the match anyway (host's choice), or let auto-balance
  move players.
- **Flag carrier enters own penalty box / out-of-bounds:** the flag
  auto-returns.
- **Both flags taken at once (stalemate):** under the "own flag must be home"
  rule, a team must tag the enemy carrier to recover its flag. Show the
  stalemate clearly on the boards.
- **Griefing in lobby:** guns only work in the arena during PLAYING.
- **Host leaves:** host role passes to the next moderator, or the match
  continues without one.

## 10. Roadmap
| Phase | Goal | Output |
|---|---|---|
| 0. Platform check | Answer the [PLATFORM] questions | Short tech spike + notes |
| 1. Graybox | Blockout world: lobby, arena, boxes | Walkable world, no logic |
| 2. Core loop | Teams, guns, hits, penalty box, respawn | 2v2 playtest |
| 3. Flag | Pickup, carry-locks-gun, drop, return, capture, scoring | Full 5v5 playtest |
| 4. Polish | Art, audio, announcer, HUD boards, stats | Public beta |
| 5. Extras | Game modes, maps, cosmetics | Post-launch |

## 11. Open decisions (summary)
1. Team theme and names.
2. Win condition: captures to win, time limit, tie-break.
3. Pip regeneration on or off.
4. Must your own flag be home to capture?
5. Dropped-flag behaviour (touch-return and auto-return timer).
6. Anti-teleport rule for carriers (A, B, or C).
7. VR-only or mixed VR/desktop.
8. Minimum players to start.
