import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { computeDueDates } from '../lib/dates.js';

const router = Router();

function rowToCompany(row: any) {
  return {
    ...row,
    has_gst: !!row.has_gst,
  };
}

function getFilingHistory(companyId: number) {
  return db.prepare(`
    SELECT id, company_id, type, filed_date, recorded_at
    FROM filing_history
    WHERE company_id = ?
    ORDER BY filed_date DESC, recorded_at DESC, id DESC
  `).all(companyId);
}

// List all companies
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all() as any[];
  res.json(rows.map(rowToCompany));
});

// Get single company
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...rowToCompany(row),
    filing_history: getFilingHistory(Number(req.params.id)),
  });
});

// Create company
router.post('/', requireAuth, (req, res) => {
  const {
    name, registration_number, address, registration_date,
    has_gst, gst_number, gst_period, notes
  } = req.body;

  if (!name || !registration_date) {
    return res.status(400).json({ error: 'Name and registration date are required' });
  }

  const hasGst = has_gst ? 1 : 0;

  // Compute due dates automatically
  const dueDates = computeDueDates({
    registration_date: registration_date,
    has_gst: hasGst,
    gst_period: gst_period || null,
  });

  const result = db.prepare(`
    INSERT INTO companies (
      name, registration_number, address, registration_date,
      has_gst, gst_number, gst_period,
      next_annual_return_date, next_filing_date, next_gst_return_date,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name, registration_number || null, address || null, registration_date,
    hasGst, hasGst ? (gst_number || null) : null, hasGst ? (gst_period || null) : null,
    dueDates.nextAnnualReturn, dueDates.nextFiling, dueDates.nextGst,
    notes || null
  );

  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid) as any;
  res.status(201).json(rowToCompany(row));
});

// Update company
router.put('/:id', requireAuth, (req, res) => {
  const {
    name, registration_number, address, registration_date,
    has_gst, gst_number, gst_period, last_filing_date, last_annual_return_date,
    last_gst_return_date, notes
  } = req.body;

  const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const hasGst = has_gst ? 1 : 0;
  const regDate = registration_date || existing.registration_date;
  const resolvedLastFilingDate = last_filing_date ?? existing.last_filing_date;
  const resolvedLastAnnualReturnDate = last_annual_return_date ?? existing.last_annual_return_date;
  const resolvedLastGstReturnDate = last_gst_return_date ?? existing.last_gst_return_date;

  const dueDates = computeDueDates({
    registration_date: regDate,
    last_annual_return_date: resolvedLastAnnualReturnDate,
    last_filing_date: resolvedLastFilingDate,
    last_gst_return_date: resolvedLastGstReturnDate,
    has_gst: hasGst,
    gst_period: gst_period || existing.gst_period,
  });

  db.prepare(`
    UPDATE companies SET
      name = ?, registration_number = ?, address = ?, registration_date = ?,
      has_gst = ?, gst_number = ?, gst_period = ?,
      last_filing_date = ?, last_annual_return_date = ?, last_gst_return_date = ?,
      next_annual_return_date = ?, next_filing_date = ?, next_gst_return_date = ?,
      notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name || existing.name, registration_number ?? existing.registration_number, address ?? existing.address, regDate,
    hasGst, hasGst ? (gst_number || null) : null, hasGst ? (gst_period || null) : null,
    resolvedLastFilingDate, resolvedLastAnnualReturnDate, resolvedLastGstReturnDate,
    dueDates.nextAnnualReturn, dueDates.nextFiling, dueDates.nextGst,
    notes ?? existing.notes,
    req.params.id
  );

  const historyInserts: { type: string; filedDate: string }[] = [];
  if (last_filing_date && last_filing_date !== existing.last_filing_date) {
    historyInserts.push({ type: 'filing', filedDate: last_filing_date });
  }
  if (last_annual_return_date && last_annual_return_date !== existing.last_annual_return_date) {
    historyInserts.push({ type: 'annual_return', filedDate: last_annual_return_date });
  }
  if (last_gst_return_date && last_gst_return_date !== existing.last_gst_return_date) {
    historyInserts.push({ type: 'gst_return', filedDate: last_gst_return_date });
  }

  const insertHistoryStmt = db.prepare(`
    INSERT INTO filing_history (company_id, type, filed_date)
    SELECT ?, ?, ?
    WHERE NOT EXISTS (
      SELECT 1 FROM filing_history
      WHERE company_id = ?
        AND type = ?
        AND filed_date = ?
    )
  `);

  for (const entry of historyInserts) {
    insertHistoryStmt.run(req.params.id, entry.type, entry.filedDate, req.params.id, entry.type, entry.filedDate);
  }

  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  res.json({
    ...rowToCompany(row),
    filing_history: getFilingHistory(Number(req.params.id)),
  });
});

// Delete company
router.delete('/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Recalculate all companies due dates
router.post('/recalculate-all', requireAuth, (req, res) => {
  const allCompanies = db.prepare('SELECT * FROM companies').all() as any[];

  const updateStmt = db.prepare(`
    UPDATE companies SET
      next_annual_return_date = ?, next_filing_date = ?, next_gst_return_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const transaction = db.transaction((companies: any[]) => {
    for (const company of companies) {
      const dueDates = computeDueDates({
        registration_date: company.registration_date,
        last_annual_return_date: company.last_annual_return_date,
        last_filing_date: company.last_filing_date,
        last_gst_return_date: company.last_gst_return_date,
        has_gst: company.has_gst,
        gst_period: company.gst_period,
      });

      updateStmt.run(dueDates.nextAnnualReturn, dueDates.nextFiling, dueDates.nextGst, company.id);
    }
  });

  transaction(allCompanies);

  res.json({ success: true, updated: allCompanies.length });
});

// Recalculate due dates
router.post('/:id/recalculate', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const dueDates = computeDueDates({
    registration_date: existing.registration_date,
    last_annual_return_date: existing.last_annual_return_date,
    last_filing_date: existing.last_filing_date,
    last_gst_return_date: existing.last_gst_return_date,
    has_gst: existing.has_gst,
    gst_period: existing.gst_period,
  });

  db.prepare(`
    UPDATE companies SET
      next_annual_return_date = ?, next_filing_date = ?, next_gst_return_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(dueDates.nextAnnualReturn, dueDates.nextFiling, dueDates.nextGst, req.params.id);

  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  res.json({
    ...rowToCompany(row),
    filing_history: getFilingHistory(Number(req.params.id)),
  });
});

// Toggle pause status for a filing type
router.post('/:id/toggle-pause', requireAuth, (req, res) => {
  const { type } = req.body;

  if (!['annual_return', 'filing', 'gst_return'].includes(type)) {
    return res.status(400).json({ error: 'Invalid filing type' });
  }

  const existing = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const columnMap: Record<string, string> = {
    'annual_return': 'annual_return_paused',
    'filing': 'filing_paused',
    'gst_return': 'gst_return_paused',
  };

  const column = columnMap[type];
  const currentValue = existing[column] || 0;
  const newValue = currentValue ? 0 : 1;

  db.prepare(`
    UPDATE companies SET ${column} = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newValue, req.params.id);

  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  res.json({
    ...rowToCompany(row),
    filing_history: getFilingHistory(Number(req.params.id)),
  });
});

export default router;
