export const moduleEnabledMap = (modules = []) => {
  const map = {}
  if (!Array.isArray(modules)) return map

  modules.forEach((module) => {
    const id = String(module?.id || '').trim()
    if (!id) return
    map[id] = Boolean(module?.enabled)
  })

  return map
}

export const isModuleEnabled = (modules = [], moduleId = '') => {
  const id = String(moduleId || '').trim()
  if (!id) return true
  const enabled = moduleEnabledMap(modules)[id]
  if (typeof enabled === 'boolean') return enabled
  return true
}

const MODULE_PERSIAN_LABELS = {
  auth: 'احراز هویت',
  'users-access': 'کاربران و دسترسی',
  sales: 'فروش',
  customers: 'مشتریان',
  'master-data': 'داده‌های پایه',
}

export const moduleLabelFa = (moduleId = '', modules = []) => {
  const id = String(moduleId || '').trim()
  if (!id) return 'ماژول'
  const dynamic = Array.isArray(modules) ? modules.find((module) => String(module?.id || '') === id) : null
  if (dynamic?.label) return String(dynamic.label)
  return MODULE_PERSIAN_LABELS[id] || id
}
