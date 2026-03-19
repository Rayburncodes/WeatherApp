import axios from 'axios';
import { HttpError } from '../middleware/errorHandler';
import { getEnv } from '../utils/env';

export type ResolvedLocation = {
  input: string;
  resolvedCity: string;
  latitude: number;
  longitude: number;
};

function parseCoords(input: string): { lat: number; lon: number } | null {
  const m = input.trim().match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

function looksLikeZip(input: string): boolean {
  const s = input.trim();
  // Basic heuristic: 4-10 digits (optionally with spaces/hyphens)
  return /^[0-9][0-9\-\s]{2,12}[0-9]$/.test(s);
}

export async function resolveLocation(input: string): Promise<ResolvedLocation> {
  const trimmed = input.trim();
  if (!trimmed) throw new HttpError(400, 'Location is required.');

  const env = getEnv();
  if (!env.OPENWEATHER_API_KEY) {
    throw new HttpError(500, 'OPENWEATHER_API_KEY is not configured.');
  }

  const coords = parseCoords(trimmed);
  if (coords) {
    const resp = await axios.get('https://api.openweathermap.org/geo/1.0/reverse', {
      params: { lat: coords.lat, lon: coords.lon, limit: 1, appid: env.OPENWEATHER_API_KEY },
      timeout: 15_000,
    });
    const first = Array.isArray(resp.data) ? resp.data[0] : undefined;
    if (!first) throw new HttpError(400, 'Unable to resolve coordinates to a known place.');
    const name = [first.name, first.state, first.country].filter(Boolean).join(', ');
    return { input: trimmed, resolvedCity: name || first.name || trimmed, latitude: coords.lat, longitude: coords.lon };
  }

  // Zip/postal lookup (best-effort). For non-US postal codes, OpenWeather may still resolve with q.
  if (looksLikeZip(trimmed)) {
    try {
      const zipResp = await axios.get('https://api.openweathermap.org/geo/1.0/zip', {
        params: { zip: trimmed, appid: env.OPENWEATHER_API_KEY },
        timeout: 15_000,
      });
      const data = zipResp.data as { name?: string; lat: number; lon: number; country?: string };
      const name = [data.name, data.country].filter(Boolean).join(', ');
      return { input: trimmed, resolvedCity: name || data.name || trimmed, latitude: data.lat, longitude: data.lon };
    } catch {
      // Fall through to direct geocoding.
    }
  }

  const resp = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
    params: { q: trimmed, limit: 1, appid: env.OPENWEATHER_API_KEY },
    timeout: 15_000,
  });

  const first = Array.isArray(resp.data) ? resp.data[0] : undefined;
  if (!first) throw new HttpError(400, `Location not found for "${trimmed}". Try a nearby city or coordinates (lat,lon).`);

  const resolvedCity = [first.name, first.state, first.country].filter(Boolean).join(', ');
  return {
    input: trimmed,
    resolvedCity: resolvedCity || first.name || trimmed,
    latitude: Number(first.lat),
    longitude: Number(first.lon),
  };
}

