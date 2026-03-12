export interface CronPreset {
  label: string;
  expression: string;
}

export const CRON_PRESETS: CronPreset[] = [
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at midnight', expression: '0 0 * * *' },
  { label: 'Every day at 9 AM', expression: '0 9 * * *' },
  { label: 'Every Monday', expression: '0 9 * * 1' },
  { label: 'Every weekday', expression: '0 9 * * 1-5' },
  { label: 'Every month (1st)', expression: '0 0 1 * *' },
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
    if (!/^[\d,\-\*\/]+$/.test(part)) {
      errors.push(`Invalid characters in ${ranges[i].name}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function cronToHuman(expr: string): string {
  const preset = CRON_PRESETS.find(p => p.expression === expr);
  if (preset) return preset.label;

  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;

  const [min, hour, dom, mon, dow] = parts;

  if (min === '*' && hour === '*') return 'Every minute';
  if (min !== '*' && hour === '*') return `Every hour at minute ${min}`;
  if (hour !== '*' && min !== '*' && dom === '*' && mon === '*' && dow === '*')
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (dow !== '*' && dom === '*')
    return `Every ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][parseInt(dow)] || dow} at ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;
  if (dom !== '*' && mon === '*')
    return `Monthly on day ${dom} at ${hour.padStart(2,'0')}:${min.padStart(2,'0')}`;

  return expr;
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

    const minMatch = minExpr === '*' || minExpr.split(',').some(v => parseInt(v) === m);
    const hourMatch = hourExpr === '*' || hourExpr.split(',').some(v => parseInt(v) === h);
    const domMatch = domExpr === '*' || domExpr.split(',').some(v => parseInt(v) === d);
    const dowMatch = dowExpr === '*' || dowExpr.split(',').some(v => parseInt(v) === w);

    if (minMatch && hourMatch && domMatch && dowMatch) {
      results.push(new Date(check));
    }
    check.setMinutes(check.getMinutes() + 1);
  }

  return results;
}
