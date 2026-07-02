import { AuditLogView } from './audit.repository';

/** فرار امن یک مقدار برای CSV (RFC 4180) */
function csvCell(value: unknown): string {
  const s =
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  // اگر شامل کاما/کوتیشن/خط جدید بود، در کوتیشن قرار بده و کوتیشن‌ها را دوبل کن
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  'id',
  'createdAt',
  'actorId',
  'actorName',
  'action',
  'entityType',
  'entityId',
  'ip',
  'reason',
  'oldValue',
  'newValue',
  'metadata',
];

/** تبدیل ردیف‌های ممیزی به CSV (با BOM برای نمایش درست فارسی در Excel). */
export function auditToCsv(rows: AuditLogView[]): string {
  const lines = [HEADERS.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.createdAt.toISOString(),
        r.actorId,
        r.actorName,
        r.action,
        r.entityType,
        r.entityId,
        r.ip,
        r.reason,
        r.oldValue,
        r.newValue,
        r.metadata,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return '﻿' + lines.join('\r\n');
}
