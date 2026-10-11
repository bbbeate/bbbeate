export default function AmbientSlider({ value, onChange }) {
  return (
    <>
      <label className="setting-row">
        <span>ambient</span>
        <input
          type="range"
          min="153"
          max="500"
          value={value}
          onChange={e => onChange(parseInt(e.target.value))}
        />
      </label>
      <div className="temp-labels">
        <span>kald</span>
        <span>varm</span>
      </div>
    </>
  )
}
