import { query, queryOne, execute } from '../db/connection';
import { AuditEvent } from '../types';

export interface AuditFilterParams {
  actor?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  correlationId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export function listAuditEvents(filters: AuditFilterParams) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 25));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.actor) {
    conditions.push('actor LIKE ?');
    params.push(`%${filters.actor}%`);
  }

  if (filters.eventType && filters.eventType !== 'ALL') {
    conditions.push('event_type = ?');
    params.push(filters.eventType);
  }

  if (filters.entityType && filters.entityType !== 'ALL') {
    conditions.push('entity_type = ?');
    params.push(filters.entityType);
  }

  if (filters.entityId) {
    conditions.push('entity_id = ?');
    params.push(filters.entityId);
  }

  if (filters.correlationId) {
    conditions.push('correlation_id = ?');
    params.push(filters.correlationId);
  }

  if (filters.startDate) {
    conditions.push('created_at >= ?');
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push('created_at <= ?');
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = queryOne<{ total: number }>(`
    SELECT COUNT(*) as total FROM audit_events ${whereClause};
  `, ...params);
  const total = countRow?.total || 0;

  const rows = query<AuditEvent>(`
    SELECT * FROM audit_events 
    ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?;
  `, ...params, limit, offset);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function logAuditEvent(entry: {
  actor: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_state_json?: string | null;
  new_state_json?: string | null;
  reason?: string | null;
  correlation_id?: string | null;
}) {
  const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
  const nowIso = new Date().toISOString();

  execute(
    `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, previous_state_json, new_state_json, reason, correlation_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    auditId,
    entry.actor,
    entry.event_type,
    entry.entity_type,
    entry.entity_id,
    entry.action,
    entry.previous_state_json || null,
    entry.new_state_json || null,
    entry.reason || null,
    entry.correlation_id || null,
    nowIso
  );

  return auditId;
}
