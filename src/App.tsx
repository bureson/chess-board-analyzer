import { useEffect, useMemo, useState } from 'react';
import { validateFen } from 'chess.js';
import { START_FEN, castlingFor, parseFen, toFen, type Position } from './chess/fen';
import { describeLine, playMove } from './chess/moves';
import { useCloudEval } from './hooks/useCloudEval';
import type { CloudEvalPv } from './lichess/cloudEval';
import { Board } from './components/Board';
import { EngineLines } from './components/EngineLines';
import { FenPanel } from './components/FenPanel';
import { EditorPanel, type Tool } from './components/EditorPanel';

const MULTI_PV = 3;
/** Wait for the board to settle before asking Lichess again. */
const MOVE_DEBOUNCE_MS = 700;

const SAMPLES = [
  { name: 'Italian', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
  { name: 'Sicilian Najdorf', fen: 'rnbqkb1r/1p3ppp/p2ppn2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7' },
  { name: 'Rook endgame', fen: '8/8/4k3/8/2R5/8/5PK1/3r4 w - - 0 50' },
];

const STATUS_TEXT = { invalid: 'Illegal position', 'not-found': 'No cloud eval', 'rate-limited': 'Rate limited', network: 'Offline' };

const cpOf = (pv: CloudEvalPv) => (pv.mate != null ? (pv.mate > 0 ? 10000 : -10000) : (pv.cp ?? 0));

function formatEval(pv: CloudEvalPv) {
  if (pv.mate != null) return `${pv.mate < 0 ? '−' : ''}M${Math.abs(pv.mate)}`;
  const cp = pv.cp ?? 0;
  return (cp >= 0 ? '+' : '−') + (Math.abs(cp) / 100).toFixed(2);
}

function describeAdvantage(cp: number) {
  const side = cp > 0 ? 'White' : 'Black';
  const abs = Math.abs(cp);
  if (abs < 30) return 'Roughly equal';
  if (abs < 100) return `${side} is slightly better`;
  if (abs < 300) return `${side} is better`;
  return `${side} is winning`;
}

function formatNodes(knodes: number) {
  if (knodes >= 1e6) return `${(knodes / 1e6).toFixed(1)}B`;
  if (knodes >= 1e3) return `${Math.round(knodes / 1e3)}M`;
  return `${knodes}k`;
}

export default function App() {
  const [tab, setTab] = useState<'fen' | 'edit'>('edit');
  const [pos, setPos] = useState<Position>(() => parseFen(START_FEN)!);
  const [fenInput, setFenInput] = useState(START_FEN);
  const [inputError, setInputError] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [selLine, setSelLine] = useState(0);
  const [tool, setTool] = useState<Tool>(null);
  const [selSq, setSelSq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const { status, result, error, analyze, reset } = useCloudEval(MULTI_PV);

  const fen = toFen(pos);

  useEffect(() => analyze(START_FEN), [analyze]);

  /** Shows a new position; `delay` is the analysis debounce, or null to not analyze at all. */
  const applyPos = (next: Position, delay: number | null) => {
    const nextFen = toFen(next);
    setPos(next);
    setFenInput(nextFen);
    setInputError('');
    setSelLine(0);
    setSelSq(null);
    if (delay === null) reset();
    else analyze(nextFen, delay);
  };

  /** Free-form edit: castling rights follow the pieces, en passant is dropped. */
  const editPos = (patch: Partial<Position>, delay: number | null = MOVE_DEBOUNCE_MS) => {
    const next = { ...pos, ...patch, ep: '-' };
    next.castling = castlingFor(next.board);
    applyPos(next, delay);
  };

  const loadFen = (text: string) => {
    const parsed = parseFen(text);
    if (!parsed) {
      setInputError(`That doesn't look like a valid FEN. Expected 8 ranks separated by "/", e.g. ${START_FEN}`);
      return;
    }
    const valid = validateFen(toFen(parsed));
    if (!valid.ok) {
      setInputError(valid.error ?? 'Invalid FEN.');
      return;
    }
    applyPos(parsed, 0);
  };

  const clickSquare = (i: number) => {
    const board = pos.board.slice();
    if (tab === 'edit' && tool) {
      board[i] = tool === 'erase' || board[i] === tool ? null : tool;
      return editPos({ board });
    }
    if (selSq === null) {
      if (board[i]) setSelSq(i);
      return;
    }
    if (selSq === i) return setSelSq(null);
    if (tab === 'edit') {
      board[i] = board[selSq];
      board[selSq] = null;
      return editPos({ board });
    }
    const next = playMove(pos, selSq, i);
    if (next) applyPos(next, MOVE_DEBOUNCE_MS);
    else setSelSq(board[i] ? i : null);
  };

  const copyFen = () => {
    navigator.clipboard?.writeText(fen);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  // Every position change drops the previous result, so `result` always belongs to `fen`.
  const lines = useMemo(
    () => (result ? result.pvs.map((pv) => ({ ...describeLine(fen, pv.moves), evalText: formatEval(pv) })) : []),
    [result, fen],
  );
  const bestPv = result?.pvs[selLine] ?? result?.pvs[0];
  const bestLine = lines[selLine] ?? lines[0] ?? null;
  const cp = bestPv ? cpOf(bestPv) : 0;

  const statusText = status === 'loading' ? 'Analyzing' : status === 'ok' ? 'Lichess cloud eval' : error ? STATUS_TEXT[error.kind] : 'Ready';
  const emptyText = status === 'loading' ? 'Querying Lichess cloud evaluation…' : (error?.message ?? 'Load a position to see engine lines.');

  return (
    <div className="app">
      <div className="glow" />

      <header className="header">
        <div className="logo">
          Chess Board Analyzer<span>.</span>
        </div>
        <div className="tabs">
          <button
            type="button"
            className={tab === 'edit' ? 'active' : ''}
            onClick={() => {
              setTab('edit');
              setSelSq(null);
            }}
          >
            Set up board
          </button>
          <button
            type="button"
            className={tab === 'fen' ? 'active' : ''}
            onClick={() => {
              setTab('fen');
              setTool(null);
              setSelSq(null);
            }}
          >
            Paste FEN
          </button>
        </div>
        <div className="status">
          <span className={`status-dot ${status}`} />
          {statusText}
        </div>
      </header>

      <main className="main">
        <section className="board-col">
          <Board
            board={pos.board}
            flipped={flipped}
            selected={selSq}
            bestMove={bestLine}
            evalPct={bestPv ? 50 + 50 * Math.tanh(cp / 400) : 50}
            clickable={selSq !== null || (tab === 'edit' && tool !== null)}
            onSquareClick={clickSquare}
          />
          <div className="board-actions">
            <button type="button" className="btn ghost" onClick={() => setFlipped(!flipped)}>
              Flip board
            </button>
            <button type="button" className="btn ghost" onClick={() => editPos({ turn: pos.turn === 'w' ? 'b' : 'w' })}>
              {pos.turn === 'w' ? 'White to move' : 'Black to move'}
            </button>
            <button type="button" className="btn ghost" onClick={copyFen}>
              {copied ? 'Copied' : 'Copy FEN'}
            </button>
            <a className="push-right" href={`https://lichess.org/analysis/${fen.replace(/ /g, '_')}`} target="_blank" rel="noreferrer">
              Open on Lichess ↗
            </a>
          </div>
          <div className="fen-text">{fen}</div>
        </section>

        <section className="side-col">
          <div className="card eval-card">
            <div className="label">Evaluation</div>
            <div className="eval-row">
              <span className="eval-value">{bestPv ? formatEval(bestPv) : status === 'loading' ? '…' : '—'}</span>
              <span className="eval-note">{bestPv ? describeAdvantage(cp) : ''}</span>
            </div>
          </div>

          <EngineLines
            lines={lines}
            selected={selLine}
            depthText={result ? `depth ${result.depth} · ${formatNodes(result.knodes)} nodes` : ''}
            emptyText={emptyText}
            onSelect={setSelLine}
          />

          {tab === 'fen' ? (
            <FenPanel
              value={fenInput}
              error={inputError}
              samples={SAMPLES}
              onChange={(value) => {
                setFenInput(value);
                setInputError('');
              }}
              onLoad={loadFen}
            />
          ) : (
            <EditorPanel
              tool={tool}
              onTool={(t) => {
                setTool(t);
                setSelSq(null);
              }}
              onStart={() => loadFen(START_FEN)}
              onClear={() => editPos({ board: Array(64).fill(null) }, null)}
              onAnalyze={() => analyze(fen)}
            />
          )}
        </section>
      </main>
    </div>
  );
}
