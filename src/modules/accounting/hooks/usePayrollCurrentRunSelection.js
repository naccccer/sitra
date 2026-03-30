import { useEffect, useMemo, useRef } from 'react'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import persianFa from 'react-date-object/locales/persian_fa'

function resolveCurrentShamsiPeriodKey() {
  try {
    const jalaliNow = new DateObject({ date: new Date() }).convert(persian, persianFa)
    return `${String(jalaliNow.year).padStart(4, '0')}-${String(jalaliNow.month.number).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export function usePayrollCurrentRunSelection({ runs = [], selectedRun, selectedRunId, setSelectedRunId }) {
  const initialSelectionSyncedRef = useRef(false)
  const currentPeriodKey = useMemo(() => resolveCurrentShamsiPeriodKey(), [])

  const currentRunSummary = useMemo(
    () => runs.find((run) => String(run?.periodKey || '') === currentPeriodKey) || null,
    [currentPeriodKey, runs],
  )

  useEffect(() => {
    if (initialSelectionSyncedRef.current || runs.length === 0) return

    const currentRunId = String(currentRunSummary?.id || '')
    const firstRunId = String(runs[0]?.id || '')
    const activeRunId = String(selectedRunId || '')

    if (currentRunId && activeRunId !== currentRunId && (!activeRunId || activeRunId === firstRunId)) {
      initialSelectionSyncedRef.current = true
      setSelectedRunId(currentRunId)
      return
    }

    if (activeRunId) {
      initialSelectionSyncedRef.current = true
    }
  }, [currentRunSummary?.id, runs, selectedRunId, setSelectedRunId])

  const selectedRunSummary = useMemo(
    () => runs.find((run) => String(run.id || '') === String(selectedRunId || '')) || null,
    [runs, selectedRunId],
  )

  const resolvedSelectedRun = String(selectedRun?.id || '') === String(selectedRunId || '')
    ? selectedRun
    : selectedRunSummary

  return {
    currentPeriodKey,
    selectedRun: resolvedSelectedRun,
    selectedRunSummary,
  }
}
