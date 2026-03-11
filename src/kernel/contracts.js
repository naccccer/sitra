/**
 * Shared kernel-level contract typedefs used by service facades.
 */

/**
 * @typedef {Object} KernelModuleRegistryItem
 * @property {string} id
 * @property {string} label
 * @property {boolean} enabled
 * @property {boolean} isProtected
 * @property {Array<string>} dependsOn
 * @property {string|null} updatedAt
 * @property {string|null} updatedByUserId
 */

/**
 * @typedef {Object} KernelAuditLogFilters
 * @property {number} [page]
 * @property {number} [pageSize]
 * @property {string} [from]
 * @property {string} [to]
 * @property {string} [eventType]
 * @property {string} [actor]
 */

export const __kernelContracts = true

