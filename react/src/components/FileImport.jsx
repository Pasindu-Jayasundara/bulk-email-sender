import { useState } from 'react'
import DataFileMatches from './DataFileMatches.jsx'
import RecipientTable from './RecipientTable.jsx'

export default function FileImport({ primaryInputRef, dataInputRef, primaryFile, dataFiles, primaryFields, sources, typedEmails, onTypedEmailsChange, busy, rowCount, dragging, setDragging, onPrimaryFile, onDataFiles, onManualDataChange, onRemoveDataFile, onJoinChange, recipientProps }) {
  const [manualData, setManualData] = useState('')
  const prettyBytes = (bytes) => bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
  return <>
    <div className="section-heading"><span className="step">01</span><div><h2>Bring your data</h2><p>Choose file uploads or enter recipient and data rows manually.</p></div></div>
    <div className="import-paths">
      <details className="import-path" open>
        <summary>Upload by files</summary>
        <div className="import-path-content">
          <details className="import-subsection" open>
            <summary>Recipients</summary>
            <div className={`dropzone ${dragging ? 'is-dragging' : ''} ${primaryFile ? 'has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); onPrimaryFile(event.dataTransfer.files[0]) }} onClick={() => primaryInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && primaryInputRef.current?.click()}>
              <input ref={primaryInputRef} type="file" accept=".csv,.xlsx,.xls" hidden onChange={(event) => onPrimaryFile(event.target.files?.[0])}/>
              <span className="upload-icon">{primaryFile ? '✓' : '↑'}</span><div className="upload-copy"><strong>{primaryFile ? primaryFile.name : 'Recipient list'}</strong><span>{primaryFile ? `${prettyBytes(primaryFile.size)} · ${busy ? 'Reading rows…' : `${rowCount} recipients`}` : 'CSV or Excel · choose the file containing recipient addresses'}</span></div><span className="browse">{primaryFile ? 'CHANGE' : 'BROWSE'}</span>
            </div>
            <RecipientTable {...recipientProps}/>
          </details>
          <details className="import-subsection">
            <summary>Data</summary>
            <div className="data-files-heading"><div><strong>Additional data files</strong><span>Join their rows to recipients by matching a shared column or row order.</span></div><button type="button" className="add-file-button" onClick={() => dataInputRef.current?.click()}>＋ Add data file</button><input ref={dataInputRef} type="file" accept=".csv,.xlsx,.xls" multiple hidden onChange={(event) => { onDataFiles(Array.from(event.target.files || [])); event.target.value = '' }}/></div>
            {dataFiles.length > 0 && <div className="data-file-list">{dataFiles.map(({ id, file }) => <div className="data-file-item" key={id}><span className="data-file-icon">▤</span><span className="data-file-name"><strong>{file.name}</strong><small>{prettyBytes(file.size)}</small></span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => onRemoveDataFile(id)}>×</button></div>)}</div>}
            <DataFileMatches primaryFields={primaryFields} sources={sources} onJoinChange={onJoinChange}/>
          </details>
        </div>
      </details>
      <details className="import-path">
        <summary>Enter manually</summary>
        <div className="import-path-content">
          <details className="import-subsection">
            <summary>Recipients</summary>
            <div className="typed-recipients"><label htmlFor="typed-emails">EMAIL ADDRESSES</label><textarea id="typed-emails" value={typedEmails} onChange={(event) => onTypedEmailsChange(event.target.value)} placeholder="Type or paste addresses, separated by commas or new lines" rows={3}/><small>Typed addresses are combined with the uploaded recipient list.</small></div>
          </details>
          <details className="import-subsection">
            <summary>Data</summary>
            <div className="manual-data-entry"><p>Enter column names on the first line, then one row per line. Separate values with commas or tabs. Fields update as you type.</p><textarea value={manualData} onChange={(event) => { const value = event.target.value; setManualData(value); onManualDataChange(value) }} aria-label="Manual data rows" placeholder={'Email,Name,Code\nalex@example.com,Alex,ABC123'} rows={5}/></div>
          </details>
        </div>
      </details>
    </div>
  </>
}
