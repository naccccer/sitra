import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_UOM_OPTIONS, normalizeUomOptions } from '@/modules/inventory/config/uomOptions'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

export const useInventoryUomOptions = () => {
  const [options, setOptions] = useState(DEFAULT_UOM_OPTIONS)

  useEffect(() => {
    let mounted = true
    inventoryApi.fetchV2Settings('uom_options')
      .then((response) => {
        if (!mounted) return
        const configured = normalizeUomOptions(response?.value)
        setOptions(configured.length > 0 ? configured : DEFAULT_UOM_OPTIONS)
      })
      .catch(() => {
        if (!mounted) return
        setOptions(DEFAULT_UOM_OPTIONS)
      })
    return () => { mounted = false }
  }, [])

  return useMemo(() => ({ uomOptions: options }), [options])
}
