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
  auth: '\u0627\u062d\u0631\u0627\u0632 \u0647\u0648\u06cc\u062a',
  'users-access': '\u06a9\u0627\u0631\u0628\u0631\u0627\u0646 \u0648 \u062f\u0633\u062a\u0631\u0633\u06cc',
  sales: '\u0641\u0631\u0648\u0634',
  customers: '\u0645\u0634\u062a\u0631\u06cc\u0627\u0646',
  'human-resources': '\u0645\u0646\u0627\u0628\u0639 \u0627\u0646\u0633\u0627\u0646\u06cc',
  inventory: '\u0627\u0646\u0628\u0627\u0631',
  'master-data': '\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u067e\u0627\u06cc\u0647',
}

export const moduleLabelFa = (moduleId = '', modules = []) => {
  const id = String(moduleId || '').trim()
  if (!id) return '\u0645\u0627\u0698\u0648\u0644'
  const dynamic = Array.isArray(modules) ? modules.find((module) => String(module?.id || '') === id) : null
  if (dynamic?.label) return String(dynamic.label)
  return MODULE_PERSIAN_LABELS[id] || id
}
