/**
 * Subscription Plan Validation Service
 * Validates user's subscription tier against feature access requirements
 * Reference: EP_Compliance_Product_Logic_Specification.md Section I.8.1
 */

export type SubscriptionTier = 'core' | 'growth' | 'consultant';
export type PackType =
  | 'REGULATOR_INSPECTION'
  | 'TENDER_CLIENT_ASSURANCE'
  | 'BOARD_MULTI_SITE_RISK'
  | 'INSURER_BROKER'
  | 'AUDIT_PACK'
  | 'COMBINED';

export type DistributionMethod = 'DOWNLOAD' | 'EMAIL' | 'SHARED_LINK';

export interface PackAccessResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: SubscriptionTier;
}

/**
 * Pack types available to each subscription tier
 */
const PACK_ACCESS_BY_TIER: Record<SubscriptionTier, PackType[]> = {
  core: ['REGULATOR_INSPECTION', 'AUDIT_PACK'],
  growth: [
    'REGULATOR_INSPECTION',
    'TENDER_CLIENT_ASSURANCE',
    'BOARD_MULTI_SITE_RISK',
    'INSURER_BROKER',
    'AUDIT_PACK',
    'COMBINED',
  ],
  consultant: [
    'REGULATOR_INSPECTION',
    'TENDER_CLIENT_ASSURANCE',
    'BOARD_MULTI_SITE_RISK',
    'INSURER_BROKER',
    'AUDIT_PACK',
    'COMBINED',
  ],
};

/**
 * Distribution methods available to each subscription tier for each pack type
 */
const DISTRIBUTION_ACCESS_BY_TIER: Record<
  SubscriptionTier,
  Record<DistributionMethod, PackType[]>
> = {
  core: {
    DOWNLOAD: ['REGULATOR_INSPECTION', 'AUDIT_PACK'],
    EMAIL: ['REGULATOR_INSPECTION', 'AUDIT_PACK'],
    SHARED_LINK: [], // Core Plan cannot use shared links
  },
  growth: {
    DOWNLOAD: [
      'REGULATOR_INSPECTION',
      'TENDER_CLIENT_ASSURANCE',
      'BOARD_MULTI_SITE_RISK',
      'INSURER_BROKER',
      'AUDIT_PACK',
      'COMBINED',
    ],
    EMAIL: [
      'REGULATOR_INSPECTION',
      'TENDER_CLIENT_ASSURANCE',
      'BOARD_MULTI_SITE_RISK',
      'INSURER_BROKER',
      'AUDIT_PACK',
      'COMBINED',
    ],
    SHARED_LINK: [
      'REGULATOR_INSPECTION',
      'TENDER_CLIENT_ASSURANCE',
      'BOARD_MULTI_SITE_RISK',
      'INSURER_BROKER',
      'AUDIT_PACK',
      'COMBINED',
    ],
  },
  consultant: {
    DOWNLOAD: [
      'REGULATOR_INSPECTION',
      'TENDER_CLIENT_ASSURANCE',
      'BOARD_MULTI_SITE_RISK',
      'INSURER_BROKER',
      'AUDIT_PACK',
      'COMBINED',
    ],
    EMAIL: [
      'REGULATOR_INSPECTION',
      'TENDER_CLIENT_ASSURANCE',
      'BOARD_MULTI_SITE_RISK',
      'INSURER_BROKER',
      'AUDIT_PACK',
      'COMBINED',
    ],
    SHARED_LINK: [
      'REGULATOR_INSPECTION',
      'TENDER_CLIENT_ASSURANCE',
      'BOARD_MULTI_SITE_RISK',
      'INSURER_BROKER',
      'AUDIT_PACK',
      'COMBINED',
    ],
  },
};

/**
 * Check if user's subscription tier allows access to a pack type
 */
export function canAccessPackType(
  subscriptionTier: SubscriptionTier,
  packType: PackType
): PackAccessResult {
  const allowedPackTypes = PACK_ACCESS_BY_TIER[subscriptionTier];

  if (!allowedPackTypes.includes(packType)) {
    return {
      allowed: false,
      reason: `Pack type "${packType}" is not available in ${subscriptionTier} plan`,
      upgradeRequired: subscriptionTier === 'core' ? 'growth' : undefined,
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Check if user's subscription tier allows a distribution method for a pack type
 */
export function canDistributePack(
  subscriptionTier: SubscriptionTier,
  packType: PackType,
  distributionMethod: DistributionMethod
): PackAccessResult {
  // First check if pack type is accessible
  const packAccess = canAccessPackType(subscriptionTier, packType);
  if (!packAccess.allowed) {
    return packAccess;
  }

  // Check distribution method access
  const distributionAccess = DISTRIBUTION_ACCESS_BY_TIER[subscriptionTier][distributionMethod];

  if (!distributionAccess.includes(packType)) {
    const reason =
      distributionMethod === 'SHARED_LINK'
        ? `Shared links are not available in ${subscriptionTier} plan. Upgrade to Growth Plan to use shared links.`
        : `Email distribution for "${packType}" is not available in ${subscriptionTier} plan. Core Plan can only email Regulator Pack and Audit Pack.`;

    return {
      allowed: false,
      reason,
      upgradeRequired: subscriptionTier === 'core' ? 'growth' : undefined,
    };
  }

  return {
    allowed: true,
  };
}

/**
 * Get list of pack types available for a subscription tier
 */
export function getAvailablePackTypes(subscriptionTier: SubscriptionTier): PackType[] {
  return PACK_ACCESS_BY_TIER[subscriptionTier];
}

/**
 * Get list of distribution methods available for a pack type and subscription tier
 */
export function getAvailableDistributionMethods(
  subscriptionTier: SubscriptionTier,
  packType: PackType
): DistributionMethod[] {
  const methods: DistributionMethod[] = [];

  // Check each distribution method
  for (const method of ['DOWNLOAD', 'EMAIL', 'SHARED_LINK'] as DistributionMethod[]) {
    const access = DISTRIBUTION_ACCESS_BY_TIER[subscriptionTier][method];
    if (access.includes(packType)) {
      methods.push(method);
    }
  }

  return methods;
}

