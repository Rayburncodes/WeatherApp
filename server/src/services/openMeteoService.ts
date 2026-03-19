import axios from 'axios';
import { HttpError } from '../middleware/errorHandler';

export type HistoricalDay = { date: string; tempMinC: number; tempMaxC: number };

export async function fetchHistoricalDailyTemps(
  lat: number,
  lon: number,
  start: string,
  end: string,
): Promise<{ days: HistoricalDay[]; raw: unknown }> {
  // Open-Meteo expects date-only (YYYY-MM-DD)
  const resp = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
    params: {
      latitude: lat,
      longitude: lon,
      start_date: start,
      end_date: end,
      daily: 'temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
    },
    timeout: 20_000,
  });

  const daily = resp.data?.daily;
  const time: string[] = Array.isArray(daily?.time) ? daily.time : [];
  const tmax: number[] = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max : [];
  const tmin: number[] = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min : [];

  if (!time.length) throw new HttpError(500, 'Open-Meteo returned no daily data.');

  const days: HistoricalDay[] = time.map((d, idx) => ({
    date: d,
    tempMinC: Number(tmin[idx]),
    tempMaxC: Number(tmax[idx]),
  }));

  return { days, raw: resp.data };
}

