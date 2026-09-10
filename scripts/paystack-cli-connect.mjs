import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const globalRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim()
const cliRoot = path.join(globalRoot, '@paystack-oss/dev-cli')
const helpersPath = path.join(cliRoot, 'src/lib/helpers.js')
const loginPath = path.join(cliRoot, 'src/commands/login.js')
const paystackPath = path.join(cliRoot, 'src/lib/paystack.js')

function mustInclude(file, snippet, label) {
  const source = readFileSync(file, 'utf8')
  if (!source.includes(snippet)) {
    throw new Error(`${label} is missing expected source in ${file}`)
  }
  return source
}

function replaceOnce(file, before, after, label) {
  const source = readFileSync(file, 'utf8')
  if (source.includes(before)) {
    writeFileSync(file, source.replace(before, after))
    return true
  }
  if (source.includes(after.trim().slice(0, 60))) {
    return false
  }
  throw new Error(`Could not patch ${label}: expected text not found in ${file}`)
}

replaceOnce(
  helpersPath,
  `function getKeys(token, type = 'secret', domain = 'test') {
  return new Promise((resolve, reject) => {
    axios.get('https://api.paystack.co/integration/keys', { headers: { Authorization: 'Bearer ' + token, 'jwt-auth': true } }).then(response => {`,
  `function secretKeyFromEnv() {
  const fromEnv = (process.env.PAYSTACK_SECRET_KEY || '').trim()
  if (fromEnv) return fromEnv
  try {
    const fs = require('fs')
    const path = require('path')
    const text = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    for (const line of text.split(/\\r?\\n/)) {
      if (!line.startsWith('PAYSTACK_SECRET_KEY=')) continue
      const value = line.slice('PAYSTACK_SECRET_KEY='.length).trim().replace(/^['"]|['"]$/g, '')
      if (value) return value
    }
  } catch {
    // no readable .env.local in the current directory
  }
  return ''
}

function getKeys(token, type = 'secret', domain = 'test') {
  const envKey = secretKeyFromEnv()
  if (envKey) {
    return Promise.resolve({ key: envKey, domain, type })
  }
  return new Promise((resolve, reject) => {
    axios.get('https://api.paystack.co/integration/keys', { headers: { Authorization: 'Bearer ' + token, 'jwt-auth': true } }).then(response => {`,
  'helpers getKeys',
)

replaceOnce(
  helpersPath,
  'module.exports = {prompt, promiseWrapper, successLog, jsonLog, errorLog, infoLog, isJson, parseURL, findSchema, executeSchema, getDescription, webhookInspector, getWebhookMessage, base64ToString}',
  'module.exports = {prompt, promiseWrapper, successLog, jsonLog, errorLog, infoLog, isJson, parseURL, findSchema, executeSchema, getDescription, webhookInspector, getWebhookMessage, base64ToString, secretKeyFromEnv}',
  'helpers export',
)

replaceOnce(
  loginPath,
  `class LoginClass extends Command {
  async run() {
    let token = ''
    let e
    let response
    let expiry = parseInt(db.read('token_expiry'), 10) * 1000`,
  `class LoginClass extends Command {
  async run() {
    const envKey = helpers.secretKeyFromEnv()
    if (envKey) {
      const mode = envKey.startsWith('sk_live_') ? 'live' : 'test'
      db.write('token', 'env-key')
      db.write('token_expiry', String(Math.floor(Date.now() / 1000) + 365 * 24 * 3600))
      db.write('user', {id: 'env-key', email: 'PAYSTACK_SECRET_KEY'})
      db.write('selected_integration', {id: 'env-key', business_name: \`NewRecall (\${mode} key)\`})
      helpers.successLog(\`Signed in with PAYSTACK_SECRET_KEY (\${mode})\`)
      helpers.infoLog('Dashboard email/password login is blocked by Cloudflare on api.paystack.co/login.')
      return
    }
    let token = ''
    let e
    let response
    let expiry = parseInt(db.read('token_expiry'), 10) * 1000`,
  'login env-key',
)

replaceOnce(
  paystackPath,
  `    }).then(response => {
      resolve(response.data.data)
    }).catch(error => {
      helpers.errorLog(error.response.data.message || 'Unable to sign in, please try again in a few minutes')
      reject(new Error('LOGIN ERROR: ' + error.response.data.message))
    })
  })
}
function verifyToken(totp, token) {`,
  `    }).then(response => {
      resolve(response.data.data)
    }).catch(error => {
      const data = error.response && error.response.data
      const blocked = typeof data === 'string' && data.includes('Just a moment')
      const message = (data && data.message) || (blocked
        ? 'Cloudflare is blocking dashboard login at api.paystack.co/login. Use PAYSTACK_SECRET_KEY in .env.local instead.'
        : 'Unable to sign in, please try again in a few minutes')
      helpers.errorLog(message)
      reject(new Error('LOGIN ERROR: ' + message))
    })
  })
}
function verifyToken(totp, token) {`,
  'signIn Cloudflare error',
)

mustInclude(helpersPath, 'function secretKeyFromEnv()', 'helpers')
mustInclude(loginPath, 'helpers.secretKeyFromEnv()', 'login')

process.stdout.write(`Patched Paystack CLI at ${cliRoot}\n`)
process.stdout.write('From this app folder run: paystack login\n')
