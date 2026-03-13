export const ROLE_LABELS = {
  admin: 'ادمین',
  manager: 'مدیر',
  sales: 'فروش',
}

export const roleLabel = (role) => ROLE_LABELS[String(role || '').trim()] || String(role || 'کاربر')

export const identityDisplayName = (session) => {
  const fullName = String(session?.fullName || '').trim()
  if (fullName !== '') return fullName
  return String(session?.username || 'کاربر').trim() || 'کاربر'
}

export const identityDisplayJobTitle = (session) => {
  const jobTitle = String(session?.jobTitle || '').trim()
  if (jobTitle !== '') return jobTitle
  return roleLabel(session?.role)
}

export const identityInitial = (name) => {
  const normalized = String(name || '').trim()
  if (normalized === '') return 'U'
  return normalized[0]
}
