import { useEffect, useState } from 'react'

function SourceColumnInput({ source, onJoinChange }) {
  const [column, setColumn] = useState(source.sourceField || '')
  const [open, setOpen] = useState(false)
  useEffect(() => setColumn(source.sourceField || ''), [source.sourceField])

  function applyColumn() {
    if (source.fields.includes(column) && column !== source.sourceField) onJoinChange(source.id, 'sourceField', column)
  }

  const matches = source.fields.filter((field) => field.toLowerCase().includes(column.toLowerCase()))
  function chooseColumn(field) {
    setColumn(field)
    setOpen(false)
    if (field !== source.sourceField) onJoinChange(source.id, 'sourceField', field)
  }

  return <div className="source-column-picker"><label htmlFor={`source-column-${source.id}`}>This file field</label><div className="source-column-control"><input id={`source-column-${source.id}`} value={column} onChange={(event) => { setColumn(event.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => { applyColumn(); setTimeout(() => setOpen(false), 120) }} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); const exact = source.fields.find((field) => field.toLowerCase() === column.trim().toLowerCase()); if (exact) chooseColumn(exact); else event.currentTarget.blur() } if (event.key === 'Escape') setOpen(false) }} placeholder="Choose or type a column" aria-autocomplete="list" aria-expanded={open}/><button type="button" aria-label="Show available file columns" aria-expanded={open} onMouseDown={(event) => event.preventDefault()} onClick={() => setOpen((current) => !current)}>⌄</button>{open && <ul className="source-column-options" role="listbox">{matches.length ? matches.map((field) => <li key={field}><button type="button" role="option" aria-selected={field === source.sourceField} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseColumn(field)}>{field}</button></li>) : <li className="no-source-columns">No matching columns</li>}</ul>}</div></div>
}

export default function DataFileMatches({ primaryFields, sources, onJoinChange }) {
  if (!sources.length) return null
  return <div className="join-section"><div className="join-heading"><strong>Match data files</strong><span>Choose the columns that contain the same value in each file.</span></div>{sources.map((source) => <div className="join-card" key={source.id}><div className="join-card-title"><span className="data-file-icon">▤</span><strong>{source.name}</strong><span className={source.mode === 'row' || (source.primaryField && source.sourceField) ? 'match-count' : 'match-count needs-match'}>{source.matched} matched</span></div><label className="join-mode">MATCH METHOD<select value={source.mode} onChange={(event) => onJoinChange(source.id, 'mode', event.target.value)}><option value="choose">Choose how to match</option><option value="key">Match by field value</option><option value="row">Match by row order</option></select></label><div className="join-selects"><label>Recipient list field<select value={source.primaryField} onChange={(event) => onJoinChange(source.id, 'primaryField', event.target.value)}><option value="">Choose a field</option>{primaryFields.map((field) => <option key={field} value={field}>{field}</option>)}</select></label><span className="join-arrow">↔</span><SourceColumnInput source={source} onJoinChange={onJoinChange}/></div>{source.mode === 'row' && <p className="row-match-note">Row 2 in the recipient file pairs with row 2 here, and so on. Choosing a file column switches to field matching.</p>}</div>)}</div>
}
