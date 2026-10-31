import { Router } from 'express';
import { requireAdmin } from '../../middleware/require-admin';
import { requireAuth } from '../../middleware/require-auth';
import {
  bulkBody,
  bulkStatus,
  editBody,
  getQuestion,
  idParam,
  listQuery,
  listQuestions,
  setStatus,
  statusBody,
  updateQuestion,
} from './questions.manage';
import { importQuestions, importSchema, listSubjectNames } from './questions.import';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/subjects', async (_req, res, next) => {
  try {
    res.json({ subjects: await listSubjectNames() });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/questions/import', async (req, res, next) => {
  try {
    res.json(await importQuestions(importSchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/questions', async (req, res, next) => {
  try {
    res.json(await listQuestions(listQuery.parse(req.query)));
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/questions/bulk-status', async (req, res, next) => {
  try {
    res.json(await bulkStatus(bulkBody.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

adminRouter.get('/questions/:id', async (req, res, next) => {
  try {
    res.json(await getQuestion(idParam.parse(req.params).id));
  } catch (err) {
    next(err);
  }
});

adminRouter.put('/questions/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await updateQuestion(id, editBody.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/questions/:id/status', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    res.json(await setStatus(id, statusBody.parse(req.body).status));
  } catch (err) {
    next(err);
  }
});