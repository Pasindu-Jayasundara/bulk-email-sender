import { useLayoutEffect, useRef, useState } from 'react'
import { renderTemplate } from '../lib/template.js'

export default function EmailDesigner({ fields, records, subject, setSubject, bodyHtml, setBodyHtml, lineSpacing, setLineSpacing }) {
  const storageKey = 'msa-bulk-email-templates'
  const signatureStorageKey = 'msa-bulk-email-signatures'
  const [templates, setTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [signatures, setSignatures] = useState(() => {
    try { return JSON.parse(localStorage.getItem(signatureStorageKey) || '[]') } catch { return [] }
  })
  const [signatureName, setSignatureName] = useState('')
  const [signatureHtml, setSignatureHtml] = useState('')
  const [selectedSignature, setSelectedSignature] = useState('')
  const editorRef = useRef(null)
  const signatureEditorRef = useRef(null)
  const signatureSelectionRef = useRef(null)
  const subjectRef = useRef(null)
  const selectionRef = useRef(null)
  const initialBodyHtml = useRef(bodyHtml)
  const sample = records.find((record) => record.valid && !record.duplicate)?.values || Object.fromEntries(fields.map((field) => [field, field]))
  const previewBody = renderTemplate(bodyHtml, sample)
  const previewSubject = renderTemplate(subject, sample, false)

  function saveTemplate() {
    const name = templateName.trim()
    if (!name) return
      const next = [...templates.filter((template) => template.name.toLowerCase() !== name.toLowerCase()), { name, subject, bodyHtml, lineSpacing, updatedAt: new Date().toISOString() }]
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setTemplates(next)
      setSelectedTemplate(name)
    } catch {
      window.alert('Could not save this template in this browser.')
    }
  }

  function loadTemplate() {
    const template = templates.find((item) => item.name === selectedTemplate)
    if (!template) return
    setSubject(template.subject)
    setBodyHtml(template.bodyHtml)
    if (template.lineSpacing) setLineSpacing(template.lineSpacing)
    if (editorRef.current) editorRef.current.innerHTML = template.bodyHtml
    setTemplateName(template.name)
  }

  function deleteTemplate() {
    const next = templates.filter((template) => template.name !== selectedTemplate)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setTemplates(next)
      setSelectedTemplate('')
      if (templateName === selectedTemplate) setTemplateName('')
    } catch { window.alert('Could not update saved templates in this browser.') }
  }

  function saveSignature() {
    const name = signatureName.trim()
    const html = signatureHtml.trim()
    const content = signatureEditorRef.current?.innerText.trim() || ''
    if (!name || !content) return
    const next = [...signatures.filter((signature) => signature.name.toLowerCase() !== name.toLowerCase()), { name, content, html }]
    try {
      localStorage.setItem(signatureStorageKey, JSON.stringify(next))
      setSignatures(next)
      setSelectedSignature(name)
    } catch { window.alert('Could not save this signature in this browser.') }
  }

  function insertSignature() {
    const signature = signatures.find((item) => item.name === selectedSignature)
    const editor = editorRef.current
    if (!signature || !editor) return
    editor.focus()
    const selection = window.getSelection()
    if (selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer)) {
      selection?.removeAllRanges()
      selection?.addRange(selectionRef.current)
    }
    let range = selection?.rangeCount ? selection.getRangeAt(0) : null
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      range = document.createRange()
      range.selectNodeContents(editor)
      range.collapse(false)
    }
    range.deleteContents()
    const markup = signature.html || signature.content.split(/\r?\n/).map((line) => line.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])).join('<br>')
    const fragment = range.createContextualFragment(markup)
    const lastNode = fragment.lastChild
    range.insertNode(fragment)
    if (lastNode) {
      range.setStartAfter(lastNode)
      range.collapse(true)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
    setBodyHtml(editor.innerHTML)
    rememberSelection()
  }

  function deleteSignature() {
    const next = signatures.filter((signature) => signature.name !== selectedSignature)
    try {
      localStorage.setItem(signatureStorageKey, JSON.stringify(next))
      setSignatures(next)
      setSelectedSignature('')
    } catch { window.alert('Could not update saved signatures in this browser.') }
  }

  function rememberSignatureSelection() {
    const editor = signatureEditorRef.current
    const selection = window.getSelection()
    if (editor && selection?.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) {
      signatureSelectionRef.current = selection.getRangeAt(0).cloneRange()
    }
  }

  function formatSignature(command, value) {
    const editor = signatureEditorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    if (signatureSelectionRef.current && editor.contains(signatureSelectionRef.current.commonAncestorContainer)) {
      selection?.removeAllRanges()
      selection?.addRange(signatureSelectionRef.current)
    }
    document.execCommand(command, false, value)
    setSignatureHtml(editor.innerHTML)
    rememberSignatureSelection()
  }

  function chooseSignature(name) {
    setSelectedSignature(name)
    const signature = signatures.find((item) => item.name === name)
    if (!signature) return
    setSignatureName(signature.name)
    const html = signature.html || signature.content.split(/\r?\n/).map((line) => line.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])).join('<br>')
    setSignatureHtml(html)
    if (signatureEditorRef.current) signatureEditorRef.current.innerHTML = html
  }

  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialBodyHtml.current
  }, [])

  function rememberSelection() {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (editor && selection?.rangeCount && editor.contains(selection.anchorNode) && editor.contains(selection.focusNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange()
    }
  }

  function handleEditorKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === 'Digit7' || event.key === '&')) {
      event.preventDefault()
      setListType('OL')
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.code === 'Digit8' || event.key === '*')) {
      event.preventDefault()
      setListType('UL')
      return
    }
    const selection = window.getSelection()
    const node = selection?.anchorNode
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement
    const listItem = element?.closest('li')
    if (!listItem || !editorRef.current?.contains(listItem)) return

    if (event.key === 'Tab') {
      const list = listItem.parentElement
      if (!event.shiftKey) {
        const previousItem = listItem.previousElementSibling
        if (!previousItem || previousItem.tagName !== 'LI') return
        event.preventDefault()
        let nestedList = Array.from(previousItem.children).find((child) => child.tagName === 'UL' || child.tagName === 'OL')
        if (!nestedList) {
          nestedList = document.createElement(list.tagName === 'OL' ? 'UL' : list.tagName)
          previousItem.append(nestedList)
        }
        nestedList.append(listItem)
      } else {
        const parentItem = list.parentElement?.closest('li')
        const outerList = parentItem?.parentElement
        if (!parentItem || !outerList || !editorRef.current.contains(parentItem)) return
        event.preventDefault()
        parentItem.after(listItem)
        if (!list.querySelector('li')) list.remove()
      }
      setBodyHtml(editorRef.current.innerHTML)
      rememberSelection()
      return
    }

    if (event.key === 'Enter' && !event.shiftKey && !listItem.textContent.trim()) {
      const nestedList = listItem.parentElement
      const immediateParent = nestedList?.parentElement?.closest('li')
      const matchingOuterList = nestedList?.tagName === 'OL' || nestedList?.tagName === 'UL'
        ? nestedList.parentElement?.closest(nestedList.tagName.toLowerCase())
        : null
      const outerList = matchingOuterList || immediateParent?.parentElement
      const parentItem = outerList?.parentElement?.closest('li')
      if (!immediateParent || !outerList || !editorRef.current.contains(immediateParent)) return
      event.preventDefault()
      listItem.remove()
      if (!nestedList.querySelector('li')) nestedList.remove()
      const continuation = document.createElement('li')
      if (parentItem) parentItem.after(continuation)
      else outerList.append(continuation)
      const range = document.createRange()
      range.selectNodeContents(continuation)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      setBodyHtml(editorRef.current.innerHTML)
      rememberSelection()
    }
  }

  function format(command, value) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    if (selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer)) {
      selection?.removeAllRanges()
      selection?.addRange(selectionRef.current)
    }
    if (command === 'hiliteColor' && !document.execCommand(command, false, value)) {
      document.execCommand('backColor', false, value)
    } else {
      document.execCommand(command, false, value)
    }
    setBodyHtml(editor.innerHTML)
    rememberSelection()
  }

  function setListType(type) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    const selection = window.getSelection()
    if (selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer)) {
      selection?.removeAllRanges()
      selection?.addRange(selectionRef.current)
    }
    const node = selection?.anchorNode
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement
    const item = element?.closest('li')
    const list = item?.parentElement
    if (list && editor.contains(list) && (list.tagName === 'OL' || list.tagName === 'UL')) {
      if (list.tagName !== type) {
        const replacement = document.createElement(type.toLowerCase())
        for (const attribute of list.attributes) replacement.setAttribute(attribute.name, attribute.value)
        while (list.firstChild) replacement.append(list.firstChild)
        list.replaceWith(replacement)
      }
    } else {
      document.execCommand(type === 'OL' ? 'insertOrderedList' : 'insertUnorderedList', false)
    }
    setBodyHtml(editor.innerHTML)
    rememberSelection()
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
    <div className="template-controls"><label>LOCAL TEMPLATES<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" aria-label="Template name"/></label><button type="button" onClick={saveTemplate} disabled={!templateName.trim()}>Save current</button><select aria-label="Saved templates" value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}><option value="">Choose a saved template</option>{templates.map((template) => <option key={template.name} value={template.name}>{template.name}</option>)}</select><button type="button" onClick={loadTemplate} disabled={!selectedTemplate}>Load</button><button type="button" className="template-delete" onClick={deleteTemplate} disabled={!selectedTemplate}>Delete</button></div>
    <div className="signature-controls">
      <div className="signature-heading"><div><strong>Signatures</strong><span>Create a reusable sign-off, format it, then insert it into your message.</span></div><label className="line-spacing-control">LINE SPACING <select value={lineSpacing} onChange={(event) => setLineSpacing(Number(event.target.value))}><option value="1">Compact</option><option value="1.2">Tight</option><option value="1.5">Normal</option><option value="1.8">Relaxed</option><option value="2">Double</option></select></label></div>
      <div className="signature-editor-tools"><label className="signature-name">NAME<input value={signatureName} onChange={(event) => setSignatureName(event.target.value)} placeholder="e.g. Work signature" aria-label="Signature name"/></label><div className="signature-rich-editor">
        <div className="signature-toolbar" aria-label="Signature formatting"><button type="button" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => formatSignature('bold')}><b>B</b></button><button type="button" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => formatSignature('italic')}><i>I</i></button><button type="button" title="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => formatSignature('underline')}><u>U</u></button><label title="Text color">A<input type="color" aria-label="Signature text color" defaultValue="#315d40" onMouseDown={rememberSignatureSelection} onChange={(event) => formatSignature('foreColor', event.target.value)}/></label><button type="button" title="Add link" onMouseDown={(event) => event.preventDefault()} onClick={() => { const url = window.prompt('Link URL'); if (url) formatSignature('createLink', url) }}>Link</button></div>
        <div ref={signatureEditorRef} className="signature-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Signature editor" aria-multiline="true" data-placeholder="Write your sign-off. Press Enter to add another line." onInput={(event) => setSignatureHtml(event.currentTarget.innerHTML)} onMouseUp={rememberSignatureSelection} onKeyUp={rememberSignatureSelection}/>
      </div><div className="signature-actions"><button type="button" className="signature-primary" onClick={saveSignature} disabled={!signatureName.trim() || !signatureEditorRef.current?.innerText.trim()}>Save signature</button><select aria-label="Saved signatures" value={selectedSignature} onChange={(event) => chooseSignature(event.target.value)}><option value="">Choose saved signature</option>{signatures.map((signature) => <option key={signature.name} value={signature.name}>{signature.name}</option>)}</select><button type="button" onClick={insertSignature} disabled={!selectedSignature}>Insert at cursor</button><button type="button" className="template-delete" onClick={deleteSignature} disabled={!selectedSignature}>Delete</button></div></div>
    </div>
    <div className="subject-field"><span>SUBJECT</span><input ref={subjectRef} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A subject for each recipient"/><small>Insert into subject: {fields.map((field) => <button type="button" key={field} onMouseDown={(event) => event.preventDefault()} onClick={() => insertSubjectField(field)}>{field}</button>)}{!fields.length && <>Add fields after importing a file.</>}</small></div>
    <div className="designer-grid">
      <div className="editor-column"><div className="field-toolbar"><span>INSERT A FIELD</span>{fields.length ? fields.map((field) => <button type="button" key={field} onMouseDown={(event) => event.preventDefault()} onClick={() => insertField(field)}>{field}</button>) : <small>Import a file to see available fields.</small>}</div>
        <div className="format-toolbar">
          <span>FORMAT</span>
          <button type="button" title="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => format('bold')}><b>B</b></button>
          <button type="button" title="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => format('italic')}><i>I</i></button>
          <button type="button" title="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => format('underline')}><u>U</u></button>
          <label className="color-tool" title="Text color">A<input type="color" aria-label="Text color" defaultValue="#315d40" onMouseDown={rememberSelection} onChange={(event) => format('foreColor', event.target.value)}/></label>
          <label className="color-tool highlight-tool" title="Highlight color">&#9608;<input type="color" aria-label="Highlight color" defaultValue="#fff29a" onMouseDown={rememberSelection} onChange={(event) => format('hiliteColor', event.target.value)}/></label>
          <button type="button" title="Bulleted list (Ctrl+Shift+8)" onMouseDown={(event) => event.preventDefault()} onClick={() => setListType('UL')}>&#8226; List <small>Ctrl+Shift+8</small></button>
          <button type="button" title="Numbered list (Ctrl+Shift+7)" onMouseDown={(event) => event.preventDefault()} onClick={() => setListType('OL')}>1. List <small>Ctrl+Shift+7</small></button>
          <button type="button" title="Add link" onMouseDown={(event) => event.preventDefault()} onClick={() => { const url = window.prompt('Link URL'); if (url) format('createLink', url) }}>&#8599; Link</button>
        </div>
        <div className="list-shortcut-note"><strong>List shortcuts</strong><span>Ctrl+Shift+8 bullets</span><span>Ctrl+Shift+7 numbering</span><span>Tab indent</span><span>Shift+Tab outdent</span></div>
        <div ref={editorRef} className="email-editor" style={{ lineHeight: lineSpacing }} contentEditable suppressContentEditableWarning role="textbox" aria-label="Email body editor" aria-multiline="true" onInput={(event) => { setBodyHtml(event.currentTarget.innerHTML); rememberSelection() }} onKeyDown={handleEditorKeyDown} onMouseUp={rememberSelection} onKeyUp={rememberSelection}/>
        <div className="editor-foot">Use the field buttons to insert merge fields at your cursor.</div>
      </div>
      <div className="preview-column"><div className="preview-header"><span>LIVE PREVIEW</span><small>Sample: {sample[Object.keys(sample)[0]] || 'first row'}</small></div><div className="mail-window"><div className="mail-chrome"><i/><i/><i/><span>New message</span></div><div className="mail-subject"><span>Subject</span><strong>{previewSubject || 'Your subject will appear here'}</strong></div><iframe title="Email preview" sandbox="" srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{font:13px/${lineSpacing} Arial,sans-serif;color:#384137;margin:0;padding:19px 18px;min-height:100%;overflow-wrap:anywhere}p{margin:0 0 5px}p:last-child{margin-bottom:0}ul,ol{margin:5px 0;padding-left:24px}img{max-width:100%;height:auto}a{color:#315d40}</style></head><body>${previewBody}</body></html>`}/></div></div>
    </div>
  </section>
}
