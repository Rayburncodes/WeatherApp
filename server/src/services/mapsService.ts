import { HttpError } from '../middleware/errorHandler';
import { getEnv } from '../utils/env';

export function buildGoogleMapsUrls(lat: number, lon: number, label: string) {
  const env = getEnv();
  if (!env.GOOGLE_MAPS_API_KEY) throw new HttpError(500, 'GOOGLE_MAPS_API_KEY is not configured.');

  const q = encodeURIComponent(label || `${lat},${lon}`);
  const center = `${lat},${lon}`;
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${env.GOOGLE_MAPS_API_KEY}&q=${q}&center=${encodeURIComponent(
    center,
  )}&zoom=11`;
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?key=${env.GOOGLE_MAPS_API_KEY}&center=${encodeURIComponent(
    center,
  )}&zoom=11&size=640x360&markers=color:red%7C${encodeURIComponent(center)}`;

  return { embedUrl, staticMapUrl };
}

