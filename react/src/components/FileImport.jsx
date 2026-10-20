export default function FileImport({ primaryInputRef, dataInputRef, primaryFile, dataFiles, busy, rowCount, dragging, setDragging, onPrimaryFile, onDataFiles, onRemoveDataFile }) {
  const prettyBytes = (bytes) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
  return <>
    <div className="section-heading"><span className="step">01</span><div><h2>Bring your files</h2><p>Choose a recipient list, then add any number of matching data files.</p></div></div>
    <div className={`dropzone ${dragging ? 'is-dragging' : ''} ${primaryFile ? 'has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); onPrimaryFile(event.dataTransfer.files[0]) }} onClick={() => primaryInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && primaryInputRef.current?.click()}>
      <input ref={primaryInputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(event) => onPrimaryFile(event.target.files?.[0])}/>
      <span className="upload-icon">{primaryFile ? '✓' : '↑'}</span><div className="upload-copy"><strong>{primaryFile ? primaryFile.name : 'Recipient list'}</strong><span>{primaryFile ? `${prettyBytes(primaryFile.size)} · ${busy ? 'Reading rows…' : `${rowCount} recipients`}` : 'CSV or Excel · must include an email column'}</span></div><span className="browse">{primaryFile ? 'CHANGE' : 'BROWSE'}</span>
    </div>
    <div className="data-files-heading"><div><strong>Additional data</strong><span>Join each file to recipients with a shared field, such as ID or email.</span></div><button type="button" className="add-file-button" onClick={() => dataInputRef.current?.click()}>＋ Add data file</button><input ref={dataInputRef} type="file" accept=".csv,.xlsx,.xls" multiple hidden onChange={(event) => { onDataFiles(Array.from(event.target.files || [])); event.target.value = '' }}/></div>
    {dataFiles.length > 0 && <div className="data-file-list">{dataFiles.map(({ id, file }) => <div className="data-file-item" key={id}><span className="data-file-icon">▤</span><span className="data-file-name"><strong>{file.name}</strong><small>{prettyBytes(file.size)}</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => onRemoveDataFile(id)}>×</button></div>)}</div>}
  </>
}
