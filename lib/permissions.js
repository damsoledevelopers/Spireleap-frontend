
/**
 * Checks if a user has permission to perform an action on a specific entry,
 * taking into account per-entry overrides.
 * 
 * @param {Object} entry - The data entry (Lead, Property, etc.) which may contain entryPermissions
 * @param {Object} user - The current user object containing role
 * @param {string} action - The action to check ('view', 'edit', 'delete')
 * @param {boolean} globalPermission - The user's global permission for this action (from checkPermission hook)
 * @returns {boolean} - Whether the user can perform the action
 */
export const checkEntryPermission = (entry, user, action, globalPermission) => {
    if (!user || !entry) return false

    // Super Admin bypass
    if (user.role === 'super_admin') return true

    // Check for per-entry override
    const entryPerms = entry.entryPermissions?.[user.role]

    if (entryPerms && typeof entryPerms[action] === 'boolean') {
        return entryPerms[action]
    }

    // Fallback to global permission
    return globalPermission
}
