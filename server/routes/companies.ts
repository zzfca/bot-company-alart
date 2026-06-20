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

// List all companies
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all() as any[];
  res.json(rows.map(rowToCompany));
});

// Get single company
router.get('/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(rowToCompany(row));
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

  const dueDates = computeDueDates({
    registration_date: regDate,
    last_annual_return_date: last_annual_return_date || existing.last_annual_return_date,
    last_filing_date: last_filing_date || existing.last_filing_date,
    last_gst_return_date: last_gst_return_date || existing.last_gst_return_date,
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
    last_filing_date ?? existing.last_filing_date, last_annual_return_date ?? existing.last_annual_return_date, last_gst_return_date ?? existing.last_gst_return_date,
    dueDates.nextAnnualReturn, dueDates.nextFiling, dueDates.nextGst,
    notes ?? existing.notes,
    req.params.id
  );

  const row = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id) as any;
  res.json(rowToCompany(row));
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
  res.json(rowToCompany(row));
});

export default router;
