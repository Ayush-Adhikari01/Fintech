import { execute, query, queryOne, transaction } from '../db/connection';
import { ScreeningResult, ScreeningStatus, SyntheticWatchlistEntry } from '../types';

// Normalized Levenshtein similarity metric bounded [0.0, 1.0]
function computeSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = dp[m][n];
  const maxLen = Math.max(m, n);
  return Math.round((1.0 - distance / maxLen) * 100) / 100;
}

export function listWatchlist(search?: string, regime?: string) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    conditions.push('(name LIKE ? OR country LIKE ? OR program LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  if (regime && regime !== 'ALL') {
    conditions.push('regime = ?');
    params.push(regime);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return query<SyntheticWatchlistEntry>(
    `SELECT * FROM synthetic_watchlist ${whereClause} ORDER BY name ASC;`,
    ...params
  );
}

export function screenEntity(input: {
  name: string;
  threshold?: number;
  target_type?: 'CUSTOMER' | 'COUNTERPARTY' | 'AD_HOC';
  target_id?: string | null;
  screened_by?: string;
}) {
  const threshold = input.threshold !== undefined ? input.threshold : 0.70;
  const targetType = input.target_type || 'AD_HOC';
  const screenedBy = input.screened_by || 'compliance.screener@sentinel.internal';
  const queryName = input.name.trim();

  const watchlistEntries = query<SyntheticWatchlistEntry>('SELECT * FROM synthetic_watchlist;');

  const candidateMatches: Array<{
    watchlistEntry: SyntheticWatchlistEntry;
    matchScore: number;
    matchType: 'EXACT' | 'FUZZY';
  }> = [];

  for (const entry of watchlistEntries) {
    const similarity = computeSimilarity(queryName, entry.name);
    if (similarity >= threshold) {
      candidateMatches.push({
        watchlistEntry: entry,
        matchScore: similarity,
        matchType: similarity === 1.0 ? 'EXACT' : 'FUZZY',
      });
    }
  }

  // Sort by highest match score
  candidateMatches.sort((a, b) => b.matchScore - a.matchScore);

  const nowIso = new Date().toISOString();
  const resultsToPersist: ScreeningResult[] = [];

  transaction(() => {
    if (candidateMatches.length === 0) {
      // Record a clean screen
      const resId = `SCR-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
      execute(
        `INSERT INTO screening_results (id, target_type, target_id, query_name, matched_entity_id, match_score, status, notes, screened_by, created_at)
         VALUES (?, ?, ?, ?, NULL, 0.0, 'CLEARED', 'No watchlist matches exceeding threshold.', ?, ?);`,
        resId, targetType, input.target_id || null, queryName, screenedBy, nowIso
      );
      resultsToPersist.push({
        id: resId,
        target_type: targetType,
        target_id: input.target_id || null,
        query_name: queryName,
        matched_entity_id: null,
        match_score: 0.0,
        status: 'CLEARED',
        notes: 'No matches found.',
        screened_by: screenedBy,
        created_at: nowIso,
      });
    } else {
      for (const match of candidateMatches) {
        const resId = `SCR-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
        const note = `${match.matchType} match against ${match.watchlistEntry.name} (${match.watchlistEntry.regime}). Score: ${match.matchScore}`;
        execute(
          `INSERT INTO screening_results (id, target_type, target_id, query_name, matched_entity_id, match_score, status, notes, screened_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'POTENTIAL_MATCH', ?, ?, ?);`,
          resId, targetType, input.target_id || null, queryName, match.watchlistEntry.id, match.matchScore, note, screenedBy, nowIso
        );
        resultsToPersist.push({
          id: resId,
          target_type: targetType,
          target_id: input.target_id || null,
          query_name: queryName,
          matched_entity_id: match.watchlistEntry.id,
          match_score: match.matchScore,
          status: 'POTENTIAL_MATCH',
          notes: note,
          screened_by: screenedBy,
          created_at: nowIso,
        });
      }
    }

    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, reason, correlation_id, created_at)
       VALUES (?, ?, 'SCREENING_EXECUTE', 'WATCHLIST', ?, 'SCREEN_NAME', ?, ?, ?);`,
      auditId, screenedBy, queryName, `Screened "${queryName}" with ${candidateMatches.length} candidate hits`, `CORR-SCR-${Date.now()}`, nowIso
    );
  });

  return {
    queryName,
    threshold,
    totalHits: candidateMatches.length,
    matches: candidateMatches,
    persistedResults: resultsToPersist,
  };
}

export function listScreeningHistory(limit: number = 50) {
  return query(`
    SELECT 
      sr.*, 
      wl.name as matched_name, 
      wl.regime as matched_regime, 
      wl.country as matched_country,
      wl.program as matched_program
    FROM screening_results sr
    LEFT JOIN synthetic_watchlist wl ON sr.matched_entity_id = wl.id
    ORDER BY sr.created_at DESC
    LIMIT ?;
  `, limit);
}

export function updateScreeningStatus(
  screeningId: string,
  newStatus: ScreeningStatus,
  reason: string,
  actor: string = 'compliance.lead@sentinel.internal'
) {
  const existing = queryOne<ScreeningResult>('SELECT * FROM screening_results WHERE id = ?;', screeningId);
  if (!existing) {
    throw new Error(`Screening record ${screeningId} not found.`);
  }

  const nowIso = new Date().toISOString();

  transaction(() => {
    execute(
      `UPDATE screening_results 
       SET status = ?, notes = ?, created_at = ? 
       WHERE id = ?;`,
      newStatus,
      reason,
      nowIso,
      screeningId
    );

    const auditId = `AUD-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 900)}`;
    execute(
      `INSERT INTO audit_events (id, actor, event_type, entity_type, entity_id, action, previous_state_json, new_state_json, reason, correlation_id, created_at)
       VALUES (?, ?, 'SCREENING_STATUS_CHANGE', 'SCREENING_RESULT', ?, ?, ?, ?, ?, ?, ?);`,
      auditId, actor, screeningId, `REVIEW_${newStatus}`,
      JSON.stringify({ status: existing.status }),
      JSON.stringify({ status: newStatus }),
      reason,
      `CORR-SCR-${screeningId}`,
      nowIso
    );
  });

  return queryOne('SELECT * FROM screening_results WHERE id = ?;', screeningId);
}
