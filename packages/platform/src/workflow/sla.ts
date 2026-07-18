/**
 * Workflow stage SLA calculation foundation (RC6.5).
 * Pure helpers — no worker/scheduler; engines call listTimedOutInstances / reportSlaBreaches.
 */

const MS_PER_HOUR = 60 * 60 * 1000;

/** Deadline instant for a stage SLA, or null when slaHours is unset. */
export function computeStageSlaDeadline(
  stageEnteredAt: string,
  slaHours: number | null | undefined,
): Date | null {
  if (slaHours === null || slaHours === undefined || slaHours <= 0) {
    return null;
  }
  const entered = new Date(stageEnteredAt).getTime();
  if (Number.isNaN(entered)) {
    return null;
  }
  return new Date(entered + slaHours * MS_PER_HOUR);
}

/** True when now is strictly after the stage SLA deadline. */
export function isStageSlaBreached(
  stageEnteredAt: string,
  slaHours: number | null | undefined,
  now: Date,
): boolean {
  const deadline = computeStageSlaDeadline(stageEnteredAt, slaHours);
  if (!deadline) {
    return false;
  }
  return now.getTime() > deadline.getTime();
}

/** Remaining hours until deadline (negative when breached); null when no SLA. */
export function remainingSlaHours(
  stageEnteredAt: string,
  slaHours: number | null | undefined,
  now: Date,
): number | null {
  const deadline = computeStageSlaDeadline(stageEnteredAt, slaHours);
  if (!deadline) {
    return null;
  }
  return (deadline.getTime() - now.getTime()) / MS_PER_HOUR;
}
