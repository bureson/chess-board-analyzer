import { isWhite } from '../chess/fen';
import { GLYPH } from './Board';

/** A FEN piece letter to place, 'erase', or null for moving pieces around. */
export type Tool = string | null;

interface Props {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onStart: () => void;
  onClear: () => void;
  onAnalyze: () => void;
}

const PALETTE = [...'KQRBNP', 'erase', ...'kqrbnp', 'move'];

export function EditorPanel({ tool, onTool, onStart, onClear, onAnalyze }: Props) {
  const hint = tool === 'erase' ? 'Click a square to erase' : tool ? 'Click squares to place' : 'Click a piece, then its destination';
  return (
    <div className="card panel">
      <div className="label panel-head">
        <span>Pieces</span>
        <span className="hint">{hint}</span>
      </div>
      <div className="palette">
        {PALETTE.map((p) => {
          const piece = p.length === 1;
          const classes = ['palette-btn'];
          if (piece) classes.push(isWhite(p) ? 'white' : 'black');
          if ((tool ?? 'move') === p) classes.push('active');
          return (
            <button
              key={p}
              type="button"
              className={classes.join(' ')}
              title={p === 'erase' ? 'Erase' : p === 'move' ? 'Move pieces' : p}
              onClick={() => onTool(p === 'move' ? null : p)}
            >
              {p === 'erase' ? '⌫' : p === 'move' ? '↔' : GLYPH[p.toUpperCase()]}
            </button>
          );
        })}
      </div>
      <div className="button-row">
        <button type="button" className="btn outline" onClick={onStart}>
          Start position
        </button>
        <button type="button" className="btn outline" onClick={onClear}>
          Clear board
        </button>
        <button type="button" className="btn primary push-right" onClick={onAnalyze}>
          Analyze
        </button>
      </div>
    </div>
  );
}
