// -----------------------------------------------------------------------------
// The weekly days and hours of a market, and what they mean at an instant:
// held today, open now, until when, next market.
//
// A schedule is seven lists of slots `{ from, to }` in minutes since midnight,
// Monday first. The sources publish a weekly rhythm only: no exceptional
// closure, no public holiday rule. A public holiday is therefore not assumed
// closed (many markets keep their day), but the texts flag it so the user
// checks (src/service.js).
// -----------------------------------------------------------------------------

import { addDays, localTime, weekdayOf } from './clock.js';
import { isHoliday } from './holidays.js';

const DAY = 1440;
// The next market is looked for within a week and a day: every market of the
// sources is weekly.
export const SEARCH_DAYS = 8;

/** "08:30" or "08:30:00" → 510, or null. "24:00" is the end of the day. */
export function minutesOf(value) {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? '').trim());
  if (!match || Number(match[2]) > 59) {
    return null;
  }
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes <= DAY ? minutes : null;
}

/** Sorted slots, the overlapping or touching ones merged. */
function merge(slots) {
  const merged = [];
  for (const slot of [...slots].sort((a, b) => a.from - b.from)) {
    const last = merged.at(-1);
    if (last && slot.from <= last.to) {
      last.to = Math.max(last.to, slot.to);
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}

/**
 * Seven lists of slots (null for a held day whose hours are unreadable) as a
 * schedule; null when a day is unreadable or when the market is never held:
 * hours are never half-read nor guessed.
 */
export function weekOf(days) {
  if (days.length !== 7 || days.some((slots) => !Array.isArray(slots))) {
    return null;
  }
  if (days.every((slots) => slots.length === 0)) {
    return null;
  }
  return days.map(merge);
}

/** The slots of a calendar day. */
export const slotsOn = (schedule, date) => schedule[weekdayOf(date)];

/**
 * The state of a schedule at an instant.
 * @param {object[][]|null} schedule
 * @param {number} ms
 * @param {{ zone: string, department: string }} place
 * @returns {{
 *   known: boolean, open: boolean, minutesLeft: number|null, minutes: number,
 *   closing: { date: string, minutes: number }|null,
 *   next: { date: string, minutes: number, days: number, to: number }|null,
 *   today: { date: string, slots: object[], holiday: boolean },
 *   tomorrow: { date: string, slots: object[], holiday: boolean },
 * }}
 */
export function statusAt(schedule, ms, { zone, department }) {
  const { date, minutes } = localTime(ms, zone);
  const tomorrowDate = addDays(date, 1);
  const dayOf = (day) => ({
    date: day,
    slots: schedule ? slotsOn(schedule, day) : [],
    holiday: isHoliday(day, department),
  });
  const today = dayOf(date);
  const tomorrow = dayOf(tomorrowDate);
  if (!schedule) {
    return {
      known: false,
      open: false,
      minutesLeft: null,
      minutes,
      closing: null,
      next: null,
      today,
      tomorrow,
    };
  }
  const current = today.slots.find(({ from, to }) => minutes >= from && minutes < to) ?? null;
  let next = null;
  for (let offset = 0; offset <= SEARCH_DAYS && !next; offset += 1) {
    const day = addDays(date, offset);
    const slot = slotsOn(schedule, day).find(({ from }) => offset > 0 || from > minutes);
    if (slot) {
      next = { date: day, minutes: slot.from, to: slot.to, days: offset };
    }
  }
  return {
    known: true,
    open: Boolean(current),
    minutesLeft: current ? current.to - minutes : null,
    minutes,
    closing: current ? { date, minutes: current.to } : null,
    next,
    today,
    tomorrow,
  };
}
