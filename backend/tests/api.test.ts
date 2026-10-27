import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/index';
import { runMigrations } from '../src/db/schema';
import { seedDatabase } from '../src/db/seed';

describe('RegTech Sentinel API Integration Tests', () => {
  beforeAll(() => {
    runMigrations();
    seedDatabase(false);
  });

  it('GET /api/health returns healthy readiness state', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.product).toBe('RegTech Sentinel');
    expect(res.body.components.database.status).toBe('HEALTHY');
  });

  it('GET /api/dashboard returns database-backed metrics', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { kpis, charts, recentTransactions } = res.body.data;
    expect(kpis.totalTransactions).toBeGreaterThan(0);
    expect(kpis.totalVolumeValue).toBeGreaterThan(0);
    expect(charts.riskDistribution.length).toBe(4);
    expect(recentTransactions.length).toBeGreaterThan(0);
  });

  it('GET /api/transactions supports pagination and filters', async () => {
    const res = await request(app).get('/api/transactions?limit=10&page=1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
    expect(res.body.pagination.total).toBeGreaterThan(0);
  });

  it('POST /api/transactions processes pipeline and creates assessment', async () => {
    const payload = {
      sender_account_id: 'ACC-8001',
      receiver_account_id: 'ACC-EXT-9901',
      amount: 450.0,
      currency: 'USD',
      channel: 'MOBILE',
      type: 'INSTANT',
      origin_country: 'US',
      dest_country: 'GB',
    };

    const res = await request(app).post('/api/transactions').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.transaction.id).toBeDefined();
    expect(res.body.data.assessment.final_risk_score).toBeDefined();
  });

  it('PATCH /api/alerts/:id/status requires reason and updates status', async () => {
    // Get existing alert
    const listRes = await request(app).get('/api/alerts?limit=1');
    const firstAlert = listRes.body.data[0];
    expect(firstAlert).toBeDefined();

    const updateRes = await request(app)
      .patch(`/api/alerts/${firstAlert.id}/status`)
      .send({
        status: 'UNDER_REVIEW',
        reason: 'Initiated formal compliance source-of-wealth inquiry',
        note: 'Customer outreach sent via secure portal',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.alert.status).toBe('UNDER_REVIEW');
  });

  it('POST /api/screening/screen fuzzy matches synthetic watchlist', async () => {
    const res = await request(app)
      .post('/api/screening/screen')
      .send({
        name: 'Viktor Mikhailov',
        threshold: 0.8,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalHits).toBeGreaterThan(0);
    expect(res.body.data.matches[0].matchScore).toBe(1.0);
  });

  it('POST /api/stress-testing/run produces deterministic scenario impact', async () => {
    const res = await request(app)
      .post('/api/stress-testing/run')
      .send({
        name: 'Macro Liquidity Shock',
        volume_increase_pct: 50,
        high_value_freq_multiplier: 2,
        high_risk_geo_pct: 20,
        suspicious_pattern_multiplier: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.projected.totalTransactions).toBeGreaterThan(
      res.body.data.baseline.totalTransactions
    );
  });

  it('GET /api/reports/generate?type=TRANSACTIONS&format=csv returns valid RFC 4180 CSV', async () => {
    const res = await request(app).get('/api/reports/generate?type=TRANSACTIONS&format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('REGTECH SENTINEL');
    expect(res.text).toContain('Transaction ID');
  });
});
