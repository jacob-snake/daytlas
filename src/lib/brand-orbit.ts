// Final all-blue v1.2 artwork, clipped native silhouette with original pixels. No fading.
export const SIZE = 1254;
export const CENTER = { x: 627, y: 622 };
export const orbs = [
  { id: "north", x: 627, y: 245, rx: 61.3, ry: 61.3, ring: "outer", group: 0 },
  { id: "south", x: 627, y: 996, rx: 62.4, ry: 62.4, ring: "outer", group: 0 },
  {
    id: "north-west",
    x: 439,
    y: 301,
    rx: 59.4,
    ry: 60.2,
    ring: "outer",
    group: 1,
  },
  { id: "north-east", x: 814, y: 301, rx: 60, ry: 60, ring: "outer", group: 1 },
  {
    id: "south-west",
    x: 420,
    y: 946,
    rx: 61.5,
    ry: 61.5,
    ring: "outer",
    group: 1,
  },
  {
    id: "south-east",
    x: 833,
    y: 946,
    rx: 61.8,
    ry: 61.8,
    ring: "outer",
    group: 1,
  },
  {
    id: "upper-west",
    x: 298,
    y: 438,
    rx: 61.6,
    ry: 61.6,
    ring: "outer",
    group: 2,
  },
  {
    id: "upper-east",
    x: 955,
    y: 438,
    rx: 61.6,
    ry: 61.6,
    ring: "outer",
    group: 2,
  },
  {
    id: "lower-west",
    x: 297,
    y: 805,
    rx: 62.3,
    ry: 62.3,
    ring: "outer",
    group: 2,
  },
  {
    id: "lower-east",
    x: 955,
    y: 805,
    rx: 62.3,
    ry: 62.3,
    ring: "outer",
    group: 2,
  },
  { id: "west", x: 233, y: 623, rx: 61.2, ry: 60.4, ring: "outer", group: 3 },
  { id: "east", x: 1017, y: 623, rx: 62.3, ry: 61, ring: "outer", group: 3 },
  {
    id: "inner-nw",
    x: 514,
    y: 440,
    rx: 114.1,
    ry: 114.5,
    ring: "inner",
    group: 4,
  },
  {
    id: "inner-ne",
    x: 740,
    y: 440,
    rx: 114.1,
    ry: 114.5,
    ring: "inner",
    group: 4,
  },
  {
    id: "inner-sw",
    x: 510,
    y: 810,
    rx: 114.3,
    ry: 115,
    ring: "inner",
    group: 4,
  },
  {
    id: "inner-se",
    x: 744,
    y: 810,
    rx: 114.5,
    ry: 115,
    ring: "inner",
    group: 4,
  },
  {
    id: "inner-w",
    x: 399,
    y: 622,
    rx: 114.6,
    ry: 115,
    ring: "inner",
    group: 5,
  },
  {
    id: "inner-e",
    x: 854,
    y: 622,
    rx: 114.6,
    ry: 115,
    ring: "inner",
    group: 5,
  },
  { id: "today", x: 627, y: 622, rx: 165.7, ry: 167.2, ring: "core", group: 6 },
];
export const orbit = {
  id: "02-orbit",
  name: "Orbit",
  number: "02",
  duration: 3.6,
  coreScale: 1.1,
  inStart: 0.035,
  inLength: 1.02,
  outStart: 1.32,
  outEnd: 3.5,
  stagger: 0.044,
  coreIn: 1.3,
  coreOut: 1.32,
  innerScale: 0.82,
  outerScale: 0.72,
  outerOpacity: 1,
  travel: 0.8,
  orbitDegrees: 85,
  tagline: "Výraznejšie zatočenie.",
  description:
    "Vonkajšie guličky opisujú väčší oblúk. Rotácia sa spája so stiahnutím do stredu, potom plynulo obráti smer a otvorí logo.",
  note: "Výraznejšia rotácia",
};
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
// easeInOutSine, https://easings.net/#easeInOutSine
export const ease = (x: number) => (1 - Math.cos(Math.PI * clamp(x))) / 2;
// Standard easing equations: easings.net. Return begins under the core,
// so its stronger launch stays occluded, then decelerates through the reveal.
const easeInOutQuad = (x: number) => {
  x = clamp(x);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const window = (t: number, a: number, b: number, curve = ease) =>
  curve((t - a) / (b - a));
export function amounts(v: OrbitVariant, orb: Orb, time: number) {
  if (orb.ring === "core")
    return (
      window(time, 0.05, v.coreIn) * (1 - window(time, v.coreOut, v.outEnd))
    );
  const delay = orb.group * v.stagger;
  const enter = window(
    time,
    v.inStart + delay,
    v.inStart + delay + v.inLength,
    easeInOutQuad,
  );
  const leaveStart = v.outStart + (5 - orb.group) * v.stagger * 0.62;
  const leave = window(time, leaveStart, v.outEnd, easeOutCubic);
  return enter * (1 - leave);
}
export function pose(v: OrbitVariant, orb: Orb, time: number) {
  const a = amounts(v, orb, time);
  const scale =
    orb.ring === "core"
      ? 1 + (v.coreScale - 1) * a
      : 1 - (1 - (orb.ring === "inner" ? v.innerScale : v.outerScale)) * a;
  const move = orb.ring === "core" ? 0 : a * v.travel;
  // Orbit positions, never the baked lighting. Inner clipped layers stay radial.
  const angle = orb.ring === "outer" ? (a * v.orbitDegrees * Math.PI) / 180 : 0;
  const dx = orb.x - CENTER.x,
    dy = orb.y - CENTER.y;
  const x =
    CENTER.x + (dx * Math.cos(angle) - dy * Math.sin(angle)) * (1 - move);
  const y =
    CENTER.y + (dx * Math.sin(angle) + dy * Math.cos(angle)) * (1 - move);
  const tx = x - orb.x * scale;
  const ty = y - orb.y * scale;
  const opacity = orb.ring === "outer" ? 1 - (1 - v.outerOpacity) * a : 1;
  return {
    scale,
    tx,
    ty,
    opacity,
    amount: a,
    transform: `matrix(${scale.toFixed(7)},0,0,${scale.toFixed(7)},${tx.toFixed(5)},${ty.toFixed(5)})`,
  };
}
export function referenceOpacity(v: OrbitVariant, time: number) {
  const a = Math.max(...orbs.map((o) => amounts(v, o, time)));
  return 1 - ease(a / 0.035);
}
export type Orb = (typeof orbs)[number];
export type OrbitVariant = typeof orbit;
export const ORBIT_INITIAL_WAIT_MS = 4000;
export const ORBIT_PAUSE_MS = 12000;
