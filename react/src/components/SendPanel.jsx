import { useState } from 'react'

export default function SendPanel({ count, total, subject, mailConfig, setMailConfig, sending, disabled, onSend, onExport }) {
  const storageKey = 'msa-mail-configurations'
  const [savedConfigs, setSavedConfigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const [configName, setConfigName] = useState('')
  const [selectedConfig, setSelectedConfig] = useState('')
  const [configMessage, setConfigMessage] = useState('')

  function updateConfig(key, value) {
    setMailConfig((current) => ({ ...current, [key]: value }))
  }

  function saveConfig() {
    const name = configName.trim()
    if (!name) return
    const next = [...savedConfigs.filter((item) => item.name.toLowerCase() !== name.toLowerCase()), { name, email: mailConfig.email, appPassword: mailConfig.appPassword }]
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setSavedConfigs(next)
      setSelectedConfig(name)
      setConfigMessage(`Saved “${name}” on this browser.`)
    } catch { setConfigMessage('Could not save this configuration in this browser.') }
  }

  function loadConfig() {
    const config = savedConfigs.find((item) => item.name === selectedConfig)
    if (!config) return
    setMailConfig({ email: config.email, appPassword: config.appPassword })
    setConfigName(config.name)
    setConfigMessage(`Loaded “${config.name}”.`)
  }

  function deleteConfig() {
    const next = savedConfigs.filter((item) => item.name !== selectedConfig)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setSavedConfigs(next)
      setSelectedConfig('')
      setConfigMessage('Saved configuration deleted.')
    } catch { setConfigMessage('Could not delete this configuration.') }
  }

  return <aside className="sidebar"><section className="mail-config" aria-labelledby="mail-config-title">
    <div className="mail-config-heading"><span className="config-icon" aria-hidden="true">✉</span><div><h2 id="mail-config-title">Email configuration</h2><p>Gmail SMTP account used to send.</p></div></div>
    <label className="config-field">GMAIL ADDRESS<input type="email" autoComplete="email" placeholder="you@gmail.com" value={mailConfig.email} disabled={sending} onChange={(event) => updateConfig('email', event.target.value)}/></label>
    <label className="config-field">GMAIL APP PASSWORD<input type="password" autoComplete="new-password" placeholder="16-character app password" value={mailConfig.appPassword} disabled={sending} onChange={(event) => updateConfig('appPassword', event.target.value)}/></label>
    <p className="config-note">Use a Google app password. Saving a configuration keeps it in this browser; sending submits it to the local Vite mail service.</p>
    <div className="saved-configs"><label>CONFIGURATION NAME<input value={configName} disabled={sending} onChange={(event) => setConfigName(event.target.value)} placeholder="e.g. Work Gmail"/></label><button type="button" onClick={saveConfig} disabled={sending || !configName.trim()}>Save configuration</button><div className="saved-config-actions"><select aria-label="Saved email configurations" value={selectedConfig} disabled={sending} onChange={(event) => { setSelectedConfig(event.target.value); setConfigMessage('') }}><option value="">Choose saved configuration</option>{savedConfigs.map((config) => <option key={config.name} value={config.name}>{config.name}</option>)}</select><button type="button" onClick={loadConfig} disabled={sending || !selectedConfig}>Load</button><button type="button" className="saved-config-delete" onClick={deleteConfig} disabled={sending || !selectedConfig}>Delete</button></div>{configMessage && <small role="status">{configMessage}</small>}</div>
  </section><div className="send-card"><span className="card-kicker">READY WHEN YOU ARE</span><div className="big-count">{String(count).padStart(2, '0')}<span> / {String(total).padStart(2, '0')}</span></div><p className="count-caption">valid recipients</p><div className="hairline"/><div className="send-meta"><span>SUBJECT</span><strong title={subject}>{subject || 'No subject yet'}</strong></div><div className="send-meta"><span>DELIVERY</span><strong>Direct via Gmail SMTP</strong></div><button className="send-button" disabled={disabled || sending} onClick={onSend}>{sending ? <><span className="spinner"/> Sending emails…</> : <>Send {count || ''} {count === 1 ? 'email' : 'emails'} <span>↗</span></>}</button><button className="export-button" disabled={disabled || sending} onClick={onExport}>Download drafts instead</button><p className="send-note">Messages are personalized separately for every recipient.</p></div><div className="privacy-note"><span>⌑</span><p>Saved configurations stay in this browser. Credentials are sent to the local Vite mail service only when you send.</p></div></aside>
}
