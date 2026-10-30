// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+).
//
// - today: the markets held today around the house (10 at most, nearest
//   first), or the markets added to Gladys without a located house. One
//   status row each ("Marché Charonne" / "ouvert jusqu'à 13:30 · 1,2 km"):
//   green when open, orange in the last half-hour, blue before it starts,
//   grey once over. The distance can be hidden.
//
// Budget of the core: 8 components, 2 texts, 1 status (10 rows).
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { clip } from './devices.js';
import { TEXT, say } from './messages.js';
import { CLOSING_SOON_MINUTES, WIDGET_KEY } from './service.js';

const MAX_LABEL = 40;
// The minute clock: a row is never more than a minute behind.
const TTL_SECONDS = 60;

/** The color of a row. */
export function rowColor(view) {
  if (view.open) {
    return view.minutesLeft <= CLOSING_SOON_MINUTES ? WIDGET_COLORS.WARNING : WIDGET_COLORS.SUCCESS;
  }
  return view.today.slots.some(({ from }) => from > view.minutes)
    ? WIDGET_COLORS.INFO
    : WIDGET_COLORS.NEUTRAL;
}

async function todayContent(service, { settings, language }) {
  await service.firstReading();
  const today = service.marketsToday();
  if (!today || today.entries.length === 0) {
    return {
      ttl_seconds: TTL_SECONDS,
      components: [{ type: 'text', text: say(TEXT, language, today ? 'noneToday' : 'noHouse') }],
    };
  }
  const distance = settings?.show_distance !== false;
  return {
    ttl_seconds: TTL_SECONDS,
    components: [
      {
        type: 'status',
        items: today.entries.map((entry) => {
          const row = service.rowText(entry.view, language);
          const km =
            distance && entry.km !== null ? ` · ${service.kmText(entry.km, language)}` : '';
          return {
            label: clip(entry.name, MAX_LABEL),
            value: clip(`${row}${km}`, 40),
            color: rowColor(entry.view),
          };
        }),
      },
    ],
  };
}

export const WIDGETS = {
  [WIDGET_KEY]: { get: todayContent },
};
