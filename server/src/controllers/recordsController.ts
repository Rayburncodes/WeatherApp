import { prisma } from '../db/prisma';
import { HttpError } from '../middleware/errorHandler';
import { resolveLocation } from '../services/locationService';
import { isFutureDate, isValidIsoDate } from '../utils/date';

export async function createRecord(input: {
  location: string;
  start?: string | null | undefined;
  end?: string | null | undefined;
  weatherData: unknown;
  notes?: string | null | undefined;
}) {
  const resolved = await resolveLocation(input.location);

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  if (input.start && input.end) {
    if (!isValidIsoDate(input.start) || !isValidIsoDate(input.end)) {
      throw new HttpError(400, 'Dates must be valid ISO 8601 date-only strings (YYYY-MM-DD).');
    }
    if (isFutureDate(input.start) || isFutureDate(input.end)) {
      throw new HttpError(400, 'Dates cannot be in the future.');
    }
    if (new Date(input.start).getTime() > new Date(input.end).getTime()) {
      throw new HttpError(400, 'Start date must be before or equal to end date.');
    }
    startDate = new Date(`${input.start}T00:00:00Z`);
    endDate = new Date(`${input.end}T00:00:00Z`);
  }

  return prisma.weatherRecord.create({
    data: {
      location: resolved.input,
      resolvedCity: resolved.resolvedCity,
      latitude: resolved.latitude,
      longitude: resolved.longitude,
      startDate,
      endDate,
      weatherData: input.weatherData as any,
      notes: input.notes ?? null,
    },
  });
}

export async function listRecords() {
  return prisma.weatherRecord.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getRecord(id: string) {
  const record = await prisma.weatherRecord.findUnique({ where: { id } });
  if (!record) throw new HttpError(404, 'Record not found.');
  return record;
}

export async function updateRecord(
  id: string,
  updates: {
    location?: string | undefined;
    start?: string | null | undefined;
    end?: string | null | undefined;
    notes?: string | null | undefined;
  },
) {
  const existing = await prisma.weatherRecord.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Record not found.');

  let resolvedCity = existing.resolvedCity;
  let latitude = existing.latitude;
  let longitude = existing.longitude;
  let location = existing.location;

  if (typeof updates.location === 'string' && updates.location.trim() && updates.location.trim() !== existing.location) {
    const resolved = await resolveLocation(updates.location);
    location = resolved.input;
    resolvedCity = resolved.resolvedCity;
    latitude = resolved.latitude;
    longitude = resolved.longitude;
  }

  let startDate = existing.startDate;
  let endDate = existing.endDate;
  const hasAnyDateUpdate = 'start' in updates || 'end' in updates;
  if (hasAnyDateUpdate) {
    const start = updates.start ?? (existing.startDate ? existing.startDate.toISOString().slice(0, 10) : null);
    const end = updates.end ?? (existing.endDate ? existing.endDate.toISOString().slice(0, 10) : null);

    if (start && end) {
      if (!isValidIsoDate(start) || !isValidIsoDate(end)) {
        throw new HttpError(400, 'Dates must be valid ISO 8601 date-only strings (YYYY-MM-DD).');
      }
      if (isFutureDate(start) || isFutureDate(end)) {
        throw new HttpError(400, 'Dates cannot be in the future.');
      }
      if (new Date(start).getTime() > new Date(end).getTime()) {
        throw new HttpError(400, 'Start date must be before or equal to end date.');
      }
      startDate = new Date(`${start}T00:00:00Z`);
      endDate = new Date(`${end}T00:00:00Z`);
    } else {
      // allow clearing range
      startDate = null;
      endDate = null;
    }
  }

  return prisma.weatherRecord.update({
    where: { id },
    data: {
      location,
      resolvedCity,
      latitude,
      longitude,
      startDate,
      endDate,
      notes: updates.notes ?? existing.notes,
    },
  });
}

export async function deleteRecord(id: string) {
  const existing = await prisma.weatherRecord.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Record not found.');
  await prisma.weatherRecord.delete({ where: { id } });
  return { deleted: true };
}

