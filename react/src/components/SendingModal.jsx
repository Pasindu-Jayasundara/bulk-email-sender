function formatCount(value) {
  return new Intl.NumberFormat().format(value || 0)
}

export default function SendingModal({ progress, onClose }) {
  const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0
  const finished = progress.finished

  return <div className="sending-overlay">
    <section className="sending-modal" role="dialog" aria-modal="true" aria-labelledby="sending-title" aria-describedby="sending-description">
      <div className={`sending-indicator ${finished ? (progress.error ? 'has-error' : 'is-done') : ''}`} aria-hidden="true">{finished ? (progress.error ? '!' : '✓') : <span/>}</div>
      <span className="sending-kicker">{finished ? (progress.error ? 'DELIVERY INTERRUPTED' : 'DELIVERY COMPLETE') : 'LIVE DELIVERY STATUS'}</span>
      <h2 id="sending-title">{finished ? (progress.error ? 'Could not finish sending' : 'Your emails are on their way.') : 'Sending your emails'}</h2>
      <p id="sending-description" className="sending-description">{progress.error || (finished ? 'All recipients have been processed.' : progress.completed ? 'Messages are being delivered one at a time.' : 'Connecting to your mail provider…')}</p>

      <div className="sending-progress-label"><span>{finished ? 'COMPLETE' : 'PROGRESS'}</span><strong>{formatCount(progress.completed)} <i>/</i> {formatCount(progress.total)}</strong></div>
      <div className="sending-progress-track" role="progressbar" aria-label="Emails processed" aria-valuemin="0" aria-valuemax={progress.total} aria-valuenow={progress.completed}><div style={{ width: `${percent}%` }}/></div>

      <div className="sending-counts">
        <div><span>SENT</span><strong>{formatCount(progress.sent)}</strong></div>
        <div><span>FAILED</span><strong className={progress.failed ? 'count-failed' : ''}>{formatCount(progress.failed)}</strong></div>
        <div><span>LEFT</span><strong>{formatCount(Math.max(0, progress.total - progress.completed))}</strong></div>
      </div>

      {progress.email && <div className="sending-current"><span>{finished ? 'LAST RECIPIENT' : 'CURRENT RECIPIENT'}</span><strong title={progress.email}>{progress.email}</strong>{progress.status && <small className={progress.status === 'failed' ? 'count-failed' : ''}>{progress.status === 'failed' ? 'Delivery failed' : progress.status === 'sent' ? 'Delivered' : 'Sending'}</small>}</div>}
      {!finished && <p className="sending-footnote">Keep this window open while delivery is in progress.</p>}
      {finished && <button className="sending-close" onClick={onClose}>Done</button>}
    </section>
  </div>
}
