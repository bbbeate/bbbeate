export default function ColorInput({ value, onChange }) {
  return (
    <label className="setting-row">
      <span>farge</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}
