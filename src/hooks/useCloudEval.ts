import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudEvalError, fetchCloudEval, type CloudEval } from '../lichess/cloudEval';

export interface EvalState {
  status: 'idle' | 'loading' | 'ok' | 'error';
  result: CloudEval | null;
  error: CloudEvalError | null;
}

const IDLE: EvalState = { status: 'idle', result: null, error: null };

export function useCloudEval(multiPv: number) {
  const [state, setState] = useState<EvalState>(IDLE);
  const timer = useRef<number | undefined>(undefined);
  const controller = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    controller.current?.abort();
  }, []);

  /** Drops the current eval right away and requests a new one after `delay` ms. */
  const analyze = useCallback(
    (fen: string, delay = 0) => {
      cancel();
      const ctrl = new AbortController();
      controller.current = ctrl;
      setState({ status: 'loading', result: null, error: null });
      timer.current = window.setTimeout(() => {
        fetchCloudEval(fen, multiPv, ctrl.signal)
          .then((result) => {
            if (!ctrl.signal.aborted) setState({ status: 'ok', result, error: null });
          })
          .catch((e) => {
            if (ctrl.signal.aborted) return;
            const error = e instanceof CloudEvalError ? e : new CloudEvalError('network', 'Something went wrong while analyzing.');
            setState({ status: 'error', result: null, error });
          });
      }, delay);
    },
    [cancel, multiPv],
  );

  const reset = useCallback(() => {
    cancel();
    setState(IDLE);
  }, [cancel]);

  useEffect(() => cancel, [cancel]);

  return { ...state, analyze, reset };
}
