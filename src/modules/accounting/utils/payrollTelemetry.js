export function trackPayrollEvent(name, payload = {}) {
  if (typeof window === 'undefined') return
  const detail = { name, payload, timestamp: Date.now() }
  window.dispatchEvent(new CustomEvent('sitra:payroll:telemetry', { detail }))
  if (import.meta.env?.DEV) {
    console.info('[payroll telemetry]', name, payload)
  }
}
