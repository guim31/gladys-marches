// -----------------------------------------------------------------------------
// The integration at runtime: the sources read, the markets offered in the
// Discover tab, the states of the markets added to Gladys, the markets of the
// day around the house, and the scene triggers.
//
// Two paces:
// - the sources are read once a day (one request each; the days change a few
//   times a year), an hour later after a failure. Only the sources needed:
//   the cities ticked, the ones of the markets added, and all three when the
//   house is located (the markets around it);
// - every minute, held today, open or not is computed from the days kept,
//   without any request: states, triggers, widget.
// -----------------------------------------------------------------------------

import { createLogger } from '@gladysassistant/integration-sdk';
import { hhmm, weekdayOf } from './clock.js';
import { DEFAULT_CONFIG, normalizeConfig } from './config.js';
import { MARKET_TYPE, buildMarketDevice, marketStates } from './devices.js';
import { statusAt } from './hours.js';
import { REPORTS, SHORT_WEEKDAYS, TEXT, WEEKDAYS, lines, render, say } from './messages.js';
import { SOURCES, distanceKm, readSource, sourceOf } from './sources.js';

const logger = createLogger({ name: 'marches' });

// Unchanged states (no market all week) are sent again this often, or the
// dashboard shows "no recent value" after 48 hours.
export const HEARTBEAT_MS = 6 * 3600 * 1000;
export const TICK_MS = 60 * 1000;
export const READ_MS = 24 * 3600 * 1000;
// A failed read is tried again sooner.
export const RETRY_MS = 3600 * 1000;
// Two evaluations further apart than this (the host slept, Gladys was down)
// fire no trigger: the change is no longer news.
export const MAX_GAP_MS = 5 * 60 * 1000;
// The widget turns orange in the last half-hour.
export const CLOSING_SOON_MINUTES = 30;
// Markets of the day in the widget and the scene sentence.
export const MAX_AROUND = 10;

export const TRIGGERS = {
  OPENED: 'opened',
  CLOSING_SOON: 'closing_soon',
  MARKET_TOMORROW: 'market_tomorrow',
};
export const WIDGET_KEY = 'today';

const NUMBER_LOCALES = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES' };

/** The source of a market key (`paris-16` → `paris`). */
const sourceIdOf = (key) => SOURCES.find((source) => key.startsWith(`${source.id}-`))?.id ?? null;

/** "07:00–13:30, 16:00–20:00". */
const slotsText = (slots) => slots.map(({ from, to }) => `${hhmm(from)}–${hhmm(to)}`).join(', ');

export class Markets {
  /**
   * @param {object} options
   * @param {object} options.gladys GladysIntegration (or the SDK's fake)
   * @param {typeof fetch} [options.fetch]
   * @param {() => number} [options.now]
   * @param {boolean} [options.timers] false in the tests: they call refresh() and tick()
   */
  constructor({ gladys, fetch = globalThis.fetch, now = Date.now, timers = true }) {
    this.gladys = gladys;
    this.fetch = fetch;
    this.now = now;
    this.useTimers = timers;
    this.config = normalizeConfig(DEFAULT_CONFIG);
    this.markets = new Map(); // market key → market
    this.areas = new Map(); // source id → { okAt, error, keys }
    this.house = null; // { lat, lon } of the first located house
    this.houseError = false;
    this.views = new Map(); // device external id → last evaluation
    this.okAt = null;
    this.failing = false;
    this.discoveredSignature = null;
    this.publishFailed = false;
    this.discoveryFailed = false;
    this.fireFailed = false;
    this.refreshTimer = null;
    this.tickTimer = null;
    this.stopped = false;
    this.refreshing = null;
    this.loading = Promise.resolve();
  }

  // --- lifecycle --------------------------------------------------------------

  async start(config) {
    this.config = config;
    logger.info(
      `Started: ${config.areas.length} city(ies), ${config.nearestCount} nearest market(s), ${this.watched().length} market(s) added`,
    );
    this.scheduleTicks();
    // The first reading in the background: the widget and the scene action
    // wait for it.
    this.loading = this.refresh({ discover: true });
  }

  /** Gladys restarted: everything again, the states included. */
  async resync(config) {
    this.config = config;
    this.gladys.forgetPublishedStates?.();
    await this.refresh({ discover: true });
  }

  async reconfigure(config) {
    const languageChanged = config.language !== this.config.language;
    this.config = config;
    if (languageChanged) {
      // The texts follow the language.
      this.gladys.forgetPublishedStates?.();
    }
    await this.refresh({ discover: true });
  }

  async stop() {
    this.stopped = true;
    clearTimeout(this.refreshTimer);
    clearTimeout(this.tickTimer);
    await this.refreshing;
  }

  /** The next read: a day later, or an hour after a failure. */
  scheduleRefresh() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.refresh(), this.failing ? RETRY_MS : READ_MS);
    this.refreshTimer.unref?.();
  }

  /** The clock: one evaluation a few seconds after every minute. */
  scheduleTicks() {
    if (!this.useTimers || this.stopped) {
      return;
    }
    const delay = TICK_MS - (this.now() % TICK_MS) + 2000;
    this.tickTimer = setTimeout(async () => {
      try {
        await this.tick();
      } catch (err) {
        // Never let one bad evaluation stop the clock.
        logger.warn(`Evaluation failed: ${err.message}`);
      } finally {
        this.scheduleTicks();
      }
    }, delay);
    this.tickTimer.unref?.();
  }

  // --- devices ----------------------------------------------------------------

  /** The market key of a device created in Gladys, from its params or its external id. */
  marketKeyOf(device) {
    const param = device?.params?.find?.((p) => p.name === 'market')?.value;
    if (param) {
      return String(param);
    }
    const id = String(device?.external_id ?? '');
    const marker = `:${MARKET_TYPE}:`;
    return id.includes(marker) ? id.slice(id.lastIndexOf(marker) + marker.length) : null;
  }

  /** The markets added to Gladys: `{ deviceId, key, name }[]`, in the order of Gladys. */
  watched() {
    return (this.gladys.devices ?? [])
      .map((device) => ({
        deviceId: device.external_id,
        key: this.marketKeyOf(device),
        name: device.name,
      }))
      .filter((entry) => entry.key && sourceIdOf(entry.key));
  }

  /** The market of a device: `{ watched, market }`, market null when not read yet. */
  lookup(deviceId) {
    const watched = this.watched().find((w) => w.deviceId === deviceId);
    if (!watched) {
      return null;
    }
    return { watched, market: this.markets.get(watched.key) ?? null };
  }

  /** Waits for the first reading (at most `ms`), for a widget or a scene action asked at start. */
  async firstReading(ms = 10000) {
    let timer;
    await Promise.race([
      this.loading,
      new Promise((resolve) => {
        timer = setTimeout(resolve, ms);
      }),
    ]);
    clearTimeout(timer);
  }

  refreshWidget() {
    this.gladys.requestWidgetRefresh?.(WIDGET_KEY)?.catch?.(() => {});
  }

  /** A device was just added in Gladys: its states, all of them, now. */
  async onDeviceCreated(device) {
    const found = this.lookup(device?.external_id);
    if (found?.market) {
      const view = this.view(found.market);
      this.views.set(found.watched.deviceId, view);
      await this.publish(marketStates(this.gladys, found.market, view));
    } else if (found) {
      // Its source not read yet: read it now.
      await this.refresh();
    }
    this.refreshWidget();
  }

  /** Markets with readable days around the house, nearest first: `{ market, km }[]`. */
  nearby() {
    if (!this.house) {
      return [];
    }
    return [...this.markets.values()]
      .filter((market) => market.schedule && market.lat !== null && market.lon !== null)
      .map((market) => ({ market, km: distanceKm(this.house, market) }))
      .filter(({ km }) => km <= this.config.maxDistanceKm)
      .sort((a, b) => a.km - b.km);
  }

  /** The markets offered in the Discover tab: the cities ticked, then the nearest ones. */
  offered() {
    const offered = new Map();
    for (const area of this.config.areas) {
      for (const key of this.areas.get(area)?.keys ?? []) {
        const market = this.markets.get(key);
        if (market?.schedule) {
          offered.set(key, market);
        }
      }
    }
    if (this.config.nearestCount > 0) {
      for (const { market } of this.nearby().slice(0, this.config.nearestCount)) {
        offered.set(market.key, market);
      }
    }
    return [...offered.values()];
  }

  async publishDiscovered({ force = false } = {}) {
    const devices = this.offered().map((market) =>
      buildMarketDevice(this.gladys, market, this.config.language),
    );
    const signature = JSON.stringify(devices.map((d) => [d.external_id, d.name, d.features]));
    if (!force && signature === this.discoveredSignature) {
      return;
    }
    try {
      await this.gladys.publishDiscoveredDevices(devices);
      this.discoveredSignature = signature;
      if (this.discoveryFailed) {
        this.discoveryFailed = false;
        logger.info('Discovered markets published again');
      }
    } catch (err) {
      if (!this.discoveryFailed) {
        logger.warn(`Cannot publish the discovered markets: ${err.message}`);
      }
      this.discoveryFailed = true;
    }
  }

  async publish(states) {
    if (states.length === 0) {
      return;
    }
    try {
      await this.gladys.publishChangedStates(states, { heartbeat: HEARTBEAT_MS });
      if (this.publishFailed) {
        this.publishFailed = false;
        logger.info('States published again');
      }
    } catch (err) {
      // Gladys restarting: said once, the next tick sends them again.
      if (!this.publishFailed) {
        logger.warn(`Cannot publish ${states.length} state(s): ${err.message}`);
      }
      this.publishFailed = true;
    }
  }

  // --- reading the sources ----------------------------------------------------

  /** One read; concurrent calls share it. */
  refresh({ discover = false } = {}) {
    if (!this.refreshing) {
      this.refreshing = this.readAll(discover)
        .catch((err) => logger.warn(`Refresh failed: ${err.message}`))
        .finally(() => {
          this.refreshing = null;
          this.scheduleRefresh();
        });
      return this.refreshing;
    }
    // A discovery asked during a read (cities just changed) reads again right
    // after it: the running one may not include them.
    return discover ? this.refreshing.then(() => this.refresh({ discover })) : this.refreshing;
  }

  /** The house location: the nearest markets and the markets of the day around it. */
  async readHouse() {
    try {
      const houses = await this.gladys.getHouses();
      const located = (houses ?? []).find(
        (h) => Number.isFinite(h?.latitude) && Number.isFinite(h?.longitude),
      );
      this.house = located ? { lat: located.latitude, lon: located.longitude } : null;
      this.houseError = false;
    } catch (err) {
      if (!this.houseError) {
        logger.warn(`Cannot read the location of the house: ${err.message}`);
      }
      this.houseError = true;
    }
  }

  /** The sources to read: cities ticked, markets added, all of them around a located house. */
  neededSources() {
    const wanted = new Set(this.config.areas);
    for (const { key } of this.watched()) {
      wanted.add(sourceIdOf(key));
    }
    if (this.house) {
      SOURCES.forEach((source) => wanted.add(source.id));
    }
    return SOURCES.filter((source) => wanted.has(source.id));
  }

  async readAll(forceDiscovery) {
    await this.readHouse();
    const failures = [];
    for (const source of this.neededSources()) {
      const area = this.areas.get(source.id) ?? { okAt: null, error: null, keys: [] };
      this.areas.set(source.id, area);
      try {
        const markets = await readSource(this.fetch, source);
        for (const key of area.keys) {
          this.markets.delete(key);
        }
        for (const market of markets) {
          this.markets.set(market.key, market);
        }
        area.keys = markets.map((market) => market.key);
        area.okAt = this.now();
        if (area.error) {
          logger.info(`${source.name} back`);
        }
        area.error = null;
        logger.debug(`${source.name}: ${markets.length} market(s) read`);
      } catch (err) {
        // Kept: the markets of the last good read.
        if (!area.error) {
          logger.warn(`${source.name} unavailable: ${err.message}`);
        }
        area.error = err.message;
        failures.push(source.id);
      }
    }
    this.failing = failures.length > 0;
    if (!this.failing) {
      this.okAt = this.now();
    }
    await this.publishDiscovered({ force: forceDiscovery });
    await this.tick();
    this.refreshWidget();
  }

  // --- the clock --------------------------------------------------------------

  /** "tomorrow at 07:00" for a `next` of statusAt, in a language. */
  whenText(next, language) {
    const time = hhmm(next.minutes);
    if (next.days === 0) {
      return say(TEXT, language, 'today', { time });
    }
    if (next.days === 1) {
      return say(TEXT, language, 'tomorrow', { time });
    }
    return say(TEXT, language, 'weekday', { day: WEEKDAYS[language][weekdayOf(next.date)], time });
  }

  /** "mer. 07:00–13:30 · sam. 07:00–14:30". */
  daysText(schedule, language) {
    return schedule
      .map((slots, day) =>
        slots.length ? `${SHORT_WEEKDAYS[language][day]} ${slotsText(slots)}` : '',
      )
      .filter(Boolean)
      .join(' · ');
  }

  /** What a market is at the current minute, with its texts. */
  view(market, language = this.config.language) {
    const status = statusAt(market.schedule, this.now(), market);
    const { today } = status;
    const heldToday = today.slots.length > 0;
    const holiday = heldToday && today.holiday ? ` (${say(TEXT, language, 'holidayCheck')})` : '';
    let ends;
    let next;
    let days;
    if (!status.known) {
      ends = say(TEXT, language, 'noHours');
      next = say(TEXT, language, 'unknown');
      days = say(TEXT, language, 'noHours');
    } else {
      ends = heldToday
        ? `${hhmm(today.slots.at(-1).to)}${holiday}`
        : say(TEXT, language, 'noMarketToday');
      next = status.next ? this.whenText(status.next, language) : say(TEXT, language, 'noNext');
      if (status.next?.days === 0 && holiday) {
        next += holiday;
      }
      days = this.daysText(market.schedule, language);
    }
    return {
      ...status,
      heldToday,
      // Triggers only compare two evaluations of the same days.
      signature: market.signature,
      at: this.now(),
      ends,
      next,
      days,
      nextStatus: status.next,
    };
  }

  /** One evaluation of every market added: states, then triggers. */
  async tick() {
    const states = [];
    const events = [];
    const alive = new Set();
    for (const watched of this.watched()) {
      const market = this.markets.get(watched.key);
      if (!market) {
        continue;
      }
      alive.add(watched.deviceId);
      const view = this.view(market);
      states.push(...marketStates(this.gladys, market, view));
      events.push(...this.events(watched, this.views.get(watched.deviceId), view));
      this.views.set(watched.deviceId, view);
    }
    for (const deviceId of [...this.views.keys()]) {
      if (!alive.has(deviceId)) {
        this.views.delete(deviceId);
      }
    }
    await this.publish(states);
    for (const { key, data } of events) {
      await this.fire(key, data);
    }
    if (events.length > 0) {
      this.refreshWidget();
    }
  }

  /** The trigger events of a market between two evaluations. */
  events(watched, before, after) {
    if (
      !before ||
      !before.known ||
      !after.known ||
      before.signature !== after.signature ||
      after.at - before.at > MAX_GAP_MS
    ) {
      return [];
    }
    const data = (slots, minutesLeft = 0) => ({
      market: watched.deviceId,
      market_name: watched.name ?? '',
      starts_at: slots.length ? hhmm(slots[0].from) : '',
      ends_at: slots.length ? hhmm(slots.at(-1).to) : '',
      minutes_left: minutesLeft,
    });
    const events = [];
    const current = (view) =>
      view.today.slots.filter(({ from, to }) => view.minutes >= from && view.minutes < to);
    if (!before.open && after.open) {
      events.push({ key: TRIGGERS.OPENED, data: data(current(after), after.minutesLeft) });
    }
    const notice = this.config.closingNotice;
    if (
      after.open &&
      after.minutesLeft <= notice &&
      // Crossing the notice, or opening for less than it (a short slot).
      (!before.open ||
        before.minutesLeft > notice ||
        before.closing?.minutes !== after.closing.minutes)
    ) {
      events.push({ key: TRIGGERS.CLOSING_SOON, data: data(current(after), after.minutesLeft) });
    }
    // The evening before a market day, at the hour of the configuration.
    const evening = this.config.eveningHour * 60;
    if (
      before.today.date === after.today.date &&
      before.minutes < evening &&
      after.minutes >= evening &&
      after.tomorrow.slots.length > 0
    ) {
      events.push({ key: TRIGGERS.MARKET_TOMORROW, data: data(after.tomorrow.slots) });
    }
    return events;
  }

  async fire(key, data) {
    try {
      await this.gladys.publishSceneEvent(key, data);
      if (this.fireFailed) {
        this.fireFailed = false;
        logger.info('Scene triggers fired again');
      }
    } catch (err) {
      if (!this.fireFailed) {
        logger.warn(`Cannot fire the ${key} trigger: ${err.message}`);
      }
      this.fireFailed = true;
    }
  }

  // --- the markets of the day ---------------------------------------------------

  /**
   * The markets held today: around the located house (nearest first, within
   * the distance of the configuration), or else the markets added to Gladys.
   * @returns {{ around: boolean, entries: { market, name, km }[] }|null} null
   *   without a located house nor any market added
   */
  marketsToday() {
    const names = new Map(this.watched().map((entry) => [entry.key, entry.name]));
    let entries;
    let around = true;
    if (this.house) {
      entries = this.nearby();
    } else if (names.size > 0) {
      around = false;
      entries = [...names.keys()]
        .map((key) => this.markets.get(key))
        .filter((market) => market?.schedule)
        .map((market) => ({ market, km: null }));
    } else {
      return null;
    }
    const today = entries
      .map((entry) => ({ ...entry, view: this.view(entry.market) }))
      .filter(({ view }) => view.heldToday)
      .slice(0, MAX_AROUND)
      // The name given in Gladys for a market added, else the source's.
      .map((entry) => ({ ...entry, name: names.get(entry.market.key) || entry.market.name }));
    return { around, entries: today };
  }

  /** "1.2 km" in the number format of a language. */
  kmText(km, language) {
    const value = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
    return `${value.toLocaleString(NUMBER_LOCALES[language])} km`;
  }

  /** "ouvert jusqu'à 13:30", "à partir de 16:00", "terminé à 13:30": a widget row (40 characters). */
  rowText(view, language) {
    if (view.open) {
      return view.minutesLeft <= CLOSING_SOON_MINUTES
        ? say(TEXT, language, 'closesIn', { minutes: view.minutesLeft })
        : say(TEXT, language, 'openUntil', { time: hhmm(view.closing.minutes) });
    }
    const later = view.today.slots.find(({ from }) => from > view.minutes);
    if (later) {
      return say(TEXT, language, 'startsAt', { time: hhmm(later.from) });
    }
    return say(TEXT, language, 'ended', { time: hhmm(view.today.slots.at(-1).to) });
  }

  /** "Marché Charonne (07:00–13:30, ouvert, 1,2 km)", one market of the scene sentence. */
  item({ name, view, km }, language) {
    const parts = [slotsText(view.today.slots)];
    if (view.open) {
      parts.push(say(TEXT, language, 'open'));
    }
    if (km !== null) {
      parts.push(this.kmText(km, language));
    }
    if (view.today.holiday) {
      parts.push(say(TEXT, language, 'holidayCheck'));
    }
    return `${name} (${parts.join(', ')})`;
  }

  // --- configuration action ---------------------------------------------------

  status() {
    const blocks = [];
    const nearest = this.config.nearestCount > 0;
    if (nearest && this.house) {
      blocks.push(
        render(REPORTS, 'house', {
          count: this.config.nearestCount,
          km: this.config.maxDistanceKm,
        }),
      );
    } else if (!this.house) {
      blocks.push(render(REPORTS, 'noHouse'));
    }
    if (this.config.areas.length === 0 && !this.house) {
      blocks.push(render(REPORTS, 'noArea'));
    }
    const needed = new Set(this.neededSources().map((source) => source.id));
    for (const [id, area] of [...this.areas].filter(([key]) => needed.has(key))) {
      const name = sourceOf(id).name;
      if (area.error) {
        blocks.push(render(REPORTS, 'areaError', { name, error: area.error }));
      } else {
        const count = area.keys.filter((key) => this.markets.get(key)?.schedule).length;
        blocks.push(render(REPORTS, 'area', { name, count }));
      }
    }
    blocks.push(
      render(REPORTS, 'offered', { count: this.offered().length }),
      this.okAt === null
        ? render(REPORTS, 'waiting')
        : render(REPORTS, 'read', { age: Math.round((this.now() - this.okAt) / 60000) }),
      render(REPORTS, 'watched', { count: this.watched().length }),
    );
    return lines(...blocks);
  }
}
