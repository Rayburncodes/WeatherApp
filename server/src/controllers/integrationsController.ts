import { resolveLocation } from '../services/locationService';
import { buildGoogleMapsUrls } from '../services/mapsService';
import { searchYoutube } from '../services/youtubeService';

export async function getYoutube(location: string) {
  const resolved = await resolveLocation(location);
  const results = await searchYoutube(resolved.resolvedCity);
  return { location: resolved, results };
}

export async function getMap(location: string) {
  const resolved = await resolveLocation(location);
  const urls = buildGoogleMapsUrls(resolved.latitude, resolved.longitude, resolved.resolvedCity);
  return { location: resolved, ...urls };
}

