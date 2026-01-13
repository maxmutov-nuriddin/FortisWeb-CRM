/**
 * Payment Distribution Constants
 * Defines distribution rates for different company modes
 */

/**
 * LEGACY MODE (Old companies without owner)
 * Used when:
 * - Company has NO company_owner
 * - OR distributionRates.companyOwner is not set
 * 
 * Behavior: EXACTLY as before, 100% backward compatible
 */
export const LEGACY_DISTRIBUTION = {
   company: 0.20,      // Company budget: 20%
   admin: 0.10,        // Admin (who accepted): 10%
   team: 0.70,         // Team total: 70%
   teamLead: 0.10,     // Team lead: 10% (from team)
   workers: 0.60       // Workers: 60% (from team)
};

/**
 * OWNER MODE (New companies with owner)
 * Used when:
 * - Company HAS company_owner
 * - AND distributionRates.companyOwner is set
 * 
 * Behavior: New distribution with owner
 */
export const OWNER_DISTRIBUTION = {
   companyOwner: 0.10, // ✅ NEW: Owner: 10% from ALL orders
   company: 0.10,      // Company budget: 10% (reduced from 20%)
   admin: 0.10,        // Admin (who accepted): 10%
   team: 0.70,         // Team total: 70%
   teamLead: 0.10,     // Team lead: 10% (from team)
   workers: 0.60       // Workers: 60% (from team)
};

/**
 * Payment Types
 */
export const PAYMENT_TYPES = {
   COMPANY_BUDGET: 'company_budget',
   COMPANY_OWNER_SHARE: 'company_owner_share',  // ✅ NEW
   ADMIN_SHARE: 'admin_share',
   TEAM_LEAD_SHARE: 'team_lead_share',
   WORKER_SHARE: 'worker_share'
};

export const PAYMENT_TYPE_LABELS = {
   company_budget: 'Company Budget',
   company_owner_share: 'Company Owner Share',  // ✅ NEW
   admin_share: 'Admin Share',
   team_lead_share: 'Team Lead Share',
   worker_share: 'Worker Share'
};

/**
 * Determine which distribution mode to use
 * 
 * @param {Object} company - Company object
 * @returns {'legacy' | 'owner'} - Distribution mode
 */
export const getDistributionMode = (company) => {
   // Legacy mode if no owner or no owner rate set
   if (!company?.companyOwner || !company?.distributionRates?.companyOwner) {
      return 'legacy';
   }

   // Owner mode if owner exists and rate is set
   return 'owner';
};

/**
 * Get distribution rates for a company
 * 
 * @param {Object} company - Company object
 * @returns {Object} - Distribution rates
 */
export const getDistributionRates = (company) => {
   const mode = getDistributionMode(company);

   if (mode === 'legacy') {
      // Use legacy rates - EXACTLY as before
      return {
         ...LEGACY_DISTRIBUTION,
         mode: 'legacy'
      };
   }

   // Use owner rates - NEW behavior
   return {
      companyOwner: company.distributionRates?.companyOwner || OWNER_DISTRIBUTION.companyOwner,
      company: company.distributionRates?.company || OWNER_DISTRIBUTION.company,
      admin: company.distributionRates?.admin || OWNER_DISTRIBUTION.admin,
      team: company.distributionRates?.team || OWNER_DISTRIBUTION.team,
      teamLead: company.distributionRates?.teamLead || OWNER_DISTRIBUTION.teamLead,
      workers: company.distributionRates?.workers || OWNER_DISTRIBUTION.workers,
      mode: 'owner'
   };
};

/**
 * Validate distribution rates sum to 100%
 * 
 * @param {Object} rates - Distribution rates
 * @returns {boolean} - True if valid
 */
export const validateDistributionRates = (rates) => {
   let total = 0;

   if (rates.companyOwner !== undefined) {
      // Owner mode
      total = rates.companyOwner + rates.company + rates.admin + rates.team;
   } else {
      // Legacy mode
      total = rates.company + rates.admin + rates.team;
   }

   // Allow small floating point errors
   return Math.abs(total - 1.0) < 0.001;
};

/**
 * Calculate distribution for an order
 * 
 * @param {number} orderAmount - Order total amount
 * @param {Object} company - Company object
 * @param {string} adminId - ID of admin who accepted order
 * @returns {Object} - Distribution breakdown
 */
export const calculateDistribution = (orderAmount, company, adminId) => {
   const rates = getDistributionRates(company);
   const mode = rates.mode;

   const distribution = {
      mode,
      total: orderAmount,
      breakdown: {}
   };

   if (mode === 'legacy') {
      // LEGACY MODE - exactly as before
      distribution.breakdown = {
         company: orderAmount * rates.company,
         admin: orderAmount * rates.admin,
         adminId: adminId,  // Only this admin gets it
         team: orderAmount * rates.team
      };
   } else {
      // OWNER MODE - new distribution
      distribution.breakdown = {
         companyOwner: orderAmount * rates.companyOwner,
         companyOwnerId: company.companyOwner,  // Owner gets it
         company: orderAmount * rates.company,
         admin: orderAmount * rates.admin,
         adminId: adminId,  // Only this admin gets it
         team: orderAmount * rates.team
      };
   }

   return distribution;
};

export default {
   LEGACY_DISTRIBUTION,
   OWNER_DISTRIBUTION,
   PAYMENT_TYPES,
   PAYMENT_TYPE_LABELS,
   getDistributionMode,
   getDistributionRates,
   validateDistributionRates,
   calculateDistribution
};
