export function renderTemplate(template, values = {}, escapeValues = true) {
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key) => {
    const text = String(values[key.trim()] ?? '')
    if (!escapeValues) return text.replace(/[\r\n]+/g, ' ')
    return text.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
  })
}

export const DEFAULT_SUBJECT = 'A message for you'
export const DEFAULT_BODY = '<p>Hello,</p><p>Write your message here, then add fields from your file to personalize it.</p>'

