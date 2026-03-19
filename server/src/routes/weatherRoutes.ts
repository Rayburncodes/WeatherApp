/**
 * Weather endpoints:
 * GET  /api/weather/current?location=   → fetch current weather for a location
 * GET  /api/weather/forecast?location=  → fetch 5-day forecast grouped by day
 * GET  /api/weather/history?location=&start=&end= → fetch historical daily temps and store result
 */

import { Router } from 'express';
import { z } from 'zod';
import { getCurrentWeather, getForecast, getHistoryAndStore } from '../controllers/weatherController';
import { HttpError } from '../middleware/errorHandler';
import { ok } from '../utils/response';

const router = Router();

const LocationQuerySchema = z.object({
  location: z.string().min(1),
});

router.get('/current', async (req, res, next) => {
  try {
    const parsed = LocationQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'location query param is required.');
    const data = await getCurrentWeather(parsed.data.location);
    res.status(200).json(ok(data));
  } catch (e) {
    next(e);
  }
});

router.get('/forecast', async (req, res, next) => {
  try {
    const parsed = LocationQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'location query param is required.');
    const data = await getForecast(parsed.data.location);
    res.status(200).json(ok(data));
  } catch (e) {
    next(e);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const schema = z.object({
      location: z.string().min(1),
      start: z.string().min(1),
      end: z.string().min(1),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'location, start, and end query params are required.');
    const data = await getHistoryAndStore(parsed.data.location, parsed.data.start, parsed.data.end);
    res.status(201).json(ok(data));
  } catch (e) {
    next(e);
  }
});

export default router;

