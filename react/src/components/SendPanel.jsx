export default function SendPanel({ count, total, subject, mailConfig, setMailConfig, sending, disabled, onSend, onExport }) {
  function updateConfig(key, value) {
    setMailConfig((current) => ({ ...current, [key]: value }))
  }

  return <aside className="sidebar"><section className="mail-config" aria-labelledby="mail-config-title">
    <div className="mail-config-heading"><span className="config-icon" aria-hidden="true">✉</span><div><h2 id="mail-config-title">Email configuration</h2><p>Gmail SMTP account used to send.</p></div></div>
    <label className="config-field">GMAIL ADDRESS<input type="email" autoComplete="email" placeholder="you@gmail.com" value={mailConfig.email} disabled={sending} onChange={(event) => updateConfig('email', event.target.value)}/></label>
    <label className="config-field">GMAIL APP PASSWORD<input type="password" autoComplete="new-password" placeholder="16-character app password" value={mailConfig.appPassword} disabled={sending} onChange={(event) => updateConfig('appPassword', event.target.value)}/></label>
    <p className="config-note">Use a Google app password. It stays in this page's memory and is sent to the local Vite mail service when you send.</p>
  </section><div className="send-card"><span className="card-kicker">READY WHEN YOU ARE</span><div className="big-count">{String(count).padStart(2, '0')}<span> / {String(total).padStart(2, '0')}</span></div><p className="count-caption">valid recipients</p><div className="hairline"/><div className="send-meta"><span>SUBJECT</span><strong title={subject}>{subject || 'No subject yet'}</strong></div><div className="send-meta"><span>DELIVERY</span><strong>Direct via Gmail SMTP</strong></div><button className="send-button" disabled={disabled || sending} onClick={onSend}>{sending ? <><span className="spinner"/> Sending emails…</> : <>Send {count || ''} {count === 1 ? 'email' : 'emails'} <span>↗</span></>}</button><button className="export-button" disabled={disabled || sending} onClick={onExport}>Download drafts instead</button><p className="send-note">Messages are personalized separately for every recipient.</p></div><div className="privacy-note"><span>⌑</span><p>Credentials are submitted to the local Vite mail service and are not saved by this page.</p></div></aside>
}
