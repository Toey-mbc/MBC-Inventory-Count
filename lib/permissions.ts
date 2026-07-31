export type AccessMode = 'read' | 'edit'

export function normalizeAccessMode(value: unknown): AccessMode {
  return value === 'edit' ? 'edit' : 'read'
}

export function roleFromAccessMode(value: unknown): 'viewer' | 'counter' {
  return normalizeAccessMode(value) === 'edit' ? 'counter' : 'viewer'
}

export function accessModeFromRole(role: string | null | undefined): AccessMode {
  return role === 'viewer' ? 'read' : 'edit'
}

export function canRoleEdit(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'warehouse_manager' || role === 'sale_support' || role === 'counter'
}
