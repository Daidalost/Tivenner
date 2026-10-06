// Levels: alle bræt er 10×10. Det der ændrer sig, er hvor mange
// rækkefølger der fører til et tomt bræt.
//
//   vertical – andel af robuste (lodrette) par. Høj = tilgivende.
//   deep     – hvor ofte et par er gemt inde i et andet par. Høj = rækkefølgen betyder mere.
//   target   – hvor ofte en spiller der klikker HELT tilfældigt skal kunne
//              tømme brættet. Generatoren laver flere bræt og vælger det
//              der rammer tallet bedst.
//
// Vil du justere sværhedsgraden, er det tallene her du skal ændre.
import { generate, makeRng, successRate } from './game.js';

export const LEVELS = [
  { vertical: 0.85, deep: 0.0, target: 0.25 },
  { vertical: 0.85, deep: 0.2, target: 0.17 },
  { vertical: 0.82, deep: 0.35, target: 0.12 },
  { vertical: 0.8, deep: 0.5, target: 0.08 },
  { vertical: 0.75, deep: 0.6, target: 0.055 },
  { vertical: 0.7, deep: 0.7, target: 0.035 },
  { vertical: 0.65, deep: 0.8, target: 0.022 },
  { vertical: 0.55, deep: 0.9, target: 0.012 },
  { vertical: 0.45, deep: 1.0, target: 0.006 },
  { vertical: 0.35, deep: 1.0, target: 0 },
];

export const MAX_LEVEL = LEVELS.length;

// Alle fem slags 10'er-venner (1+9, 2+8, 3+7, 4+6, 5+5) er lige hyppige.
const WEIGHTS = [1, 1, 1, 1, 1];
const CANDIDATES = 8;
const TRIALS = 150;

// Mindst så mange par skal ligge på tværs af to kolonner (vandret eller
// skråt), så brættet aldrig kan tømmes ved kun at gå kolonne for kolonne.
const MIN_CROSS = 5;

function countCrossPairs(board) {
  const column = new Map();
  board.cols.forEach((col, c) => col.forEach((cell) => column.set(cell.id, c)));
  return board.solution.filter(([a, b]) => column.get(a) !== column.get(b)).length;
}

export function makeLevel(level, seed) {
  const spec = LEVELS[Math.min(Math.max(level, 1), MAX_LEVEL) - 1];
  const rng = makeRng(seed);
  let best = null;
  let measured = 0;
  for (let tries = 0; tries < 60 && measured < CANDIDATES; tries++) {
    const board = generate(rng, { ...spec, weights: WEIGHTS });
    // Efter 50 forsøg tager vi hvad vi kan få, så der altid kommer et bræt.
    if (countCrossPairs(board) < MIN_CROSS && tries < 50) continue;
    measured++;
    const rate = successRate(board.cols, rng, TRIALS);
    const miss = Math.abs(Math.log(rate + 0.004) - Math.log(spec.target + 0.004));
    if (!best || miss < best.miss) best = { ...board, rate, miss };
  }
  return { cols: best.cols, solution: best.solution, rate: best.rate };
}
