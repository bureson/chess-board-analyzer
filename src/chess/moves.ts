import { Chess, type Square } from 'chess.js';
import { castlingFor, idxSq, parseFen, toFen, type Position } from './fen';

export interface Line {
  /** First move in SAN, prefixed with "…" when it is Black's move. */
  move: string;
  /** Whole variation in SAN with move numbers. */
  pv: string;
  from: string;
  to: string;
}

// Lichess reports castling as "king takes own rook" (e1h1); chess.js wants e1g1.
function parseUci(chess: Chess, uci: string) {
  const from = uci.slice(0, 2) as Square;
  let to = uci.slice(2, 4) as Square;
  const king = chess.get(from);
  const target = chess.get(to);
  if (king?.type === 'k' && target?.type === 'r' && target.color === king.color) {
    to = ((to[0] > from[0] ? 'g' : 'c') + from[1]) as Square;
  }
  return { from, to, promotion: uci[4] };
}

/** Turns a UCI principal variation from the cloud eval into a displayable line. */
export function describeLine(fen: string, uciMoves: string): Line {
  const ucis = uciMoves.split(' ');
  const line: Line = { move: ucis[0], pv: uciMoves, from: ucis[0].slice(0, 2), to: ucis[0].slice(2, 4) };
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return line;
  }
  const tokens: string[] = [];
  for (const [i, uci] of ucis.entries()) {
    const move = parseUci(chess, uci);
    const white = chess.turn() === 'w';
    const num = chess.moveNumber();
    let san: string;
    try {
      san = chess.move(move).san;
    } catch {
      break;
    }
    if (i === 0) {
      line.move = white ? san : `…${san}`;
      line.to = move.to;
    }
    tokens.push(white ? `${num}. ${san}` : i === 0 ? `${num}… ${san}` : san);
  }
  if (tokens.length) line.pv = tokens.join(' ');
  return line;
}

/**
 * Plays a move on the board. Legal moves only (promotions become queens);
 * returns null when the move is illegal. Positions chess.js cannot load at all
 * (e.g. a missing king) fall back to simply relocating the piece.
 */
export function playMove(pos: Position, from: number, to: number): Position | null {
  let chess: Chess;
  try {
    chess = new Chess(toFen(pos));
  } catch {
    const board = pos.board.slice();
    board[to] = board[from];
    board[from] = null;
    return {
      ...pos,
      board,
      turn: pos.turn === 'w' ? 'b' : 'w',
      castling: castlingFor(board),
      ep: '-',
      full: pos.turn === 'b' ? pos.full + 1 : pos.full,
    };
  }
  try {
    chess.move({ from: idxSq(from), to: idxSq(to), promotion: 'q' });
  } catch {
    return null;
  }
  return parseFen(chess.fen());
}
