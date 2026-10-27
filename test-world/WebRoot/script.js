// Capture the Planet: zero-g test world.
// Tests web slinging in zero-g, gravity toward a planet's centre, and the
// avatar tilting to match gravity (design doc spikes S1-S3).
//
// Everything is built from this script, so the Unity scene only needs the SDK.
// Gravity is local: each player's page sets gravity for that player only.

// ---------------------------------------------------------------------------
// World layout and tuning (plain data, no SDK calls)
// ---------------------------------------------------------------------------

const LAYER = {
    PLANET: 6,   // UserLayer2: planet ground. Gravity toward the planet's centre
    STATION: 7,  // UserLayer3: station floors and walls. Gravity into the surface
    ROCK: 8,     // UserLayer4: asteroids and props. Walkable, web-able, no gravity change
    UI: 5
};

// Gravity rays only look at station surfaces. Planets use their gravity well
// (distance to the centre), so bumps on a planet never tilt the player.
const STATION_MASK = 1 << LAYER.STATION;

const DEFAULTS = {
    planetGravity: 9.81,   // m/s² at a planet's surface
    edgeGravityScale: 0.3, // share of surface gravity left at the edge of a well
    blendTime: 0.25,       // seconds for gravity to turn to a new direction
    webRange: 40,          // grapple range, metres
    drag: 0.1,             // player drag, so drifting slowly stops
    airControl: 1.5        // m/s of stick steering in the air
};

const STATION_GRAVITY = 9.81;
const DOWN_RAY_LENGTH = 2.5;    // from the head toward the feet (as in GravityRaycastSystem)
const FORWARD_RAY_LENGTH = 1.8; // forward and down, to step onto a wall in front
const TICK_MS = 50;

const SPAWN = { x: 0, y: 0.1, z: -2, yaw: 0 }; // on the station deck, facing the planet

const ARENA = { centre: { x: 0, y: 0, z: 45 }, boundaryRadius: 110, push: 1.5 };

const PLANETS = [
    { name: "Test Planet", centre: { x: 0, y: 0, z: 50 }, radius: 10, wellRadius: 20, color: [0.75, 0.32, 0.25, 1] },
    { name: "Moon", centre: { x: 35, y: 12, z: 85 }, radius: 4, wellRadius: 8, color: [0.62, 0.66, 0.76, 1] }
];

// Spaced so a 40 m web always reaches something.
const ASTEROIDS = [
    { p: [4, 3, 16], r: 1.5 }, { p: [-5, 6, 26], r: 2 }, { p: [8, -4, 28], r: 1.8 },
    { p: [-22, 2, 40], r: 2.2 }, { p: [18, 8, 62], r: 2.5 }, { p: [-16, -6, 60], r: 2 },
    { p: [0, 18, 64], r: 1.6 }, { p: [6, -14, 70], r: 2 }, { p: [24, 14, 72], r: 1.8 },
    { p: [-12, 10, 78], r: 2.4 }
];

// ---------------------------------------------------------------------------
// Gravity maths (pure, tested in tests/gravity.test.js)
// ---------------------------------------------------------------------------

const vec = {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    scale: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
    length: (a) => Math.hypot(a.x, a.y, a.z),
    normalize: (a) => {
        const l = Math.hypot(a.x, a.y, a.z);
        return l > 1e-6 ? { x: a.x / l, y: a.y / l, z: a.z / l } : { x: 0, y: 0, z: 0 };
    },
    lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t })
};

// The planet whose gravity well holds this position, nearest centre first.
function findWell(position, planets) {
    let best = null;
    for (const planet of planets) {
        const distance = vec.length(vec.sub(planet.centre, position));
        if (distance < planet.wellRadius && (!best || distance < best.distance)) {
            best = { planet, distance };
        }
    }
    return best;
}

// Full gravity at the surface, falling off linearly to edgeScale at the well's edge.
function planetGravity(position, well, tuning) {
    const { planet, distance } = well;
    const span = Math.max(planet.wellRadius - planet.radius, 1e-6);
    const t = Math.min(Math.max((distance - planet.radius) / span, 0), 1);
    const strength = tuning.planetGravity * (1 + (tuning.edgeGravityScale - 1) * t);
    return vec.scale(vec.normalize(vec.sub(planet.centre, position)), strength);
}

// Gravity for a station surface the ray hit: straight into the surface.
function stationGravity(normal) {
    return vec.scale(vec.normalize(normal), -STATION_GRAVITY);
}

// Move the current gravity toward the target. Frame-rate independent.
function blendGravity(current, target, dt, blendTime) {
    if (blendTime <= 0) return target;
    const t = 1 - Math.exp(-dt / blendTime);
    return vec.lerp(current, target, t);
}

function outsideBoundary(position, arena) {
    return vec.length(vec.sub(position, arena.centre)) > arena.boundaryRadius;
}

// ---------------------------------------------------------------------------
// The world (needs the SDK)
// ---------------------------------------------------------------------------

function startWorld() {
    const scene = BS.Scene.GetInstance();
    const V3 = (p) => new BS.Vector3(p.x, p.y, p.z);
    const color = (c) => new BS.Vector4(c[0], c[1], c[2], c[3]);

    const tuning = loadTuning();
    const settings = new BS.SceneSettings();

    // Settings go out early, before the space finishes loading (SpawnPoint needs it).
    applySettings();

    function applySettings() {
        settings.EnableTeleport = false;
        settings.EnableSpiderMan = true;     // web slinging
        settings.EnableBirdFlight = false;
        settings.EnableForceGrab = false;
        settings.SpawnPoint = new BS.Vector4(SPAWN.x, SPAWN.y, SPAWN.z, SPAWN.yaw);
        settings.PhysicsGrappleRange = tuning.webRange;
        settings.PhysicsDrag = tuning.drag;
        settings.PhysicsAirControlSpeed = tuning.airControl;
        settings.PhysicsAirControlAcceleration = 3;
        // SetSettings sends every setting, so always send this one object.
        return scene.SetSettings(settings);
    }

    function loadTuning() {
        const values = { ...DEFAULTS };
        try {
            const saved = JSON.parse(localStorage.getItem("ctp-test-tuning") || "{}");
            for (const key of Object.keys(DEFAULTS)) {
                if (typeof saved[key] === "number") values[key] = saved[key];
            }
        } catch (e) { /* storage blocked: use defaults */ }
        return values;
    }

    function saveTuning() {
        try { localStorage.setItem("ctp-test-tuning", JSON.stringify(tuning)); } catch (e) { /* ignore */ }
    }

    // --- Building -----------------------------------------------------------

    async function shape(name, { position, euler, layer = 0, geometry, collider, rgba, unlit = false, material }) {
        const config = { name, layer, localPosition: V3(position) };
        if (euler) config.localEulerAngles = V3(euler);
        const obj = new BS.GameObject(config);
        await obj.AddComponent(geometry);
        await obj.AddComponent(new BS.Material(material || (unlit
            ? { shaderName: "Unlit/Diffuse", color: color(rgba) }
            : { color: color(rgba) })));
        if (collider) await obj.AddComponent(collider);
        return obj;
    }

    async function buildSky() {
        const sky = await shape("Sky", {
            position: { x: 0, y: 0, z: 45 },
            geometry: new BS.Sphere({ radius: 800, widthSegments: 24, heightSegments: 16 }),
            rgba: [0.01, 0.01, 0.03, 1],
            unlit: true
        });
        await sky.AddComponent(new BS.InvertedMesh());

        // Stars, from a fixed seed so every player sees the same sky.
        let seed = 7;
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 60; i++) {
            const u = random() * 2 - 1, a = random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
            await shape("Star", {
                position: { x: 700 * s * Math.cos(a), y: 700 * u, z: 45 + 700 * s * Math.sin(a) },
                geometry: new BS.Sphere({ radius: 1 + random() * 1.5, widthSegments: 6, heightSegments: 4 }),
                rgba: [1, 1, 0.95, 1],
                unlit: true
            });
        }

        const sun = new BS.GameObject({ name: "Sun", localEulerAngles: new BS.Vector3(35, -40, 0) });
        await sun.AddComponent(new BS.Light({ type: BS.LightType.Directional, intensity: 1.2 }));
    }

    async function buildStation() {
        // Deck: top surface at y = 0.
        await shape("Station Deck", {
            position: { x: 0, y: -0.25, z: 0 },
            layer: LAYER.STATION,
            geometry: new BS.Box({ width: 14, height: 0.5, depth: 14 }),
            collider: new BS.BoxCollider({ size: new BS.Vector3(14, 0.5, 14) }),
            rgba: [0.55, 0.58, 0.62, 1]
        });
        // A wall to test walking from the floor onto a wall.
        await shape("Station Wall", {
            position: { x: -7.25, y: 4, z: 0 },
            layer: LAYER.STATION,
            geometry: new BS.Box({ width: 0.5, height: 8, depth: 14 }),
            collider: new BS.BoxCollider({ size: new BS.Vector3(0.5, 8, 14) }),
            rgba: [0.42, 0.45, 0.5, 1]
        });
        // Edge markers so the deck's outline is easy to see in space.
        const edges = [[0, 7], [0, -7], [7, 0]];
        for (const [x, z] of edges) {
            await shape("Deck Edge", {
                position: { x, y: 0.02, z },
                geometry: new BS.Box({ width: x === 0 ? 14 : 0.15, height: 0.05, depth: x === 0 ? 0.15 : 14 }),
                rgba: [0.2, 0.8, 1, 1],
                unlit: true
            });
        }
        await label("Sign", { x: 0, y: 2.2, z: 3 }, { x: 0, y: 0, z: 0 },
            "<b>ZERO-G TEST</b>\nWeb: trigger to fire, grip to reel\nX: back to station   Y: HUD on/off\nTuning board behind you", 1, [6, 2]);
    }

    async function buildPlanet(planet) {
        await shape(planet.name, {
            position: planet.centre,
            layer: LAYER.PLANET,
            geometry: new BS.Sphere({ radius: planet.radius, widthSegments: 48, heightSegments: 32 }),
            collider: new BS.SphereCollider({ radius: planet.radius }),
            rgba: planet.color
        });
        // Coloured pillars on six sides, so testers can tell they walked around.
        const sides = [
            { n: { x: 0, y: 1, z: 0 }, e: { x: 0, y: 0, z: 0 }, c: [1, 1, 1, 1] },
            { n: { x: 0, y: -1, z: 0 }, e: { x: 180, y: 0, z: 0 }, c: [0.1, 0.1, 0.1, 1] },
            { n: { x: 1, y: 0, z: 0 }, e: { x: 0, y: 0, z: -90 }, c: [1, 0.85, 0.1, 1] },
            { n: { x: -1, y: 0, z: 0 }, e: { x: 0, y: 0, z: 90 }, c: [0.2, 0.9, 0.3, 1] },
            { n: { x: 0, y: 0, z: 1 }, e: { x: 90, y: 0, z: 0 }, c: [0.3, 0.5, 1, 1] },
            { n: { x: 0, y: 0, z: -1 }, e: { x: -90, y: 0, z: 0 }, c: [0.9, 0.3, 0.9, 1] }
        ];
        const height = Math.max(1, planet.radius * 0.2);
        for (const side of sides) {
            await shape(planet.name + " Marker", {
                position: vec.add(planet.centre, vec.scale(side.n, planet.radius + height / 2 - 0.1)),
                euler: side.e,
                layer: LAYER.ROCK,
                geometry: new BS.Cylinder({ radiusTop: 0.3, radiusBottom: 0.4, height, radialSegments: 12 }),
                collider: new BS.CapsuleCollider({ radius: 0.4, height }),
                rgba: side.c
            });
        }
        // Faint shell showing where the gravity well ends.
        await shape(planet.name + " Well", {
            position: planet.centre,
            geometry: new BS.Sphere({ radius: planet.wellRadius, widthSegments: 32, heightSegments: 16 }),
            material: {
                shaderName: "Unlit/DiffuseTransparent",
                color: new BS.Vector4(0.4, 0.7, 1, 0.06),
                side: BS.MaterialSide.Double
            }
        });
    }

    async function buildAsteroids() {
        for (const [i, rock] of ASTEROIDS.entries()) {
            await shape("Asteroid " + (i + 1), {
                position: { x: rock.p[0], y: rock.p[1], z: rock.p[2] },
                euler: { x: i * 37, y: i * 53, z: i * 19 },
                layer: LAYER.ROCK,
                geometry: new BS.Sphere({ radius: rock.r, widthSegments: 7, heightSegments: 5 }),
                collider: new BS.SphereCollider({ radius: rock.r }),
                rgba: [0.35, 0.32, 0.3, 1]
            });
        }
    }

    async function label(name, position, euler, text, fontSize, size, parent) {
        const config = { name, localPosition: V3(position), localEulerAngles: V3(euler) };
        if (parent) config.parent = parent;
        const obj = new BS.GameObject(config);
        return obj.AddComponent(new BS.Text({
            text,
            fontSize,
            richText: true,
            rectTransformSizeDelta: new BS.Vector2(size[0], size[1])
        }));
    }

    // --- Tuning board ---------------------------------------------------------

    async function buildTuningBoard() {
        // Turned to face the spawn point. Text reads from its object's -Z side.
        const board = new BS.GameObject({
            name: "Tuning Board",
            localPosition: new BS.Vector3(0, 1.6, -6.5),
            localEulerAngles: new BS.Vector3(0, 180, 0)
        });
        await board.AddComponent(new BS.Box({ width: 3.4, height: 2.6, depth: 0.05 }));
        await board.AddComponent(new BS.Material({ color: new BS.Vector4(0.08, 0.1, 0.14, 1) }));
        await label("Board Title", { x: 0, y: 1.05, z: -0.04 }, { x: 0, y: 0, z: 0 }, "<b>TUNING</b> (saved on this device)", 1, [3.2, 0.3], board);

        const rows = [
            { key: "planetGravity", label: "Planet gravity", step: 1, min: 1, max: 20, unit: " m/s²" },
            { key: "edgeGravityScale", label: "Gravity at well edge", step: 0.1, min: 0, max: 1, unit: "×" },
            { key: "blendTime", label: "Gravity turn time", step: 0.05, min: 0, max: 1, unit: " s" },
            { key: "webRange", label: "Web range", step: 5, min: 10, max: 120, unit: " m", settings: true },
            { key: "drag", label: "Player drag", step: 0.05, min: 0, max: 1, unit: "", settings: true },
            { key: "airControl", label: "Air steering", step: 0.5, min: 0, max: 5, unit: " m/s", settings: true }
        ];

        const refreshers = [];
        for (const [i, row] of rows.entries()) {
            const y = 0.7 - i * 0.3;
            await label(row.key + " Label", { x: -0.75, y, z: -0.04 }, { x: 0, y: 0, z: 0 }, row.label, 0.8, [1.7, 0.25], board);
            const value = await label(row.key + " Value", { x: 1.0, y, z: -0.04 }, { x: 0, y: 0, z: 0 }, "", 0.8, [0.6, 0.25], board);
            const show = () => { value.text = (+tuning[row.key].toFixed(2)) + row.unit; };
            show();
            refreshers.push(show);
            const change = async (sign) => {
                const next = Math.round((tuning[row.key] + sign * row.step) * 100) / 100;
                tuning[row.key] = Math.min(row.max, Math.max(row.min, next));
                show();
                saveTuning();
                if (row.settings) await applySettings();
            };
            await button(board, "−", { x: 0.55, y }, () => change(-1));
            await button(board, "+", { x: 1.45, y }, () => change(1));
        }

        await button(board, "Reset", { x: -0.9, y: -1.05 }, async () => {
            Object.assign(tuning, DEFAULTS);
            saveTuning();
            await applySettings();
            refreshers.forEach((show) => show());
        }, 0.6);
        await button(board, "Respawn", { x: 0.9, y: -1.05 }, respawn, 0.6);
    }

    async function button(parent, text, at, onClick, width = 0.22) {
        const obj = new BS.GameObject({
            name: "Button " + text,
            parent,
            layer: LAYER.UI, // only UI and Menu can be clicked
            localPosition: new BS.Vector3(at.x, at.y, -0.06)
        });
        await obj.AddComponent(new BS.Box({ width, height: 0.22, depth: 0.05 }));
        await obj.AddComponent(new BS.Material({ color: new BS.Vector4(0.2, 0.55, 0.9, 1) }));
        await obj.AddComponent(new BS.BoxCollider({ size: new BS.Vector3(width, 0.22, 0.05) }));
        await label("Button Text", { x: 0, y: 0, z: -0.03 }, { x: 0, y: 0, z: 0 }, "<b>" + text + "</b>", 0.9, [width, 0.22], obj);
        obj.On("click", onClick);
        return obj;
    }

    // --- HUD --------------------------------------------------------------------

    const hud = { text: null, object: null, visible: true, lastText: "" };

    async function buildHud() {
        const obj = new BS.GameObject({ name: "HUD" });
        hud.text = await obj.AddComponent(new BS.Text({
            text: "",
            fontSize: 0.35,
            richText: true,
            rectTransformSizeDelta: new BS.Vector2(1.2, 0.3)
        }));
        const attached = await obj.AddComponent(new BS.AttachedObject({
            uid: "me",
            avatarAttachmentPoint: BS.AvatarBoneName.HEAD,
            attachmentPosition: new BS.Vector3(0, -0.28, 1.0),
            autoSync: false // only you see your HUD
        }));
        await attached.Attach("me");
        hud.object = obj;
    }

    function updateHud(state) {
        if (!hud.text || !hud.visible) return;
        const g = vec.length(state.gravity);
        let line = state.source === "station" ? "Station surface"
            : state.source === "planet" ? state.planet.name + " (" + state.distanceToSurface.toFixed(1) + " m up)"
                : "Zero-g";
        if (state.outside) line += "   <color=#ff8040>OUT OF BOUNDS</color>";
        const text = line + "\n<size=80%>gravity " + g.toFixed(1) + " m/s²</size>";
        if (text !== hud.lastText) {
            hud.text.text = text;
            hud.lastText = text;
        }
    }

    // --- Gravity loop -------------------------------------------------------------

    let pose = null;
    let gravity = { x: 0, y: -STATION_GRAVITY, z: 0 };
    let sentGravity = null;
    let busy = false;
    let lastTick = performance.now();
    let lastPush = 0;

    scene.On("pose-update", (e) => { pose = e.detail; });

    function toPlain(v) { return { x: v.x, y: v.y, z: v.z }; }

    async function raycast(origin, direction, length) {
        const hit = await scene.Raycast(V3(origin), V3(direction), length, STATION_MASK);
        if (!hit) return null;
        const parts = hit.split("¶");
        return { normal: { x: Number(parts[5]), y: Number(parts[6]), z: Number(parts[7]) } };
    }

    async function chooseGravity(head, headRotation) {
        // "Down" for the rays: the way gravity points now, or the head's down in zero-g.
        let down = vec.normalize(gravity);
        if (vec.length(down) < 0.5) {
            const d = new BS.Vector3(0, -1, 0);
            d.ApplyQuaternion(headRotation);
            down = toPlain(d);
        }
        const fwd = new BS.Vector3(0, 0, 1);
        fwd.ApplyQuaternion(headRotation);
        const forwardDown = vec.normalize(vec.add(toPlain(fwd), down));

        // 1. Station surfaces, from rays (only the station layer counts).
        // Forward first: it's too short to reach the floor (1.8 m at 45° from
        // head height), so it only hits a wall right in front, letting you step onto it.
        const hit = (await raycast(head, forwardDown, FORWARD_RAY_LENGTH)) || (await raycast(head, down, DOWN_RAY_LENGTH));
        if (hit) return { source: "station", gravity: stationGravity(hit.normal) };

        // 2. Planets, from their gravity wells: keeps pulling even when rays miss.
        const well = findWell(head, PLANETS);
        if (well) {
            return {
                source: "planet",
                planet: well.planet,
                distanceToSurface: well.distance - well.planet.radius,
                gravity: planetGravity(head, well, tuning)
            };
        }

        // 3. Open space.
        return { source: "zero", gravity: { x: 0, y: 0, z: 0 } };
    }

    async function tick() {
        if (busy || !pose) return;
        busy = true;
        try {
            const now = performance.now();
            const dt = Math.min((now - lastTick) / 1000, 0.25);
            lastTick = now;

            const head = toPlain(pose.head.position);
            const state = await chooseGravity(head, pose.head.rotation);
            gravity = blendGravity(gravity, state.gravity, dt, tuning.blendTime);

            // Only send gravity when it has changed noticeably.
            if (!sentGravity || vec.length(vec.sub(gravity, sentGravity)) > 0.02) {
                sentGravity = gravity;
                await scene.Gravity(V3(gravity));
            }

            state.outside = outsideBoundary(head, ARENA);
            if (state.outside && now - lastPush > 500) {
                lastPush = now;
                const inward = vec.scale(vec.normalize(vec.sub(ARENA.centre, head)), ARENA.push);
                await scene.AddPlayerForce(V3(inward), BS.ForceMode.VelocityChange);
            }

            state.gravity = gravity;
            updateHud(state);
        } catch (e) {
            console.warn("gravity tick failed", e);
        } finally {
            busy = false;
        }
    }

    async function respawn() {
        gravity = { x: 0, y: -STATION_GRAVITY, z: 0 };
        sentGravity = gravity;
        await scene.Gravity(V3(gravity));
        await scene.TeleportTo(new BS.Vector3(SPAWN.x, SPAWN.y, SPAWN.z), SPAWN.yaw, true);
    }

    // --- Input --------------------------------------------------------------------

    scene.On("button-pressed", (e) => {
        if (e.detail.side !== BS.HandSide.LEFT) return;
        if (e.detail.button === BS.ButtonType.PRIMARY) respawn();          // X
        if (e.detail.button === BS.ButtonType.SECONDARY) toggleHud();      // Y
    });
    scene.On("key-press", (e) => {
        if (e.detail.key === BS.KeyCode.R) respawn();
        if (e.detail.key === BS.KeyCode.H) toggleHud();
    });

    function toggleHud() {
        hud.visible = !hud.visible;
        if (hud.object) hud.object.SetActive(hud.visible);
    }

    // --- Start ------------------------------------------------------------------

    scene.On("unity-loaded", async () => {
        await scene.Gravity(V3(gravity));
        await buildStation();
        await buildTuningBoard();
        for (const planet of PLANETS) await buildPlanet(planet);
        await buildAsteroids();
        await buildSky();
        await buildHud();
        setInterval(tick, TICK_MS);
    });
}

if (typeof window !== "undefined") {
    window.addEventListener("bs-loaded", startWorld);
}

if (typeof module !== "undefined") {
    module.exports = { vec, findWell, planetGravity, stationGravity, blendGravity, outsideBoundary, PLANETS, ASTEROIDS, ARENA, DEFAULTS, STATION_MASK, LAYER };
}
