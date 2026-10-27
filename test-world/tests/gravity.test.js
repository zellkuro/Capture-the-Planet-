// Run with: node --test test-world/tests
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const W = require(path.join(__dirname, "../WebRoot/script.js"));

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const planet = W.PLANETS[0];

test("planet gravity points at the centre at full strength on the surface", () => {
    const pos = W.vec.add(planet.centre, { x: planet.radius, y: 0, z: 0 });
    const well = W.findWell(pos, W.PLANETS);
    assert.strictEqual(well.planet, planet);
    const g = W.planetGravity(pos, well, W.DEFAULTS);
    assert.ok(near(g.x, -W.DEFAULTS.planetGravity) && near(g.y, 0) && near(g.z, 0));
});

test("planet gravity falls to the edge scale at the well's edge", () => {
    const pos = W.vec.add(planet.centre, { x: 0, y: planet.wellRadius - 1e-9, z: 0 });
    const g = W.planetGravity(pos, W.findWell(pos, W.PLANETS), W.DEFAULTS);
    assert.ok(near(W.vec.length(g), W.DEFAULTS.planetGravity * W.DEFAULTS.edgeGravityScale, 1e-6));
    assert.ok(g.y < 0);
});

test("no well outside every planet's range", () => {
    assert.strictEqual(W.findWell({ x: 0, y: 0, z: 0 }, W.PLANETS), null);
});

test("station gravity pushes into the surface", () => {
    const g = W.stationGravity({ x: 1, y: 0, z: 0 }); // a wall facing +x
    assert.ok(near(g.x, -9.81) && near(g.y, 0));
});

test("blending moves part of the way and never overshoots", () => {
    const from = { x: 0, y: -9.81, z: 0 }, to = { x: -9.81, y: 0, z: 0 };
    const g = W.blendGravity(from, to, 0.05, 0.25);
    assert.ok(g.x < 0 && g.x > -9.81 && g.y < 0 && g.y > -9.81);
    assert.deepStrictEqual(W.blendGravity(from, to, 0.05, 0), to);
});

test("gravity wells don't overlap", () => {
    for (let i = 0; i < W.PLANETS.length; i++) for (let j = i + 1; j < W.PLANETS.length; j++) {
        const a = W.PLANETS[i], b = W.PLANETS[j];
        assert.ok(W.vec.length(W.vec.sub(a.centre, b.centre)) > a.wellRadius + b.wellRadius, a.name + " / " + b.name);
    }
});

test("asteroids don't overlap planets", () => {
    for (const rock of W.ASTEROIDS) for (const p of W.PLANETS) {
        const c = { x: rock.p[0], y: rock.p[1], z: rock.p[2] };
        assert.ok(W.vec.length(W.vec.sub(c, p.centre)) > p.radius + rock.r + 1);
    }
});

test("every rock and planet can be reached from the station by web", () => {
    // Surfaces as spheres; the station deck as a sphere covering it.
    const range = W.DEFAULTS.webRange * 0.8; // keep a margin
    const nodes = [{ c: { x: 0, y: 0, z: 0 }, r: 7 }]
        .concat(W.ASTEROIDS.map((a) => ({ c: { x: a.p[0], y: a.p[1], z: a.p[2] }, r: a.r })))
        .concat(W.PLANETS.map((p) => ({ c: p.centre, r: p.radius })));
    const reached = new Set([0]), queue = [0];
    while (queue.length) {
        const i = queue.shift();
        nodes.forEach((n, j) => {
            const gap = W.vec.length(W.vec.sub(n.c, nodes[i].c)) - n.r - nodes[i].r;
            if (!reached.has(j) && gap <= range) { reached.add(j); queue.push(j); }
        });
    }
    assert.strictEqual(reached.size, nodes.length);
});

test("everything stays inside the boundary and above the SDK reset height", () => {
    for (const p of W.PLANETS) {
        assert.ok(!W.outsideBoundary(p.centre, W.ARENA));
        assert.ok(p.centre.y - p.wellRadius > -250);
    }
});

test("gravity rays only see the station layer", () => {
    assert.strictEqual(W.STATION_MASK, 1 << 7);
});
