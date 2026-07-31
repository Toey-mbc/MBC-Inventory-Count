export type AccessMode = 'read' | 'edit'

export function normalizeRole(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

export function usernameFromEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().split('@')[0] || ''
}

/**
 * The account named `admin` is the bootstrap administrator created during the
 * first Supabase setup. Role-based authorization remains the primary check;
 * the username fallback repairs older deployments where that profile was
 * accidentally left as counter/viewer.
 */
export function isAdminAccount(role: unknown, email: unknown): boolean {
  return normalizeRole(role) === 'admin' || usernameFromEmail(email) === 'admin'
}

export function normalizeAccessMode(value: unknown): AccessMode {
  return value === 'edit' ? 'edit' : 'read'
}

export function roleFromAccessMode(value: unknown): 'viewer' | 'counter' {
  return normalizeAccessMode(value) === 'edit' ? 'counter' : 'viewer'
}

export function accessModeFromRole(role: string | null | undefined): AccessMode {
  return normalizeRole(role) === 'viewer' ? 'read' : 'edit'
}

export function canRoleEdit(role: string | null | undefined): boolean {
  return ['admin', 'warehouse_manager', 'sale_support', 'counter'].includes(normalizeRole(role))
}
