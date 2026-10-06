import { SIZE } from './game.js';

// Tegner brættet. Hvert felt har en fast nøgle (id), så når et felt får
// en ny række, glider det derhen af sig selv – det er "faldet".
export default function Board({ cols, selected, hint, clearing, shaking, onPick, disabled }) {
  const tiles = [];
  cols.forEach((col, c) => {
    col.forEach((cell, r) => tiles.push({ ...cell, c, r }));
  });
  // Fast rækkefølge i DOM'en, så animationerne ikke bliver afbrudt.
  tiles.sort((a, b) => a.id - b.id);

  return (
    <div className="board" role="grid" aria-label="Spillebræt">
      {tiles.map((t) => {
        const classes = ['tile'];
        if (t.id === selected) classes.push('is-selected');
        if (hint && hint.includes(t.id)) classes.push('is-hint');
        if (clearing.includes(t.id)) classes.push('is-clearing');
        if (shaking.includes(t.id)) classes.push('is-shaking');
        return (
          <button
            key={t.id}
            type="button"
            className={classes.join(' ')}
            data-v={t.v}
            disabled={disabled}
            aria-label={`${t.v}, kolonne ${t.c + 1}, række ${t.r + 1} fra bunden`}
            aria-pressed={t.id === selected}
            style={{ transform: `translate(${t.c * 100}%, ${(SIZE - 1 - t.r) * 100}%)` }}
            onClick={() => onPick(t.id)}
          >
            <span className="face">{t.v}</span>
          </button>
        );
      })}
    </div>
  );
}
