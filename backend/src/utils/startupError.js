export const redactSensitiveText = (value) => {
  let text = String(value ?? '')

  for (const secret of [
    process.env.JWT_SECRET,
    process.env.R2_ACCESS_KEY_ID,
    process.env.R2_SECRET_ACCESS_KEY,
  ]) {
    if (secret) text = text.replaceAll(secret, '[REDACTED]')
  }

  return text
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, '$1[REDACTED]@')
    .replace(/((?:password|secret|token)\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, '$1[REDACTED]')
}

const getNestedErrors = (error) => {
  const pending = [error]
  const visited = new Set()
  const results = []

  while (pending.length && results.length < 12) {
    const current = pending.shift()
    if (!current || typeof current !== 'object' || visited.has(current)) continue
    visited.add(current)
    results.push(current)

    if (current.cause) pending.push(current.cause)
    if (current.reason && typeof current.reason === 'object') pending.push(current.reason)

    const servers = current.servers
    if (servers && typeof servers.values === 'function') {
      for (const server of servers.values()) {
        if (server?.error) pending.push(server.error)
      }
    }
  }

  return results
}

const diagnose = (error, details) => {
  const codes = details.map((item) => String(item.code ?? item.codeName ?? '')).join(' ')
  const text = `${error?.name || ''} ${details.map((item) => item.message || item.type || '').join(' ')} ${codes}`
  const normalized = text.toLowerCase()

  if (codes.includes('JWT_SECRET_MISSING')) return 'JWT_SECRET is missing from backend configuration.'
  if (codes.includes('JWT_SECRET_TOO_SHORT')) return 'JWT_SECRET must contain at least 32 characters.'
  if (codes.includes('MONGODB_URI_MISSING')) return 'MONGODB_URI is missing from backend configuration.'
  if (/ip.{0,50}(not allowed|not whitelisted|access list)|not whitelisted.{0,50}ip|ip address.{0,50}allowlist/i.test(text)) {
    return 'MongoDB Atlas IP/network access was rejected. Check the Atlas Network Access allowlist.'
  }
  if (/authentication failed|bad auth|auth failed|authenticationfailure/.test(normalized) || codes.includes('18')) {
    return 'MongoDB authentication failed. Check the database username, password, and authentication database.'
  }
  if (/mongoparseerror|invalid.{0,30}(mongodb )?uri|connection string.*invalid|invalid scheme/.test(normalized)) {
    return 'MongoDB URI is invalid. Check its scheme, hostname, and percent-encoding.'
  }
  if (/enotfound|eai_again|querysrv|dns/.test(normalized)) {
    return 'MongoDB DNS/connection failure. Check the URI hostname and DNS/network resolution.'
  }
  if (/econnrefused|etimedout|serverselection|connection timed out/.test(normalized)) {
    return 'MongoDB connection failure. Check cluster availability, Atlas IP access, and network connectivity.'
  }
  if (codes.includes('EADDRINUSE')) return 'The API port is already in use. Stop the other process or configure another PORT.'

  return 'Application startup failed. Review the error details below.'
}

export const logStartupError = (error) => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Unable to start DocVault API. Set NODE_ENV=development for startup diagnostics.')
    return
  }

  const details = getNestedErrors(error)
  const code = details.map((item) => item.code ?? item.codeName).find(Boolean)
  const reason = details
    .slice(1)
    .map((item) => item.message || item.type)
    .filter(Boolean)
    .map(redactSensitiveText)
  const lines = [
    `[DocVault startup] ${diagnose(error, details)}`,
    `name: ${redactSensitiveText(error?.name || 'Error')}`,
    ...(code ? [`code: ${redactSensitiveText(code)}`] : []),
    `message: ${redactSensitiveText(error?.message || error || 'Unknown startup error')}`,
    ...(reason.length ? [`reason: ${[...new Set(reason)].join('; ')}`] : []),
  ]

  console.error(lines.join('\n'))
}