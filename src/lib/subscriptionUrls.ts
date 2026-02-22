/**
 * Builds an external subscription URL with farm and tier query parameters.
 *
 * Reusable across WellLimitModal, AddUserModal, SubscriptionPage, and SettingsPage.
 */
export function buildSubscriptionUrl(
  baseUrl: string,
  farmId: string,
  tierSlug: string,
): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}farm_id=${encodeURIComponent(farmId)}&tier=${encodeURIComponent(tierSlug)}`;
}
