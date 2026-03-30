// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
// Run `npm run contracts:types` after modifying contracts/schemas/*.json.

/**
 * @typedef { success: boolean, action: string, total: number, succeeded: number, failed: number, results: Array<{ id: string | number, success: boolean, payslip?: Record<string, any>, error?: string, errorObj?: Record<string, any> }> } AccountingPayrollActionBulkResponse
 */
export const __type_AccountingPayrollActionBulkResponse = null
/**
 * @typedef { id?: string | number, periodId?: string | number, ids?: Array<string | number>, action: "approve" | "issue" | "record_payment" | "cancel" | "finalize_period" | "reopen_period", amount?: number, paymentMethod?: "cash" | "bank", paymentDate?: string, accountId?: string | number, referenceNo?: string, notes?: string, clientRequestId?: string } AccountingPayrollActionRequest
 */
export const __type_AccountingPayrollActionRequest = null
/**
 * @typedef { entity?: "period" | "employee" | "payslip", id?: string | number, periodId?: string | number, periodKey?: string, year?: number, month?: number, title?: string, startDate?: string, endDate?: string, payDate?: string, status?: "open" | "issued" | "closed", employeeId?: string | number, employeeCode?: string, firstName?: string, lastName?: string, personnelNo?: string, nationalId?: string, mobile?: string, bankName?: string, bankAccountNo?: string, bankSheba?: string, baseSalary?: number, defaultInputs?: Array<any> | Record<string, any>, inputs?: Array<any> | Record<string, any>, notes?: string, clientRequestId?: string } AccountingPayrollCreateRequest
 */
export const __type_AccountingPayrollCreateRequest = null
/**
 * @typedef { success: boolean, dryRun: boolean, period: Record<string, any>, created: number, updated: number, results: Array<Record<string, any>>, warnings: Array<Record<string, any>>, errors: Array<Record<string, any>> } AccountingPayrollImportPreviewResponse
 */
export const __type_AccountingPayrollImportPreviewResponse = null
/**
 * @typedef { dryRun?: boolean, periodId?: string | number, periodKey?: string, year?: number, month?: number, title?: string, startDate?: string, endDate?: string, payDate?: string, notes?: string, rows: Array<{ employeeId?: string | number, employeeCode?: string, inputs?: Array<any> | Record<string, any>, notes?: string, clientRequestId?: string }> } AccountingPayrollImportRequest
 */
export const __type_AccountingPayrollImportRequest = null
/**
 * @typedef { entity?: "period" | "employee" | "payslip", id: string | number, periodId?: string | number, periodKey?: string, year?: number, month?: number, title?: string, startDate?: string, endDate?: string, payDate?: string, status?: "open" | "issued" | "closed", employeeId?: string | number, employeeCode?: string, firstName?: string, lastName?: string, personnelNo?: string, nationalId?: string, mobile?: string, bankName?: string, bankAccountNo?: string, bankSheba?: string, baseSalary?: number, defaultInputs?: Array<any> | Record<string, any>, inputs?: Array<any> | Record<string, any>, notes?: string, isActive?: boolean } AccountingPayrollUpdateRequest
 */
export const __type_AccountingPayrollUpdateRequest = null
/**
 * @typedef { success: boolean, workspace: { period: Record<string, any>, workflowState: "in_progress" | "ready_to_finalize" | "finalized", summary: { employees?: number, draft?: number, approved?: number, issued?: number, cancelled?: number, net?: number, paid?: number, due?: number, workflowStatusLabel?: string, settlementStatus?: string, settlementStatusLabel?: string }, checklist: Array<{ id?: string, label?: string, ok?: boolean, value?: number }>, importStatus: { mode?: string, totalRows?: number, validRows?: number, errorRows?: number, manualEntrySupported?: boolean }, finalizationReadiness: { canFinalize?: boolean, counts?: { personnelCount?: number, payslipCount?: number, rowsWithErrors?: number, incompletePayslips?: number, readyToFinalize?: number, finalizedPayslips?: number, cancelledPayslips?: number }, blockers?: Array<Record<string, any>> }, actionable: { approve?: Array<string>, issue?: Array<string>, payments?: Array<string> }, stepStatus: Record<string, any>, blockers: Array<Record<string, any>> } } AccountingPayrollWorkspaceResponse
 */
export const __type_AccountingPayrollWorkspaceResponse = null
/**
 * @typedef { session: { authenticated: boolean, role: string | null, username: string | null, fullName: string | null, jobTitle: string | null }, permissions?: Array<string>, capabilities?: Record<string, any>, modules?: Array<{ id: string, enabled: boolean, isProtected?: boolean, dependsOn?: Array<string> }>, catalog: Record<string, any>, profile?: Record<string, any>, orders?: { items?: Array<Record<string, any>>, hasMore?: boolean, nextCursor?: string | null }, csrfToken: string } BootstrapResponse
 */
export const __type_BootstrapResponse = null
/**
 * @typedef { glasses: Array<Record<string, any>>, operations: Array<Record<string, any>>, connectors: Record<string, any>, fees: Record<string, any>, jumboRules?: Array<Record<string, any>>, roundStep?: number } CatalogSaveRequest
 */
export const __type_CatalogSaveRequest = null
/**
 * @typedef { action: "start_session" | "upsert_line" | "close_session", id?: string | number, sessionId?: string | number, warehouseId?: string | number, countType?: "cycle" | "annual", itemId?: string | number, countedQuantityBase?: number, countedQuantitySecondary?: number, notes?: string } InventoryCountsCommandRequest
 */
export const __type_InventoryCountsCommandRequest = null
/**
 * @typedef { docType: "receipt" | "issue" | "transfer" | "adjustment", sourceWarehouseId?: string | number | null, targetWarehouseId?: string | number | null, referenceType?: string, referenceId?: string, referenceCode?: string, postImmediately?: boolean, notes?: string, lines: Array<{ itemId: string | number, quantityBase: number, quantitySecondary?: number, unitPrice?: number, notes?: string }> } InventoryDocumentsCreateRequest
 */
export const __type_InventoryDocumentsCreateRequest = null
/**
 * @typedef { id?: string | number, sku?: string, title: string, category: "raw_glass" | "processed_glass" | "hardware" | "consumable", glassWidthMm?: number, glassHeightMm?: number, glassThicknessMm?: number, glassColor?: string, baseUnit: string, secondaryUnit?: string, secondaryPerBase?: number, notes?: string } InventoryItemsUpsertRequest
 */
export const __type_InventoryItemsUpsertRequest = null
/**
 * @typedef { warehouseId: string | number, itemId: string | number, quantityBase: number, quantitySecondary?: number, requestNotes?: string } InventoryRequestsCreateRequest
 */
export const __type_InventoryRequestsCreateRequest = null
/**
 * @typedef { id: string | number, action: "approve" | "reject" | "cancel", resolutionNotes?: string } InventoryRequestsPatchRequest
 */
export const __type_InventoryRequestsPatchRequest = null
/**
 * @typedef { id?: string | number, warehouseId: string | number, parentLocationId?: string | number | null, locationKey: string, name: string, usageType: "internal" | "supplier" | "customer" | "inventory" | "production", notes?: string, isActive?: boolean } InventoryV2LocationsUpsertRequest
 */
export const __type_InventoryV2LocationsUpsertRequest = null
/**
 * @typedef { id?: string | number, lotCode: string, productId: string | number, variantId?: string | number | null, expiryDate?: string | null, notes?: string, isActive?: boolean } InventoryV2LotsUpsertRequest
 */
export const __type_InventoryV2LotsUpsertRequest = null
/**
 * @typedef { id: string | number, action: "submit" | "approve" | "post" | "cancel" } InventoryV2OperationsActionRequest
 */
export const __type_InventoryV2OperationsActionRequest = null
/**
 * @typedef { operationType: "receipt" | "delivery" | "transfer" | "production_move" | "adjustment" | "count", sourceWarehouseId?: string | number | null, targetWarehouseId?: string | number | null, referenceType?: string, referenceId?: string, referenceCode?: string, notes?: string, lines: Array<{ productId: string | number, variantId?: string | number | null, lotId?: string | number | null, sourceLocationId?: string | number | null, targetLocationId?: string | number | null, quantityRequested: number, quantityDone?: number, uom?: string, notes?: string }> } InventoryV2OperationsCreateRequest
 */
export const __type_InventoryV2OperationsCreateRequest = null
/**
 * @typedef { id?: string | number, productCode?: string, name: string, productType: "stockable" | "consumable" | "service", uom: string, notes?: string, isActive?: boolean } InventoryV2ProductsUpsertRequest
 */
export const __type_InventoryV2ProductsUpsertRequest = null
/**
 * @typedef { id?: string, productId: string, warehouseId: string, minQty: number, maxQty: number, notes?: string } InventoryV2ReplenishmentRuleUpsertRequest
 */
export const __type_InventoryV2ReplenishmentRuleUpsertRequest = null
/**
 * @typedef { report: "on_hand" | "cardex" | "operations", productId?: string, warehouseId?: string, dateFrom?: string, dateTo?: string } InventoryV2ReportsQueryRequest
 */
export const __type_InventoryV2ReportsQueryRequest = null
/**
 * @typedef { productId: string | number, variantId?: string | number | null, lotId?: string | number | null, warehouseId: string | number, locationId: string | number, quantityReserved: number, referenceType?: string, referenceId?: string, referenceCode?: string, notes?: string } InventoryV2ReservationsCreateRequest
 */
export const __type_InventoryV2ReservationsCreateRequest = null
/**
 * @typedef { id?: string | number, warehouseKey: string, name: string, notes?: string, isActive?: boolean } InventoryV2WarehousesUpsertRequest
 */
export const __type_InventoryV2WarehousesUpsertRequest = null
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
