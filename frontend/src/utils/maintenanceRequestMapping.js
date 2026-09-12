// Bridges two vocabularies that genuinely differ: RoleContext (built for
// the synthetic Dashboard/Maintenance Records/Block Requests pages) uses
// 'Engineering' / 'S&T' / 'Traction Distribution'. The real backend's
// MaintenanceRequest.department is the Literal 'TRACK' | 'OHE' | 'SIGNAL'.
// This file is the one place that translates between them — never send the
// RoleContext label to the backend, and never store the backend code as if
// it were a RoleContext department.

const ROLE_DEPARTMENT_TO_BACKEND_CODE = {
  Engineering: 'TRACK',
  'S&T': 'SIGNAL',
  'Traction Distribution': 'OHE',
}

export function backendDepartmentForRole(roleDepartment) {
  return ROLE_DEPARTMENT_TO_BACKEND_CODE[roleDepartment] || null
}

// request ids are never persisted anywhere (no create endpoint exists), so
// this only needs to be unique within the current browser session.
export function generateMaintenanceRequestId(departmentCode) {
  return `NEW-${departmentCode}-${Date.now()}`
}
