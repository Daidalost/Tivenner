import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZE,
  countCells,
  findPairs,
  findSolution,
  makeRng,
  removeIds,
  solutionStillWorks,
  updateMatching,
} from '../src/game.js';
import { MAX_LEVEL, makeLevel } from '../src/levels.js';

test('alle levels giver et fuldt 10×10-bræt med cifrene 1-9 og en løsning', () => {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    for (let seed = 1; seed <= 5; seed++) {
      const board = makeLevel(level, seed * 1000 + level);
      assert.equal(board.cols.length, SIZE);
      for (const col of board.cols) {
        assert.equal(col.length, SIZE);
        for (const cell of col) assert.ok(cell.v >= 1 && cell.v <= 9);
      }
      assert.equal(new Set(board.cols.flat().map((c) => c.id)).size, SIZE * SIZE);
      assert.ok(solutionStillWorks(board.cols, board.solution), `level ${level} kan løses`);
    }
  }
});

test('levels bliver sværere: en tilfældig spiller vinder sjældnere', () => {
  const average = (level) => {
    let sum = 0;
    for (let seed = 1; seed <= 8; seed++) sum += makeLevel(level, seed * 77 + level).rate;
    return sum / 8;
  };
  const easy = average(1);
  const middle = average(5);
  const hard = average(MAX_LEVEL);
  assert.ok(easy > middle && middle > hard, `${easy} > ${middle} > ${hard}`);
});

test('hint giver altid en gyldig vej, også efter at eleven har valgt egne par', () => {
  const rng = makeRng(42);
  for (let level = 1; level <= MAX_LEVEL; level += 3) {
    const board = makeLevel(level, 500 + level);
    let cols = board.cols;
    let matching = board.solution;
    for (let move = 0; move < 20; move++) {
      const found = findSolution(cols, matching, 200);
      if (found) {
        assert.ok(solutionStillWorks(cols, found.solution));
        assert.equal(found.matching.length * 2, countCells(cols));
      }
      const pairs = findPairs(cols);
      if (pairs.length === 0) break;
      const [a, b] = pairs[Math.floor(rng() * pairs.length)];
      const idA = cols[a.c][a.r].id;
      const idB = cols[b.c][b.r].id;
      cols = removeIds(cols, idA, idB);
      matching = updateMatching(matching, idA, idB);
      assert.equal(matching.length * 2, countCells(cols));
    }
  }
});
