// -----------------------------------------------------------------------------
// The Gladys device of a market and its states:
//
//   today     input/binary   1 = the market is held today
//   open      input/binary   1 = open now
//   ends      text/text      end time today ("13:30"), "No market today"
//   next      text/text      next market ("Saturday at 07:00")
//   days      text/text      the week ("Wed 07:00–13:30, Sat 07:00–14:30")
//
// Read-only, no polling: the integration computes the states every minute
// on its own timer (src/service.js), Gladys never polls (`should_poll: false`).
// A market whose hours become unreadable keeps its device, without binary
// states.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
} from '@gladysassistant/integration-sdk';
import { NAMES } from './messages.js';

export const MARKET_TYPE = 'market';
export const FEATURE_KEYS = ['today', 'open', 'ends', 'next', 'days'];
const BINARY_KEYS = new Set(['today', 'open']);
export const MAX_DEVICE_NAME = 100;
export const MAX_TEXT = 500;

/** Shortens a text to `max` characters, with an ellipsis. */
export function clip(text, max) {
  const value = String(text ?? '');
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** The external ids of a market, from its key (`paris-16`). */
export const idsOf = (gladys, key) => gladys.externalIds(MARKET_TYPE, key);

/**
 * The device of a market.
 * @param {object} gladys
 * @param {object} market from src/sources.js
 * @param {string} language
 */
export function buildMarketDevice(gladys, market, language) {
  const ids = idsOf(gladys, market.key);
  const names = NAMES[language] ?? NAMES.en;
  return {
    name: clip(market.name || market.key, MAX_DEVICE_NAME),
    external_id: ids.device,
    should_poll: false,
    params: [
      { name: 'market', value: market.key },
      { name: 'city', value: market.city },
      { name: 'address', value: clip(market.address, 200) },
    ],
    features: FEATURE_KEYS.map((key) => ({
      name: names[key],
      external_id: ids.feature(key),
      ...(BINARY_KEYS.has(key)
        ? { category: C.INPUT, type: T.SENSOR.BINARY, min: 0, max: 1 }
        : { category: C.TEXT, type: T.TEXT.TEXT, min: 0, max: 0 }),
      read_only: true,
      has_feedback: false,
    })),
  };
}

/**
 * The states of a market from its view (src/service.js): the binary states
 * only when the hours are readable, texts never empty.
 */
export function marketStates(gladys, market, view) {
  const ids = idsOf(gladys, market.key);
  const states = [];
  if (view.known) {
    states.push(
      { device_feature_external_id: ids.feature('today'), state: view.heldToday ? 1 : 0 },
      { device_feature_external_id: ids.feature('open'), state: view.open ? 1 : 0 },
    );
  }
  for (const key of ['ends', 'next', 'days']) {
    states.push({ device_feature_external_id: ids.feature(key), text: clip(view[key], MAX_TEXT) });
  }
  return states;
}
