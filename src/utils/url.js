const APP_BASE_URL = import.meta.env.BASE_URL || '/'
const RAW_API_BASE = String(import.meta.env.VITE_API_BASE || '').trim()
const API_BASE = RAW_API_BASE ? RAW_API_BASE.replace(/\/+$/, '') : ''

/**
 * Resolve an API file path to a runtime-safe URL.
 * Handles sub-path deployments (e.g. /sitra) and external API base URLs.
 * @param {string} path
 * @returns {string}
 */
export function resolveApiFileUrl(path = '') {
  const raw = String(path || '').trim()
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw

  const absolutePath = raw.startsWith('/') ? raw : `/${raw}`
  if (!absolutePath.startsWith('/api/')) {
    return absolutePath
  }

  if (API_BASE) {
    return `${API_BASE}${absolutePath.slice('/api'.length)}`
  }

  if (import.meta.env.DEV) {
    return absolutePath
  }

  const normalizedBase = APP_BASE_URL === '/' ? '' : APP_BASE_URL.replace(/\/$/, '')
  return `${normalizedBase}${absolutePath}`
}

/**
 * Resolve a public asset path to a runtime-safe URL.
 * Accepts either a filename or a path under the public folder.
 * @param {string} path
 * @param {string} fallbackFolder
 * @returns {string}
 */
export function resolvePublicAssetUrl(path = '', fallbackFolder = '') {
  const raw = String(path || '').trim()
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw

  const normalizedPath = raw
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^public\//i, '')
    .replace(/^\/+/, '')

  const baseUrl = APP_BASE_URL === '/' ? '/' : APP_BASE_URL
  const hasFolderPrefix = fallbackFolder && normalizedPath.startsWith(`${fallbackFolder}/`)

  if (hasFolderPrefix || !fallbackFolder) {
    return `${baseUrl}${normalizedPath}`
  }

  const fileName = normalizedPath.split('/').filter(Boolean).pop()
  return fileName ? `${baseUrl}${fallbackFolder}/${fileName}` : ''
}

