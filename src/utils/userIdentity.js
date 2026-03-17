import { fixPossibleMojibake, isLikelyMojibakeText } from '@/utils/textEncoding'

export const ROLE_LABELS = {
  admin: '\u0627\u062f\u0645\u06cc\u0646',
  manager: '\u0645\u062f\u06cc\u0631',
  sales: '\u0641\u0631\u0648\u0634',
}

const DEFAULT_USER_LABEL = '\u06a9\u0627\u0631\u0628\u0631'

export const roleLabel = (role) => {
  const normalized = String(role || '').trim()
  const label = ROLE_LABELS[normalized] || String(role || DEFAULT_USER_LABEL)
  return fixPossibleMojibake(label)
}

export const identityDisplayName = (session) => {
  const fullName = fixPossibleMojibake(String(session?.fullName || '').trim())
  if (fullName !== '') return fullName
  return fixPossibleMojibake(String(session?.username || DEFAULT_USER_LABEL).trim() || DEFAULT_USER_LABEL)
}

export const identityDisplayJobTitle = (session) => {
  const rawJobTitle = String(session?.jobTitle || '').trim()
  const jobTitle = fixPossibleMojibake(rawJobTitle)
  if (jobTitle !== '' && !isLikelyMojibakeText(jobTitle)) return jobTitle
  return roleLabel(session?.role)
}

export const identityInitial = (name) => {
  const normalized = String(name || '').trim()
  if (normalized === '') return 'U'
  return normalized[0]
}
