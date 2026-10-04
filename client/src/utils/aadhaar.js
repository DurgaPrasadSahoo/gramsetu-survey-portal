// Canonical display/input format is xxxx-xxxx-xxxx. Accepts raw digits, an
// already-dashed value, or a partial in-progress value (for live typing).
export function formatAadhaar(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 12);
  const parts = [digits.slice(0, 4), digits.slice(4, 8), digits.slice(8, 12)].filter(Boolean);
  return parts.join('-');
}
