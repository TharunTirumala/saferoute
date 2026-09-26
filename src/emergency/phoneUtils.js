// SafeRoute: Phone Number Normalization & Formatting Utility

export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let str = phone.toString().trim();
  let digits = str.replace(/[^0-9]/g, '');
  if (!digits) return '';

  // Deduplicate redundant 91 prefixes (e.g. 91916300863028 -> 916300863028)
  while (digits.startsWith('9191') && digits.length > 12) {
    digits = digits.slice(2);
  }

  // 12-digit Indian number starting with 91 (e.g. 916300863028)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  // 10-digit Indian standard number (e.g. 6300863028)
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // 11-digit number starting with 0 (e.g. 06300863028)
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }

  return str.startsWith('+') ? `+${digits}` : `+91${digits}`;
}

export function formatDisplayPhone(phone) {
  const norm = normalizePhoneNumber(phone);
  if (!norm) return 'No phone number';
  const clean = norm.replace(/[^0-9]/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return norm;
}
