/**
 * Integrations endpoints:
 * GET /api/integrations/youtube?location= → top 3 YouTube results related to location
 * GET /api/integrations/map?location=     → Google Maps embed + static map URL
 */

import { Router } from 'express';
import { z } from 'zod';
import { getMap, getYoutube } from '../controllers/integrationsController';
import { HttpError } from '../middleware/errorHandler';
import { ok } from '../utils/response';

const router = Router();

const LocationQuerySchema = z.object({ location: z.string().min(1) });

router.get('/youtube', async (req, res, next) => {
  try {
    const parsed = LocationQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'location query param is required.');
    const data = await getYoutube(parsed.data.location);
    res.status(200).json(ok(data));
  } catch (e) {
    next(e);
  }
});

router.get('/map', async (req, res, next) => {
  try {
    const parsed = LocationQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'location query param is required.');
    const data = await getMap(parsed.data.location);
    res.status(200).json(ok(data));
  } catch (e) {
    next(e);
  }
});

export default router;

