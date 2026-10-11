const MODES = [['ambient', 'ambient'], ['color', 'farge']]

export default function ModeSwitch({ value, onChange }) {
  return (
    <div className="mode-switch">
      {MODES.map(([mode, label]) => (
        <button key={mode} className={`chip ${value === mode ? 'active' : ''}`} onClick={() => onChange(mode)}>
          {label}
        </button>
      ))}
    </div>
  )
}
