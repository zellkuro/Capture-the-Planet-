// Loads script.js against a fake SDK and runs the start-up and a few gravity
// ticks, to catch typos and wrong calls before trying it in the app.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function fakeSdk(log) {
    class Vec { constructor(x = 0, y = 0, z = 0, w = 0) { Object.assign(this, { x, y, z, w }); } ApplyQuaternion() { return this; } }
    const handlers = {};
    const component = (type) => class { constructor(cfg) { Object.assign(this, cfg); this.type = type; } async Attach() {} };
    const scene = {
        components: {},
        On: (name, fn) => { (handlers[name] = handlers[name] || []).push(fn); },
        SetSettings: async (s) => log.push(["settings", { ...s }]),
        Gravity: async (g) => log.push(["gravity", g]),
        Raycast: async () => null,
        TeleportTo: async () => log.push(["teleport"]),
        AddPlayerForce: async (f) => log.push(["push", f])
    };
    const BS = new Proxy({
        Scene: { GetInstance: () => scene },
        Vector2: Vec, Vector3: Vec, Vector4: Vec,
        SceneSettings: class {},
        GameObject: class {
            constructor(cfg) { if (!cfg || !cfg.name) throw new Error("GameObject needs a name"); this.cfg = cfg; }
            async AddComponent(c) { return c; }
            On() {} SetActive() {}
        },
        LightType: { Directional: 1 }, MaterialSide: { Double: 2 }, ForceMode: { VelocityChange: 2 },
        AvatarBoneName: { HEAD: 0 }, HandSide: { LEFT: 0 }, ButtonType: { PRIMARY: 2, SECONDARY: 3 },
        KeyCode: { R: 114, H: 104 }
    }, {
        get(target, key) {
            if (key in target) return target[key];
            const known = ["Box", "Sphere", "Cylinder", "Material", "BoxCollider", "SphereCollider",
                "CapsuleCollider", "Light", "Text", "InvertedMesh", "AttachedObject"];
            if (known.includes(key)) return (target[key] = component(key));
            throw new Error("script used BS." + String(key) + ", which the smoke test doesn't know");
        }
    });
    return { BS, handlers };
}

test("world starts and gravity responds to position", async () => {
    const log = [];
    const { BS, handlers } = fakeSdk(log);
    const listeners = {};
    const intervals = [];
    const context = {
        BS, console, Math,
        performance: { now: (() => { let t = 0; return () => (t += 50); })() }, JSON, Number, Object, Promise,
        localStorage: { getItem: () => null, setItem: () => {} },
        setInterval: (fn) => intervals.push(fn),
        window: { addEventListener: (name, fn) => (listeners[name] = fn) }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../WebRoot/script.js"), "utf8"), context);

    listeners["bs-loaded"]();
    assert.ok(log.some(([k, s]) => k === "settings" && s.EnableSpiderMan === true && s.EnableTeleport === false));

    for (const fn of handlers["unity-loaded"]) await fn();
    assert.strictEqual(intervals.length, 1);

    const tickAt = async (x, y, z) => {
        for (const fn of handlers["pose-update"]) fn({ detail: { head: { position: { x, y, z }, rotation: {} } } });
        for (let i = 0; i < 40; i++) await intervals[0]();
        return log.filter(([k]) => k === "gravity").pop()[1];
    };

    const onPlanet = await tickAt(0, 11.6, 50); // standing on top of the test planet
    assert.ok(onPlanet.y < -8 && Math.abs(onPlanet.x) < 0.1, JSON.stringify(onPlanet)); // ~8.7 m/s² at 1.6 m up

    const open = await tickAt(-20, 25, 20); // empty space
    assert.ok(Math.hypot(open.x, open.y, open.z) < 0.1);

    await tickAt(0, 0, 200); // past the boundary
    assert.ok(log.some(([k]) => k === "push"));
});
