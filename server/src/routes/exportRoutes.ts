/**
 * Export endpoints:
 * GET /api/export?format=json|csv|xml|pdf|markdown → export all records in requested format
 */

import { Router } from 'express';
import { z } from 'zod';
import { exportAll } from '../controllers/exportController';
import { HttpError } from '../middleware/errorHandler';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const schema = z.object({
      format: z.enum(['json', 'csv', 'xml', 'pdf', 'markdown']),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, 'format query param is required.');

    const file = await exportAll(parsed.data.format);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.status(200).send(file.body);
  } catch (e) {
    next(e);
  }
});

export default router;

