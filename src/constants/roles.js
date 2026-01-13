/**
 * Role Constants
 * Defines all user roles in the system
 */

export const ROLES = {
   SUPER_ADMIN: 'super_admin',
   COMPANY_OWNER: 'company_owner',  // ✅ NEW: Company head
   COMPANY_ADMIN: 'company_admin',
   TEAM_LEAD: 'team_lead',
   EMPLOYEE: 'employee',
   WORKER: 'worker',
   FRONTEND: 'frontend',
   BACKEND: 'backend',
   MARKETER: 'marketer',
   DESIGNER: 'designer'
};

export const ROLE_LABELS = {
   super_admin: 'Super Admin',
   company_owner: 'Company Owner',  // ✅ NEW
   company_admin: 'Company Admin',
   team_lead: 'Team Lead',
   employee: 'Employee',
   worker: 'Worker',
   frontend: 'Frontend Developer',
   backend: 'Backend Developer',
   marketer: 'Marketer',
   designer: 'Designer'
};

/**
 * Role Permissions
 * Defines what each role can access
 */
export const ROLE_PERMISSIONS = {
   // Global admin - can do everything
   super_admin: {
      canManageAllCompanies: true,
      canManageUsers: true,
      canManageSettings: true,
      canViewAllOrders: true,
      canViewAllPayments: true,
      canCreateCompanyOwner: true  // ✅ NEW: Only super_admin can create owners
   },

   // ✅ NEW: Company head - full access within their company (like super_admin but scoped)
   company_owner: {
      canManageOwnCompany: true,
      canViewCompanyOrders: true,
      canViewCompanyPayments: true,
      canManageCompanyUsers: true,
      canViewCompanyStats: true,
      canManageTeams: true,  // ✅ NEW: Can manage teams
      canManageProjects: true,  // ✅ NEW: Can manage projects
      canManageSettings: true,  // ✅ NEW: Can manage company settings
      canDeleteUsers: true,  // ✅ NEW: Can delete users
      canEditDistribution: true,  // ✅ NEW: Can edit distribution rates
      earnsFromAllOrders: true  // ✅ KEY: Gets 10% from ALL company orders
   },

   // Company admin - manages their own orders
   company_admin: {
      canManageOwnOrders: true,
      canViewCompanyOrders: true,
      canViewOwnPayments: true,
      earnsFromOwnOrders: true  // ✅ KEY: Gets 10% only from orders they accepted
   },

   // Team lead
   team_lead: {
      canManageTeam: true,
      canViewTeamTasks: true,
      canViewOwnPayments: true
   },

   // Workers
   employee: {
      canViewOwnTasks: true,
      canViewOwnPayments: true
   }
};

/**
 * Check if user has permission
 */
export const hasPermission = (userRole, permission) => {
   const permissions = ROLE_PERMISSIONS[userRole];
   return permissions?.[permission] || false;
};

/**
 * Check if user can access company data
 */
export const canAccessCompany = (userRole, userCompanyId, targetCompanyId) => {
   // Super admin can access all companies
   if (userRole === ROLES.SUPER_ADMIN) {
      return true;
   }

   // Company owner and admin can only access their own company
   if ([ROLES.COMPANY_OWNER, ROLES.COMPANY_ADMIN].includes(userRole)) {
      return userCompanyId === targetCompanyId;
   }

   return false;
};

/**
 * Get user role display name
 */
export const getRoleLabel = (role) => {
   return ROLE_LABELS[role] || role;
};

/**
 * Check if role can create users
 */
export const canCreateUser = (userRole, targetRole) => {
   // Only super_admin can create company_owner
   if (targetRole === ROLES.COMPANY_OWNER) {
      return userRole === ROLES.SUPER_ADMIN;
   }

   // Super admin can create anyone
   if (userRole === ROLES.SUPER_ADMIN) {
      return true;
   }

   // ✅ UPDATED: Company owner can create anyone except super_admin and other owners
   if (userRole === ROLES.COMPANY_OWNER) {
      return ![ROLES.SUPER_ADMIN, ROLES.COMPANY_OWNER].includes(targetRole);
   }

   // Company admin can create team members
   if (userRole === ROLES.COMPANY_ADMIN) {
      return ![ROLES.SUPER_ADMIN, ROLES.COMPANY_OWNER, ROLES.COMPANY_ADMIN].includes(targetRole);
   }

   return false;
};

export default ROLES;
