import nodemailer from 'nodemailer'
import { Buffer } from 'node:buffer'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_BODY_BYTES = 5 * 1024 * 1024
const MAX_RECIPIENTS = 500

function sendJson(response, status, data) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(data))
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('The message is too large.'), { status: 413 }))
        request.resume()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      if (size > MAX_BODY_BYTES) return
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
      catch { reject(Object.assign(new Error('The send request was not valid JSON.'), { status: 400 })) }
    })
    request.on('error', reject)
  })
}

function renderTemplate(template, values, html = true) {
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, field) => {
    const value = String(values[field.trim()] ?? '')
    return html
      ? value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
      : value.replace(/[\r\n]+/g, ' ')
  })
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function sendEvent(response, event) {
  if (!response.destroyed) response.write(`${JSON.stringify(event)}\n`)
}

export function createMailApi({ user, password, appOrigin }) {
  return async function mailApi(request, response, next) {
    if (request.url?.split('?')[0] !== '/api/send') return next()
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST')
      return sendJson(response, 405, { error: 'Use POST to send emails.' })
    }

    const origin = request.headers.origin
    if (!origin) return sendJson(response, 403, { error: 'The send request must come from the Vite site.' })
    try {
      const parsedOrigin = new URL(origin)
      const expectedOrigin = appOrigin || `${parsedOrigin.protocol}//${request.headers.host}`
      if (parsedOrigin.origin !== expectedOrigin) return sendJson(response, 403, { error: 'The request origin is not allowed.' })
    } catch {
      return sendJson(response, 403, { error: 'The request origin is not allowed.' })
    }

    let payload
    try { payload = await readJson(request) }
    catch (error) { return sendJson(response, error.status || 400, { error: error.message }) }

    const configuredUser = String(payload?.mailConfig?.email ?? user ?? '').trim()
    const configuredPassword = String(payload?.mailConfig?.appPassword ?? password ?? '').trim()
    if (!configuredUser || !configuredPassword) return sendJson(response, 400, { error: 'Enter your Gmail address and app password in Email configuration.' })
    if (!EMAIL_PATTERN.test(configuredUser)) return sendJson(response, 400, { error: 'Enter a valid Gmail address in Email configuration.' })

    const subjectTemplate = String(payload?.subject ?? '').trim()
    const bodyTemplate = String(payload?.bodyHtml ?? '')
    if (!subjectTemplate || !bodyTemplate.trim()) return sendJson(response, 400, { error: 'Add both an email subject and body before sending.' })
    if (!Array.isArray(payload?.recipients) || payload.recipients.length === 0) return sendJson(response, 400, { error: 'There are no recipients to send to.' })
    if (payload.recipients.length > MAX_RECIPIENTS) return sendJson(response, 400, { error: `Send up to ${MAX_RECIPIENTS} recipients at a time.` })

    const uniqueRecipients = []
    const seen = new Set()
    for (const recipient of payload.recipients) {
      const email = String(recipient?.email ?? '').trim()
      if (!EMAIL_PATTERN.test(email) || seen.has(email.toLowerCase())) continue
      seen.add(email.toLowerCase())
      uniqueRecipients.push({ email, values: recipient?.values && typeof recipient.values === 'object' ? recipient.values : {} })
    }
    if (!uniqueRecipients.length) return sendJson(response, 400, { error: 'No valid unique recipient addresses were provided.' })

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: configuredUser, pass: configuredPassword },
      connectionTimeout: 30_000,
      greetingTimeout: 30_000,
      socketTimeout: 10 * 60_000,
    })
    const sent = []
    const failures = []
    try {
      response.statusCode = 200
      response.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
      response.setHeader('Cache-Control', 'no-cache, no-transform')
      response.setHeader('X-Accel-Buffering', 'no')
      response.flushHeaders?.()
      sendEvent(response, { type: 'start', total: uniqueRecipients.length })

      try {
        await transporter.verify()
      } catch (error) {
        sendEvent(response, { type: 'error', message: `Could not connect to Gmail SMTP: ${error.message || 'Unknown error.'}` })
        return response.end()
      }

      for (const [index, recipient] of uniqueRecipients.entries()) {
        if (response.destroyed) break
        let status = 'sent'
        let failure
        try {
          await transporter.sendMail({
            from: configuredUser,
            to: recipient.email,
            subject: renderTemplate(subjectTemplate, recipient.values, false),
            html: renderTemplate(bodyTemplate, recipient.values),
          })
          sent.push(recipient.email)
        } catch (error) {
          status = 'failed'
          failure = error.message || 'Delivery failed.'
          failures.push({ email: recipient.email, error: failure })
        }
        sendEvent(response, { type: 'progress', completed: index + 1, total: uniqueRecipients.length, sent: sent.length, failed: failures.length, email: recipient.email, status, error: failure })
        if (sent.length + failures.length < uniqueRecipients.length) await delay(1500)
      }
      if (!response.destroyed) {
        sendEvent(response, { type: 'done', sent, failures })
        response.end()
      }
    } catch (error) {
      if (!response.headersSent) return sendJson(response, 502, { error: `Could not connect to Gmail SMTP: ${error.message || 'Unknown error.'}` })
      sendEvent(response, { type: 'error', message: error.message || 'Email delivery stopped unexpectedly.' })
      response.end()
    } finally {
      transporter.close()
    }
  }
}
