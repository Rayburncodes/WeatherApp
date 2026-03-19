export function isValidIsoDate(value: string): boolean {
  // Expect YYYY-MM-DD for Open-Meteo archive API (date only).
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function isFutureDate(value: string): boolean {
  const d = new Date(`${value}T00:00:00Z`);
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return d.getTime() > todayUtc.getTime();
}

