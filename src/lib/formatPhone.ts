/**
 * Format a phone number for display: +1 (XXX) XXX-XXXX
 * Expects E.164 format input (+1XXXXXXXXXX).
 */
export function formatPhoneForDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const line = digits.slice(7, 11);
    return `+1 (${area}) ${prefix}-${line}`;
  }
  return phone;
}
