import { useCallback, useEffect, useRef, useState } from 'react';
import Board from './Board.jsx';
import {
  TARGET,
  countCells,
  findPairs,
  findSolution,
  isNeighbour,
  locate,
  removeIds,
  updateMatching,
} from './game.js';
import { MAX_LEVEL, makeLevel } from './levels.js';

const CLEAR_MS = 220;
const STORAGE_KEY = 'tiervenner-v1';
const START_TEXT = 'Vælg to nabofelter der giver 10.';

const clampLevel = (n) => Math.min(MAX_LEVEL, Math.max(1, Math.round(n) || 1));

// Husker level mellem besøg. Virker også hvis browseren blokerer lagring.
function loadProgress() {
  let level = 1;
  let highest = 1;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      level = clampLevel(saved.level);
      highest = clampLevel(saved.highest);
    }
  } catch {
    /* ingen gemt fremgang */
  }
  // Læreren kan hoppe direkte til et level med ?level=7 i adressen.
  const wanted = Number(new URLSearchParams(window.location.search).get('level'));
  if (wanted >= 1) {
    level = clampLevel(wanted);
    highest = Math.max(highest, level);
  }
  return { level, highest: Math.max(highest, level) };
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* lagring er ikke tilgængelig */
  }
}

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [round, setRound] = useState(0); // tælles op for at få et nyt bræt
  const [game, setGame] = useState(null); // { start, cols, matching }
  const [selected, setSelected] = useState(null);
  const [hint, setHint] = useState(null);
  const [clearing, setClearing] = useState([]);
  const [shaking, setShaking] = useState([]);
  const [message, setMessage] = useState({ text: START_TEXT, tone: 'plain' });
  const [hintsUsed, setHintsUsed] = useState(0);
  const timers = useRef([]);

  const { level, highest } = progress;

  const later = useCallback((fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const resetRound = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSelected(null);
    setHint(null);
    setClearing([]);
    setShaking([]);
    setHintsUsed(0);
    setMessage({ text: START_TEXT, tone: 'plain' });
  }, []);

  // Lav et nyt bræt når level skifter, eller når der bedes om et nyt.
  useEffect(() => {
    setGame(null);
    resetRound();
    const seed = Math.floor(Math.random() * 2 ** 31);
    // Lille pause, så "Laver bræt …" når at blive vist først.
    const id = setTimeout(() => {
      const start = makeLevel(level, seed);
      setGame({ start, cols: start.cols, matching: start.solution });
    }, 40);
    return () => clearTimeout(id);
  }, [level, round, resetRound]);

  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const left = game ? countCells(game.cols) : 0;
  const won = game !== null && left === 0;
  const busy = clearing.length > 0;

  function pick(id) {
    if (!game || busy || won) return;
    setHint(null);
    setShaking([]);
    if (selected === null) {
      setSelected(id);
      return;
    }
    if (selected === id) {
      setSelected(null);
      return;
    }

    const a = locate(game.cols, selected);
    const b = locate(game.cols, id);
    const va = game.cols[a.c][a.r].v;
    const vb = game.cols[b.c][b.r].v;
    const sum = va + vb;

    if (sum !== TARGET) {
      setMessage({ text: `${va} + ${vb} = ${sum}. Det giver ikke 10.`, tone: 'bad' });
      setShaking([selected, id]);
      setSelected(null);
      return;
    }
    if (!isNeighbour(a, b)) {
      setMessage({ text: `${va} + ${vb} = 10, men felterne er ikke naboer.`, tone: 'bad' });
      setShaking([selected, id]);
      setSelected(null);
      return;
    }

    const idA = selected;
    setMessage({ text: `${va} + ${vb} = 10`, tone: 'good' });
    setSelected(null);
    setClearing([idA, id]);
    later(() => {
      setGame((g) => ({
        ...g,
        cols: removeIds(g.cols, idA, id),
        matching: updateMatching(g.matching, idA, id),
      }));
      setClearing([]);
    }, CLEAR_MS);
  }

  function showHint() {
    if (!game || busy || won) return;
    setSelected(null);
    setShaking([]);
    const pairs = findPairs(game.cols);
    if (pairs.length === 0) {
      setHint(null);
      setMessage({ text: 'Der er ingen par tilbage. Start level forfra.', tone: 'bad' });
      return;
    }
    setHintsUsed((n) => n + 1);

    // Helst et par der holder vejen til et tomt bræt åben.
    const found = findSolution(game.cols, game.matching, 250);
    if (found) {
      setGame((g) => ({ ...g, matching: found.matching }));
      setHint(found.solution[0]);
    } else {
      const [a, b] = pairs[Math.floor(Math.random() * pairs.length)];
      setHint([game.cols[a.c][a.r].id, game.cols[b.c][b.r].id]);
    }
    setMessage({ text: 'Prøv de to felter der blinker.', tone: 'plain' });
  }

  function restart() {
    if (!game) return;
    resetRound();
    setGame((g) => ({ start: g.start, cols: g.start.cols, matching: g.start.solution }));
  }

  function goToLevel(next) {
    const target = clampLevel(next);
    if (target === level) {
      setRound((n) => n + 1);
      return;
    }
    setProgress((p) => ({ level: target, highest: Math.max(p.highest, target) }));
  }

  return (
    <main className="app">
      <header className="top">
        <h1>
          10’er-venner
        </h1>
        <div className="level" aria-label="Vælg level">
          <button
            type="button"
            className="step"
            onClick={() => goToLevel(level - 1)}
            disabled={level <= 1}
            aria-label="Forrige level"
          >
            ‹
          </button>
          <span className="level-name">
            Level {level}
            <small>af {MAX_LEVEL}</small>
          </span>
          <button
            type="button"
            className="step"
            onClick={() => goToLevel(level + 1)}
            disabled={level >= highest}
            aria-label="Næste level"
          >
            ›
          </button>
        </div>
      </header>

      <p className={`status tone-${message.tone}`} role="status" aria-live="polite">
        {message.text}
      </p>

      <div className="board-wrap">
        {game ? (
          <Board
            cols={game.cols}
            selected={selected}
            hint={hint}
            clearing={clearing}
            shaking={shaking}
            onPick={pick}
            disabled={won}
          />
        ) : (
          <div className="board board-loading">Laver bræt …</div>
        )}

        {won && (
          <div className="win" role="dialog" aria-label="Level klaret">
            <p className="win-title">Brættet er tomt!</p>
            <p className="win-text">
              {hintsUsed === 0
                ? 'Du klarede det helt uden hints.'
                : `Du brugte ${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'}.`}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => goToLevel(level + 1)} autoFocus>
              {level < MAX_LEVEL ? `Videre til level ${level + 1}` : 'Nyt bræt på level 10'}
            </button>
          </div>
        )}
      </div>

      <footer className="bottom">
        <p className="counts">
          <span>
            Felter tilbage: <strong>{left}</strong>
          </span>
          <span>
            Hints: <strong>{hintsUsed}</strong>
          </span>
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={showHint} disabled={!game || won || busy}>
            Hint
          </button>
          <button type="button" className="btn" onClick={restart} disabled={!game}>
            Start level forfra
          </button>
        </div>
      </footer>
    </main>
  );
}
