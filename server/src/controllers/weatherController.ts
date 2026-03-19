import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { fetchHistoricalDailyTemps } from '../services/openMeteoService';
import { fetchCurrentWeather, fetchFiveDayForecast } from '../services/openWeatherService';
import { resolveLocation } from '../services/locationService';
import { isFutureDate, isValidIsoDate } from '../utils/date';

export async function getCurrentWeather(location: string) {
  const resolved = await resolveLocation(location);
  const weather = await fetchCurrentWeather(resolved.latitude, resolved.longitude);
  return { location: resolved, weather };
}

export async function getForecast(location: string) {
  const resolved = await resolveLocation(location);
  const forecast = await fetchFiveDayForecast(resolved.latitude, resolved.longitude);
  return { location: resolved, forecast };
}

export async function getHistoryAndStore(location: string, start: string, end: string) {
  if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
    throw new HttpError(400, 'Dates must be valid ISO 8601 date-only strings (YYYY-MM-DD).');
  }
  if (isFutureDate(start) || isFutureDate(end)) {
    throw new HttpError(400, 'Historical queries cannot include future dates.');
  }
  if (new Date(start).getTime() > new Date(end).getTime()) {
    throw new HttpError(400, 'Start date must be before or equal to end date.');
  }

  const resolved = await resolveLocation(location);
  const { days, raw } = await fetchHistoricalDailyTemps(resolved.latitude, resolved.longitude, start, end);

  const created = await prisma.weatherRecord.create({
    data: {
      location: resolved.input,
      resolvedCity: resolved.resolvedCity,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      startDate: new Date(`${start}T00:00:00Z`),
      endDate: new Date(`${end}T00:00:00Z`),
      weatherData: raw as any,
      notes: null,
    },
  });

  return { location: resolved, days, record: created };
}

