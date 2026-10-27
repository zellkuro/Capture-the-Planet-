# Zero-G Test World

A small world for trying out Capture the Planet's movement before building
the game: web slinging in zero-g, gravity toward a planet's centre, and the
avatar tilting to match gravity. These are spikes S1–S3 in
[the design doc](../docs/game-design.md).

The whole world is built by `WebRoot/script.js`, so the Unity scene stays
empty apart from the SDK.

## What's in it
| Thing | Where | Layer | What to test |
|---|---|---|---|
| Station deck (14 × 14 m) | Spawn, at the origin | 7 StationSurface | Normal gravity; walk off the edge into zero-g |
| Station wall | Left side of the deck | 7 StationSurface | Walk into it and onto it (gravity into the surface) |
| Test Planet (10 m radius) | 50 m ahead | 6 PlanetSurface | Land anywhere, walk all the way around |
| Moon (4 m radius) | Up and to the right, past the planet | 6 PlanetSurface | Small-planet gravity, hopping between bodies |
| 10 asteroids | Between and around | 8 Rock | Web anchors; they never change gravity |
| Gravity well shells | Faint blue spheres around each planet | none (no collider) | See where a planet's pull starts |
| Coloured pillars | Six sides of each planet | 8 Rock | Tell which side you're on |
| Tuning board | Behind the spawn point | UI buttons | Change values live (saved on that device) |
| HUD | Under your view | none | Shows gravity source and strength |
| Boundary | 110 m around the arena | n/a | Drifting too far pushes you back |

**Gravity rules** (the design doc's section 5.3):
1. Rays from the head (down and forward-down) hit a **station surface** →
   gravity points into that surface.
2. Otherwise, inside a **planet's well** → gravity points at the planet's
   centre, strongest at the surface and fading to 30% at the well's edge.
3. Otherwise → **zero-g**.
4. Gravity turns to a new direction over 0.25 s rather than snapping.

## Setup
1. **Unity:** install Unity **6000.3.21f1** with Android and Windows build
   support, and create a project from the **Universal 3D** template.
2. **SDK:** import the
   [installer package](https://altvr.app/files/Install-com.sidequest.creator-sdk-latest.unitypackage),
   then press **Fix All** in the Setup panel. This also creates
   `Assets/WebRoot/index.html`.
3. **Page:** copy `WebRoot/index.html` and `WebRoot/script.js` from this
   folder into the project's `Assets/WebRoot/`, replacing the generated
   `index.html`.
4. **Scene:** an empty scene is fine. You can delete the default Directional
   Light, since the script adds its own sun. Keep one scene in the project.
5. **Publish:** open the Builder (`Creator SDK > Builder`), sign in, and use
   **Build & upload**. After changing only the script, **Upload HTML + JS** is
   enough; no rebuild needed.
6. **Test in the headset.** Most of this only works in the app: gravity,
   web slinging, `AddPlayerForce`, the teleport lock, and `pose-update`. In
   Unity Play mode you'll see the world but not the movement.

`node --test test-world/tests/*.test.js` runs the gravity maths, layout
checks, and a smoke test against a fake SDK. They don't need Unity.

## Controls
| Action | VR | PC |
|---|---|---|
| Fire a web | Trigger | Q / E |
| Reel in | Grip | (per app defaults) |
| Back to station | X (left controller) | R |
| HUD on/off | Y (left controller) | H |
| Change a setting | Point and click the tuning board | Click |

## Test checklist
Try each in the headset, and if you can, with a second player watching you.

**S1: Zero-g and web slinging**
- [ ] Walk off the deck. Do you float away slowly and come to a stop (drag)?
- [ ] Web from the station to the first asteroid, then on to the planet. Does
      it feel good? Is 40 m range too much, too little?
- [ ] Can you always find something to web? Did you ever get stuck?
- [ ] Is stick steering in the air too strong or too weak?
- [ ] Comfort: any motion sickness? When?

**S2: Planet gravity**
- [ ] Fly toward the planet without webbing. Do you feel the pull start at the
      blue shell?
- [ ] Land on the side or bottom of the planet. Does gravity pull you to the
      surface smoothly, with no jitter?
- [ ] Jump on the planet. Do you come back down?
- [ ] Hop from the planet to the moon. Is the change smooth?

**S3: Avatar tilt**
- [ ] On the planet's side or bottom, do your body and view turn so the
      planet is "down"?
- [ ] Does the turn follow the 0.25 s blend smoothly, or snap? Try turn time 0
      and 0.5 on the tuning board.
- [ ] Walk all the way around the planet past all six pillars.
- [ ] Walk onto the station wall from the deck.
- [ ] **With a second player:** does your avatar look right to them when
      you're upside down or sideways?

**Record:** the tuning values that felt best, and anything that broke.

## Not verified yet
Written from the SDK docs without running it in the app. Check these first if
something looks wrong:
- **Text size:** the board, sign and HUD use guessed font sizes.
- **Default material shader:** planets and rocks use the default `Material`
  with no shader set, assuming it's lit. If they look flat, change them to a
  lit shader.
- **Raycast result:** the script reads the hit's surface normal from
  `scene.Raycast`'s documented `¶`-separated result (fields 5–7).
- **Head rotation:** the script turns `(0, −1, 0)` by `pose-update`'s head
  rotation to find "down" in zero-g.
