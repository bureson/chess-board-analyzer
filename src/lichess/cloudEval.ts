import { validateFen } from 'chess.js';

export interface CloudEvalPv {
  /** Space separated UCI moves. */
  moves: string;
  /** Centipawns from White's point of view. Absent when `mate` is set. */
  cp?: number;
  /** Moves until mate, positive when White mates. */
  mate?: number;
}

export interface CloudEval {
  fen: string;
  knodes: number;
  depth: number;
  pvs: CloudEvalPv[];
}

export type CloudEvalErrorKind = 'invalid' | 'not-found' | 'rate-limited' | 'network';

export class CloudEvalError extends Error {
  constructor(
    readonly kind: CloudEvalErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const cache = new Map<string, CloudEval>();

async function request(fen: string, multiPv: number, signal: AbortSignal): Promise<CloudEval | null> {
  const key = `${multiPv}|${fen}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let res: Response;
  try {
    res = await fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${multiPv}`, { signal });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new CloudEvalError('network', 'Could not reach Lichess. Check your connection and try again.');
  }
  if (res.status === 404) return null;
  if (res.status === 429) {
    throw new CloudEvalError('rate-limited', 'Lichess is rate limiting requests. Wait a minute before analyzing again.');
  }
  if (!res.ok) throw new CloudEvalError('network', `Lichess answered with an error (HTTP ${res.status}). Try again later.`);
  const json = (await res.json()) as CloudEval;
  cache.set(key, json);
  return json;
}

export async function fetchCloudEval(fen: string, multiPv: number, signal: AbortSignal): Promise<CloudEval> {
  const valid = validateFen(fen);
  if (!valid.ok) throw new CloudEvalError('invalid', `This position can't be analyzed: ${valid.error}`);
  // The cloud stores evals per multiPv; a position missing at multiPv=3 may still have a single-line eval.
  const result = (await request(fen, multiPv, signal)) ?? (multiPv > 1 ? await request(fen, 1, signal) : null);
  if (!result) {
    throw new CloudEvalError(
      'not-found',
      'This position is not in the Lichess cloud database yet. Try a more common position, or open it on Lichess to run a local engine.',
    );
  }
  return result;
}
