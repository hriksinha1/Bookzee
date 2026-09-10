export function fmtINR(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

export function fmtDate(isoString: string) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function generateId(prefix = '') {
  return prefix + Math.random().toString(36).substr(2, 6).toUpperCase();
}
