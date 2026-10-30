// -----------------------------------------------------------------------------
// The integration end to end, against the SDK's fake Gladys and the real
// answers of the three sources captured on 2026-10-30.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import {
  HOUSE,
  MINUTE,
  action,
  at,
  create,
  createWorld,
  featureId,
  minutes,
  paris,
  setRecords,
  urlOf,
} from './helpers/world.js';

const lastState = (world, device, key) => {
  const id = featureId(device, key);
  const found = world.fake.states.filter((s) => s.device_feature_external_id === id).at(-1);
  return found ? (found.text ?? found.state) : undefined;
};
const fired = (world) => world.fake.sceneEvents.map((event) => event.key);
const names = (world) => world.fake.discoveredDevices.map((device) => device.name);

test('the food markets of the cities ticked are offered, with stable ids', async (t) => {
  const world = await createWorld({ config: { areas: ['strasbourg'], nearest_count: 0 } });
  t.after(() => world.app.stop());
  assert.equal(world.fake.discoveredDevices.length, 19);
  const neudorf = world.fake.discoveredDevices.find((d) => d.name === 'Marché Neudorf');
  assert.equal(neudorf.external_id, 'ext:test-integration:market:strasbourg-neud');
  assert.equal(neudorf.should_poll, false);
  assert.deepEqual(
    neudorf.params.map((p) => [p.name, p.value]),
    [
      ['market', 'strasbourg-neud'],
      ['city', 'Strasbourg'],
      ['address', 'Place du Marché Neudorf, Strasbourg'],
    ],
  );
  assert.deepEqual(
    neudorf.features.map((f) => f.name),
    [
      "Marché aujourd'hui",
      'Ouvert maintenant',
      "Fin aujourd'hui",
      'Prochain marché',
      'Jours de marché',
    ],
  );
  // Only the source needed is read.
  assert.deepEqual(
    world.network.calls.map((call) => call.url),
    [urlOf('strasbourg')],
  );
});

test('around a located house: the nearest markets within the distance, every source read', async (t) => {
  const world = await createWorld({ config: { areas: [], nearest_count: 3 }, houses: [HOUSE] });
  t.after(() => world.app.stop());
  assert.deepEqual(names(world), [
    'Marché Esparcette Bio',
    'Marché Victor Hugo',
    'Marché Saint Georges',
  ]);
  assert.equal(world.network.calls.length, 3);
  const message = await action(world, 'status');
  assert.match(message.fr, /les 3 marchés les plus proches à moins de 5 km/);
  assert.match(message.fr, /■ Toulouse : 45 marchés alimentaires/);
  // Paris and Strasbourg are read, but too far to matter.
  assert.doesNotMatch(message.fr, /Paris|Strasbourg/);
  assert.match(message.fr, /3 marchés dans l'onglet Découverte/);
});

test('without a located house nor a city: nothing offered, and the status says why', async (t) => {
  const world = await createWorld({
    config: { areas: [] },
    houses: [{ ...HOUSE, latitude: null, longitude: null }],
  });
  t.after(() => world.app.stop());
  assert.deepEqual(world.fake.discoveredDevices, []);
  assert.equal(world.network.calls.length, 0);
  const message = await action(world, 'status');
  assert.match(message.en, /The house has no location/);
  assert.match(message.en, /No city ticked/);
});

test('a market added: every state at once, in the configured language', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const victor = await create(world, 'Victor Hugo');
  // Friday 10:00.
  assert.equal(lastState(world, victor, 'today'), 1);
  assert.equal(lastState(world, victor, 'open'), 1);
  assert.equal(lastState(world, victor, 'ends'), '13:30');
  assert.equal(lastState(world, victor, 'next'), 'demain à 07:00');
  assert.equal(
    lastState(world, victor, 'days'),
    'mar. 07:00–13:30 · mer. 07:00–13:30 · jeu. 07:00–13:30 · ven. 07:00–13:30 · sam. 07:00–13:30 · dim. 07:00–13:30',
  );
  assert.ok(world.fake.widgetRefreshes.includes('today'));
  // Monday: no market today.
  await at(world, paris('2026-11-02 10:00'));
  assert.equal(lastState(world, victor, 'today'), 0);
  assert.equal(lastState(world, victor, 'open'), 0);
  assert.equal(lastState(world, victor, 'ends'), "Pas de marché aujourd'hui");
  assert.equal(lastState(world, victor, 'next'), 'demain à 07:00');
  // Public holiday: flagged, never assumed closed.
  await at(world, paris('2026-11-11 06:00'));
  assert.equal(lastState(world, victor, 'ends'), '13:30 (jour férié : à vérifier)');
  assert.equal(lastState(world, victor, 'next'), "aujourd'hui à 07:00 (jour férié : à vérifier)");
});

test('the triggers: opens, ends soon, market tomorrow; none after a gap', async (t) => {
  const world = await createWorld({ config: { areas: ['toulouse'], evening_hour: 19 } });
  t.after(() => world.app.stop());
  // Arnaud Bernard: Wednesday 16:00–20:00, Saturday 07:30–13:30.
  const arnaud = await create(world, 'Arnaud Bernard');
  await at(world, paris('2026-11-04 15:58'));
  await minutes(world, 3);
  assert.deepEqual(fired(world), ['opened']);
  assert.deepEqual(world.fake.sceneEvents[0].data, {
    market: arnaud.external_id,
    market_name: 'Marché Arnaud Bernard',
    starts_at: '16:00',
    ends_at: '20:00',
    minutes_left: 240,
  });
  await at(world, paris('2026-11-04 19:29'));
  await minutes(world, 2);
  assert.deepEqual(fired(world), ['opened', 'closing_soon']);
  assert.equal(world.fake.sceneEvents[1].data.minutes_left, 30);
  // Friday 18:59 → 19:00: a market on Saturday.
  await at(world, paris('2026-11-06 18:59'));
  await minutes(world, 1);
  assert.deepEqual(fired(world).at(-1), 'market_tomorrow');
  assert.deepEqual(world.fake.sceneEvents.at(-1).data, {
    market: arnaud.external_id,
    market_name: 'Marché Arnaud Bernard',
    starts_at: '07:30',
    ends_at: '13:30',
    minutes_left: 0,
  });
  // Thursday evening: no market on Friday, nothing.
  const count = world.fake.sceneEvents.length;
  await at(world, paris('2026-11-05 18:59'));
  await minutes(world, 2);
  assert.equal(world.fake.sceneEvents.length, count);
  // The host slept through the opening: no stale "opened".
  await at(world, paris('2026-11-07 07:00'));
  world.clock.advance(10 * MINUTE);
  await world.service.tick();
  assert.equal(world.fake.sceneEvents.length, count);
});

test('a market whose hours become unreadable keeps its device, without binary states', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const victor = await create(world, 'Victor Hugo');
  setRecords(world, 'toulouse', (r) => r.nom === 'VICTOR HUGO', { mardi: '1er du mois' });
  await world.service.refresh();
  assert.ok(!world.fake.discoveredDevices.some((d) => d.name === 'Marché Victor Hugo'));
  const before = world.fake.states.length;
  await minutes(world, 1);
  const after = world.fake.states.slice(before).map((s) => s.device_feature_external_id);
  assert.ok(!after.includes(featureId(victor, 'open')));
  assert.equal(lastState(world, victor, 'ends'), 'Horaires illisibles');
});

test('a market added from another city is read anyway', async (t) => {
  const world = await createWorld({ config: { areas: ['paris'], nearest_count: 0 } });
  t.after(() => world.app.stop());
  const charonne = await create(world, 'Charonne');
  await world.fake.configUpdated({ areas: ['toulouse'], nearest_count: 0 });
  await world.service.refresh();
  assert.ok(world.network.calls.filter((c) => c.url === urlOf('paris')).length >= 2);
  assert.equal(lastState(world, charonne, 'next'), 'demain à 07:00');
});

test('the scene action markets_today: around the house, or the markets added', async (t) => {
  const world = await createWorld({ config: { areas: [], nearest_count: 3 }, houses: [HOUSE] });
  t.after(() => world.app.stop());
  const result = await world.fake.sceneAction('markets_today', {});
  assert.equal(result.success, true);
  const { outputs } = result.data;
  assert.equal(outputs.markets_count, 10);
  assert.equal(outputs.open_count, 8);
  assert.match(
    outputs.sentence,
    /^Marchés aujourd'hui près de chez vous : Marché Victor Hugo \(07:00–13:30, ouvert, 0,3 km\), /,
  );
  assert.match(outputs.sentence, /Marché Ponts Jumeaux \(16:00–20:00, 2,2 km\)/);

  // No house: the markets added to Gladys, by the name given in Gladys.
  const other = await createWorld({ config: { areas: ['toulouse'], nearest_count: 0 } });
  t.after(() => other.app.stop());
  const arnaud = await create(other, 'Arnaud Bernard');
  await create(other, 'Victor Hugo');
  await other.fake.deviceUpdated({ ...arnaud, name: 'Arnaud' });
  let answer = await other.fake.sceneAction('markets_today', {});
  assert.equal(
    answer.data.outputs.sentence,
    "Vos marchés aujourd'hui : Marché Victor Hugo (07:00–13:30, ouvert).",
  );
  await at(other, paris('2026-11-04 17:00'));
  answer = await other.fake.sceneAction('markets_today', {});
  assert.equal(answer.data.outputs.markets_count, 2);
  assert.match(answer.data.outputs.sentence, /Arnaud \(16:00–20:00, ouvert\)/);

  // Neither: a clear error.
  const none = await createWorld({ config: { areas: [] } });
  t.after(() => none.app.stop());
  const failed = await none.fake.sceneAction('markets_today', {});
  assert.equal(failed.success, false);
  assert.match(failed.error, /Localisez la maison/);
});

test('the widget: today around the house, colors, distance hidden, validated content', async (t) => {
  const world = await createWorld({ config: { areas: [], nearest_count: 0 }, houses: [HOUSE] });
  t.after(() => world.app.stop());
  await at(world, paris('2026-10-30 13:10'));
  const content = (await world.fake.widgetGet('today', { language: 'fr' })).data.content;
  assert.deepEqual(validateWidgetContent(content).errors ?? [], []);
  const rows = content.components[0].items;
  assert.equal(rows.length, 10);
  assert.deepEqual(rows[0], {
    label: 'Marché Victor Hugo',
    value: 'finit dans 20 min · 0,3 km',
    color: 'warning',
  });
  const later = rows.find((row) => row.label === 'Marché Ponts Jumeaux');
  assert.deepEqual(later, {
    label: 'Marché Ponts Jumeaux',
    value: 'à partir de 16:00 · 2,2 km',
    color: 'info',
  });
  const hidden = (
    await world.fake.widgetGet('today', { language: 'en', settings: { show_distance: false } })
  ).data.content;
  assert.equal(hidden.components[0].items[0].value, 'ends in 20 min');
  await at(world, paris('2026-10-30 21:00'));
  const evening = (await world.fake.widgetGet('today', { language: 'de' })).data.content;
  assert.equal(evening.components[0].items[0].value, 'beendet um 13:30 · 0,3 km');
  assert.equal(evening.components[0].items[0].color, 'neutral');
  // A house far from every source: nothing today.
  const far = await createWorld({
    config: { areas: [], max_distance: 1 },
    houses: [{ ...HOUSE, latitude: 45.76, longitude: 4.83 }],
  });
  t.after(() => far.app.stop());
  const empty = (await far.fake.widgetGet('today', { language: 'fr' })).data.content;
  assert.deepEqual(empty.components, [
    { type: 'text', text: "Pas de marché aujourd'hui autour de la maison." },
  ]);
});

test('a source down keeps the markets of the last read, and is read again an hour later', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const victor = await create(world, 'Victor Hugo');
  world.network.routes[urlOf('toulouse')] = 503;
  await world.service.refresh();
  assert.equal(world.service.failing, true);
  await minutes(world, 1);
  assert.equal(lastState(world, victor, 'open'), 1);
  const message = await action(world, 'status');
  assert.match(message.en, /Toulouse: unavailable \(data\.toulouse-metropole\.fr: HTTP 503\)/);
});

test('an empty or truncated answer is a failure: the markets of the last read are kept', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  world.network.routes[urlOf('toulouse')] = { total_count: 0, results: [] };
  await world.service.refresh();
  assert.equal(world.service.markets.size, 45);
  world.network.routes[urlOf('toulouse')] = { total_count: 150, results: [{ nom: 'X' }] };
  await world.service.refresh();
  assert.equal(world.service.markets.size, 45);
  assert.equal(world.service.failing, true);
});

test('the language of the configuration changes the texts, not the frozen names', async (t) => {
  const world = await createWorld();
  t.after(() => world.app.stop());
  const victor = await create(world, 'Victor Hugo');
  await world.fake.configUpdated({ areas: ['toulouse'], nearest_count: 0, language: 'es' });
  await world.app.ready;
  await world.service.refresh();
  assert.equal(lastState(world, victor, 'next'), 'mañana a las 07:00');
  assert.equal(victor.features[0].name, "Marché aujourd'hui");
});

test('a dataset larger than one page is read page by page', async (t) => {
  const world = await createWorld({ connect: false });
  t.after(() => world.app.stop());
  const all = world.network.routes[urlOf('toulouse')].results;
  world.network.routes[urlOf('toulouse')] = { total_count: 150, results: all.slice(0, 40) };
  world.network.routes[`${urlOf('toulouse')}&offset=100`] = {
    total_count: 150,
    results: all.slice(40),
  };
  // 40 + 18 of the 150 announced: still short, a failure.
  await world.gladys.connect();
  await world.app.ready;
  await world.service.loading;
  assert.equal(world.service.failing, true);
  world.network.routes[urlOf('toulouse')] = { total_count: 58, results: all.slice(0, 40) };
  world.network.routes[`${urlOf('toulouse')}&offset=100`] = { total_count: 58, results: [] };
  await world.service.refresh();
  assert.equal(world.service.failing, true);
});

test('a house located after the start is found by the widget, without waiting a day', async (t) => {
  const world = await createWorld({ config: { areas: [], nearest_count: 3 } });
  t.after(() => world.app.stop());
  assert.equal(world.network.calls.length, 0);
  // The user sets the location of the house in Gladys.
  world.fake.houses.push(structuredClone(HOUSE));
  const content = (await world.fake.widgetGet('today', { language: 'fr' })).data.content;
  assert.equal(content.components[0].items.length, 10);
  assert.equal(world.network.calls.length, 3);
});

test('around the house, a market added farther away is kept after the near ones', async (t) => {
  const world = await createWorld({
    config: { areas: ['paris'], nearest_count: 0, max_distance: 1 },
    houses: [HOUSE],
  });
  t.after(() => world.app.stop());
  // Wednesday: Charonne (Paris) is held, 590 km from the house in Toulouse.
  await at(world, paris('2026-11-04 09:00'));
  await create(world, 'Charonne');
  const answer = await world.fake.sceneAction('markets_today', {});
  assert.match(
    answer.data.outputs.sentence,
    /Marché Charonne \(07:00–13:30, ouvert, 5\d\d km\)\.$/,
  );
});

test('a city far from the house that fails is not read again every hour', async (t) => {
  const world = await createWorld({ config: { areas: [], nearest_count: 3 }, houses: [HOUSE] });
  t.after(() => world.app.stop());
  world.network.routes[urlOf('strasbourg')] = 503;
  await world.service.refresh();
  assert.equal(world.service.failing, false);
  const message = await action(world, 'status');
  assert.doesNotMatch(message.en, /Strasbourg/);
  world.network.routes[urlOf('toulouse')] = 503;
  await world.service.refresh();
  assert.equal(world.service.failing, true);
});
