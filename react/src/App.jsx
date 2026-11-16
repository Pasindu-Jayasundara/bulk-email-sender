import { useRef, useState } from 'react'
import EmailDesigner from './components/EmailDesigner.jsx'
import FileImport from './components/FileImport.jsx'
import SendPanel from './components/SendPanel.jsx'
import SendingModal from './components/SendingModal.jsx'
import { buildRecipientData, readDataFile } from './lib/dataFiles.js'
import { renderTemplate, DEFAULT_BODY, DEFAULT_SUBJECT } from './lib/template.js'
import { createZip } from './lib/zip.js'
import './email.css'
import './styles/sources.css'
import './styles/fields.css'
import './styles/joins.css'
import './styles/designer.css'
import './styles/send.css'
import './styles/progress.css'
import './styles/editor-enhancements.css'
import './styles/layout.css'

function toBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64Lines(text) {
  const base64 = toBase64(new TextEncoder().encode(text))
  return base64.match(/.{1,76}/g)?.join('\r\n') || ''
}

function makeEml(email, subject, bodyHtml, lineSpacing) {
  const subjectHeader = `=?UTF-8?B?${toBase64(new TextEncoder().encode(subject.replace(/[\r\n]+/g, ' ')))}?=`
  const html = `<div style="font:13px/${lineSpacing} Arial,sans-serif;color:#384137"><style>p{margin:0 0 5px}p:last-child{margin-bottom:0}ul,ol{margin:5px 0;padding-left:24px}</style>${bodyHtml}</div>`
  return `To: ${email}\r\nSubject: ${subjectHeader}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Lines(html)}\r\n`
}

function safeFilePart(value) {
  return value.replace(/[^a-z0-9._-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'recipient'
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = filename; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function App() {
  const primaryInputRef = useRef(null)
  const dataInputRef = useRef(null)
  const previewRunRef = useRef(0)
  const manualDataRunRef = useRef(0)
  const [primaryFile, setPrimaryFile] = useState(null)
  const [dataFiles, setDataFiles] = useState([])
  const [fields, setFields] = useState([])
  const [primaryFields, setPrimaryFields] = useState([])
  const [records, setRecords] = useState([])
  const [sources, setSources] = useState([])
  const [joins, setJoins] = useState({})
  const [recipientField, setRecipientField] = useState('')
  const [recipientAlias, setRecipientAlias] = useState('')
  const [typedEmails, setTypedEmails] = useState('')
  const [manualDataInfo, setManualDataInfo] = useState({ fields: [], records: [] })
  const [headerlessPrimary, setHeaderlessPrimary] = useState(false)
  const [firstColumnName, setFirstColumnName] = useState('Email')
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_BODY)
  const [lineSpacing, setLineSpacing] = useState(1.5)
  const [mailConfig, setMailConfig] = useState({ email: '', appPassword: '' })
  const [busy, setBusy] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendProgress, setSendProgress] = useState(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const manualRecords = typedEmails.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean).map((email, index) => ({ recipient: email, valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), values: { ...(manualDataInfo.records[index]?.values || {}), [recipientAlias || recipientField || 'Email']: email } }))
  const designerFields = [...new Set([...fields, ...manualDataInfo.fields])]
  const seenRecipients = new Set()
  const allRecords = [...records, ...manualRecords].map((record) => {
    const key = record.recipient?.toLowerCase()
    const duplicate = Boolean(record.valid && key && seenRecipients.has(key)) || Boolean(record.duplicate)
    if (record.valid && key) seenRecipients.add(key)
    return { ...record, duplicate }
  })
  const valid = allRecords.filter((record) => record.valid && !record.duplicate)

  async function refreshPreview(primary = primaryFile, extras = dataFiles, selectedRecipient = recipientField, selectedJoins = joins, noHeader = headerlessPrimary, firstName = firstColumnName, selectedAlias = recipientAlias) {
    if (!primary) return
    const run = ++previewRunRef.current
    setBusy(true); setError(''); setResult(null)
    try {
      const data = await buildRecipientData({ primaryFile: primary, dataFiles: extras, recipientField: selectedRecipient, recipientAlias: selectedAlias, headerlessPrimary: noHeader, firstColumnName: firstName, joins: selectedJoins })
      if (run !== previewRunRef.current) return
      setFields(data.fields); setPrimaryFields(data.primaryFields); setRecords(data.records)
      setRecipientField(data.recipientField); setRecipientAlias(data.recipientAlias); setSources(data.sources)
      setJoins(Object.fromEntries(data.sources.map((source) => [source.id, { primaryField: source.primaryField, sourceField: source.sourceField, mode: source.mode }])))
    } catch (exception) { if (run === previewRunRef.current) setError(exception.message || 'Could not read these files.') }
    finally { if (run === previewRunRef.current) setBusy(false) }
  }

  function selectPrimary(file) {
    if (!file) return
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) { setError('Choose a CSV or Excel file (.csv, .xlsx, .xls).'); return }
    setPrimaryFile(file); setFields([]); setPrimaryFields([]); setRecords([]); setSources([]); setRecipientField(''); setJoins({})
    refreshPreview(file, dataFiles, headerlessPrimary ? firstColumnName : '', {}, headerlessPrimary, firstColumnName, '')
  }

  function addDataFiles(files) {
    const accepted = files.filter((file) => /\.(csv|xlsx|xls)$/i.test(file.name))
    if (accepted.length !== files.length) setError('Some files were skipped. Choose CSV or Excel files only.')
    if (!accepted.length) return
    const added = accepted.map((file, index) => ({ id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`, file }))
    const nextFiles = [...dataFiles, ...added]
    const nextJoins = { ...joins }
    setDataFiles(nextFiles); setJoins(nextJoins)
    if (primaryFile) refreshPreview(primaryFile, nextFiles, recipientField, nextJoins)
  }

  function updateManualData(text) {
    const contents = text.trim()
    const run = ++manualDataRunRef.current
    const nextFiles = dataFiles.filter((item) => item.id !== 'manual-data')
    const manualFile = contents ? new File([contents], 'manual-data.csv', { type: 'text/csv' }) : null
    if (manualFile) nextFiles.push({ id: 'manual-data', file: manualFile })
    const nextJoins = { ...joins }
    if (!contents) delete nextJoins['manual-data']
    setDataFiles(nextFiles); setJoins(nextJoins)
    if (!manualFile) setManualDataInfo({ fields: [], records: [] })
    else readDataFile(manualFile).then((data) => {
      if (run === manualDataRunRef.current) setManualDataInfo(data)
    }).catch(() => {
      if (run === manualDataRunRef.current) setManualDataInfo({ fields: [], records: [] })
    })
    if (primaryFile) refreshPreview(primaryFile, nextFiles, recipientField, nextJoins)
  }

  function removeDataFile(id) {
    const nextFiles = dataFiles.filter((item) => item.id !== id)
    const nextJoins = { ...joins }; delete nextJoins[id]
    setDataFiles(nextFiles); setJoins(nextJoins)
    if (primaryFile) refreshPreview(primaryFile, nextFiles, recipientField, nextJoins)
  }

  function changeRecipientField(field) {
    setRecipientField(field)
    const alias = !recipientAlias || recipientAlias === recipientField ? field : recipientAlias
    setRecipientAlias(alias)
    const nextJoins = Object.fromEntries(sources.map((source) => [source.id, { ...joins[source.id], primaryField: field }]))
    setJoins(nextJoins)
    refreshPreview(primaryFile, dataFiles, field, nextJoins, headerlessPrimary, firstColumnName, alias)
  }

  function changeRecipientAlias(alias) {
    setRecipientAlias(alias)
    refreshPreview(primaryFile, dataFiles, recipientField, joins, headerlessPrimary, firstColumnName, alias)
  }

  function changePrimaryHeaderMode(hasHeaders) {
    const nextNoHeader = !hasHeaders
    setHeaderlessPrimary(nextNoHeader)
    const nextRecipient = nextNoHeader ? firstColumnName : ''
    setRecipientField(nextRecipient); setRecipientAlias(nextRecipient)
    refreshPreview(primaryFile, dataFiles, nextRecipient, joins, nextNoHeader, firstColumnName, nextRecipient)
  }

  function changeFirstColumnName(name) {
    setFirstColumnName(name)
    if (headerlessPrimary) {
      setRecipientField(name); setRecipientAlias(name)
      refreshPreview(primaryFile, dataFiles, name, joins, true, name, name)
    }
  }

  function changeJoin(id, key, value) {
    const nextJoins = { ...joins, [id]: { ...joins[id], [key]: value } }
    if ((key === 'sourceField' || key === 'primaryField') && value) nextJoins[id].mode = 'key'
    setJoins(nextJoins)
    refreshPreview(primaryFile, dataFiles, recipientField, nextJoins)
  }

  async function exportEmails() {
    if (!valid.length || !window.confirm(`Create a ZIP with ${valid.length} personalized email drafts?`)) return
    setSending(true); setError(''); setResult(null)
    try {
      const files = valid.map((record, index) => {
        const renderedSubject = renderTemplate(subject, record.values, false).replace(/[\r\n]+/g, ' ').trim() || 'Personalized email'
        const renderedBody = renderTemplate(bodyHtml, record.values)
        return { name: `${String(index + 1).padStart(4, '0')}_${safeFilePart(record.recipient)}.eml`, content: makeEml(record.recipient, renderedSubject, renderedBody, lineSpacing) }
      })
      downloadBlob(createZip(files), 'personalized-email-drafts.zip')
      setResult({ count: files.length })
    } catch (exception) { setError(exception.message || 'Could not prepare the email drafts.') }
    finally { setSending(false) }
  }

  async function sendEmails() {
    if (!valid.length || !window.confirm(`Send ${valid.length} personalized email${valid.length === 1 ? '' : 's'} now?`)) return
    setSending(true); setError(''); setResult(null)
    setSendProgress({ open: true, completed: 0, total: valid.length, sent: 0, failed: 0, finished: false, status: 'connecting' })
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          bodyHtml: `<div style="font:13px/${lineSpacing} Arial,sans-serif;color:#384137"><style>p{margin:0 0 5px}p:last-child{margin-bottom:0}ul,ol{margin:5px 0;padding-left:24px}</style>${bodyHtml}</div>`,
          mailConfig,
          recipients: valid.map((record) => ({ email: record.recipient, values: record.values })),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'The mail service is unavailable. Check that the Vite mail service is running.')
      }
      if (!response.body) throw new Error('This browser cannot display live sending progress.')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let pending = ''
      let completed = false
      const handleEvent = (event) => {
        if (event.type === 'start') {
          setSendProgress((current) => ({ ...current, total: event.total, status: 'sending' }))
        } else if (event.type === 'progress') {
          setSendProgress((current) => ({ ...current, completed: event.completed, total: event.total, sent: event.sent, failed: event.failed, email: event.email, status: event.status }))
        } else if (event.type === 'error') {
          completed = true
          setSendProgress((current) => ({ ...current, finished: true, error: event.message }))
        } else if (event.type === 'done') {
          completed = true
          setSendProgress((current) => ({ ...current, completed: event.sent.length + event.failures.length, sent: event.sent.length, failed: event.failures.length, finished: true, status: 'done' }))
          setResult({ type: 'sent', count: event.sent.length, failures: event.failures || [] })
        }
      }
      const consume = (chunk) => {
        pending += chunk
        const lines = pending.split('\n')
        pending = lines.pop() || ''
        for (const line of lines) if (line.trim()) handleEvent(JSON.parse(line))
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        consume(decoder.decode(value, { stream: true }))
      }
      consume(decoder.decode())
      if (pending.trim()) handleEvent(JSON.parse(pending))
      if (!completed) throw new Error('The sending connection ended before a final status was received.')
    } catch (exception) {
      setSendProgress((current) => ({ ...current, finished: true, error: exception.message || 'Could not reach the mail service. Check that the Vite mail service is running.' }))
    } finally { setSending(false) }
  }

  const unconfiguredJoins = sources.some((source) => source.mode === 'choose' || (source.mode === 'key' && (!source.primaryField || !source.sourceField)))
  return <div className="email-sender"><main className="shell">
    <header className="product-header">
      <a className="product-brand" href="#top" aria-label="Bulk Email Sender home">
        <img className="product-brand-logo" src="/bulk-email-sender.svg" alt=""/>
        <span><strong>BULK EMAIL SENDER</strong><small>BY KRYVAZENT</small></span>
      </a>
      <a className="product-header-link" href="https://www.kryvazent.com/" target="_blank" rel="noopener noreferrer">More from Kryvazent <span aria-hidden="true">&#8599;</span></a>
    </header>
    <section className="workspace"><div className="workflow">
      <FileImport primaryInputRef={primaryInputRef} dataInputRef={dataInputRef} primaryFile={primaryFile} dataFiles={dataFiles} primaryFields={primaryFields} sources={sources} typedEmails={typedEmails} onTypedEmailsChange={setTypedEmails} busy={busy} rowCount={records.length} dragging={dragging} setDragging={setDragging} onPrimaryFile={selectPrimary} onDataFiles={addDataFiles} onManualDataChange={updateManualData} onRemoveDataFile={removeDataFile} onJoinChange={changeJoin} recipientProps={{ primaryFields, records: allRecords, recipientField, onRecipientField: changeRecipientField, recipientAlias, onRecipientAlias: changeRecipientAlias, headerlessPrimary, firstColumnName, onHeaderModeChange: changePrimaryHeaderMode, onFirstColumnName: changeFirstColumnName }}/>
      </div>
      <div className="designer-workflow">
      <EmailDesigner fields={designerFields} records={[...records, ...manualRecords]} subject={subject} setSubject={setSubject} bodyHtml={bodyHtml} setBodyHtml={setBodyHtml} lineSpacing={lineSpacing} setLineSpacing={setLineSpacing}/>
      </div>
      {(error || result) && <div className={`notice workspace-notice ${error ? 'notice-error' : 'notice-success'}`}>{error || (result.type === 'sent' ? `Sent ${result.count} email${result.count === 1 ? '' : 's'}${result.failures.length ? ` Â· ${result.failures.length} failed` : ''}.` : `Prepared ${result.count} personalized email drafts in a ZIP file. Open the .eml files with your mail app to review and send.`)}{result?.failures?.length > 0 && <details><summary>Show failed recipients</summary>{result.failures.map((failure) => <div key={failure.email}>{failure.email}: {failure.error}</div>)}</details>}</div>}
      <div className="send-workflow"><SendPanel count={valid.length} total={allRecords.length} subject={subject} mailConfig={mailConfig} setMailConfig={setMailConfig} sending={sending} disabled={!valid.length || busy || (primaryFile && unconfiguredJoins) || !subject.trim() || !bodyHtml.trim()} onSend={sendEmails} onExport={exportEmails}/></div>
    </section>
    <footer className="product-footer"><a className="footer-brand" href="https://www.kryvazent.com/" target="_blank" rel="noopener noreferrer"><img src="/kryvazent-logo.png" alt=""/><span><strong>KRYVAZENT</strong><small>SOFTWARE ENGINEERING</small></span></a><div className="footer-product-info"><strong>BULK EMAIL SENDER</strong><span>Prepare personalized email campaigns.</span></div><a className="footer-visit" href="https://www.kryvazent.com/" target="_blank" rel="noopener noreferrer">Visit Kryvazent <span aria-hidden="true">&#8599;</span></a></footer>
    {sendProgress?.open && <SendingModal progress={sendProgress} onClose={() => setSendProgress(null)}/>}
  </main></div>
}

export default App
