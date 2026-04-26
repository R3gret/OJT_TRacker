/**
 * Philippine Regular Holidays and Special Non-Working Days
 * Covers 2025–2027 for prediction accuracy.
 * Format: 'YYYY-MM-DD'
 */

const PH_HOLIDAYS: string[] = [
  // ── 2025 ──
  '2025-01-01', // New Year's Day
  '2025-01-29', // Chinese New Year
  '2025-02-25', // EDSA People Power Anniversary
  '2025-04-09', // Araw ng Kagitingan
  '2025-04-17', // Maundy Thursday
  '2025-04-18', // Good Friday
  '2025-04-19', // Black Saturday
  '2025-05-01', // Labor Day
  '2025-06-12', // Independence Day
  '2025-06-27', // Eid'l Fitr (estimated)
  '2025-08-21', // Ninoy Aquino Day
  '2025-08-25', // National Heroes Day
  '2025-09-03', // Eid'l Adha (estimated)
  '2025-11-01', // All Saints' Day
  '2025-11-30', // Bonifacio Day
  '2025-12-08', // Feast of the Immaculate Conception
  '2025-12-24', // Christmas Eve
  '2025-12-25', // Christmas Day
  '2025-12-30', // Rizal Day
  '2025-12-31', // Last Day of the Year

  // ── 2026 ──
  '2026-01-01', // New Year's Day
  '2026-02-17', // Chinese New Year
  '2026-02-25', // EDSA People Power Anniversary
  '2026-04-02', // Maundy Thursday
  '2026-04-03', // Good Friday
  '2026-04-04', // Black Saturday
  '2026-04-09', // Araw ng Kagitingan
  '2026-05-01', // Labor Day
  '2026-06-12', // Independence Day
  '2026-06-17', // Eid'l Fitr (estimated)
  '2026-08-21', // Ninoy Aquino Day
  '2026-08-31', // National Heroes Day
  '2026-08-24', // Eid'l Adha (estimated)
  '2026-11-01', // All Saints' Day
  '2026-11-30', // Bonifacio Day
  '2026-12-08', // Feast of the Immaculate Conception
  '2026-12-24', // Christmas Eve
  '2026-12-25', // Christmas Day
  '2026-12-30', // Rizal Day
  '2026-12-31', // Last Day of the Year

  // ── 2027 ──
  '2027-01-01', // New Year's Day
  '2027-02-06', // Chinese New Year
  '2027-02-25', // EDSA People Power Anniversary
  '2027-03-25', // Maundy Thursday
  '2027-03-26', // Good Friday
  '2027-03-27', // Black Saturday
  '2027-04-09', // Araw ng Kagitingan
  '2027-05-01', // Labor Day
  '2027-06-07', // Eid'l Fitr (estimated)
  '2027-06-12', // Independence Day
  '2027-08-14', // Eid'l Adha (estimated)
  '2027-08-21', // Ninoy Aquino Day
  '2027-08-30', // National Heroes Day
  '2027-11-01', // All Saints' Day
  '2027-11-30', // Bonifacio Day
  '2027-12-08', // Feast of the Immaculate Conception
  '2027-12-24', // Christmas Eve
  '2027-12-25', // Christmas Day
  '2027-12-30', // Rizal Day
  '2027-12-31', // Last Day of the Year
]

const holidaySet = new Set(PH_HOLIDAYS)

/**
 * Returns true if the date is a weekend (Sat/Sun) or a Philippine holiday.
 */
export function isNonWorkingDay(date: Date): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return true // Weekend

  const dateStr = date.toISOString().split('T')[0]
  return holidaySet.has(dateStr)
}

/**
 * Predicts the OJT completion date.
 * @param remainingMinutes - minutes still needed
 * @param avgMinutesPerDay - average productive minutes per working day
 * @returns predicted completion Date, or null if not enough data
 */
export function predictEndDate(
  remainingMinutes: number,
  avgMinutesPerDay: number
): Date | null {
  if (avgMinutesPerDay <= 0 || remainingMinutes <= 0) return null

  let minutesLeft = remainingMinutes
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  // Safety cap: don't loop more than 2 years out
  const maxDays = 730
  let daysChecked = 0

  while (minutesLeft > 0 && daysChecked < maxDays) {
    cursor.setDate(cursor.getDate() + 1)
    daysChecked++

    if (isNonWorkingDay(cursor)) continue

    minutesLeft -= avgMinutesPerDay
  }

  return daysChecked >= maxDays ? null : cursor
}
