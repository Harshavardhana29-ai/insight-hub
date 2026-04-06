export interface CronPreset {
  label: string;
  expression: string;
  key: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Every 5 Min', expression: '*/5 * * * *', key: 'every5min' },
  { label: 'Every 10 Min', expression: '*/10 * * * *', key: 'every10min' },
  { label: 'Every 30 Min', expression: '*/30 * * * *', key: 'every30min' },
  { label: 'Every Hour', expression: '0 * * * *', key: 'everyhour' },
  { label: 'Every Day', expression: '0 0 * * *', key: 'everyday' },
  { label: 'Every Week', expression: '0 0 * * 1', key: 'everyweek' },
  { label: 'Every Month', expression: '0 0 1 * *', key: 'everymonth' },
];

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

export const DAY_NAMES = [
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
  { label: 'Sunday', value: '0' },
];

export function validateCronExpression(expr: string): { valid: boolean; errors: string[] } {
  if (!expr.trim()) return { valid: false, errors: ['Expression is required'] };
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { valid: false, errors: ['Must have exactly 5 fields (min hour dom month dow)'] };

  const ranges = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'day of month', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12 },
    { name: 'day of week', min: 0, max: 7 },
  ];

  const errors: string[] = [];
  parts.forEach((part, i) => {
    if (!/^[\d,\-*/]+$/.test(part)) {
      errors.push(`Invalid characters in ${ranges[i].name}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function cronToHuman(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;

  const [min, hour, dom, mon, dow] = parts;

  if (min === '*' && hour === '*') return 'Every minute';
  if (min.startsWith('*/') && hour === '*') {
    const interval = min.slice(2);
    return `Every ${interval} minutes`;
  }
  if (min !== '*' && hour === '*') return `Every hour at minute ${min}`;
  if (hour !== '*' && min !== '*' && dom === '*' && mon === '*' && dow === '*')
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (dow !== '*' && dom === '*')
    return `Every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseInt(dow)] || dow} at ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
  if (dom !== '*' && mon === '*')
    return `Monthly on day ${dom} at ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;

  return expr;
}

function matchesCronField(expr: string, value: number): boolean {
  if (expr === '*') return true;
  if (expr.startsWith('*/')) {
    const interval = parseInt(expr.slice(2));
    return interval > 0 && value % interval === 0;
  }
  return expr.split(',').some(v => parseInt(v) === value);
}

export function getNextExecutions(expr: string, count: number): Date[] {
  const { valid } = validateCronExpression(expr);
  if (!valid) return [];

  const parts = expr.trim().split(/\s+/);
  const [minExpr, hourExpr, domExpr, , dowExpr] = parts;
  const results: Date[] = [];
  const now = new Date();
  const check = new Date(now);
  check.setSeconds(0);
  check.setMilliseconds(0);
  check.setMinutes(check.getMinutes() + 1);

  for (let i = 0; i < 10000 && results.length < count; i++) {
    const m = check.getMinutes();
    const h = check.getHours();
    const d = check.getDate();
    const w = check.getDay();

    if (matchesCronField(minExpr, m) && matchesCronField(hourExpr, h) &&
        matchesCronField(domExpr, d) && matchesCronField(dowExpr, w)) {
      results.push(new Date(check));
    }
    check.setMinutes(check.getMinutes() + 1);
  }

  return results;
}

export function buildCron(preset: string, minute: string, hour: string, dayOfWeek: string, dayOfMonth: string): string {
  switch (preset) {
    case 'every5min':
      return '*/5 * * * *';
    case 'every10min':
      return '*/10 * * * *';
    case 'every30min':
      return '*/30 * * * *';
    case 'everyhour':
      return `${parseInt(minute)} * * * *`;
    case 'everyday':
      return `${parseInt(minute)} ${parseInt(hour)} * * *`;
    case 'everyweek':
      return `${parseInt(minute)} ${parseInt(hour)} * * ${dayOfWeek}`;
    case 'everymonth':
      return `${parseInt(minute)} ${parseInt(hour)} ${parseInt(dayOfMonth)} * *`;
    default:
      return '0 0 * * *';
  }
}
