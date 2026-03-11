// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
// Run `npm run contracts:types` after modifying contracts/schemas/*.json.

/**
 * @typedef { session: { authenticated: boolean, role: string | null, username: string | null }, permissions?: Array<string>, capabilities?: Record<string, any>, modules?: Array<{ id: string, enabled: boolean, isProtected?: boolean, dependsOn?: Array<string> }>, catalog: Record<string, any>, profile?: Record<string, any>, orders?: { items?: Array<Record<string, any>>, hasMore?: boolean, nextCursor?: string | null }, csrfToken: string } BootstrapResponse
 */
export const __type_BootstrapResponse = null
/**
 * @typedef { glasses: Array<Record<string, any>>, operations: Array<Record<string, any>>, connectors: Record<string, any>, fees: Record<string, any>, jumboRules?: Array<Record<string, any>>, roundStep?: number } CatalogSaveRequest
 */
export const __type_CatalogSaveRequest = null
/**
 * @typedef { customerName: string, phone: string, date: string, status?: "pending" | "processing" | "delivered" | "archived", items: Array<{ id: string | number, title: string, quantity: number, unitPrice?: number, totalPrice?: number }>, financials?: Record<string, any> | null, payments?: Array<Record<string, any>>, invoiceNotes?: string, clientRequestId?: string } OrdersCreateRequest
 */
export const __type_OrdersCreateRequest = null
/**
 * @typedef { id: string | number, status: "pending" | "processing" | "delivered" | "archived", expectedUpdatedAt?: string, clientRequestId?: string } OrdersStatusPatchRequest
 */
export const __type_OrdersStatusPatchRequest = null
/**
 * @typedef { id: string | number, customerName: string, phone: string, date: string, status?: "pending" | "processing" | "delivered" | "archived", items: Array<Record<string, any>>, expectedUpdatedAt?: string, clientRequestId?: string } OrdersUpdateRequest
 */
export const __type_OrdersUpdateRequest = null
