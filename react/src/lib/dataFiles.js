function detectDelimiter(line) {
  const candidates = [',', ';', '\t']
  return candidates.reduce((best, current) => {
    const count = (line.match(new RegExp(current === '\t' ? '\\t' : `\\${current}`, 'g')) || []).length
    return count > best.count ? { delimiter: current, count } : best
  }, { delimiter: ',', count: -1 }).delimiter
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || ''
  const delimiter = detectDelimiter(firstLine)
  const rows = []
  let row = [], cell = '', quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1 }
      else if (character === '"') quoted = false
      else cell += character
    } else if (character === '"' && cell.length === 0) quoted = true
    else if (character === delimiter) { row.push(cell); cell = '' }
    else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += character
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows
}

export async function readDataFile(file, { headerless = false, firstColumnName = 'Email' } = {}) {
  let rows
  if (/\.csv$/i.test(file.name)) {
    rows = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
  } else if (/\.(xlsx|xls)$/i.test(file.name)) {
    const XLSX = await import('xlsx')
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
  } else {
    throw new Error('Choose a CSV or Excel file (.csv, .xlsx, .xls).')
  }
  if (!rows?.length) throw new Error(`${file.name} is empty.`)

  const header = headerless ? rows[0].map((_, index) => index === 0 ? firstColumnName.trim() : `Column ${index + 1}`) : rows[0].map((value, index) => String(value ?? '').trim() || `Column ${index + 1}`)
  if (!header[0]) throw new Error('Enter a name for the first column.')
  const used = new Set()
  const fields = header.map((name) => {
    let unique = name, suffix = 2
    while (used.has(unique)) { unique = `${name} (${suffix})`; suffix += 1 }
    used.add(unique)
    return unique
  })
  const dataRows = rows.slice(headerless ? 0 : 1)
  const records = dataRows.flatMap((values, position) => {
    const mapped = Object.fromEntries(fields.map((field, index) => [field, String(values[index] ?? '').trim()]))
    return Object.values(mapped).some(Boolean) ? [{ position, row: position + (headerless ? 1 : 2), values: mapped }] : []
  })
  if (!fields.length) throw new Error(`${file.name} must have at least one column.`)
  return { fields, records }
}

const normalizeKey = (value) => String(value ?? '').trim().toLocaleLowerCase()
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export async function buildRecipientData({ primaryFile, dataFiles, recipientField, recipientAlias, headerlessPrimary, firstColumnName, joins }) {
  const primary = await readDataFile(primaryFile, { headerless: headerlessPrimary, firstColumnName })
  const primaryFields = [...primary.fields]
  const records = primary.records.map((record) => ({ ...record, values: { ...record.values } }))
  const sources = []
  const usedFields = new Set(primaryFields)

  for (const sourceFile of dataFiles) {
    const sourceData = await readDataFile(sourceFile.file)
    const sourceName = sourceFile.file.name.replace(/\.[^.]+$/, '')
    const config = joins[sourceFile.id] || {}
    let mode = config.mode
    let primaryKey = config.primaryField || ''
    let sourceKey = config.sourceField || ''
    if (!mode) {
      const common = sourceData.fields.filter((field) => primaryFields.includes(field))
      mode = common.length === 1 ? 'key' : common.length > 1 ? 'choose' : 'row'
      if (common.length === 1) primaryKey = sourceKey = common[0]
    }
    if (mode === 'key' && (!primaryFields.includes(primaryKey) || !sourceData.fields.includes(sourceKey))) {
      primaryKey = ''; sourceKey = ''
    }
    const aliases = {}
    for (const field of sourceData.fields) {
      let label = usedFields.has(field) ? `${sourceName} · ${field}` : field
      const base = label
      let suffix = 2
      while (usedFields.has(label)) { label = `${base} (${suffix})`; suffix += 1 }
      aliases[field] = label
      usedFields.add(label)
    }
    const lookup = new Map()
    if (mode === 'key' && primaryKey && sourceKey) {
      for (const record of sourceData.records) {
        const key = normalizeKey(record.values[sourceKey])
        if (!key) continue
        if (lookup.has(key)) throw new Error(`${sourceName} has duplicate values in “${sourceKey}”. Choose a unique match field.`)
        lookup.set(key, record.values)
      }
    }
    const rowsByPosition = new Map(sourceData.records.map((record) => [record.position, record.values]))
    let matched = 0
    for (const record of records) {
      for (const alias of Object.values(aliases)) record.values[alias] = ''
      const key = normalizeKey(record.values[primaryKey])
      const match = mode === 'key' ? (key ? lookup.get(key) : undefined) : mode === 'row' ? rowsByPosition.get(record.position) : undefined
      if (match) {
        matched += 1
        for (const [field, alias] of Object.entries(aliases)) record.values[alias] = match[field] ?? ''
      }
    }
    sources.push({ id: sourceFile.id, name: sourceName, fields: sourceData.fields, aliases, primaryField: primaryKey, sourceField: sourceKey, mode, matched, rowCount: sourceData.records.length })
  }

  const emailField = recipientField || (headerlessPrimary ? primary.fields[0] : primaryFields.find((field) => ['email', 'emailaddress', 'recipient'].includes(field.toLowerCase().replaceAll(' ', '')))) || ''
  if (!emailField || !primaryFields.includes(emailField)) throw new Error('Choose the recipient email column.')
  const alias = (recipientAlias || emailField).trim()
  if (!alias) throw new Error('Enter a name for the email field.')
  if (alias !== emailField) {
    if (usedFields.has(alias)) throw new Error(`The field name “${alias}” is already in use.`)
    for (const record of records) record.values[alias] = record.values[emailField] || ''
    primaryFields.push(alias)
  }

  const seen = new Set()
  for (const record of records) {
    const email = String(record.values[emailField] || '').trim()
    const normalized = email.toLowerCase()
    record.recipient = email
    record.valid = validEmail(email)
    record.duplicate = Boolean(email && seen.has(normalized))
    if (email) seen.add(normalized)
  }
  return { fields: [...primaryFields, ...sources.flatMap((source) => Object.values(source.aliases))], primaryFields, records, recipientField: emailField, recipientAlias: alias, sources }
}
