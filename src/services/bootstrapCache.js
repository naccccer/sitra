const BOOTSTRAP_CACHE_KEY = 'sitra:bootstrap-cache:v1'
const BOOTSTRAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function supportsStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function now() {
  return Date.now()
}

export function readBootstrapCache() {
  if (!supportsStorage()) return null

  try {
    const raw = window.localStorage.getItem(BOOTSTRAP_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const storedAt = Number(parsed.storedAt || 0)
    if (!Number.isFinite(storedAt) || storedAt <= 0) return null

    if (now() - storedAt > BOOTSTRAP_CACHE_TTL_MS) {
      window.localStorage.removeItem(BOOTSTRAP_CACHE_KEY)
      return null
    }

    const payload = parsed.payload
    if (!payload || typeof payload !== 'object') return null
    return payload
  } catch {
    return null
  }
}

export function writeBootstrapCache(payload) {
  if (!supportsStorage()) return
  if (!payload || typeof payload !== 'object') return

  try {
    window.localStorage.setItem(
      BOOTSTRAP_CACHE_KEY,
      JSON.stringify({
        storedAt: now(),
        payload,
      }),
    )
  } catch {
    // Best-effort cache only.
  }
}

export function clearBootstrapCache() {
  if (!supportsStorage()) return
  try {
    window.localStorage.removeItem(BOOTSTRAP_CACHE_KEY)
  } catch {
    // Ignore storage cleanup errors.
  }
}
