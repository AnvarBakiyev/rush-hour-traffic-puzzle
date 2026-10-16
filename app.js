import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { LEVELS, SPACING, BOX, HEADINGS, AXIS, simulate, parse, buildCity, linkPoint, crossNames, writeRules } from "./traffic_core.js";

// ---------------------------------------------------------------- words
const T = {
  title: ["Rush hour", "Час пик"],
  sub: ["The city is jammed. Decide what stands at every crossing and get everyone home.", "Город стоит в пробках. Реши, что стоит на каждом перекрёстке, и развези всех по домам."],
  city: ["Your city", "Твой город"], budget: ["lights: {u} of {n}", "светофоров: {u} из {n}"],
  t_light: ["Traffic light", "Светофор"], "t_main-ns": ["Main ↕", "Главная ↕"], "t_main-ew": ["Main ↔", "Главная ↔"], t_stop: ["Stop", "Стоп"],
  s_light: ["light", "свет"], "s_main-ns": ["main", "глав"], "s_main-ew": ["main", "глав"], s_stop: ["stop", "стоп"],
  p_ns: ["↕ longer", "↕ дольше"], p_eq: ["Equal", "Поровну"], p_ew: ["↔ longer", "↔ дольше"], p_smart: ["Smart", "Умный"],
  o_0: ["no offset", "без сдвига"], o_3: ["+3 s", "+3 с"], o_6: ["+6 s", "+6 с"],
  cross: ["Crossing {n}", "Перекрёсток {n}"],
  n_light: ["green goes in turns", "зелёный по очереди"], "n_main-ns": ["↕ goes first, ↔ gives way", "↕ едет первой, ↔ уступает"], "n_main-ew": ["↔ goes first, ↕ gives way", "↔ едет первой, ↕ уступает"], n_stop: ["everyone stops, then goes in turn", "все стоят и едут по очереди"],
  no_lights_left: ["all lights are in use; take one away first", "все светофоры уже стоят; сначала сними один"],
  box_label: ["Box junction: nobody drives in unless they can drive out", "Вафельная разметка: не въезжать, если не выехать"],
  amb_label: ["Let the ambulance through", "Пропускать скорую"],
  advanced: ["Rules as text, for the curious", "Правила текстом — для продвинутых"],
  siren: ["wee-woo!", "уи-уи!"],
  g_amb: ["the ambulance crosses in under {n} s", "скорая проезжает быстрее {n} с"], g_stuck: ["no more than {n} cars still stuck at the end", "к концу в пробке не больше {n} машин"],
  r_amb: ["the ambulance took {a} s on average", "скорая ехала в среднем {a} с"],
  rules: ["Rules of the city", "Правила города"],
  run: ["Start rush hour", "Запустить час пик"], running: ["Rush hour is on…", "Идёт час пик…"],
  again: ["Again", "Ещё раз"], hint: ["Hint", "Подсказка"], reset: ["As it was", "Как было"],
  lang_help: ["How to write rules", "Как писать правила"],
  help: ["<code>A: light, north-south 12, east-west 8</code> — a light, green to each street in seconds<br><code>A: light, longest queue, min 5, max 25</code> — a smart light<br><code>A: light, offset 3</code> — starts 3 s later (green waves)<br><code>B: main north-south</code> — a main street, the other gives way<br><code>C: stop</code> — everyone stops, then goes in turn<br><code>D: stop, box</code> — and a box junction<br><code>ambulance first</code> — let the ambulance through<br>The buttons write these lines; edit them and the buttons follow.",
    "<code>A: light, north-south 12, east-west 8</code> — светофор, зелёный каждой улице в секундах<br><code>A: light, longest queue, min 5, max 25</code> — умный светофор<br><code>A: light, offset 3</code> — включается на 3 с позже (зелёная волна)<br><code>B: main north-south</code> — главная улица, другая уступает<br><code>C: stop</code> — все останавливаются и едут по очереди<br><code>D: stop, box</code> — плюс вафельная разметка<br><code>ambulance first</code> — пропускать скорую<br>Это же пишут кнопки: поправишь строки — кнопки переключатся. Можно и по-русски: «светофор», «главная север-юг», «стоп», «вафельная разметка», «пропускать скорую»."],
  problems: ["The handler did not accept the rules:", "Обработчик не принял правила:"],
  delivered: ["home", "доехали"], standing: ["standing", "стоят"], queue: ["longest queue", "самая длинная очередь"], wait: ["average wait", "среднее ожидание"],
  goal: ["Goals", "Цели"],
  g_delivered: ["{n} cars get home", "{n} машин доедут"], g_wait: ["average wait under {n} s", "среднее ожидание меньше {n} с"], g_queue: ["no queue longer than {n} cars", "ни одной очереди длиннее {n} машин"],
  result: ["Rush hour is over", "Час пик закончился"],
  r_line: ["{d} cars got home · average wait {w} s · longest queue {q}", "Доехали {d} · среднее ожидание {w} с · самая длинная очередь {q}"],
  r_more: ["{h} honks, {o} drivers got out to look", "гудков: {h}, водителей вышли посмотреть: {o}"],
  stars0: ["The city is still stuck. Look at which street stands longest.", "Город всё ещё стоит. Посмотри, какая улица стоит дольше всех."],
  stars3: ["Three stars: the city breathes.", "Три звезды: город задышал."],
  share: ["Copy a link to my rules", "Ссылка на мои правила"], copied: ["Link copied: it carries your rules", "Ссылка скопирована: в ней твои правила"],
  how: ["Why this game", "Зачем эта игра"],
  how_body: ["<p><b>Extella</b> is an environment where software is written as short rules in small languages, and a handler checks those rules and carries them out. Usually that means dull things: reconciling invoices, checking contracts, running a machine on a shop floor. We wanted to show the same idea in a way you can touch in a minute.</p><p>Here, your choices — a light, a main road, a stop, a box junction, letting the ambulance through — are a program in a small language called <b>traffic</b>. Open «Rules as text» and you will see it. The handler checks the program first: it will not accept a one-second green or one light too many, and it tells you why in words. Then it runs rush hour by your rules, car by car.</p><p>The same rules always give the same day. So Extella's server can replay your rush hour with its own handler and confirm the result: only confirmed results enter the table of mayors. We compared the browser and the server on 450 sets of rules, from mistakes to whole city plans: not a single difference.</p><p>The same approach works for the rules of a warehouse, an accounting team or a machine: rules short enough for the people who run the process, a strict check before anything runs, and the same result wherever it runs.</p>",
    "<p><b>Extella</b> — среда, где программы пишут короткими правилами на маленьких языках, а обработчик их проверяет и исполняет. Обычно это скучные вещи: сверка счетов, проверка договоров, работа станка в цеху. Мы хотели показать ту же идею так, чтобы её можно было потрогать за минуту.</p><p>Здесь твои решения — светофор, главная, «стоп», вафельная разметка, «пропускать скорую» — это программа на маленьком языке <b>traffic</b>. Открой «Правила текстом» — она там. Обработчик сначала проверяет её: не пропустит зелёный на одну секунду или лишний светофор и объяснит почему, словами. Потом прогоняет час пик по твоим правилам, машину за машиной.</p><p>Одни и те же правила всегда дают один и тот же день. Поэтому сервер Extella может переиграть твой час пик своим обработчиком и подтвердить результат: в таблицу мэров попадают только подтверждённые. Мы сверили браузер и сервер на 450 наборах правил — от ошибок до целых городских планов: ни одного расхождения.</p><p>Тот же приём работает с правилами склада, бухгалтерии или станка: правила такие короткие, что их пишут люди, которые ведут процесс, проверка строгая до запуска, а результат одинаковый, где бы он ни считался.</p>"],
  close: ["Close", "Закрыть"], speed: ["speed", "скорость"],
  beep: ["beep!", "би-бип!"], huh: ["?!", "?!"],
  verify: ["Confirm on the server", "Подтвердить на сервере"], verifying: ["The server is replaying your rush hour…", "Сервер переигрывает твой час пик…"],
  v_same: ["The server got the same day: {s} stars. You are {r} of {n} mayors.", "Сервер получил тот же день: звёзд {s}. Ты {r}-й из {n} мэров."],
  v_diff: ["The server got a different day. This is a bug in one of the two handlers; please send us the link.", "Сервер получил другой день. Это ошибка в одном из двух обработчиков; пришли нам ссылку, пожалуйста."],
  v_meta: ["browser {a} · server {b} · {h} on {d} · {sec} s", "браузер {a} · сервер {b} · {h} на {d} · {sec} с"],
  v_bad: ["The server did not accept the rules:", "Сервер не принял правила:"],
  v_err: ["The server did not answer. Your result is safe in the link; try again in a minute.", "Сервер не ответил. Результат цел в ссылке, попробуй через минуту."],
  mayors: ["Best mayors", "Лучшие мэры"],
  mayors_lead: ["Results the server replayed with its own handler. Open anyone's rules and try to beat them.", "Результаты, которые сервер переиграл своим обработчиком. Открой чужие правила и попробуй обойти."],
  mayors_empty: ["Nobody yet. Finish rush hour and confirm your result.", "Пока никого. Пройди час пик и подтверди результат."],
  board_note: ["Leaderboard:", "Таблица мэров:"], board_link: ["Leaderboard", "Таблица мэров"],
  share_manual: ["Copy this link, it carries your rules:", "Скопируй ссылку, в ней твои правила:"],
  m_who: ["mayor", "мэр"], m_stars: ["stars", "звёзды"], m_wait: ["wait", "ожидание"], m_home: ["home", "доехали"], m_rules: ["rules", "правила"], m_open: ["Open", "Открыть"],
};
let lang = (() => { try { return (localStorage.getItem("robot_lang") || navigator.language || "en").startsWith("ru") ? "ru" : "en"; } catch (e) { return "en"; } })();
const t = (k, v) => { let s = (T[k] || [k, k])[lang === "ru" ? 1 : 0]; if (v) for (const [a, b] of Object.entries(v)) s = s.split("{" + a + "}").join(b); return s; };
const L = arr => Array.isArray(arr) ? arr[lang === "ru" ? 1 : 0] : arr;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------------------------------------------------------------- renderer
const canvas = $("scene");
// Some computers (virtual machines, old drivers) have no WebGL. Then the city is not drawn,
// but the rules, the simulation and the results still work, and the player sees why.
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch (e) {
  renderer = { shadowMap: {}, setPixelRatio() {}, setSize() {}, render() {}, domElement: canvas, noWebGL: true };
  const note = document.createElement("div");
  note.className = "no-webgl";
  note.textContent = (navigator.language || "").startsWith("ru")
    ? "На этом компьютере нет 3D (WebGL), поэтому город не нарисован. Правила, симуляция и результат работают как обычно."
    : "This computer has no 3D support (WebGL), so the city isn't drawn. Rules, the simulation and the results still work.";
  note.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-10%,-50%);max-width:420px;padding:16px 18px;border-radius:14px;background:#fffdf7;border:1px solid #e3dccb;font:15px/1.45 system-ui,sans-serif;color:#2b2b2b;z-index:5";
  document.body.appendChild(note);
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#e9f1e6", 70, 170);
const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 500);
camera.position.set(30, 34, 40);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.44; controls.minPolarAngle = Math.PI * 0.15; controls.minDistance = 14; controls.maxDistance = 120;
scene.add(new THREE.HemisphereLight("#ffffff", "#a9b98e", 1.1));
const sun = new THREE.DirectionalLight("#fff3df", 2.3);
sun.position.set(-22, 40, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 140 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
scene.add(sun, sun.target);
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85 }, o));
const mesh = (geo, mat, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };

// ---------------------------------------------------------------- the city: grass, roads, blocks with houses and trees
let world = null, level = null, levelKey = "district", city = null;
let state = null, selected = "A";   // the city plan behind the buttons: { cross, amb }
const ROAD_W = 5.0;
function rand(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
const HOUSE_COLORS = ["#f6e3c6", "#f3b7a8", "#bfe0c9", "#bcd5ee", "#f7d98b", "#d9c8ef", "#f2c4d7"];
const ROOF_COLORS = ["#d6694f", "#e08b5a", "#7f8fa6", "#c45b6a"];
function buildWorld() {
  if (world) scene.remove(world);
  world = new THREE.Group(); scene.add(world);
  const w = (level.cols - 1) * SPACING, h = (level.rows - 1) * SPACING;
  const x0 = -SPACING, x1 = w + SPACING, z0 = -SPACING, z1 = h + SPACING;
  const grass = mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), M("#bcd9a3", { roughness: 1 }), false);
  grass.position.set(w / 2, -0.02, h / 2); world.add(grass);
  const asphalt = M("#8d97a8", { roughness: 0.95 }), walk = M("#e9e3d6", { roughness: 1 }), paint = new THREE.MeshBasicMaterial({ color: "#fdfbf5" });
  const ext = SPACING * 1.6;
  // roads: one per row and one per column, running past the edge of the city
  for (let j = 0; j < level.rows; j++) {
    const len = (x1 - x0) + 2 * ext;
    const r = mesh(new THREE.BoxGeometry(len, 0.06, ROAD_W), asphalt, false); r.position.set(w / 2, 0.01, j * SPACING); world.add(r);
    const s = mesh(new THREE.BoxGeometry(len, 0.1, ROAD_W + 2.2), walk, false); s.position.set(w / 2, -0.02, j * SPACING); world.add(s);
  }
  for (let i = 0; i < level.cols; i++) {
    const len = (z1 - z0) + 2 * ext;
    const r = mesh(new THREE.BoxGeometry(ROAD_W, 0.06, len), asphalt, false); r.position.set(i * SPACING, 0.012, h / 2); world.add(r);
    const s = mesh(new THREE.BoxGeometry(ROAD_W + 2.2, 0.1, len), walk, false); s.position.set(i * SPACING, -0.021, h / 2); world.add(s);
  }
  // dashes between the lanes and zebra crossings at every crossing
  const dash = new THREE.BoxGeometry(1.1, 0.02, 0.16), zeb = new THREE.BoxGeometry(0.42, 0.02, 1.7);
  const dashes = new THREE.InstancedMesh(dash, paint, 800), zebs = new THREE.InstancedMesh(zeb, paint, 800);
  let nd = 0, nz = 0; const o = new THREE.Object3D();
  const isBox = (x, z) => city.nodes.some(n => Math.abs(n.x - x) < BOX + 0.8 && Math.abs(n.z - z) < BOX + 0.8);
  for (let j = 0; j < level.rows; j++) for (let x = x0 - ext; x < x1 + ext; x += 2.2) if (!isBox(x, j * SPACING)) { o.position.set(x, 0.05, j * SPACING); o.rotation.set(0, 0, 0); o.updateMatrix(); dashes.setMatrixAt(nd++, o.matrix); }
  for (let i = 0; i < level.cols; i++) for (let z = z0 - ext; z < z1 + ext; z += 2.2) if (!isBox(i * SPACING, z)) { o.position.set(i * SPACING, 0.05, z); o.rotation.set(0, Math.PI / 2, 0); o.updateMatrix(); dashes.setMatrixAt(nd++, o.matrix); }
  for (const n of city.nodes) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = -4; k <= 4; k++) {
    const along = BOX + 0.9;
    if (dx) o.position.set(n.x + dx * along, 0.05, n.z + k * 0.55), o.rotation.set(0, 0, 0);
    else o.position.set(n.x + k * 0.55, 0.05, n.z + dz * along), o.rotation.set(0, Math.PI / 2, 0);
    o.updateMatrix(); zebs.setMatrixAt(nz++, o.matrix);
  }
  dashes.count = nd; zebs.count = nz; world.add(dashes, zebs);
  // blocks: houses and trees between the roads
  const R = rand(level.seed * 7 + 3);
  const roadAt = (x, z) => [...Array(level.rows).keys()].some(j => Math.abs(z - j * SPACING) < ROAD_W / 2 + 1.6) || [...Array(level.cols).keys()].some(i => Math.abs(x - i * SPACING) < ROAD_W / 2 + 1.6);
  for (let x = x0 - ext + 2; x < x1 + ext - 2; x += 4.3) for (let z = z0 - ext + 2; z < z1 + ext - 2; z += 4.3) {
    const jx = x + (R() - 0.5) * 1.2, jz = z + (R() - 0.5) * 1.2;
    if (roadAt(jx, jz)) continue;
    const far = Math.max(Math.abs(jx - w / 2) / (w / 2 + ext), Math.abs(jz - h / 2) / (h / 2 + ext));
    const r = R();
    if (r < 0.62 && far < 0.95) world.add(house(jx, jz, R));
    else if (r < 0.9) world.add(tree(jx, jz, R));
  }
  // the stadium on the stadium level
  if (levelKey === "stadium") {
    const st = new THREE.Group();
    const bowl = mesh(new THREE.CylinderGeometry(6.5, 5.6, 2.6, 24, 1, true), M("#f0e6d6", { side: THREE.DoubleSide }));
    const field = mesh(new THREE.CircleGeometry(5.6, 24).rotateX(-Math.PI / 2), M("#7cc06a", { roughness: 1 }), false);
    bowl.position.y = 1.3; field.position.y = 0.06; st.add(bowl, field);
    for (let k = 0; k < 6; k++) { const f = mesh(new THREE.ConeGeometry(0.35, 0.8, 4), M(["#e8574b", "#f2c14e", "#5fa8e8"][k % 3])); f.position.set(Math.cos(k) * 6.6, 3, Math.sin(k) * 6.6); st.add(f); }
    st.position.set(-SPACING * 0.5, 0, -SPACING * 1.35); world.add(st);
  }
}
function house(x, z, R) {
  const g = new THREE.Group();
  const w = 2.2 + R() * 1.2, d = 2.2 + R() * 1.0, hh = 1.6 + R() * 2.4;
  const body = mesh(new RoundedBoxGeometry(w, hh, d, 2, 0.18), M(HOUSE_COLORS[Math.floor(R() * HOUSE_COLORS.length)]));
  body.position.y = hh / 2; g.add(body);
  const roof = mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.1, 4), M(ROOF_COLORS[Math.floor(R() * ROOF_COLORS.length)]));
  roof.position.y = hh + 0.55; roof.rotation.y = Math.PI / 4; roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(roof);
  const win = M("#5d7895", { roughness: 0.3 });
  for (let k = 0; k < Math.floor(hh / 1.1); k++) for (const s of [-1, 1]) { const wv = mesh(new THREE.BoxGeometry(0.42, 0.45, 0.05), win, false); wv.position.set(s * w * 0.22, 0.75 + k * 1.05, d / 2 + 0.01); g.add(wv); }
  g.position.set(x, 0, z); g.rotation.y = Math.floor(R() * 4) * Math.PI / 2;
  return g;
}
function tree(x, z, R) {
  const g = new THREE.Group();
  const trunk = mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6), M("#8a6a4f")); trunk.position.y = 0.45; g.add(trunk);
  const s = 0.8 + R() * 0.6;
  const crown = mesh(new THREE.IcosahedronGeometry(0.9 * s, 1), M(["#7fbf6a", "#6aa95c", "#93c97a"][Math.floor(R() * 3)], { flatShading: true }));
  crown.position.y = 1.2 + 0.6 * s; g.add(crown);
  g.position.set(x, 0, z); return g;
}

// ---------------------------------------------------------------- cars with eyes
const carGroup = new THREE.Group(); scene.add(carGroup);
const cars = new Map();
const eyeWhite = M("#ffffff", { roughness: 0.3 }), pupil = M("#20262e", { roughness: 0.4 }), tyre = M("#2e3440"), glass = M("#cfe6f2", { roughness: 0.15, metalness: 0.1 });
const SHAPES = { car: [1.5, 0.62, 0.95], van: [1.8, 0.95, 1.0], bus: [2.6, 1.1, 1.05], amb: [1.95, 1.0, 1.05] };
function makeCar(c) {
  const [L, H, W] = SHAPES[c.kind] || SHAPES.car;
  const color = c.kind === "bus" ? "#f2c14e" : (c.kind === "amb" ? "#fbfbf8" : c.color);
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const shell = mesh(new RoundedBoxGeometry(L, H, W, 3, 0.22), M(color, { roughness: 0.55 })); shell.position.y = 0.32 + H / 2; body.add(shell);
  if (c.kind === "car") {
    const cab = mesh(new RoundedBoxGeometry(L * 0.58, 0.5, W * 0.86, 3, 0.18), glass); cab.position.set(-0.08, 0.32 + H + 0.2, 0); body.add(cab);
  } else {
    const strip = mesh(new THREE.BoxGeometry(L * 0.8, 0.3, W + 0.02), glass, false); strip.position.set(-0.05, 0.32 + H * 0.68, 0); body.add(strip);
  }
  // headlights are eyes; pupils look where the car is going
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = mesh(new THREE.SphereGeometry(0.17, 12, 10), eyeWhite, false); e.position.set(L / 2 - 0.02, 0.32 + H * 0.55, s * W * 0.27); e.scale.set(0.6, 1, 1); body.add(e);
    const p = mesh(new THREE.SphereGeometry(0.08, 10, 8), pupil, false); p.position.set(L / 2 + 0.08, 0.32 + H * 0.55, s * W * 0.27); body.add(p); eyes.push(p);
  }
  for (const [dx, dz] of [[L * 0.3, W / 2], [L * 0.3, -W / 2], [-L * 0.3, W / 2], [-L * 0.3, -W / 2]]) {
    const wh = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12), tyre); wh.rotation.x = Math.PI / 2; wh.position.set(dx, 0.25, dz); g.add(wh);
  }
  // a door that opens, and a little driver who steps out to look
  const door = mesh(new THREE.BoxGeometry(L * 0.34, H * 0.8, 0.06), M(color, { roughness: 0.55 }));
  const hinge = new THREE.Group(); hinge.position.set(L * 0.12, 0.32 + H * 0.45, -W / 2 - 0.02); door.position.set(-L * 0.17, 0, 0); hinge.add(door); body.add(hinge);
  const person = new THREE.Group();
  const torso = mesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 8), M(["#4f7fbf", "#d9644f", "#5fae7b", "#8b6fc4"][c.id % 4]));
  torso.position.y = 0.42; const head = mesh(new THREE.SphereGeometry(0.17, 12, 10), M("#f1c7a6")); head.position.y = 0.86;
  person.add(torso, head); person.position.set(0, 0, -W / 2 - 0.55); person.visible = false; g.add(person);
  if (c.kind === "amb") {
    const stripe = mesh(new THREE.BoxGeometry(L + 0.02, 0.14, W + 0.02), M("#e0473c"), false); stripe.position.y = 0.32 + H * 0.38; body.add(stripe);
    for (const s of [-1, 1]) {
      const v1 = mesh(new THREE.BoxGeometry(0.34, 0.1, 0.02), M("#e0473c"), false), v2 = mesh(new THREE.BoxGeometry(0.1, 0.34, 0.02), M("#e0473c"), false);
      v1.position.set(-0.3, 0.32 + H * 0.72, s * (W / 2 + 0.02)); v2.position.copy(v1.position); body.add(v1, v2);
    }
    const red = mesh(new THREE.BoxGeometry(0.28, 0.16, 0.3), M("#ff3b3b", { emissive: "#ff2020", emissiveIntensity: 2 }), false);
    const blue = mesh(new THREE.BoxGeometry(0.28, 0.16, 0.3), M("#3b7bff", { emissive: "#2060ff", emissiveIntensity: 0 }), false);
    red.position.set(0.25, 0.32 + H + 0.08, -0.2); blue.position.set(0.25, 0.32 + H + 0.08, 0.2); body.add(red, blue);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, color: "#ff3030", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 }));
    glow.scale.set(2.4, 2.4, 1); glow.position.set(0.25, 0.32 + H + 0.2, 0); body.add(glow);
    g.userData.flash = { red, blue, glow };
  }
  g.scale.setScalar(1.22);
  g.userData = Object.assign(g.userData || {}, { body, eyes, hinge, person, L, bob: Math.random() * 6, kind: c.kind });
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  carGroup.add(g);
  return g;
}

// ---------------------------------------------------------------- traffic lights with faces
const lightsGroup = new THREE.Group(); scene.add(lightsGroup);
const lights = [];
const LAMP = { red: "#ff4b4b", yellow: "#ffcc3d", green: "#3fd17a" };
const HALO = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
function signTexture(kind) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  if (kind === "stop") {
    g.fillStyle = "#d9433a"; g.strokeStyle = "#ffffff"; g.lineWidth = 8;
    g.beginPath(); for (let i = 0; i < 8; i++) { const an = Math.PI / 8 + i * Math.PI / 4; g.lineTo(64 + 56 * Math.cos(an), 64 + 56 * Math.sin(an)); } g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.font = "800 30px DM Sans, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("STOP", 64, 66);
  } else if (kind === "main") {
    g.save(); g.translate(64, 64); g.rotate(Math.PI / 4);
    g.fillStyle = "#ffffff"; g.fillRect(-40, -40, 80, 80); g.fillStyle = "#f2c14e"; g.fillRect(-28, -28, 56, 56); g.restore();
  } else {
    g.fillStyle = "#ffffff"; g.strokeStyle = "#d9433a"; g.lineWidth = 12; g.lineJoin = "round";
    g.beginPath(); g.moveTo(14, 22); g.lineTo(114, 22); g.lineTo(64, 110); g.closePath(); g.fill(); g.stroke();
  }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
const SIGN_TEX = {};
function sign(kind) {
  const tex = SIGN_TEX[kind] || (SIGN_TEX[kind] = signTexture(kind));
  const g = new THREE.Group();
  const pole = mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.2, 8), M("#8b95a3")); pole.position.y = 1.1; g.add(pole);
  const plate = mesh(new THREE.PlaneGeometry(1.15, 1.15), new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, roughness: 0.6 }), false);
  plate.position.set(0, 2.55, 0.05); g.add(plate);
  return g;
}
const WAFFLE = (() => {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"); g.strokeStyle = "rgba(242,193,78,.95)"; g.lineWidth = 10;
  g.strokeRect(8, 8, 240, 240);
  for (let k = -256; k < 512; k += 48) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k + 256, 0); g.lineTo(k, 256); g.stroke(); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
})();
function letterTexture(s) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(255,255,255,.92)"; g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#3b4752"; g.font = "600 58px DM Sans, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, 64, 67);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
const marks = {};
function makeCrossings() {
  lightsGroup.clear(); lights.length = 0;
  for (const n of city.nodes) {
    const c = state.cross[n.name];
    for (const h of "NSEW") {
      const [dx, dz] = HEADINGS[h];
      const x = n.x - dx * (BOX + 0.4) - dz * (ROAD_W / 2 + 0.45), z = n.z - dz * (BOX + 0.4) + dx * (ROAD_W / 2 + 0.45);
      if (c.type !== "light") {
        const kind = c.type === "stop" ? "stop" : (AXIS[h] === (c.type === "main-ns" ? "ns" : "ew") ? "main" : "yield");
        const s = sign(kind); s.position.set(x, 0, z); s.rotation.y = Math.atan2(-dx, -dz); s.scale.setScalar(0.78);
        lightsGroup.add(s);
        continue;
      }
      const g = new THREE.Group();
      const pole = mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), M("#4b5563")); pole.position.y = 1.2; g.add(pole);
      const box = mesh(new RoundedBoxGeometry(0.8, 1.8, 0.62, 3, 0.24), M("#4a5466", { roughness: 0.55 })); box.position.y = 3.15; g.add(box);
      const lamps = {};
      ["red", "yellow", "green"].forEach((k, i) => {
        const l = mesh(new THREE.SphereGeometry(0.24, 16, 12), M("#323844", { emissive: LAMP[k], emissiveIntensity: 0 }), false);
        l.position.set(0, 3.7 - i * 0.56, 0.27); l.scale.z = 0.55; g.add(l); lamps[k] = l;
      });
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: HALO, color: "#3fd17a", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
      halo.scale.set(1.5, 1.5, 1); halo.position.set(0, 3.15, 0.45); g.add(halo);
      const eyes = [];
      for (const s of [-1, 1]) {
        const e = mesh(new THREE.SphereGeometry(0.24, 16, 12), eyeWhite, false); e.position.set(s * 0.21, 4.26, 0.1); g.add(e);
        const p = mesh(new THREE.SphereGeometry(0.11, 12, 10), pupil, false); p.position.set(s * 0.21, 4.26, 0.3); g.add(p); eyes.push(p);
      }
      const brows = [];
      for (const s of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.26, 0.05, 0.05), pupil, false); b.position.set(s * 0.19, 4.5, 0.2); g.add(b); brows.push(b); }
      const sweat = mesh(new THREE.SphereGeometry(0.09, 10, 8), M("#8fd3ff", { roughness: 0.1 }), false); sweat.position.set(0.42, 4.25, 0.15); sweat.scale.y = 1.4; sweat.visible = false; g.add(sweat);
      g.position.set(x, 0, z); g.rotation.y = Math.atan2(-dx, -dz); g.scale.setScalar(0.82);
      lightsGroup.add(g);
      lights.push({ node: n.name, h, g, lamps, eyes, brows, sweat, halo, hop: 0, last: "" });
    }
    if (c.box) {
      const w = mesh(new THREE.PlaneGeometry(BOX * 2, BOX * 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: WAFFLE, transparent: true, depthWrite: false }), false);
      w.position.set(n.x, 0.07, n.z); lightsGroup.add(w);
    }
    // the letter keeps one size on screen, however far the camera is
    const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture(n.name), depthWrite: false, depthTest: false, sizeAttenuation: false }));
    badge.scale.set(0.028, 0.028, 1); badge.position.set(n.x + BOX + 1.3, 3.6, n.z - BOX - 1.3); badge.renderOrder = 10; lightsGroup.add(badge);
    const ring = mesh(new THREE.RingGeometry(BOX + 0.7, BOX + 1.15, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#1f2a33", transparent: true, opacity: 0.85, depthWrite: false }), false);
    ring.position.set(n.x, 0.09, n.z); ring.visible = selected === n.name; lightsGroup.add(ring);
    const jam = mesh(new THREE.RingGeometry(BOX + 0.15, BOX + 0.65, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#ff5a4a", transparent: true, opacity: 0, depthWrite: false }), false);
    jam.position.set(n.x, 0.1, n.z); lightsGroup.add(jam);
    marks[n.name] = { ring, jam };
  }
}

// ---------------------------------------------------------------- bubbles: beep!, ?!, and the ducks
function bubbleTexture(text, bg = "#ffffff", fg = "#20262e") {
  const c = document.createElement("canvas"); c.width = 256; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = bg; g.strokeStyle = "rgba(0,0,0,.15)"; g.lineWidth = 4;
  g.beginPath(); g.roundRect(8, 8, 240, 88, 40); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(110, 94); g.lineTo(128, 122); g.lineTo(146, 94); g.fill();
  g.fillStyle = fg; g.font = "700 46px DM Sans, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 128, 54);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
let BEEP = null, HUH = null, SIREN = null;
function bubbles() { BEEP = bubbleTexture(t("beep")); HUH = bubbleTexture(t("huh"), "#fff4c2"); SIREN = bubbleTexture(t("siren"), "#ffe4e4", "#c62828"); }
const spriteMat = tex => new THREE.SpriteMaterial({ map: tex, depthWrite: false });
const duckGroup = new THREE.Group(); scene.add(duckGroup);
function duck(s) {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.32 * s, 12, 10), M("#fff6dc")); body.scale.set(1.3, 0.9, 1); body.position.y = 0.3 * s;
  const head = mesh(new THREE.SphereGeometry(0.2 * s, 12, 10), M("#fff6dc")); head.position.set(0.32 * s, 0.6 * s, 0);
  const beak = mesh(new THREE.ConeGeometry(0.07 * s, 0.2 * s, 6), M("#f2a541")); beak.rotation.z = -Math.PI / 2; beak.position.set(0.55 * s, 0.58 * s, 0);
  g.add(body, head, beak); return g;
}

// ---------------------------------------------------------------- playing a day back
let run = null;   // { frames, result, i, time }
let speed = 3;
function frameAt(time) {
  const fr = run.frames, step = fr.length > 1 ? fr[1].t - fr[0].t : 0.2;
  const i = Math.min(fr.length - 2, Math.max(0, Math.floor(time / step)));
  return { a: fr[i], b: fr[i + 1], k: Math.min(1, Math.max(0, (time - fr[i].t) / step)) };
}
const HROT = { E: 0, W: Math.PI, N: Math.PI / 2, S: -Math.PI / 2 };
function lerpAngle(a, b, k) { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * k; }
function show(time, dt) {
  const { a, b, k } = frameAt(time);
  const nextById = new Map(b.cars.map(c => [c.id, c]));
  const seen = new Set();
  for (const c of a.cars) {
    seen.add(c.id);
    let g = cars.get(c.id);
    if (!g) { g = makeCar(c); cars.set(c.id, g); }
    const n = nextById.get(c.id) || c;
    const x = c.x + (n.x - c.x) * k, z = c.z + (n.z - c.z) * k;
    let ang = HROT[c.h];
    if (c.box) { const from = HROT[c.box.from], to = HROT[c.box.to]; ang = lerpAngle(from, to, Math.min(1, c.box.p + (n.box ? (n.box.p - c.box.p) * k : 0))); }
    const prev = g.position.clone();
    g.position.set(x, 0, z);
    g.rotation.y = ang;
    const u = g.userData;
    const moving = c.v > 0.4;
    u.bob += dt * (moving ? 14 : 3);
    u.body.position.y = moving ? 0.04 * Math.abs(Math.sin(u.bob)) : 0.015 * Math.sin(u.bob);
    u.body.rotation.z = moving ? 0 : 0.02 * Math.sin(u.bob * 0.7);
    // the door and the driver
    const doorTarget = c.door ? -1.1 : 0;
    u.hinge.rotation.y += (doorTarget - u.hinge.rotation.y) * Math.min(1, dt * 6);
    u.person.visible = !!c.door && u.hinge.rotation.y < -0.6;
    if (u.person.visible) u.person.rotation.y = Math.sin(time * 2 + c.id) * 0.6;
    // bubbles
    if (c.honk && !u.beep) { u.beep = new THREE.Sprite(spriteMat(BEEP)); u.beep.scale.set(2.2, 1.1, 1); u.beep.position.set(0, 2.4, 0); g.add(u.beep); }
    if (!c.honk && u.beep) { g.remove(u.beep); u.beep = null; }
    if (c.door && !u.huh) { u.huh = new THREE.Sprite(spriteMat(HUH)); u.huh.scale.set(1.5, 0.75, 1); u.huh.position.set(0, 2.1, -1.3); g.add(u.huh); }
    if (!c.door && u.huh) { g.remove(u.huh); u.huh = null; }
    if (u.beep) u.beep.position.y = 2.4 + 0.1 * Math.sin(time * 10);
    if (u.flash) {
      const on = Math.floor(time * 7) % 2;
      u.flash.red.material.emissiveIntensity = on ? 3 : 0.2; u.flash.blue.material.emissiveIntensity = on ? 0.2 : 3;
      u.flash.glow.material.color.set(on ? "#ff3030" : "#3070ff");
      const slow = c.v < 1.5;
      if (slow && !u.siren) { u.siren = new THREE.Sprite(spriteMat(SIREN)); u.siren.scale.set(2.6, 1.3, 1); u.siren.position.set(0, 2.9, 0); g.add(u.siren); }
      if (!slow && u.siren) { g.remove(u.siren); u.siren = null; }
    }
  }
  for (const [id, g] of cars) if (!seen.has(id)) { carGroup.remove(g); cars.delete(id); }
  // lights
  for (const L of lights) {
    const st = a.lights[L.node];
    const myAxis = "NS".includes(L.h) ? "ns" : "ew";
    const state = st.phase === myAxis ? (st.yellow ? "yellow" : "green") : (st.phase !== myAxis && st.yellow ? "red" : "red");
    for (const kk of ["red", "yellow", "green"]) L.lamps[kk].material.emissiveIntensity = kk === state ? 3.4 : 0;
    L.halo.material.color.set(LAMP[state]);
    L.halo.position.y = 3.7 - ["red", "yellow", "green"].indexOf(state) * 0.56;
    if (state === "green" && L.last !== "green") L.hop = 1;
    L.last = state;
    L.hop = Math.max(0, L.hop - dt * 2.5);
    L.g.position.y = 0.2 * Math.sin(L.hop * Math.PI);
    const q = st.q[L.h] || 0;
    // eyes look down the street at the queue; the longer it is, the more worried the face
    const worry = Math.min(1, q / 8);
    L.eyes.forEach((p, i) => { p.position.y = 4.26 - 0.07 * worry + 0.02 * Math.sin(time * 3 + i); p.position.x = (i ? 0.21 : -0.21) + 0.04 * Math.sin(time * 0.8 + L.g.position.x); });
    L.brows.forEach((b, i) => { b.rotation.z = (i ? -1 : 1) * (state === "green" ? -0.25 : 0.35 * worry); b.position.y = 4.5 + (state === "green" ? 0.05 : 0); });
    L.sweat.visible = q >= 7;
    if (L.sweat.visible) L.sweat.position.y = 4.35 - ((time * 0.8) % 1) * 0.5;
  }
  // crossings where cars stand inside the box: a red ring that pulses
  for (const [name, mk] of Object.entries(marks)) {
    const st = a.lights[name];
    mk.jam.material.opacity = st && st.jam ? 0.45 + 0.35 * Math.sin(time * 8) : 0;
    const chip = document.querySelector('.cx[data-n="' + name + '"]');
    if (chip) chip.classList.toggle("jam", !!(st && st.jam));
  }
  // ducks
  duckGroup.clear();
  for (const d of a.ducks) {
    const lk = city.links[d.link]; if (!lk) continue;
    const mid = linkPoint(lk, lk.len * 0.5);
    const [dx, dz] = HEADINGS[lk.h];
    const across = { x: -dz, z: dx };
    for (let m = 0; m < 4; m++) {
      const s = m === 0 ? 1.1 : 0.6;
      const off = (d.p * 7 - 3.5) - m * 0.8;
      const dd = duck(s);
      dd.position.set(mid.x + across.x * off, 0.05 + 0.04 * Math.abs(Math.sin(time * 9 + m)), mid.z + across.z * off);
      dd.rotation.y = Math.atan2(-across.z, across.x);
      duckGroup.add(dd);
    }
  }
  // live numbers
  $("nDelivered").textContent = a.delivered;
  $("nStanding").textContent = a.standing;
  let maxq = 0; for (const s of Object.values(a.lights)) for (const v of Object.values(s.q)) maxq = Math.max(maxq, v);
  $("nQueue").textContent = maxq;
  $("clock").style.width = (100 * time / level.seconds).toFixed(1) + "%";
}

// ---------------------------------------------------------------- level, rules, running
const startCross = () => parse("", level).cross;
function setLevel(key, rules) {
  levelKey = key; level = LEVELS[key];
  city = buildCity(level);
  for (const [, g] of cars) carGroup.remove(g); cars.clear();
  buildWorld();
  const text = rules ?? loadRules(key) ?? writeRules(level, startCross(), false);
  const p = parse(text, level);
  if (p.problems.length) { state = { cross: startCross(), amb: false }; $("rules").value = writeRules(level, state.cross, state.amb); }
  else { state = { cross: p.cross, amb: p.ambulanceFirst }; $("rules").value = text; }
  selected = crossNames(level)[0];
  makeCrossings();
  $("story").textContent = L(level.story);
  const g = level.goals, hasAmb = (level.ambulances || []).length;
  $("goals").innerHTML = [t("g_delivered", { n: g.delivered }), t("g_wait", { n: g.wait }), hasAmb ? t("g_amb", { n: g.ambulance }) : t("g_stuck", { n: g.stuck })].map(s => "<li>" + esc(s) + "</li>").join("");
  document.querySelectorAll("[data-level]").forEach(b => b.classList.toggle("on", b.dataset.level === key));
  $("hintText").hidden = true; $("hintText").textContent = L(level.hint);
  $("result").hidden = true; $("problems").hidden = true;
  $("runBtn").classList.add("p"); $("runBtn").textContent = t("run"); $("runBtn").disabled = false;
  renderPanel();
  frame();
  start(false);
}
// the buttons change the plan; the plan is written out as the rules; the rules are what runs
const PLANS = { ns: { mode: "fixed", ns: 24, ew: 10 }, eq: { mode: "fixed", ns: 15, ew: 15 }, ew: { mode: "fixed", ns: 10, ew: 24 }, smart: { mode: "longest", min: 5, max: 30 } };
function planKey(c) { if (c.mode === "longest") return "smart"; if (c.ns > c.ew) return "ns"; if (c.ew > c.ns) return "ew"; return "eq"; }
function applyState() {
  $("rules").value = writeRules(level, state.cross, state.amb);
  $("problems").hidden = true;
  saveRules(); makeCrossings(); renderPanel();
  $("result").hidden = true; $("runBtn").classList.add("p"); $("runBtn").textContent = t("run");
  start(false);
}
function opt(label, on, onclick, disabled, title) {
  const b = document.createElement("button"); b.type = "button"; b.className = "opt" + (on ? " on" : ""); b.textContent = label;
  if (disabled) { b.disabled = true; if (title) b.title = title; } else b.onclick = onclick;
  return b;
}
function renderPanel() {
  const names = crossNames(level), used = names.filter(n => state.cross[n].type === "light").length;
  $("budget").textContent = t("budget", { u: used, n: level.lights });
  const box = $("crosses"); box.innerHTML = "";
  for (const n of names) {
    const c = state.cross[n];
    const b = document.createElement("button"); b.type = "button"; b.dataset.n = n;
    b.className = "cx " + (c.type === "light" ? "light" : c.type === "stop" ? "stop" : "main") + (n === selected ? " on" : "");
    b.innerHTML = esc(n) + "<small>" + esc(t("s_" + c.type)) + (c.box ? "▦" : "") + "</small>";
    b.onclick = () => select(n);
    box.appendChild(b);
  }
  const c = state.cross[selected];
  $("cardTitle").textContent = t("cross", { n: selected });
  $("cardNote").textContent = t("n_" + c.type);
  const types = $("typeOpts"); types.innerHTML = "";
  for (const ty of ["light", "main-ns", "main-ew", "stop"]) {
    const full = ty === "light" && c.type !== "light" && used >= level.lights;
    types.appendChild(opt(t("t_" + ty), c.type === ty, () => { c.type = ty; if (ty === "light") Object.assign(c, PLANS.eq, { offset: 0 }); applyState(); }, full, t("no_lights_left")));
  }
  const plans = $("planOpts"), offs = $("offsetOpts"); plans.innerHTML = ""; offs.innerHTML = "";
  if (c.type === "light") {
    const pk = planKey(c);
    for (const k of ["ns", "eq", "ew", "smart"]) plans.appendChild(opt(t("p_" + k), pk === k, () => { Object.assign(c, PLANS[k]); applyState(); }));
    for (const o of [0, 3, 6]) offs.appendChild(opt(t("o_" + o), c.offset === o, () => { c.offset = o; applyState(); }));
  }
  $("boxToggle").checked = !!c.box;
  $("ambRow").hidden = !(level.ambulances || []).length;
  $("ambToggle").checked = !!state.amb;
}
function select(n) {
  selected = n;
  for (const [name, mk] of Object.entries(marks)) mk.ring.visible = name === n;
  renderPanel();
}
function frame() {
  const w = (level.cols - 1) * SPACING, h = (level.rows - 1) * SPACING;
  controls.target.set(w / 2, 0, h / 2);
  const span = Math.max(w, h) + SPACING * 2.0;
  const dist = span * 1.3 / Math.min(1, Math.pow(Math.max(0.45, camera.aspect), 0.85)) + 6;
  const dir = new THREE.Vector3(0.55, 0.78, 0.9).normalize();
  camera.position.copy(controls.target).add(dir.multiplyScalar(dist));
  scene.fog.near = dist * 1.05; scene.fog.far = dist * 2.4;   // the fog starts behind the city, whatever its size
  sun.target.position.copy(controls.target); sun.position.copy(controls.target).add(new THREE.Vector3(-22, 40, 18));
}
function saveRules() { try { localStorage.setItem("traffic_rules_" + levelKey, $("rules").value); } catch (e) {} }
function loadRules(key) {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get("l") === key && h.get("r")) { try { return decodeURIComponent(escape(atob(h.get("r").replace(/-/g, "+").replace(/_/g, "/")))); } catch (e) {} }
  try { return localStorage.getItem("traffic_rules_" + key); } catch (e) { return null; }
}
function start(real = true) {
  const text = $("rules").value;
  const out = simulate(levelKey, text);
  if (out.problems.length) {
    const box = $("problems"); box.hidden = false;
    box.innerHTML = "<b>" + esc(t("problems")) + "</b><br>" + out.problems.slice(0, 4).map(esc).join("<br>");
    return;
  }
  $("problems").hidden = true;
  for (const [, g] of cars) carGroup.remove(g); cars.clear();
  run = { frames: out.frames, result: out.result, time: 0, real, done: false };
  $("result").hidden = true;
  if (real) { $("runBtn").disabled = true; $("runBtn").textContent = t("running"); $("runBtn").classList.add("p"); saveRules(); }
}
function finish() {
  run.done = true;
  if (!run.real) { run.time = 0; return; }   // the preview loops
  const r = run.result;
  $("runBtn").disabled = false; $("runBtn").textContent = t("again"); $("runBtn").classList.remove("p");   // one main action: now it is "confirm"
  $("stars").innerHTML = [0, 1, 2].map(i => `<span class="${i < r.stars ? "on" : ""}">★</span>`).join("");
  $("rLine").textContent = t("r_line", { d: r.delivered, w: r.avgWait, q: r.maxQueue }) + ((level.ambulances || []).length ? " · " + t("r_amb", { a: r.ambulance }) : "");
  $("rMore").textContent = t("r_more", { h: r.honks, o: r.doors }) + (r.stars === 3 ? " · " + t("stars3") : (r.stars === 0 ? " · " + t("stars0") : ""));
  $("result").hidden = false; $("verdict").hidden = true;
  $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
  try { const best = +(localStorage.getItem("traffic_best_" + levelKey) || 0); if (r.stars > best) localStorage.setItem("traffic_best_" + levelKey, r.stars); } catch (e) {}
  drawLevels();
}
// Without a leaderboard server (a local copy, the Extella desktop window) a shared link opens the online game,
// which reads the same "#l=…&r=…" format.
const ONLINE = "https://extella.dev/traffic/";
function shareLink() {
  const enc = btoa(unescape(encodeURIComponent($("rules").value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return (API ? location.origin + location.pathname : ONLINE) + "#l=" + levelKey + "&r=" + enc;
}

// ---------------------------------------------------------------- the server: the same rules, replayed by the handler on a device
// The leaderboard lives on extella.dev. A page that has it sets <html data-leaderboard-api="/api/blocks/traffic/">;
// with the attribute empty the game runs fully offline and points to the online leaderboard instead.
const API = document.documentElement.dataset.leaderboardApi || "";
const SESSION = (() => { try { let s = localStorage.getItem("traffic_session"); if (!s) { s = "m" + Math.random().toString(36).slice(2, 12); localStorage.setItem("traffic_session", s); } return s; } catch (e) { return "anon"; } })();
const ADJ = [["Brave", "Смелый"], ["Calm", "Спокойный"], ["Clever", "Хитрый"], ["Sleepy", "Сонный"], ["Rosy", "Румяный"], ["Quick", "Шустрый"], ["Kind", "Добрый"], ["Fluffy", "Пушистый"], ["Merry", "Весёлый"], ["Wise", "Мудрый"], ["Tiny", "Маленький"], ["Bold", "Отважный"]];
const ANIMAL = [["Duck", "Утёнок"], ["Hedgehog", "Ёж"], ["Fox", "Лис"], ["Badger", "Барсук"], ["Owl", "Филин"], ["Beaver", "Бобр"], ["Marmot", "Сурок"], ["Raccoon", "Енот"], ["Pigeon", "Голубь"], ["Bear", "Медведь"], ["Hare", "Заяц"], ["Goose", "Гусь"]];
const mayorName = m => (lang === "ru" ? "Мэр " : "Mayor ") + L(ADJ[m.a % 12]) + " " + L(ANIMAL[m.b % 12]) + " " + m.n;
// the server keeps rules in lower case; light names read better as capitals
const showRules = s => String(s).split("\n").map(l => { const at = l.indexOf(":"); return at > 0 ? l.slice(0, at).toUpperCase() + l.slice(at) : l; }).join("\n");
if (!API) {
  $("verifyBtn").hidden = true; $("mayorsBtn").hidden = true;
  $("boardNote").hidden = false; $("boardLink").hidden = false;
}
$("verifyBtn").onclick = async () => {
  if (!API) return;
  const b = $("verifyBtn"), v = $("verdict"), was = b.textContent;
  b.disabled = true; b.textContent = t("verifying"); v.hidden = true; v.className = "verdict";
  const mine = run && run.result;
  try {
    const r = await fetch(API + "score", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ level: levelKey, rules: $("rules").value, session: SESSION }) }).then(x => x.json());
    if (r.status === "success" && r.result) {
      const same = mine && r.result.sha === mine.sha;
      v.innerHTML = esc(same ? t("v_same", { s: r.result.stars, r: r.rank, n: r.of }) : t("v_diff")) + '<span class="mono">' + esc(t("v_meta", { a: mine ? mine.sha : "?", b: r.result.sha, h: (r.handler_version || "") + " " + (r.handler_sha || ""), d: r.device || "?", sec: r.seconds })) + "</span>";
      if (!same) v.className = "verdict bad";
    } else {
      v.className = "verdict bad";
      v.innerHTML = esc(r.reason || t("v_bad")) + "<br>" + (r.problems || []).map(esc).join("<br>");
    }
  } catch (e) { v.className = "verdict bad"; v.textContent = t("v_err"); }
  finally { b.disabled = false; b.textContent = was; v.hidden = false; v.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
};
$("mayorsBtn").onclick = async () => {
  if (!API) return;
  $("mayors").hidden = false; $("mayorsLead").textContent = L(LEVELS[levelKey].name) + " · " + t("mayors_lead");
  const box = $("mayorsTable"); box.innerHTML = '<p class="sub" style="display:block">…</p>';
  try {
    const r = await fetch(API + "mayors?level=" + levelKey).then(x => x.json());
    const rows = r.mayors || [];
    if (!rows.length) { box.innerHTML = '<p class="sub" style="display:block">' + esc(t("mayors_empty")) + "</p>"; return; }
    box.innerHTML = '<table class="m"><thead><tr><th>#</th><th>' + esc(t("m_who")) + "</th><th>" + esc(t("m_stars")) + "</th><th>" + esc(t("m_wait")) + "</th><th>" + esc(t("m_home")) + "</th><th>" + esc(t("m_rules")) + "</th><th></th></tr></thead><tbody>" +
      rows.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(mayorName(m.mayor))}</td><td class="st">${"★".repeat(m.stars)}</td><td>${esc(m.avgWait)} ${lang === "ru" ? "с" : "s"}</td><td>${esc(m.delivered)}</td><td class="r">${esc(showRules(m.rules))}</td><td><button type="button" data-k="${i}">${esc(t("m_open"))}</button></td></tr>`).join("") + "</tbody></table>";
    box.querySelectorAll("button[data-k]").forEach(btn => btn.onclick = () => { $("rules").value = showRules(rows[+btn.dataset.k].rules); $("mayors").hidden = true; saveRules(); start(false); });
  } catch (e) { box.innerHTML = '<p class="sub" style="display:block">' + esc(t("v_err")) + "</p>"; }
};
$("mayorsClose").onclick = () => { $("mayors").hidden = true; };

// ---------------------------------------------------------------- the panel
function drawLevels() {
  const box = $("levels"); box.innerHTML = "";
  for (const k of Object.keys(LEVELS)) {
    let best = 0; try { best = +(localStorage.getItem("traffic_best_" + k) || 0); } catch (e) {}
    const b = document.createElement("button"); b.type = "button"; b.dataset.level = k; b.className = "chip" + (k === levelKey ? " on" : "");
    b.innerHTML = esc(L(LEVELS[k].name)) + (best ? ' <span class="mini">' + "★".repeat(best) + "</span>" : "");
    b.onclick = () => setLevel(k);
    box.appendChild(b);
  }
}
function words() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i]").forEach(e => { e.textContent = t(e.dataset.i); });
  $("help").innerHTML = t("help"); $("howBody").innerHTML = t("how_body");
  document.querySelectorAll("[data-lang]").forEach(b => b.classList.toggle("on", b.dataset.lang === lang));
  bubbles(); drawLevels();
}
$("runBtn").onclick = () => start(true);
$("hintBtn").onclick = () => { $("hintText").hidden = !$("hintText").hidden; };
$("resetBtn").onclick = () => { state = { cross: startCross(), amb: false }; applyState(); };
$("boxToggle").onchange = () => { state.cross[selected].box = $("boxToggle").checked; applyState(); };
$("ambToggle").onchange = () => { state.amb = $("ambToggle").checked; applyState(); };
$("helpBtn").onclick = () => { $("help").hidden = !$("help").hidden; };
$("howBtn").onclick = () => { $("how").hidden = false; };
$("howClose").onclick = () => { $("how").hidden = true; };
function copyText(u) {
  // a sandboxed frame may refuse the clipboard API; the old copy command often still works there
  const ta = document.createElement("textarea"); ta.value = u; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
  ta.remove(); return ok;
}
$("shareBtn").onclick = async () => {
  const u = shareLink();
  try { await navigator.clipboard.writeText(u); toast(t("copied")); return; } catch (e) {}
  if (copyText(u)) { toast(t("copied")); return; }
  const v = $("verdict"); v.className = "verdict"; v.hidden = false;
  v.innerHTML = esc(t("share_manual")) + '<input class="share-box" readonly>';
  const box = v.querySelector("input"); box.value = u; box.focus(); box.select();
};
$("rules").addEventListener("input", () => {
  clearTimeout($("rules").tm);
  $("rules").tm = setTimeout(() => {
    const p = parse($("rules").value, level);
    const box = $("problems"); box.hidden = !p.problems.length;
    if (p.problems.length) { box.innerHTML = "<b>" + esc(t("problems")) + "</b><br>" + p.problems.slice(0, 4).map(esc).join("<br>"); return; }
    state = { cross: p.cross, amb: p.ambulanceFirst };
    saveRules(); makeCrossings(); renderPanel(); start(false);
  }, 350);
});
// choosing a crossing by clicking it in the city
{
  let down = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    if (d.y >= 0) return;
    const s = -o.y / d.y, x = o.x + d.x * s, z = o.z + d.z * s;
    let best = null, bd = 1e9;
    for (const n of city.nodes) { const dd = Math.hypot(n.x - x, n.z - z); if (dd < bd) { bd = dd; best = n; } }
    if (best && bd < BOX + 4) select(best.name);
  });
}
document.querySelectorAll("[data-speed]").forEach(b => b.onclick = () => { speed = +b.dataset.speed; document.querySelectorAll("[data-speed]").forEach(x => x.classList.toggle("on", x === b)); });
document.querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { lang = b.dataset.lang; try { localStorage.setItem("robot_lang", lang); } catch (e) {} words(); setLevel(levelKey, $("rules").value); });
function toast(s) { const el = $("toast"); el.textContent = s; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2600); }

// ---------------------------------------------------------------- loop
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  // the city is drawn beside the panel, not under it
  const p = document.querySelector(".panel").getBoundingClientRect();
  if (w > 760) camera.setViewOffset(w, h, -Math.round((p.right) / 2), 0, w, h);
  else camera.setViewOffset(w, h, 0, Math.round((h - p.top) / 2), w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", () => { resize(); });
let last = performance.now();
function loop() {
  const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (run) {
    if (!run.done) {
      run.time += dt * (run.real ? speed : 1.5);
      const end = run.frames[run.frames.length - 1].t;
      if (run.time >= end) { run.time = end; show(run.time, dt); finish(); }
      else show(run.time, dt);
    } else show(run.time, dt);
    if (!run.real && run.time === 0 && run.done) { run.done = false; }
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
words(); resize();
const startLevel = (() => { const h = new URLSearchParams(location.hash.slice(1)); return LEVELS[h.get("l")] ? h.get("l") : "district"; })();
setLevel(startLevel);
loop();
window.__traffic = { simulate, get run() { return run; }, LEVELS, camera, scene, renderer, controls, THREE, get world() { return world; } };
