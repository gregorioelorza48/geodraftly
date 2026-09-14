/** Web Billing public key from the RevenueCat dashboard (rcb_ / rcb_sb_). Never use a secret sk_ key here. */
export const REVENUECAT_PUBLIC_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY?.trim() ?? "";

/** Entitlement identifier that unlocks Geodraftly Pro. Must match the dashboard. */
export const REVENUECAT_ENTITLEMENT = process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT?.trim() || "pro";

export function isRevenueCatPublicKey(value: string) {
  return value.startsWith("rcb_");
}

export function hasRevenueCatKey() {
  return isRevenueCatPublicKey(REVENUECAT_PUBLIC_KEY);
}

/** One subscriber per firm so everyone in the org shares the same plan. */
export function firmAppUserId(organizationId: string) {
  return `org_${organizationId}`;
}
