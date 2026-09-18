import { FILES, isWhite, sqIdx } from '../chess/fen';

export const GLYPH: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };

interface Props {
  board: (string | null)[];
  flipped: boolean;
  selected: number | null;
  /** Best move to highlight and draw an arrow for, as square names. */
  bestMove: { from: string; to: string } | null;
  /** Share of the eval bar filled for White, 0–100. */
  evalPct: number;
  clickable: boolean;
  onSquareClick: (index: number) => void;
}

function arrowFor(from: string, to: string, flipped: boolean) {
  const center = (sq: string) => {
    let x = FILES.indexOf(sq[0]) + 0.5;
    let y = 8 - +sq[1] + 0.5;
    if (flipped) {
      x = 8 - x;
      y = 8 - y;
    }
    return [x, y];
  };
  const [x1, y1] = center(from);
  const [x2, y2] = center(to);
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const hx = x2 - ux * 0.45;
  const hy = y2 - uy * 0.45;
  const px = -uy * 0.3;
  const py = ux * 0.3;
  return { x1, y1, x2: x2 - ux * 0.35, y2: y2 - uy * 0.35, head: `${x2},${y2} ${hx + px},${hy + py} ${hx - px},${hy - py}` };
}

export function Board({ board, flipped, selected, bestMove, evalPct, clickable, onSquareClick }: Props) {
  const from = bestMove ? sqIdx(bestMove.from) : -1;
  const to = bestMove ? sqIdx(bestMove.to) : -1;
  const arrow = bestMove && arrowFor(bestMove.from, bestMove.to, flipped);

  return (
    <div className="board-row">
      <div className={`eval-bar${flipped ? ' flipped' : ''}`}>
        <div className="eval-bar-fill" style={{ height: `${evalPct}%` }} />
      </div>
      <div className="board">
        <div className="board-grid">
          {Array.from({ length: 64 }, (_, k) => {
            const i = flipped ? 63 - k : k;
            const r = Math.floor(i / 8);
            const f = i % 8;
            const piece = board[i];
            const classes = ['sq', (r + f) % 2 ? 'dark' : 'light'];
            if (i === from || i === to) classes.push('best');
            if (i === selected) classes.push('selected');
            if (piece) classes.push(isWhite(piece) ? 'white' : 'black');
            if (piece || clickable) classes.push('clickable');
            return (
              <button key={i} type="button" className={classes.join(' ')} onClick={() => onSquareClick(i)}>
                <span className="piece">{piece ? GLYPH[piece.toUpperCase()] : ''}</span>
                {k % 8 === 0 && <span className="coord rank">{8 - r}</span>}
                {k >= 56 && <span className="coord file">{FILES[f]}</span>}
              </button>
            );
          })}
        </div>
        {arrow && (
          <svg className="board-arrow" viewBox="0 0 8 8">
            <line x1={arrow.x1} y1={arrow.y1} x2={arrow.x2} y2={arrow.y2} strokeWidth=".22" strokeLinecap="round" />
            <polygon points={arrow.head} />
          </svg>
        )}
      </div>
    </div>
  );
}
