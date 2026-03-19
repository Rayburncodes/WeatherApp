import axios from 'axios';
import { HttpError } from '../middleware/errorHandler';
import { getEnv } from '../utils/env';

export type YoutubeResult = { videoId: string; title: string; thumbnail: string | null };

export async function searchYoutube(location: string): Promise<YoutubeResult[]> {
  const env = getEnv();
  if (!env.YOUTUBE_API_KEY) throw new HttpError(500, 'YOUTUBE_API_KEY is not configured.');

  const resp = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      key: env.YOUTUBE_API_KEY,
      part: 'snippet',
      type: 'video',
      maxResults: 3,
      q: `travel ${location}`,
      safeSearch: 'moderate',
    },
    timeout: 15_000,
  });

  const items: Array<any> = Array.isArray(resp.data?.items) ? resp.data.items : [];
  return items
    .map((it) => ({
      videoId: String(it?.id?.videoId ?? ''),
      title: String(it?.snippet?.title ?? ''),
      thumbnail: it?.snippet?.thumbnails?.medium?.url ? String(it.snippet.thumbnails.medium.url) : null,
    }))
    .filter((v) => v.videoId && v.title);
}

