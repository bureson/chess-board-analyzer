export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const FILES ='abcdefgh';

export type Color = 'w' | 'b';

export interface Position {
  /** 64 squares, a8 first, h1 last. FEN piece letters, uppercase = white. */
  board: (string | null)[];
  turn: Color;
  castling: string;
  ep: string;
  half: number;
  full: number;
}

export const sqIdx = (sq: string) => (8 - +sq[1]) * 8 + FILES.indexOf(sq[0]);
export const idxSq = (i: number) => FILES[i % 8] + (8 - Math.floor(i / 8));
export const isWhite = (piece: string) => piece === piece.toUpperCase();

/** Lenient parse: only the board field is required, the rest gets defaults. */
export function parseFen(fen: string): Position | null {
  const parts = fen.trim().split(/\s+/);
  const rows = parts[0].split('/');
  if (rows.length !== 8) return null;
  const board: (string | null)[] = [];
  for (const row of rows) {
    let n = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        for (let i = 0; i < +ch; i++) board.push(null);
        n += +ch;
      } else if (/[prnbqkPRNBQK]/.test(ch)) {
        board.push(ch);
        n++;
      } else return null;
    }
    if (n !== 8) return null;
  }
  return {
    board,
    turn: parts[1] === 'b' ? 'b' : 'w',
    castling: parts[2] || '-',
    ep: parts[3] || '-',
    half: +(parts[4] || 0) || 0,
    full: +(parts[5] || 1) || 1,
  };
}

export function toFen(p: Position): string {
  const rows: string[] = [];
  for (let r = 0; r < 8; r++) {
    let s = '';
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const c = p.board[r * 8 + f];
      if (c) {
        if (empty) s += empty;
        empty = 0;
        s += c;
      } else empty++;
    }
    if (empty) s += empty;
    rows.push(s);
  }
  return `${rows.join('/')} ${p.turn} ${p.castling} ${p.ep} ${p.half} ${p.full}`;
}

/** Castling rights implied by kings and rooks standing on their home squares. */
export function castlingFor(board: (string | null)[]): string {
  let c = '';
  if (board[sqIdx('e1')] === 'K') {
    if (board[sqIdx('h1')] === 'R') c += 'K';
    if (board[sqIdx('a1')] === 'R') c += 'Q';
  }
  if (board[sqIdx('e8')] === 'k') {
    if (board[sqIdx('h8')] === 'r') c += 'k';
    if (board[sqIdx('a8')] === 'r') c += 'q';
  }
  return c || '-';
}
