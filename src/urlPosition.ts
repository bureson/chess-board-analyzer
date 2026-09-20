/**
 * The current position lives in the URL hash as a FEN with underscores instead of spaces,
 * e.g. `#rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR_b_KQkq_-_0_1`, so a reload keeps the
 * position, the link can be shared and the browser's back button walks through earlier positions.
 */

export function readUrlFen(): string | null {
  const raw = window.location.hash.slice(1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).replace(/_/g, ' ');
  } catch {
    return null;
  }
}

/** `push` adds a history entry (a played move), `replace` amends the current one (board editing). */
export function writeUrlFen(fen: string, mode: 'push' | 'replace') {
  const hash = `#${fen.replace(/ /g, '_')}`;
  if (window.location.hash === hash) return;
  if (mode === 'push') window.history.pushState(null, '', hash);
  else window.history.replaceState(null, '', hash);
}
