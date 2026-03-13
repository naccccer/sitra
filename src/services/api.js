import { buildApiBusinessEndpoints } from './apiBusinessEndpoints'
import { buildApiCoreEndpoints } from './apiCoreEndpoints'
import { clearCsrfToken, request, setCsrfToken } from './apiRequest'

export { setCsrfToken, clearCsrfToken }

export const api = {
  ...buildApiCoreEndpoints(request),
  ...buildApiBusinessEndpoints(request),
}
