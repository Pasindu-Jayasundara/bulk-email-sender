import { useLayoutEffect, useRef } from 'react'
import { renderTemplate } from '../lib/template.js'

export default function EmailDesigner({ fields, records, subject, setSubject, bodyHtml, setBodyHtml }) {
  const editorRef = useRef(null)
  const subjectRef = useRef(null)
  const initialBodyHtml = useRef(bodyHtml)
  const sample = records.find((record) => record.valid && !record.duplicate)?.values || Object.fromEntries(fields.map((field) => [field, field]))
  const previewBody = renderTemplate(bodyHtml, sample)
  const previewSubject = renderTemplate(subject, sample, false)

  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialBodyHtml.current
  }, [])

  function format(command, value) {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    if (editorRef.current) setBodyHtml(editorRef.current.innerHTML)
  }

  function insertField(field) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    let range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
    range.deleteContents()
    const text = document.createTextNode(`{{${field}}}`)
    range.insertNode(text)
    range.setStartAfter(text)
    range.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(range)
    setBodyHtml(editor.innerHTML)
  }

  function insertSubjectField(field) {
    const input = subjectRef.current
    const start = input?.selectionStart ?? subject.length
    const end = input?.selectionEnd ?? start
    const next = `${subject.slice(0, start)}{{${field}}}${subject.slice(end)}`
    setSubject(next)
    requestAnimationFrame(() => {
      input?.focus()
      input?.setSelectionRange(start + field.length + 4, start + field.length + 4)
    })
  }

  return <section className="designer" aria-labelledby="designer-title">
    <div className="section-heading designer-heading"><span className="step">03</span><div><h2 id="designer-title">Design your email</h2><p>Write the message, format it, and place any file field wherever it belongs.</p></div></div>
    <div className="subject-field"><span>SUBJECT</span><input ref={subjectRef} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A subject for each recipient"/><small>Insert into subject: {fields.map((field) => <button type="button" key={field} onMouseDown={(event) => event.preventDefault()} onClick={() => insertSubjectField(field)}>{field}</button>)}{!fields.length && <>Add fields after importing a file.</>}</small></div>
    <div className="designer-grid">
      <div className="editor-column"><div className="field-toolbar"><span>INSERT A FIELD</span>{fields.length ? fields.map((field) => <button type="button" key={field} onMouseDown={(event) => event.preventDefault()} onClick={() => insertField(field)}>{field}</button>) : <small>Import a file to see available fields.</small>}</div>
        <div className="format-toolbar"><span>FORMAT</span><button type="button" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => format('bold')}><b>B</b></button><button type="button" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => format('italic')}><i>I</i></button><button type="button" title="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => format('underline')}><u>U</u></button><button type="button" title="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => format('insertUnorderedList')}>• List</button><button type="button" title="Add link" onMouseDown={(event) => event.preventDefault()} onClick={() => { const url = window.prompt('Link URL'); if (url) format('createLink', url) }}>↗ Link</button></div>
        <div ref={editorRef} className="email-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Email body editor" aria-multiline="true" onInput={(event) => setBodyHtml(event.currentTarget.innerHTML)}/>
        <div className="editor-foot">Use the field buttons to insert merge fields at your cursor.</div>
      </div>
      <div className="preview-column"><div className="preview-header"><span>LIVE PREVIEW</span><small>Sample: {sample[Object.keys(sample)[0]] || 'first row'}</small></div><div className="mail-window"><div className="mail-chrome"><i/><i/><i/><span>New message</span></div><div className="mail-subject"><span>Subject</span><strong>{previewSubject || 'Your subject will appear here'}</strong></div><iframe title="Email preview" sandbox="" srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px Arial,sans-serif;color:#333;line-height:1.65;padding:12px;overflow-wrap:anywhere}img{max-width:100%}a{color:#315d40}</style></head><body>${previewBody}</body></html>`}/></div></div>
    </div>
  </section>
}
