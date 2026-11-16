export default function RecipientTable({ primaryFields, records, recipientField, onRecipientField, recipientAlias, onRecipientAlias, headerlessPrimary, firstColumnName, onHeaderModeChange, onFirstColumnName }) {
  const ready = records.filter((record) => record.valid && !record.duplicate).length
  const invalid = records.filter((record) => !record.valid).length
  const duplicates = records.filter((record) => record.valid && record.duplicate).length
  return <>
    {primaryFields.length > 0 && <div className="recipient-settings"><label className="header-toggle"><input type="checkbox" checked={!headerlessPrimary} onChange={(event) => onHeaderModeChange(event.target.checked)}/><span>First row contains column names</span></label>{headerlessPrimary && <label className="column-name-setting">NAME FOR FIRST COLUMN<input value={firstColumnName} onChange={(event) => onFirstColumnName(event.target.value)} placeholder="Email"/></label>}<label className="column-name-setting email-column-setting">EMAIL ADDRESS COLUMN<select value={recipientField} onChange={(event) => onRecipientField(event.target.value)}><option value="">Choose the email column</option>{primaryFields.map((field) => <option key={field} value={field}>{field}</option>)}</select><small>Select the column that contains recipient email addresses.</small></label>{!recipientField && <p className="email-column-help" role="status">Choose the column containing email addresses to review recipients.</p>}<label className="column-name-setting">EMAIL FIELD NAME FOR MESSAGE<input value={recipientAlias} onChange={(event) => onRecipientAlias(event.target.value)} placeholder="e.g. Recipient Email"/><small>This name appears in the merge-field buttons.</small></label>
      <div className="count-grid"><div><strong>{ready}</strong><span>Ready to send</span></div><div><strong>{invalid}</strong><span>Invalid email</span></div><div><strong>{duplicates}</strong><span>Duplicate</span></div></div>
    </div>}
  </>
}
