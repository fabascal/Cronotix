import type { RecurrenceType } from '../../database/entities/agent-schedule.entity';

/**
 * Translates a user-friendly recurrenceConfig into a cron expression.
 * Returns null for one-time schedules (handled via Bull delay).
 */
export function buildCronExpression(
  type: RecurrenceType,
  config: Record<string, unknown>,
): string | null {
  switch (type) {
    case 'interval': {
      const minutes = config.intervalMinutes as number | undefined;
      const hours = config.intervalHours as number | undefined;
      if (minutes) return `*/${minutes} * * * *`;
      if (hours) return `0 */${hours} * * *`;
      return '*/30 * * * *';
    }
    case 'daily': {
      const [h, m] = parseTime(config.time as string | undefined);
      return `${m} ${h} * * *`;
    }
    case 'weekly': {
      const [h, m] = parseTime(config.time as string | undefined);
      const dow = (config.dayOfWeek as number) ?? 1;
      return `${m} ${h} * * ${dow}`;
    }
    case 'monthly': {
      const [h, m] = parseTime(config.time as string | undefined);
      const dom = (config.dayOfMonth as number) ?? 1;
      return `${m} ${h} ${dom} * *`;
    }
    case 'once':
      return null;
    default:
      return null;
  }
}

/** Computes the delay in ms from now until `runAt` for one-time schedules. */
export function computeDelay(config: Record<string, unknown>): number {
  const runAt = config.runAt as string | undefined;
  if (!runAt) return 0;
  const delta = new Date(runAt).getTime() - Date.now();
  return Math.max(delta, 0);
}

function parseTime(time?: string): [number, number] {
  if (!time) return [9, 0];
  const [h, m] = time.split(':').map(Number);
  return [h ?? 9, m ?? 0];
}
