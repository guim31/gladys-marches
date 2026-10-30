// -----------------------------------------------------------------------------
// The days and hours of the markets: the three formats of the sources, read
// from their real answers (2026-10-30), and what they mean at an instant.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusAt, weekOf } from '../src/hours.js';
import { SOURCES, parseFrenchRange, slug, titleCase } from '../src/sources.js';
import { fixtureJson, paris } from './helpers/world.js';

const marketsOf = (id) => {
  const source = SOURCES.find((s) => s.id === id);
  return source.toMarkets(source, fixtureJson(`${id}.json`).results);
};
const find = (id, key) => marketsOf(id).find((market) => market.key === key);
const PLACE = { zone: 'Europe/Paris', department: '31' };

test('the French ranges of Toulouse and Strasbourg', () => {
  assert.deepEqual(parseFrenchRange('07h30 - 13h30'), { from: 450, to: 810 });
  assert.deepEqual(parseFrenchRange('7h-14h'), { from: 420, to: 840 });
  assert.deepEqual(parseFrenchRange('16h00 – 20h00'), { from: 960, to: 1200 });
  assert.deepEqual(parseFrenchRange('De 7h à 13h'), { from: 420, to: 780 });
  assert.deepEqual(parseFrenchRange('07h00 - 19h'), { from: 420, to: 1140 });
  // Never guessed: a season, a monthly rhythm, a range backwards.
  assert.equal(parseFrenchRange('7h-19h30 été'), null);
  assert.equal(parseFrenchRange('1er du mois'), null);
  assert.equal(parseFrenchRange('13h-7h'), null);
});

test('a week with an unreadable held day, or never held, is unreadable', () => {
  assert.equal(weekOf([[], [], null, [], [], [], []]), null);
  assert.equal(weekOf([[], [], [], [], [], [], []]), null);
  assert.deepEqual(
    weekOf([
      [
        { from: 600, to: 700 },
        { from: 420, to: 610 },
      ],
      [],
      [],
      [],
      [],
      [],
      [],
    ])[0],
    [{ from: 420, to: 700 }],
  );
});

test('Paris: one pair of hours for weekdays, one for Saturday, one for Sunday; food only', () => {
  const markets = marketsOf('paris');
  // 80 records, of which 8 flower, flea, art and stamp markets.
  assert.equal(markets.length, 72);
  const charonne = find('paris', 'paris-16');
  assert.equal(charonne.name, 'Marché Charonne');
  assert.equal(charonne.city, 'Paris 11e');
  assert.deepEqual(charonne.schedule[2], [{ from: 420, to: 810 }]);
  assert.deepEqual(charonne.schedule[5], [{ from: 420, to: 870 }]);
  assert.deepEqual(charonne.schedule[0], []);
  assert.equal(find('paris', 'paris-84').kind, 'organic');
  // Wednesday afternoon, Saturday morning: two pairs of the same market.
  assert.deepEqual(find('paris', 'paris-84').schedule[2], [{ from: 600, to: 1200 }]);
  assert.ok(!markets.some((market) => /fleurs|puces|timbres/i.test(market.name)));
});

test('Toulouse: food markets by type, the name as id, odd postcodes left out', () => {
  const markets = marketsOf('toulouse');
  assert.equal(markets.length, 45);
  const arnaud = find('toulouse', 'toulouse-arnaud-bernard');
  assert.equal(arnaud.name, 'Marché Arnaud Bernard');
  assert.equal(arnaud.address, 'Place Arnaud-Bernard, 31000 Toulouse');
  assert.deepEqual(arnaud.schedule[2], [{ from: 960, to: 1200 }]);
  assert.deepEqual(arnaud.schedule[5], [{ from: 450, to: 810 }]);
  assert.equal(find('toulouse', 'toulouse-carmes').kind, 'covered');
  assert.equal(find('toulouse', 'toulouse-esparcette-bio').kind, 'organic');
  // -9999 for a postcode: no number shown.
  assert.equal(find('toulouse', 'toulouse-arenes').address, 'Place E. Male Toulouse');
  assert.equal(find('toulouse', 'toulouse-marche-de-l-hers').name, "Marché de l'Hers");
  // Books, flea markets, flowers and the second-hand corner are not food.
  for (const key of ['feuga-bouquinistes', 'brocante-saint-aubin', 'jeanne-d-arc']) {
    assert.equal(find('toulouse', `toulouse-${key}`), undefined, key);
  }
});

test('Strasbourg: one record per day, grouped by market code', () => {
  const markets = marketsOf('strasbourg');
  // 37 records: 19 food markets, books, flowers, flea and crafts left out.
  assert.equal(markets.length, 19);
  const neudorf = find('strasbourg', 'strasbourg-neud');
  assert.equal(neudorf.name, 'Marché Neudorf');
  assert.equal(neudorf.address, 'Place du Marché Neudorf, Strasbourg');
  assert.deepEqual(
    neudorf.schedule.map((slots) => slots.length),
    [0, 1, 0, 0, 0, 1, 0],
  );
  assert.deepEqual(neudorf.schedule[1], [{ from: 420, to: 780 }]);
  assert.equal(find('strasbourg', 'strasbourg-prod').name, 'Marché des producteurs');
  assert.deepEqual(find('strasbourg', 'strasbourg-cill').schedule[2], [{ from: 840, to: 1080 }]);
});

test('names and ids', () => {
  assert.equal(titleCase("MARCHÉ JEANNE D'ARC"), "Marché Jeanne d'Arc");
  assert.equal(slug('Saint  Étienne'), 'saint-etienne');
});

test('held today, open, until when, next market at an instant', () => {
  const victor = find('toulouse', 'toulouse-victor-hugo').schedule;
  // Friday 30 October 2026, 10:00: open until 13:30, next one tomorrow.
  let status = statusAt(victor, paris('2026-10-30 10:00'), PLACE);
  assert.equal(status.open, true);
  assert.equal(status.minutesLeft, 210);
  assert.deepEqual(status.closing, { date: '2026-10-30', minutes: 810 });
  assert.deepEqual(status.next, { date: '2026-10-31', minutes: 420, to: 810, days: 1 });
  // Sunday 14:00: over; no market on Monday, the next one on Tuesday.
  status = statusAt(victor, paris('2026-11-01 14:00'), PLACE);
  assert.equal(status.open, false);
  assert.equal(status.today.slots.length, 1);
  assert.equal(status.today.holiday, true);
  assert.equal(status.tomorrow.slots.length, 0);
  assert.deepEqual(status.next, { date: '2026-11-03', minutes: 420, to: 810, days: 2 });
  // Before it starts: the next one is today.
  status = statusAt(victor, paris('2026-10-30 06:00'), PLACE);
  assert.equal(status.open, false);
  assert.equal(status.next.days, 0);
  // Unknown hours: nothing claimed.
  status = statusAt(null, paris('2026-10-30 10:00'), PLACE);
  assert.equal(status.known, false);
  assert.equal(status.open, false);
});

test('summer time: the hours are Paris wall-clock hours', () => {
  const victor = find('toulouse', 'toulouse-victor-hugo').schedule;
  // 2026-07-03, a Friday: 05:30 UTC is 07:30 in Paris (UTC+2).
  const status = statusAt(victor, Date.UTC(2026, 6, 3, 5, 30), PLACE);
  assert.equal(status.open, true);
  assert.equal(status.minutesLeft, 360);
});
