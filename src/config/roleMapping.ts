import { UserRole } from "../types/enums";

/**
 * Configuration for mapping designations to user roles
 *
 * IMPORTANT ROLE PERMISSION STRUCTURE:
 *
 * 1. PROCUREMENT TEAM: All members of procurement team get PROCUREMENT_MANAGER role
 *    - Can perform all PM functions: initiate bidding, review bids, approve at PM level
 *    - Includes: procurement officers, specialists, coordinators, managers
 *
 * 2. HR APPROVAL: Only Head of HR can approve at HR level
 *    - Head of HR gets HR_APPROVER role for HR-level approval
 *    - Regular HR staff get STAFF role (can create requisitions, get dept head approval)
 *    - HR Head ALSO gets DEPARTMENT_HEAD role to approve HR department requisitions
 *
 * 3. HIGH-LEVEL DEPARTMENTS (HR, Procurement, Accounts):
 *    - These departments function like regular departments
 *    - Their staff can create requisitions
 *    - Their department heads approve at department level first
 *    - Then requisitions go through normal approval flow
 *
 * 4. HHRA ROLE: Only for accounting/finance staff (HR removed from this role)
 */

// Role mapping based on designation keywords
export const DESIGNATION_ROLE_MAPPING = {
  // Admin roles - highest priority
  [UserRole.ADMIN]: [
    "administrator",
    "system admin",
    "it admin",
    "super admin",
    "superadmin",
  ],

  // Senior management - nullified but kept for backward compatibility
  [UserRole.SENIOR_MANAGEMENT]: [
    // Titles moved to PROCUREMENT_MANAGER
    // "director",
    // "vice president",
    // "vp",
    // "chief",
    // "ceo",
    // "cfo",
    // "cto",
    // "president",
    // "executive",
    // "senior executive",
  ],

  // Procurement management - ALL procurement team members get this role
  [UserRole.PROCUREMENT_MANAGER]: [
    // Procurement team titles - all members can perform PM functions
    "procurement",
    "purchasing",
    "sourcing",
    "supply chain",
    "procurement officer",
    "purchasing officer",
    "sourcing officer",
    "procurement specialist",
    "purchasing specialist",
    "procurement coordinator",
    "purchasing coordinator",
    "procurement manager",
    "purchasing manager",
    "sourcing manager",
    "supply chain manager",
    "head of procurement",
    "procurement head",
    "purchasing head",

    // Senior management titles now consolidated here
    "director",
    "vice president",
    "vp",
    "chief",
    "ceo",
    "cfo",
    "cto",
    "president",
    "executive",
    "senior executive",

    // Finance manager titles consolidated here
    "finance manager",
    "financial manager",
    "accounts manager",
    "treasury manager",

    // Inventory manager titles consolidated here
    "inventory manager",
    "warehouse manager",
    "stores manager",
    "stock manager",
  ],

  // Finance management - deprecated but kept for backward compatibility
  [UserRole.FINANCE_MANAGER]: [
    // Titles moved to PROCUREMENT_MANAGER
    // "finance manager",
    // "financial manager",
    // "accounts manager",
    // "treasury manager",
  ],

  // Inventory management - deprecated but kept for backward compatibility
  [UserRole.INVENTORY_MANAGER]: [
    // Titles moved to PROCUREMENT_MANAGER
    // "inventory manager",
    // "warehouse manager",
    // "stores manager",
    // "stock manager",
  ],

  // Department heads (including high-level department heads)
  [UserRole.DEPARTMENT_HEAD]: [
    // Generic department head titles
    "head",
    "supervisor",
    "department manager",
    "team lead",
    "team leader",
    "section head",
    "unit head",

    // High-level department heads that should function as regular department heads
    "head of hr",
    "hr head",
    "head of human resources",
    "human resources head",
    "Head, Human Resources & Admin",

    "head of procurement",
    "procurement head",

    "head of accounts",
    "accounts head",
    "head of accounting",
    "accounting head",

    "head of finance",
    "finance head",
  ],

  // Head of Finance - approves PO first
  [UserRole.HEAD_OF_FINANCE]: [
    "head of finance",
    "finance head",
    "chief financial officer",
    "cfo",
    "finance director",
    "director of finance",
  ],

  // Head of HR - approves PO second and approves working tools / vendor approvals
  [UserRole.HEAD_OF_HR]: [
    "head of hr",
    "hr head",
    "head of human resources",
    "human resources head",
    "chief human resources officer",
    "chro",
    "hr director",
    "director of human resources",
    "Head, Human Resources & Admin",
  ],

  // Store / Warehouse Manager - manages GRN
  [UserRole.STORE_MANAGER]: [
    "store manager",
    "stores manager",
    "warehouse manager",
    "inventory manager",
    "stock manager",
    "store officer",
    "warehouse officer",
  ],

  [UserRole.WAREHOUSE_MANAGER]: [
    "warehouse manager",
    "warehouse supervisor",
    "warehouse officer",
  ],

  // HR roles (legacy) - ONLY for Head of HR who approves at HR level
  // Regular HR staff should NOT have this role
  [UserRole.HR_APPROVER]: ["hr manager", "senior hr manager", "hr director"],

  // Accounts/Finance approvers (legacy)
  [UserRole.ACCOUNTS_APPROVER]: [
    "senior accountant",
    "chief accounting officer",
  ],

  // Consolidated HHRA role - REMOVED all HR-related titles
  // Only accounting/finance staff get this role now
  // Head of HR should ONLY have HR_APPROVER role for HR-level approval
  [UserRole.HHRA]: [
    "accountant",
    "accounting",
    "accounting staff",
    "financial analyst",
    "finance officer",
    "accounts officer",
    "hhra",
  ],

  // @deprecated - Vendor role removed
  // [UserRole.VENDOR]: ["vendor", "supplier", "contractor"],

  // Staff role - regular employees who can create requisitions
  // Includes regular HR staff (not HR managers/heads)
  [UserRole.STAFF]: [
    "staff",
    "employee",
    "officer",
    "assistant",
    "coordinator",
    "specialist",
    "analyst",
    "executive",

    // Regular HR staff (NOT HR managers or heads)
    "hr staff",
    "hr officer",
    "hr assistant",
    "hr coordinator",
    "hr specialist",
    "hr executive",
    "human resources staff",
    "human resources officer",
    "human resources assistant",
    "personnel officer",
    "personnel assistant",
  ],
};

// Special designation ID mappings (if specific IDs should map to specific roles)
export const DESIGNATION_ID_ROLE_MAPPING: { [key: string]: UserRole } = {
  // Add specific designation IDs here if needed
  //   "001": UserRole.ADMIN,
  // "002": UserRole.SENIOR_MANAGEMENT,
  // etc.
};

/**
 * Enhanced role mapping function that uses configuration
 */
export function mapDesignationToRoleEnhanced(
  designation: string,
  designationId: string
): UserRole {
  const designationLower = designation.toLowerCase();

  // Log the designation for debugging
  console.log(
    `Mapping designation: "${designation}" (ID: ${designationId}) to role`
  );

  // First check if there's a specific ID mapping
  if (DESIGNATION_ID_ROLE_MAPPING[designationId]) {
    const role = DESIGNATION_ID_ROLE_MAPPING[designationId];
    console.log(`Assigned role: ${role} for designation ID: ${designationId}`);
    return role;
  }

  // Check keyword mappings in priority order
  for (const [role, keywords] of Object.entries(DESIGNATION_ROLE_MAPPING)) {
    for (const keyword of keywords) {
      if (designationLower.includes(keyword.toLowerCase())) {
        console.log(
          `Assigned role: ${role} for designation: ${designation} (matched keyword: ${keyword})`
        );
        return role as UserRole;
      }
    }
  }

  // Special case for general managers (should be department heads)
  if (
    designationLower.includes("manager") &&
    !designationLower.includes("assistant")
  ) {
    console.log(
      `Assigned role: DEPARTMENT_HEAD for general manager designation: ${designation}`
    );
    return UserRole.DEPARTMENT_HEAD;
  }

  // Default to staff for all other designations
  console.log(`Assigned default role: STAFF for designation: ${designation}`);
  return UserRole.STAFF;
}
