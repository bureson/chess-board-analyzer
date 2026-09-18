import type { Line } from '../chess/moves';

interface Props {
  lines: (Line & { evalText: string })[];
  selected: number;
  depthText: string;
  emptyText: string;
  onSelect: (index: number) => void;
}

export function EngineLines({ lines, selected, depthText, emptyText, onSelect }: Props) {
  return (
    <div className="lines">
      <div className="label lines-head">
        <span>Top engine lines</span>
        <span>{depthText}</span>
      </div>
      {lines.map((ln, i) => (
        <button key={i} type="button" className={`line${i === selected ? ' active' : ''}`} onClick={() => onSelect(i)}>
          <span className="line-move">{ln.move}</span>
          <span className="line-pv">{ln.pv}</span>
          <span className="line-eval">{ln.evalText}</span>
        </button>
      ))}
      {lines.length === 0 && <div className="lines-empty">{emptyText}</div>}
    </div>
  );
}
