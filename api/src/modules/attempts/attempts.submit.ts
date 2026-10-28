import { AppError } from '../../lib/errors';
import { EngineError, submitAttempt, type AttemptRuntime } from '../exam-engine/engine';
import { loadSubmitPolicy } from './attempts.policy';
import { loadAndSync, persist, toRuntime } from './attempts.service';

export async function submitExam(userId: string, attemptId: string) {
  const now = new Date();
  const attempt = await loadAndSync(userId, attemptId, now);

  // Some exams (like SSC CGL) end only when the time is over
  const policy = await loadSubmitPolicy(attempt.templateVersionId);
  if (!policy.allowEarlySubmit) {
    throw new AppError(409, 'SUBMIT_NOT_ALLOWED', 'This exam ends automatically when the time is over.');
  }

  const before = toRuntime(attempt);
  let after: AttemptRuntime;
  try {
    after = submitAttempt(before, now);
  } catch (e) {
    if (e instanceof EngineError) throw new AppError(409, e.code, e.message);
    throw e;
  }
  await persist(attempt, before, after);
}