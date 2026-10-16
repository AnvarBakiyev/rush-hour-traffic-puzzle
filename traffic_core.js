// The "traffic" language and its handler: a little city of crossings, simulated step by step.
// The player decides what stands at every crossing and how the lights work; the handler checks it and runs rush hour.
// Deterministic: the same rules on the same level give the same day, car by car (seeded random, fixed step).
//
//   # a comment
//   A: light, north-south 12, east-west 8   a traffic light with a fixed plan, green to each street in seconds
//   A: light, longest queue, min 5, max 25  a light that gives green to the street with the longer queue
//   A: light, offset 4                      the light starts its plan 4 s later (green waves)
//   B: main north-south                     no light: the north-south street has the right of way
//   C: stop                                 no light: everyone stops, then goes in the order they came
//   D: box                                  a box junction: nobody drives in unless they can drive out
//   ambulance first                         lights turn green for an ambulance; signs let it through
// A city has only so many traffic lights. Russian words work too: «светофор», «главная север-юг», «стоп»,
// «вафельная разметка», «пропускать скорую», «самая длинная очередь», «сдвиг», «все».

export const DT = 0.1;
export const CAR = 1.9;
export const VMAX = 7.5;
export const ACC = 5.5, BRAKE = 11;
export const SPACING = 15;
export const BOX = 2.7;
export const YELLOW = 2;
export const MIN_GREEN = 3, MAX_GREEN = 40, MAX_CYCLE = 70;
export const AMB_SEE = 30;          // a light sees an ambulance this far away
export const HEADINGS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
export const AXIS = { N: "ns", S: "ns", E: "ew", W: "ew" };
const LEFT = { N: "W", W: "S", S: "E", E: "N" }, RIGHT = { N: "E", E: "S", S: "W", W: "N" };

export const LEVELS = {
  district: {
    name: ["Our district", "Наш район"],
    story: ["Six crossings and only two traffic lights. Right now every crossing is a stop: everyone stops and waits their turn, and the district stands.", "Шесть перекрёстков и всего два светофора. Сейчас на каждом перекрёстке «стоп»: все останавливаются и ждут очереди, и район стоит."],
    hint: ["Put the two lights where the most cars cross. On the others, give one street the right of way. And look where cars drive into a crossing and get stuck in it.", "Поставь два светофора туда, где больше всего машин. На остальных дай одной улице главную. И посмотри, где машины въезжают на перекрёсток и застревают на нём."],
    cols: 3, rows: 2, seconds: 150, seed: 41, lights: 2,
    start: {},
    flows: { W: 0.42, E: 0.34, N: 0.2, S: 0.2 },
    turns: { straight: 0.7, right: 0.17, left: 0.13 },
    ambulances: [],
    goals: { delivered: 270, wait: 17, stuck: 140 },
    ducks: [{ at: 70, link: "B" + "S" }],
  },
  ambulance: {
    name: ["The ambulance", "Скорая"],
    story: ["Nine crossings, three lights. Every forty seconds an ambulance drives in from the west and has to cross the whole city along the middle street.", "Девять перекрёстков, три светофора. Каждые сорок секунд с запада въезжает скорая, и ей надо пересечь весь город по средней улице."],
    hint: ["The ambulance drives straight along the middle row: D, E, F. Let it through, and keep that street moving even when no ambulance is in sight.", "Скорая едет прямо по среднему ряду: D, E, F. Пропускай её и держи эту улицу свободной, даже когда скорой не видно."],
    cols: 3, rows: 3, seconds: 160, seed: 53, lights: 3,
    start: { A: "light", C: "light", I: "light" },
    flows: { W: 0.3, E: 0.26, N: 0.2, S: 0.2 },
    turns: { straight: 0.7, right: 0.17, left: 0.13 },
    ambulances: [{ at: 20, gate: "W1" }, { at: 60, gate: "W1" }, { at: 100, gate: "W1" }, { at: 140, gate: "W1" }],
    goals: { delivered: 330, wait: 15, ambulance: 14 },
    ducks: [],
  },
  gridlock: {
    name: ["The jam of the century", "Пробка века"],
    story: ["Twelve crossings, four lights, Friday evening. Drivers drive into every crossing they can and block it for everyone else. Untangle the city.", "Двенадцать перекрёстков, четыре светофора, вечер пятницы. Водители въезжают на любой перекрёсток и запирают его для всех остальных. Распутай город."],
    hint: ["A box junction stops cars from driving into a crossing they cannot leave. Start with the crossings where everything stands, then think about the lights.", "Вафельная разметка не даёт въехать на перекрёсток, с которого не выехать. Начни с перекрёстков, где стоит всё, а потом думай о светофорах."],
    cols: 4, rows: 3, seconds: 170, seed: 67, lights: 4,
    start: { F: "light", G: "light" },
    flows: { W: 0.26, E: 0.26, N: 0.2, S: 0.2 },
    burst: { from: 50, to: 110, gates: ["N1", "N2"], rate: 0.25 },
    turns: { straight: 0.66, right: 0.18, left: 0.16 },
    ambulances: [{ at: 40, gate: "W1" }, { at: 120, gate: "N2" }],
    goals: { delivered: 390, wait: 15, ambulance: 30 },
    ducks: [{ at: 90, link: "J" + "E" }],
  },
};

// ---------------------------------------------------------------- random numbers every device draws the same way
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rnd1 = x => Math.floor(x * 10 + 0.5) / 10;
export const rnd0 = x => Math.floor(x + 0.5);

// ---------------------------------------------------------------- the language
export const crossNames = level => {
  const out = [];
  for (let j = 0; j < level.rows; j++) for (let i = 0; i < level.cols; i++) out.push(String.fromCharCode(65 + j * level.cols + i));
  return out;
};
export const lightNames = crossNames;
const W_NS = ["north-south", "ns", "север-юг", "сю"], W_EW = ["east-west", "ew", "запад-восток", "восток-запад", "зв"];
const W_LONGEST = ["longest queue", "самая длинная очередь", "длинная очередь"];
const W_LIGHT = ["light", "светофор"], W_STOP = ["stop", "стоп"];
const W_MAIN = ["main", "главная"];
const W_BOX = ["box", "вафля", "вафельная разметка"], W_NOBOX = ["no box", "без вафли", "без разметки"];
const W_AMB = ["ambulance first", "пропускать скорую", "скорая первая"];
const PLAN_KEYS = ["ns", "ew", "longest", "min", "max", "offset"];
const isNum = s => /^-?[0-9]{1,4}$/.test(s);

export function defaultCross() { return { type: "stop", mode: "fixed", ns: 15, ew: 15, min: 5, max: 25, offset: 0, box: false }; }

export function parse(text, level) {
  const names = crossNames(level);
  const cross = {}, problems = [];
  for (const n of names) cross[n] = Object.assign(defaultCross(), { type: (level.start || {})[n] || "stop" });
  let ambulanceFirst = false;
  String(text || "").split("\n").forEach((raw, i) => {
    const line = raw.split("#")[0].trim().toLowerCase();
    if (!line) return;
    const at = line.indexOf(":");
    if (at < 0) {
      if (W_AMB.includes(line.split(" ").filter(Boolean).join(" "))) { ambulanceFirst = true; return; }
      problems.push(`line ${i + 1}: a rule is "<crossing>: <what stands there>", for example "A: light, north-south 12, east-west 8", or "ambulance first"`);
      return;
    }
    const who = line.slice(0, at).trim(), what = line.slice(at + 1).trim();
    const everyone = who === "all" || who === "все";
    const targets = everyone ? names : names.filter(n => n.toLowerCase() === who);
    if (!targets.length) { problems.push(`line ${i + 1}: there is no crossing "${who.toUpperCase()}" here; the crossings are ${names.join(", ")}`); return; }
    const parts = what.split(",").map(s => s.trim()).filter(Boolean);
    const upd = {};
    let bad = null;
    for (const p of parts) {
      const words = p.split(" ").filter(Boolean), joined = words.join(" ");
      if (W_LIGHT.includes(joined)) { upd.type = "light"; continue; }
      if (W_STOP.includes(joined)) { upd.type = "stop"; continue; }
      if (W_BOX.includes(joined)) { upd.box = true; continue; }
      if (W_NOBOX.includes(joined)) { upd.box = false; continue; }
      if (W_LONGEST.includes(joined)) { upd.mode = "longest"; upd.longest = true; continue; }
      if (W_MAIN.includes(words[0]) && words.length > 1) {
        const rest = words.slice(1).join(" ");
        if (W_NS.includes(rest)) { upd.type = "main-ns"; continue; }
        if (W_EW.includes(rest)) { upd.type = "main-ew"; continue; }
        bad = `"${p}": the main street is north-south or east-west`; break;
      }
      const last = words[words.length - 1], head = words.slice(0, -1).join(" ");
      if (!isNum(last)) { bad = `"${p}" is not something a crossing can have; use light, main north-south, main east-west, stop, box, or a plan for a light`; break; }
      const num = parseInt(last, 10);
      if (W_NS.includes(head) || W_EW.includes(head)) {
        if (num < MIN_GREEN) { bad = `green for ${num} s is too short: a car needs ${MIN_GREEN} s just to start`; break; }
        if (num > MAX_GREEN) { bad = `green for ${num} s is too long: the other street would wait more than ${MAX_GREEN} s`; break; }
        upd[W_NS.includes(head) ? "ns" : "ew"] = num; upd.mode = upd.mode || "fixed"; continue;
      }
      if (head === "offset" || head === "сдвиг") { if (num < 0 || num > 60) { bad = `offset ${num} s: an offset is between 0 and 60 s`; break; } upd.offset = num; continue; }
      if (head === "min" || head === "мин") { if (num < MIN_GREEN || num > MAX_GREEN) { bad = `min ${num} s: it must be between ${MIN_GREEN} and ${MAX_GREEN}`; break; } upd.min = num; continue; }
      if (head === "max" || head === "макс") { if (num < MIN_GREEN || num > MAX_GREEN) { bad = `max ${num} s: it must be between ${MIN_GREEN} and ${MAX_GREEN}`; break; } upd.max = num; continue; }
      bad = `"${p}" is not something a crossing can have; use light, main north-south, main east-west, stop, box, or a plan for a light`; break;
    }
    if (bad) { problems.push(`line ${i + 1}: ${bad}`); return; }
    if ((upd.ns === undefined) !== (upd.ew === undefined)) {
      problems.push(`line ${i + 1}: a plan gives green to both streets; "${upd.ns === undefined ? "north-south" : "east-west"}" is missing, and that street would never move`); return;
    }
    const hasPlan = PLAN_KEYS.some(k => upd[k] !== undefined);
    for (const n of targets) {
      const c = cross[n];
      const type = upd.type || c.type;
      if (hasPlan && type !== "light") { problems.push(`line ${i + 1}: crossing ${n} has no traffic light, so it cannot have a plan of greens; write "${n}: light, ..."`); return; }
      for (const k of ["type", "mode", "ns", "ew", "min", "max", "offset", "box"]) if (upd[k] !== undefined) c[k] = upd[k];
      if (upd.ns !== undefined && !upd.longest) c.mode = "fixed";
      if (c.min > c.max) { problems.push(`line ${i + 1}: min ${c.min} s is longer than max ${c.max} s`); return; }
      if (c.type === "light" && c.mode === "fixed" && c.ns + c.ew + 2 * YELLOW > MAX_CYCLE) { problems.push(`line ${i + 1}: a cycle of ${c.ns + c.ew + 2 * YELLOW} s at ${n} is longer than ${MAX_CYCLE} s; walkers would wait too long`); return; }
    }
  });
  const lit = names.filter(n => cross[n].type === "light");
  if (lit.length > level.lights) problems.push(`the city has only ${level.lights} traffic lights, but the rules put lights on ${lit.length} crossings: ${lit.join(", ")}`);
  return { cross, ambulanceFirst, problems };
}

// the rules written out from a city plan (what the buttons write)
export function writeRules(level, cross, ambulanceFirst) {
  const lines = ["# " + "the rules of the city"];
  for (const n of crossNames(level)) {
    const c = cross[n], parts = [];
    if (c.type === "light") {
      parts.push("light");
      if (c.mode === "longest") parts.push("longest queue", "min " + c.min, "max " + c.max);
      else parts.push("north-south " + c.ns, "east-west " + c.ew);
      if (c.offset) parts.push("offset " + c.offset);
    } else if (c.type === "main-ns") parts.push("main north-south");
    else if (c.type === "main-ew") parts.push("main east-west");
    else parts.push("stop");
    if (c.box) parts.push("box");
    lines.push(n + ": " + parts.join(", "));
  }
  if (ambulanceFirst) lines.push("ambulance first");
  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------- the city: crossings, links, gates
export function buildCity(level) {
  const nodes = [], links = {}, gates = [];
  const names = crossNames(level);
  for (let j = 0; j < level.rows; j++) for (let i = 0; i < level.cols; i++) nodes.push({ i, j, name: names[j * level.cols + i], x: i * SPACING, z: j * SPACING });
  const node = (i, j) => nodes.find(n => n.i === i && n.j === j);
  const len = SPACING - 2 * BOX, stub = SPACING - BOX;
  for (const n of nodes) {
    for (const h of "NSEW") {
      const [dx, dz] = HEADINGS[h];
      const nb = node(n.i + dx, n.j + dz);
      links[`${n.name}${h}`] = { id: `${n.name}${h}`, h, from: n.name, to: nb ? nb.name : null, x0: n.x + dx * BOX, z0: n.z + dz * BOX, len: nb ? len : stub, cars: [], gate: false, queue: 0 };
      const back = { N: "S", S: "N", E: "W", W: "E" }[h];
      const [bx, bz] = HEADINGS[back];
      if (!node(n.i + bx, n.j + bz)) {
        const gid = { S: "N" + n.i, N: "S" + n.i, E: "W" + n.j, W: "E" + n.j }[h];
        const id = `in-${n.name}${h}`;
        links[id] = { id, h, from: null, to: n.name, x0: n.x + bx * SPACING, z0: n.z + bz * SPACING, len: stub, cars: [], gate: true, gateId: gid, queue: 0 };
        gates.push({ id: gid, link: id, side: gid[0] });
      }
    }
  }
  return { nodes, links, gates, names };
}
export const linkPoint = (lk, s) => {
  const [dx, dz] = HEADINGS[lk.h];
  return { x: lk.x0 + dx * s - dz * 1.15, z: lk.z0 + dz * s + dx * 1.15 };
};

// ---------------------------------------------------------------- one rush hour
export function simulate(levelKey, rulesText, opts = {}) {
  const level = LEVELS[levelKey];
  const { cross, ambulanceFirst, problems } = parse(rulesText, level);
  if (problems.length) return { problems };
  const city = buildCity(level);
  const R = rng(level.seed), V = rng(level.seed + 999);
  const linkList = Object.values(city.links);
  const nodes = {};
  for (const n of city.nodes) {
    const c = cross[n.name];
    Object.assign(n, { cfg: c, phase: "ns", yellow: 0, t: -c.offset, green: c.mode === "fixed" ? c.ns : c.min, box: [] });
    nodes[n.name] = n;
  }
  const inLinks = {};
  for (const n of city.nodes) inLinks[n.name] = { N: null, S: null, E: null, W: null };
  for (const lk of linkList) if (lk.to && !inLinks[lk.to][lk.h]) inLinks[lk.to][lk.h] = lk;
  const cars = [];
  let nextId = 1, t = 0;
  const stats = { delivered: 0, spawned: 0, waitSum: 0, tripSum: 0, maxQueue: 0, gateWaiting: 0, honks: 0, doors: 0 };
  const pending = Object.fromEntries(city.gates.map(g => [g.id, []]));
  const ambPending = Object.fromEntries(city.gates.map(g => [g.id, []]));
  const ambs = (level.ambulances || []).map(a => ({ at: a.at, gate: a.gate, done: false, car: null }));
  const ducks = (level.ducks || []).map(d => ({ at: d.at, link: d.link, until: d.at + 4.5 }));
  const record = opts.record !== false;
  const COLORS = ["#ef8a6f", "#f2c14e", "#7cc4a0", "#7fb2e5", "#c39be0", "#f39fb5", "#5fc6c9", "#ffb36b"];
  const steps = Math.floor(level.seconds / DT + 0.5);
  const frames = [];

  const queueAt = (n, axis) => {
    let q = 0;
    for (const h of axis === "ns" ? "NS" : "EW") {
      const lk = inLinks[n.name][h];
      if (lk) for (const c of lk.cars) if (c.v < 0.5 && lk.len - c.s < 14) q++;
    }
    return q;
  };
  const roomAt = lk => !lk.cars.length || lk.cars[lk.cars.length - 1].s > CAR * 1.15;
  const ambAxis = n => {
    for (const h of "NSEW") {
      const lk = inLinks[n.name][h];
      if (!lk) continue;
      for (const c of lk.cars) if (c.amb && lk.len - c.s < AMB_SEE) return AXIS[h];
    }
    return null;
  };
  const canEnter = (n, c, h, outLk) => {
    for (const b of n.box) { if (b.from === h) return false; if (AXIS[b.from] !== AXIS[h]) return false; }
    if (n.cfg.box && !roomAt(outLk)) return false;
    const amb = c.amb && ambulanceFirst;
    const type = n.cfg.type;
    if (type === "light") return amb || (!n.yellow && n.phase === AXIS[h]);
    if (amb) return true;
    if (type === "main-ns" || type === "main-ew") {
      const main = type === "main-ns" ? "ns" : "ew";
      if (AXIS[h] === main) return true;
      for (const mh of main === "ns" ? "NS" : "EW") {
        const lk = inLinks[n.name][mh];
        if (!lk || !lk.cars.length) continue;
        const f = lk.cars[0];
        if (lk.len - f.s < 7 && (f.v > 0.5 || lk.len - f.s < 1.2)) return false;
      }
      return true;
    }
    // stop: stop first, then go in the order of arrival
    if (c.arrive < 0) return false;
    for (const hh of "NSEW") {
      const lk = inLinks[n.name][hh];
      if (!lk || !lk.cars.length || lk.cars[0] === c) continue;
      const f = lk.cars[0];
      if (f.arrive >= 0 && f.arrive < c.arrive) return false;
    }
    return n.box.length === 0;
  };

  for (let step = 0; step < steps; step++) {
    t = step * DT;
    // traffic lights
    for (const n of city.nodes) {
      const p = n.cfg;
      if (p.type !== "light") continue;
      n.t += DT;
      if (n.t < 0) continue;
      if (n.yellow > 0) {
        n.yellow -= DT;
        if (n.yellow <= 1e-9) { n.yellow = 0; n.phase = n.phase === "ns" ? "ew" : "ns"; n.t = 0; n.green = p.mode === "fixed" ? p[n.phase] : p.min; }
        continue;
      }
      const amb = ambulanceFirst ? ambAxis(n) : null;
      if (amb) { if (n.phase !== amb) n.yellow = YELLOW; continue; }
      if (p.mode === "fixed") { if (n.t >= n.green - 1e-9) n.yellow = YELLOW; }
      else {
        const mine = queueAt(n, n.phase), other = queueAt(n, n.phase === "ns" ? "ew" : "ns");
        if (n.t >= p.max - 1e-9 || (n.t >= p.min - 1e-9 && other > mine)) n.yellow = YELLOW;
      }
    }
    // ambulances get called
    for (const a of ambs) if (!a.called && t >= a.at) { a.called = true; ambPending[a.gate].push(a); }
    // gates
    for (const g of city.gates) {
      let rate = level.flows[g.side] || 0;
      if (level.burst && t >= level.burst.from && t < level.burst.to && level.burst.gates.includes(g.id)) rate += level.burst.rate;
      if (R() < rate * DT) pending[g.id].push(t);
      const lk = city.links[g.link];
      if (roomAt(lk) && !(lk.cars.length && lk.cars[lk.cars.length - 1].s < CAR * 1.6)) {
        if (ambPending[g.id].length) {
          const a = ambPending[g.id].shift();
          const c = { id: nextId++, link: lk.id, s: 0, v: VMAX * 0.7, born: a.at, wait: t - a.at, color: "#ffffff", kind: "amb", amb: true, box: null, still: 0, turn: null, gone: -1, arrive: -1 };
          a.car = c; lk.cars.push(c); cars.push(c);
        } else if (pending[g.id].length) {
          const wanted = pending[g.id].shift();
          const color = COLORS[Math.floor(R() * COLORS.length)];
          const kind = R() < 0.12 ? "van" : (R() < 0.1 ? "bus" : "car");
          const c = { id: nextId++, link: lk.id, s: 0, v: VMAX * 0.7, born: wanted, wait: t - wanted, color, kind, amb: false, box: null, still: 0, turn: null, gone: -1, arrive: -1 };
          lk.cars.push(c); cars.push(c); stats.spawned++;
        }
      }
      stats.gateWaiting += pending[g.id].length * DT;
    }
    // cars on links
    for (const lk of linkList) {
      const n = lk.to ? nodes[lk.to] : null;
      let k = 0;
      while (k < lk.cars.length) {
        const c = lk.cars[k];
        let gap = 1e9;
        if (k > 0) gap = lk.cars[k - 1].s - c.s - CAR;
        for (const d of ducks) if (d.link === lk.id && t >= d.at && t < d.until && c.s < lk.len * 0.5) gap = Math.min(gap, lk.len * 0.5 - 1.2 - c.s);
        const toEnd = lk.len - c.s;
        if (n) {
          if (!c.turn) {
            if (c.amb) c.turn = "straight";
            else { const r = R(), tr = level.turns; c.turn = r < tr.straight ? "straight" : (r < tr.straight + tr.right ? "right" : "left"); }
          }
          const out = c.turn === "straight" ? lk.h : (c.turn === "right" ? RIGHT[lk.h] : LEFT[lk.h]);
          if (k === 0 && c.arrive < 0 && toEnd < 0.6 && c.v < 0.3) c.arrive = t;
          const may = k === 0 && canEnter(n, c, lk.h, city.links[n.name + out]);
          if (!may) gap = Math.min(gap, toEnd - 0.15);
          if (may && toEnd < 0.35) {
            lk.cars.shift();
            c.box = { node: n.name, from: lk.h, to: out, turn: c.turn, p: 0, dur: c.turn === "left" ? 1.3 : (c.turn === "right" ? 0.75 : 0.95) };
            n.box.push(c.box); c.link = null; c.turn = null; c.arrive = -1;
            continue;
          }
        } else if (toEnd <= 0) {
          lk.cars.shift();
          c.gone = t;
          if (!c.amb) { stats.delivered++; stats.tripSum += t - c.born; stats.waitSum += c.wait; }
          continue;
        }
        const target = Math.max(0, Math.min(VMAX, (gap - 0.25) * 1.9));
        c.v += Math.max(-BRAKE * DT, Math.min(ACC * DT, target - c.v));
        if (c.v < 0) c.v = 0;
        c.s += c.v * DT;
        if (c.v < 0.4) { c.wait += DT; c.still += DT; } else c.still = 0;
        k++;
      }
    }
    // cars inside crossings: they leave only when there is room behind the crossing
    for (const n of city.nodes) {
      let k = 0;
      while (k < n.box.length) {
        const b = n.box[k];
        if (b.p < 1) b.p = Math.min(1, b.p + DT / b.dur);
        const lk = city.links[n.name + b.to];
        if (b.p >= 1 && roomAt(lk)) {
          let c = null;
          for (const x of cars) if (x.box === b) { c = x; break; }
          n.box.splice(k, 1);
          c.box = null; c.link = lk.id; c.s = 0.05; c.v = Math.max(c.v, 3);
          lk.cars.push(c);
          lk.cars.sort((a, b2) => b2.s - a.s);
          continue;
        }
        if (b.p >= 1) { const c = cars.find(x => x.box === b); c.wait += DT; c.still += DT; c.v = 0; }
        k++;
      }
    }
    for (const lk of linkList) {
      if (!lk.to) continue;
      let q = 0;
      for (const c of lk.cars) if (c.v < 0.5) q++;
      if (lk.gate) q += pending[lk.gateId].length;
      lk.queue = q;
      if (q > stats.maxQueue) stats.maxQueue = q;
    }
    if (record && step % 2 === 0) {
      for (const c of cars) {
        if (c.gone >= 0 || c.amb) continue;
        if (c.still > 3 && !c.honked && V() < 0.02) { c.honked = t; stats.honks++; }
        if (c.still > 9 && !c.door && c.link) { c.door = t; stats.doors++; }
        if ((c.still < 0.5 || !c.link) && c.door && t - c.door > 2) c.door = 0;
        if (c.honked && t - c.honked > 1.2) c.honked = 0;
      }
      frames.push(snapshot(t, city, cars, nodes, ducks, cross));
    }
  }
  let leftWait = 0, left = 0;
  for (const c of cars) if (c.gone < 0 && !c.amb) { leftWait += c.wait; left++; }
  for (const g of city.gates) for (const w of pending[g.id]) { leftWait += t - w; left++; }
  let ambSum = 0, ambN = 0, ambWorst = 0;
  for (const a of ambs) {
    const time = a.car && a.car.gone >= 0 ? a.car.gone - a.at : t - a.at;
    if (a.at < t) { ambSum += time; ambN++; if (time > ambWorst) ambWorst = time; }
  }
  const delivered = stats.delivered;
  const result = {
    delivered, spawned: stats.spawned,
    avgWait: delivered + left ? rnd1((stats.waitSum + leftWait) / (delivered + left)) : 0,
    stuck: left,
    avgTrip: delivered ? rnd1(stats.tripSum / delivered) : 0,
    maxQueue: stats.maxQueue, gateWait: rnd0(stats.gateWaiting),
    ambulances: ambN, ambulance: ambN ? rnd1(ambSum / ambN) : 0, ambulanceWorst: rnd1(ambWorst),
    honks: stats.honks, doors: stats.doors,
  };
  result.stars = stars(level, result);
  result.sha = fingerprint(result);
  return { problems: [], result, frames, city, cross, ambulanceFirst };
}

export function stars(level, r) {
  const g = level.goals;
  return (r.delivered >= g.delivered ? 1 : 0) + (r.avgWait <= g.wait ? 1 : 0) + (level.ambulances && level.ambulances.length ? (r.ambulance <= g.ambulance ? 1 : 0) : (r.stuck <= g.stuck ? 1 : 0));
}

function snapshot(t, city, cars, nodes, ducks, cross) {
  const out = { t, cars: [], lights: {}, ducks: [], delivered: 0, standing: 0 };
  for (const c of cars) {
    if (c.gone >= 0) { if (!c.amb) out.delivered++; continue; }
    let x, z, h;
    if (c.link) {
      const lk = city.links[c.link];
      const p = linkPoint(lk, c.s); x = p.x; z = p.z; h = lk.h;
      if (c.v < 0.5) out.standing++;
    } else if (c.box) {
      const n = nodes[c.box.node];
      const a = HEADINGS[c.box.from], b = HEADINGS[c.box.to];
      const start = { x: n.x - a[0] * BOX - a[1] * 1.15, z: n.z - a[1] * BOX + a[0] * 1.15 };
      const end = { x: n.x + b[0] * BOX - b[1] * 1.15, z: n.z + b[1] * BOX + b[0] * 1.15 };
      const p = c.box.p, span = (Math.abs(end.x - start.x) + Math.abs(end.z - start.z)) * 0.5;
      const ctrl = c.box.turn === "straight" ? { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 } : { x: start.x + a[0] * span, z: start.z + a[1] * span };
      x = (1 - p) * (1 - p) * start.x + 2 * (1 - p) * p * ctrl.x + p * p * end.x;
      z = (1 - p) * (1 - p) * start.z + 2 * (1 - p) * p * ctrl.z + p * p * end.z;
      h = p < 0.5 ? c.box.from : c.box.to;
      if (p >= 1) out.standing++;
    } else continue;
    out.cars.push({ id: c.id, x: +x.toFixed(2), z: +z.toFixed(2), h, v: +c.v.toFixed(2), color: c.color, kind: c.kind, door: c.door ? 1 : 0, honk: c.honked ? 1 : 0, box: c.box ? { from: c.box.from, to: c.box.to, p: +c.box.p.toFixed(2) } : null });
  }
  for (const n of city.nodes) {
    const q = h => { const lk = Object.values(city.links).find(l => l.to === n.name && l.h === h); return lk ? (lk.queue || 0) : 0; };
    out.lights[n.name] = { type: cross[n.name].type, phase: n.phase, yellow: n.yellow > 0, q: { N: q("N"), S: q("S"), E: q("E"), W: q("W") }, jam: n.box.some(b => b.p >= 1) };
  }
  for (const d of ducks) if (t >= d.at && t < d.until) out.ducks.push({ link: d.link, p: (t - d.at) / (d.until - d.at) });
  return out;
}

export function fingerprint(r) {
  const s = [r.delivered, r.spawned, r.avgWait, r.avgTrip, r.maxQueue, r.gateWait, r.ambulance, r.stuck].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0");
}
