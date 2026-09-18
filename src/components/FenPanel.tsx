interface Props {
  value: string;
  error: string;
  samples: { name: string; fen: string }[];
  onChange: (value: string) => void;
  onLoad: (fen: string) => void;
}

export function FenPanel({ value, error, samples, onChange, onLoad }: Props) {
  return (
    <div className="card panel">
      <div className="label">Position</div>
      <textarea
        className={`fen-input${error ? ' invalid' : ''}`}
        value={value}
        rows={3}
        spellCheck={false}
        placeholder="Paste a FEN string and press Enter"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onLoad(value);
          }
        }}
      />
      {error && <div className="input-error">{error}</div>}
      <div className="button-row">
        <button type="button" className="btn primary" onClick={() => onLoad(value)}>
          Analyze
        </button>
        {samples.map((s) => (
          <button key={s.name} type="button" className="btn outline" onClick={() => onLoad(s.fen)}>
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
