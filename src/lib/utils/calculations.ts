export function calcNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = end - start;
  return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
}
