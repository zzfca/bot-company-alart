import { addMonths, addYears, differenceInDays, startOfDay, isBefore, parseISO } from 'date-fns';

export function getNextAnnualReturnDate(registrationDate: string, lastAnnualReturnDate?: string | null): string {
  const today = startOfDay(new Date());
  const regDate = parseISO(registrationDate);
  const lastDate = lastAnnualReturnDate ? parseISO(lastAnnualReturnDate) : regDate;

  const thisYear = today.getFullYear();
  let candidate = new Date(thisYear, regDate.getMonth(), regDate.getDate());

  if (isBefore(candidate, lastDate) || candidate <= lastDate) {
    candidate = new Date(thisYear + 1, regDate.getMonth(), regDate.getDate());
  }

  return candidate.toISOString().split('T')[0];
}

export function getNextFilingDate(registrationDate: string, lastFilingDate?: string | null): string {
  const today = startOfDay(new Date());
  const regDate = parseISO(registrationDate);
  const lastDate = lastFilingDate ? parseISO(lastFilingDate) : addMonths(regDate, 6);

  const thisYear = today.getFullYear();
  let candidate = addMonths(new Date(thisYear, regDate.getMonth(), regDate.getDate()), 6);

  if (isBefore(candidate, lastDate) || candidate <= lastDate) {
    candidate = addMonths(new Date(thisYear + 1, regDate.getMonth(), regDate.getDate()), 6);
  }

  return candidate.toISOString().split('T')[0];
}

export function getNextGstReturnDate(lastGstReturnDate: string | null, registrationDate: string, gstPeriod: string | null): string | null {
  if (!gstPeriod) return null;

  const lastDate = lastGstReturnDate ? parseISO(lastGstReturnDate) : parseISO(registrationDate);
  let nextDate: Date;

  if (gstPeriod === 'monthly') {
    nextDate = addMonths(lastDate, 1);
  } else if (gstPeriod === 'annual') {
    nextDate = addYears(lastDate, 1);
  } else {
    return null;
  }

  return nextDate.toISOString().split('T')[0];
}

export function computeDueDates(company: {
  registration_date: string;
  last_annual_return_date?: string | null;
  last_filing_date?: string | null;
  last_gst_return_date?: string | null;
  has_gst: number | boolean;
  gst_period?: string | null;
}) {
  const regDate = company.registration_date;
  const lastAnnualReturn = company.last_annual_return_date || null;
  const lastFiling = company.last_filing_date || null;
  const lastGst = company.last_gst_return_date || null;

  const nextAnnualReturn = getNextAnnualReturnDate(regDate, lastAnnualReturn);
  const nextFiling = getNextFilingDate(regDate, lastFiling);
  const nextGst = company.has_gst
    ? getNextGstReturnDate(lastGst, regDate, company.gst_period || null)
    : null;

  return { nextAnnualReturn, nextFiling, nextGst };
}

export function getDaysUntil(dateStr: string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(parseISO(dateStr));
  return differenceInDays(target, today);
}

export function getDaysFromNow(dateStr: string): number {
  const today = startOfDay(new Date());
  const target = startOfDay(parseISO(dateStr));
  return differenceInDays(today, target);
}
