// Spillogik til 10'er-venner. Ingen React her – kun rene funktioner.
//
// Brættet er en liste af kolonner. Hver kolonne er en liste af felter
// fra BUNDEN og op, så "tyngdekraft" bare er at fjerne et element.
// Et felt er { id, v } hvor v er cifferet 1-9.

export const SIZE = 10;
export const TARGET = 10;

// Lille, hurtig tilfældighedsgenerator med seed, så et bræt kan genskabes.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng, n) => Math.floor(rng() * n);

function pickWeighted(rng, weights) {
  let total = 0;
  for (const w of weights) total += w;
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}

export const cloneCols = (cols) => cols.map((col) => col.slice());

export const countCells = (cols) => cols.reduce((n, col) => n + col.length, 0);

// Naboer er vandret, lodret og diagonalt.
export function isNeighbour(a, b) {
  const dc = Math.abs(a.c - b.c);
  const dr = Math.abs(a.r - b.r);
  return (dc !== 0 || dr !== 0) && dc <= 1 && dr <= 1;
}

// Alle par af nabofelter der giver 10. Hvert par optræder én gang.
export function findPairs(cols) {
  const pairs = [];
  for (let c = 0; c < cols.length; c++) {
    const col = cols[c];
    const next = cols[c + 1];
    for (let r = 0; r < col.length; r++) {
      const need = TARGET - col[r].v;
      if (r + 1 < col.length && col[r + 1].v === need) {
        pairs.push([{ c, r }, { c, r: r + 1 }]);
      }
      if (!next) continue;
      for (let dr = -1; dr <= 1; dr++) {
        const r2 = r + dr;
        if (r2 >= 0 && r2 < next.length && next[r2].v === need) {
          pairs.push([{ c, r }, { c: c + 1, r: r2 }]);
        }
      }
    }
  }
  return pairs;
}

// Fjerner to felter (givet ved id) og lader resten falde ned.
export function removeIds(cols, idA, idB) {
  return cols.map((col) => {
    for (let i = 0; i < col.length; i++) {
      if (col[i].id === idA || col[i].id === idB) {
        return col.filter((cell) => cell.id !== idA && cell.id !== idB);
      }
    }
    return col;
  });
}

export function locate(cols, id) {
  for (let c = 0; c < cols.length; c++) {
    for (let r = 0; r < cols[c].length; r++) {
      if (cols[c][r].id === id) return { c, r };
    }
  }
  return null;
}

// ---------------------------------------------------------------------
// Brætgenerator
//
// Brættet bygges BAGLÆNS: vi starter med et tomt bræt og skubber ét par
// ind ad gangen, sådan at de to felter er naboer i det øjeblik de sættes
// ind. Spiller man parrene i omvendt rækkefølge, tømmes brættet – så
// alle bræt har med garanti en løsning.
//
// "vertical" er andelen af par der ligger lodret i samme kolonne. De par
// er robuste: de kan ikke skilles ad af det der sker i nabokolonnerne.
// Par på tværs af to kolonner er skrøbelige, fordi kolonnerne falder
// hver for sig.
//
// "deep" styrer hvor ofte et par skubbes ind midt i en kolonne i stedet
// for at blive lagt ovenpå. Par der skubbes ind i midten, skiller ældre
// par ad, som så først mødes igen når det nye par er fjernet. Det er dét
// der gør rækkefølgen vigtig.
// ---------------------------------------------------------------------
function tryGenerate(rng, { deep, vertical, weights }) {
  const cols = Array.from({ length: SIZE }, () => []);
  const order = [];
  let nextId = 1;
  const total = (SIZE * SIZE) / 2;

  for (let n = 0; n < total; n++) {
    // Mulige placeringer: lodret i én kolonne, eller på tværs af to nabokolonner.
    const options = [];
    const optionWeights = [];
    const wantVertical = rng() < vertical;
    for (let c = 0; c < SIZE; c++) {
      const free = SIZE - cols[c].length;
      if (free >= 2 && wantVertical) {
        options.push([c, c]);
        optionWeights.push(free * free);
      }
      if (c + 1 < SIZE && !wantVertical) {
        const free2 = SIZE - cols[c + 1].length;
        if (free >= 1 && free2 >= 1) {
          options.push([c, c + 1]);
          optionWeights.push(2 * free * free2);
        }
      }
    }
    if (options.length === 0) {
      // Den ønskede type par kan ikke være der – prøv den anden type.
      for (let c = 0; c < SIZE; c++) {
        const free = SIZE - cols[c].length;
        if (free >= 2) {
          options.push([c, c]);
          optionWeights.push(free * free);
        }
        if (c + 1 < SIZE && free >= 1 && cols[c + 1].length < SIZE) {
          options.push([c, c + 1]);
          optionWeights.push(free);
        }
      }
    }
    if (options.length === 0) return null;

    const [c1, c2] = options[pickWeighted(rng, optionWeights)];
    const low = 1 + pickWeighted(rng, weights); // 1..5
    const flip = rng() < 0.5;
    const cellA = { id: nextId++, v: flip ? low : TARGET - low };
    const cellB = { id: nextId++, v: flip ? TARGET - low : low };
    const goDeep = rng() < deep;

    if (c1 === c2) {
      const len = cols[c1].length;
      const h = goDeep ? randInt(rng, len + 1) : len;
      cols[c1].splice(h, 0, cellA, cellB);
    } else {
      const len1 = cols[c1].length;
      const len2 = cols[c2].length;
      const maxH1 = Math.min(len1, len2 + 1);
      const h1 = goDeep ? randInt(rng, maxH1 + 1) : maxH1;
      const lo = Math.max(0, h1 - 1);
      const hi = Math.min(len2, h1 + 1);
      const h2 = goDeep ? lo + randInt(rng, hi - lo + 1) : hi;
      cols[c1].splice(h1, 0, cellA);
      cols[c2].splice(h2, 0, cellB);
    }
    order.push([cellA.id, cellB.id]);
  }
  return { cols, solution: order.reverse() };
}

export function generate(rng, params) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const board = tryGenerate(rng, params);
    if (board) return board;
  }
  throw new Error('Kunne ikke lave et bræt');
}

// ---------------------------------------------------------------------
// Måling af sværhedsgrad
//
// Vi lader en "tilfældig spiller" klikke løs på gyldige par og ser hvor
// ofte brættet bliver tømt. Jo sjældnere det lykkes, jo færre veje fører
// til et tomt bræt – og jo mere skal eleven planlægge.
// ---------------------------------------------------------------------
export function randomPlayout(start, rng) {
  let cols = start;
  const moves = [];
  for (;;) {
    const pairs = findPairs(cols);
    if (pairs.length === 0) break;
    const [a, b] = pairs[randInt(rng, pairs.length)];
    const idA = cols[a.c][a.r].id;
    const idB = cols[b.c][b.r].id;
    moves.push([idA, idB]);
    cols = removeIds(cols, idA, idB);
  }
  return { left: countCells(cols), moves };
}

export function successRate(cols, rng, trials) {
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    if (randomPlayout(cols, rng).left === 0) wins++;
  }
  return wins / trials;
}

// Tjekker om en række træk (par af id'er) stadig tømmer brættet.
export function solutionStillWorks(start, solution) {
  let cols = start;
  for (const [idA, idB] of solution) {
    const a = locate(cols, idA);
    const b = locate(cols, idB);
    if (!a || !b || !isNeighbour(a, b)) return false;
    if (cols[a.c][a.r].v + cols[b.c][b.r].v !== TARGET) return false;
    cols = removeIds(cols, idA, idB);
  }
  return countCells(cols) === 0;
}

// ---------------------------------------------------------------------
// Hint
//
// Vi husker hele tiden en "makkerliste": en opdeling af alle felter på
// brættet i par der giver 10. Fra start er det generatorens par. Når
// eleven vælger et par der ikke står på listen, har de brugt ét felt fra
// hvert af to par – og de to felter der blev tilovers, er altid selv
// 10'er-venner, så de bliver bare gjort til makkere.
//
// Et hint finder en rækkefølge at spille makkerlisten i, så brættet
// bliver tomt. Findes der ingen, prøver vi at bytte makkere ét sted.
// ---------------------------------------------------------------------
export function updateMatching(matching, idA, idB) {
  const touched = matching.filter((p) => p.includes(idA) || p.includes(idB));
  const rest = matching.filter((p) => !p.includes(idA) && !p.includes(idB));
  if (touched.length === 2) {
    rest.push(touched.flat().filter((id) => id !== idA && id !== idB));
  }
  return rest;
}

// Finder en rækkefølge for parrene i makkerlisten.
// Returnerer { solution, timedOut } hvor solution er null hvis ingen blev fundet.
export function orderMatching(start, matching, deadline) {
  const n = matching.length;
  const dead = new Set();
  const used = new Array(n).fill(false);
  const path = [];
  let nodes = 0;
  let timedOut = false;

  function dfs(cols, left) {
    if (left === 0) return true;
    if ((++nodes & 31) === 0 && Date.now() > deadline) {
      timedOut = true;
      return false;
    }
    let key = '';
    for (let i = 0; i < n; i++) key += used[i] ? '1' : '0';
    if (dead.has(key)) return false;

    const where = new Map();
    for (let c = 0; c < cols.length; c++) {
      for (let r = 0; r < cols[c].length; r++) where.set(cols[c][r].id, { c, r });
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const [idA, idB] = matching[i];
      if (!isNeighbour(where.get(idA), where.get(idB))) continue;
      used[i] = true;
      path.push(matching[i]);
      if (dfs(removeIds(cols, idA, idB), left - 1)) return true;
      path.pop();
      used[i] = false;
      if (timedOut) return false;
    }
    dead.add(key);
    return false;
  }

  const ok = dfs(start, n);
  return { solution: ok ? path.slice() : null, timedOut };
}

// Finder en vej til et tomt bræt fra den aktuelle stilling.
// Returnerer { solution, matching } eller null hvis ingen vej blev fundet.
export function findSolution(cols, matching, budgetMs) {
  const deadline = Date.now() + budgetMs;
  const direct = orderMatching(cols, matching, Date.now() + budgetMs / 3);
  if (direct.solution) return { solution: direct.solution, matching };

  // Prøv hvert muligt træk der bytter makkere, og se om resten går op.
  const pairs = findPairs(cols);
  const slice = Math.max(4, budgetMs / Math.max(1, pairs.length));
  for (const [a, b] of pairs) {
    if (Date.now() > deadline) break;
    const idA = cols[a.c][a.r].id;
    const idB = cols[b.c][b.r].id;
    if (matching.some((p) => p.includes(idA) && p.includes(idB))) continue;
    const swapped = updateMatching(matching, idA, idB);
    const after = removeIds(cols, idA, idB);
    const result = orderMatching(after, swapped, Math.min(deadline, Date.now() + slice));
    if (result.solution) {
      const first = [idA, idB];
      return { solution: [first, ...result.solution], matching: [...swapped, first] };
    }
  }
  return null;
}
