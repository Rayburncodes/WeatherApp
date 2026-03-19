/**
 * Records endpoints:
 * POST   /api/records      → create: save a weather query + result
 * GET    /api/records      → read: return all records
 * GET    /api/records/:id  → read single record
 * PUT    /api/records/:id  → update location/date_range/notes (re-validate location if changed)
 * DELETE /api/records/:id  → delete
 */

import { Router } from 'express';
import { z } from 'zod';
import { createRecord, deleteRecord, getRecord, listRecords, updateRecord } from '../controllers/recordsController';
import { HttpError } from '../middleware/errorHandler';
import { ok } from '../utils/response';

const router = Router();

const CreateSchema = z.object({
  location: z.string().min(1),
  start: z.string().min(1).nullable().optional(),
  end: z.string().min(1).nullable().optional(),
  weatherData: z.unknown(),
  notes: z.string().max(2000).nullable().optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid body for creating record.');
    const record = await createRecord(parsed.data);
    res.status(201).json(ok(record));
  } catch (e) {
    next(e);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const records = await listRecords();
    res.status(200).json(ok(records));
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const record = await getRecord(id);
    res.status(200).json(ok(record));
  } catch (e) {
    next(e);
  }
});

const UpdateSchema = z.object({
  location: z.string().min(1).optional(),
  start: z.string().min(1).nullable().optional(),
  end: z.string().min(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid body for updating record.');
    const record = await updateRecord(id, parsed.data);
    res.status(200).json(ok(record));
  } catch (e) {
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await deleteRecord(id);
    res.status(200).json(ok(result));
  } catch (e) {
    next(e);
  }
});

export default router;

