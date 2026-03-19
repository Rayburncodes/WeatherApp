import axios from 'axios';
import { HttpError } from '../middleware/errorHandler';
import { getEnv } from '../utils/env';

export type CurrentWeather = {
  temperatureC: number;
  temperatureF: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number | null;
  uvIndex: number | null;
  icon: string | null;
  coordinates: { latitude: number; longitude: number };
};

export type ForecastDay = {
  date: string; // YYYY-MM-DD
  minTempC: number;
  maxTempC: number;
  minTempF: number;
  maxTempF: number;
  condition: string;
  icon: string | null;
};

function cToF(c: number) {
  return c * (9 / 5) + 32;
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const env = getEnv();
  if (!env.OPENWEATHER_API_KEY) throw new HttpError(500, 'OPENWEATHER_API_KEY is not configured.');

  // Prefer One Call for UV index + richer fields.
  // If it fails (plan limitation), fall back to /weather.
  try {
    const resp = await axios.get('https://api.openweathermap.org/data/3.0/onecall', {
      params: { lat, lon, units: 'metric', exclude: 'minutely,hourly,daily,alerts', appid: env.OPENWEATHER_API_KEY },
      timeout: 15_000,
    });
    const cur = resp.data?.current;
    const tempC = Number(cur?.temp);
    const icon = cur?.weather?.[0]?.icon ? String(cur.weather[0].icon) : null;
    return {
      temperatureC: tempC,
      temperatureF: cToF(tempC),
      condition: String(cur?.weather?.[0]?.description ?? 'Unknown'),
      humidity: Number(cur?.humidity ?? 0),
      windSpeed: Number(cur?.wind_speed ?? 0),
      windDirection: Number(cur?.wind_deg ?? 0),
      visibility: typeof cur?.visibility === 'number' ? cur.visibility : null,
      uvIndex: typeof cur?.uvi === 'number' ? cur.uvi : null,
      icon,
      coordinates: { latitude: lat, longitude: lon },
    };
  } catch {
    const resp = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: { lat, lon, units: 'metric', appid: env.OPENWEATHER_API_KEY },
      timeout: 15_000,
    });
    const data = resp.data;
    const tempC = Number(data?.main?.temp);
    const icon = data?.weather?.[0]?.icon ? String(data.weather[0].icon) : null;
    return {
      temperatureC: tempC,
      temperatureF: cToF(tempC),
      condition: String(data?.weather?.[0]?.description ?? 'Unknown'),
      humidity: Number(data?.main?.humidity ?? 0),
      windSpeed: Number(data?.wind?.speed ?? 0),
      windDirection: Number(data?.wind?.deg ?? 0),
      visibility: typeof data?.visibility === 'number' ? data.visibility : null,
      uvIndex: null,
      icon,
      coordinates: { latitude: lat, longitude: lon },
    };
  }
}

export async function fetchFiveDayForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const env = getEnv();
  if (!env.OPENWEATHER_API_KEY) throw new HttpError(500, 'OPENWEATHER_API_KEY is not configured.');

  const resp = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
    params: { lat, lon, units: 'metric', appid: env.OPENWEATHER_API_KEY },
    timeout: 15_000,
  });

  const list: Array<any> = Array.isArray(resp.data?.list) ? resp.data.list : [];
  const byDay = new Map<string, Array<any>>();

  for (const item of list) {
    const dtTxt = String(item?.dt_txt ?? '');
    const day = dtTxt.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const arr = byDay.get(day) ?? [];
    arr.push(item);
    byDay.set(day, arr);
  }

  const days = Array.from(byDay.keys()).sort().slice(0, 5);
  return days.map((day) => {
    const items = byDay.get(day) ?? [];
    const temps = items.map((i) => Number(i?.main?.temp)).filter((n) => Number.isFinite(n));
    const minC = Math.min(...temps);
    const maxC = Math.max(...temps);

    // Choose a representative entry (closest to 12:00) for icon/condition.
    let best = items[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const it of items) {
      const dtTxt = String(it?.dt_txt ?? '');
      const hour = Number(dtTxt.slice(11, 13));
      const dist = Math.abs(hour - 12);
      if (Number.isFinite(dist) && dist < bestDist) {
        best = it;
        bestDist = dist;
      }
    }
    const icon = best?.weather?.[0]?.icon ? String(best.weather[0].icon) : null;
    const condition = String(best?.weather?.[0]?.description ?? 'Unknown');

    return {
      date: day,
      minTempC: minC,
      maxTempC: maxC,
      minTempF: cToF(minC),
      maxTempF: cToF(maxC),
      condition,
      icon,
    };
  });
}

