// -----------------------------------------------------------------------------
// The open data sources: the cities that publish the days and hours of their
// food markets (Opendatasoft v2.1, no key). Each one is a single request: the
// datasets hold a few dozen records.
//
// Only sources with real days and hours are here. Left aside on 30/10/2026:
// Rennes (places, no hours), Nantes, Bordeaux, Lyon (nothing published with
// hours on their portals).
//
// Only food markets are kept (open-air, covered, organic, producers): flea,
// book, flower and craft markets are dropped by each source.
//
// A market becomes `{ key, source, id, name, city, address, lat, lon, kind,
// schedule, signature, department, zone }`; `key` (`<source>-<id>`) builds
// the external ids and never changes. `schedule` is seven lists of slots,
// Monday first (src/hours.js), or null when a held day has no readable hours:
// such a market is kept, flagged, and never offered.
// -----------------------------------------------------------------------------

import { PARIS } from './clock.js';
import { minutesOf, weekOf } from './hours.js';
import { HttpError, getJson, hostOf } from './http.js';

const records = (base, fields) =>
  `${base}/records?select=${encodeURIComponent(fields.join(','))}&limit=100`;

const words = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const SMALL_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'sur', 'aux', 'au']);

/** "MARCHÉ DE L'ÉGLISE" → "Marché de l'Église". */
export function titleCase(value) {
  return words(value)
    .toLocaleLowerCase('fr-FR')
    .split(' ')
    .map((word, index) => {
      if (index > 0 && SMALL_WORDS.has(word)) {
        return word;
      }
      const elided = /^([dl]')(.+)$/.exec(word);
      if (elided) {
        const article = index === 0 ? elided[1].toLocaleUpperCase('fr-FR') : elided[1];
        return `${article}${elided[2][0].toLocaleUpperCase('fr-FR')}${elided[2].slice(1)}`;
      }
      return word.replace(
        /(^|-)(\p{L})/gu,
        (_, dash, letter) => dash + letter.toLocaleUpperCase('fr-FR'),
      );
    })
    .join(' ');
}

/** "Saint Étienne" → "saint-etienne": the id of a market published without one. */
export const slug = (value) =>
  words(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** "Arnaud Bernard" → "Marché Arnaud Bernard"; "Marche de l'Hers" → "Marché de l'Hers". */
export const marketName = (name) =>
  /^march[eé](?!\p{L})/iu.test(name) ? name.replace(/^march[eé]/iu, 'Marché') : `Marché ${name}`;

const number = (value) => (Number.isFinite(Number(value)) && value !== null ? Number(value) : null);

function market(source, { id, name, city, address, point, kind, week, raw }) {
  return {
    key: `${source.id}-${id}`,
    source: source.id,
    id: String(id),
    name: words(name).slice(0, 100),
    city: words(city),
    address: words(address),
    lat: number(point?.lat),
    lon: number(point?.lon),
    kind,
    schedule: week,
    // The days and hours as published: two evaluations compare it before firing a trigger.
    signature: JSON.stringify(raw ?? null),
    department: source.department,
    zone: PARIS,
  };
}

/** "07h30 - 13h30", "7h-14h", "16h00 – 20h00", "de 7h à 13h" → a slot, or null. */
export function parseFrenchRange(text) {
  const match = /^(?:de\s+)?(\d{1,2})\s*h\s*(\d{2})?\s*(?:-|–|à)\s*(\d{1,2})\s*h\s*(\d{2})?$/i.exec(
    words(text),
  );
  if (!match) {
    return null;
  }
  const from = minutesOf(`${match[1]}:${match[2] ?? '00'}`);
  const to = minutesOf(`${match[3]}:${match[4] ?? '00'}`);
  return from !== null && to !== null && to > from ? { from, to } : null;
}

const FRENCH_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DAY_CODES = ['LU', 'MA', 'ME', 'JE', 'VE', 'SA', 'DI'];

// Strasbourg markets that sell no food, by the prefix of their `code4`.
const STRASBOURG_NOT_FOOD = new Set(['LIVR', 'FLEU', 'BROC', 'MONT']);
const STRASBOURG_NAMES = { PROD: 'Marché des producteurs' };

export const SOURCES = [
  {
    id: 'paris',
    name: 'Paris',
    // The town hall: a house this far from it cannot have a market nearby.
    center: { lat: 48.8566, lon: 2.3522 },
    department: '75',
    url: records('https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/marches-decouverts', [
      'id_marche',
      'nom_long',
      'produit',
      'ardt',
      'localisation',
      ...FRENCH_DAYS,
      'h_deb_sem_1',
      'h_fin_sem_1',
      'h_deb_sam',
      'h_fin_sam',
      'h_deb_dim',
      'h_fin_dim',
      'geo_point_2d',
    ]),
    toMarkets(source, list) {
      return list
        .filter((record) => record.id_marche !== null && record.id_marche !== undefined)
        .filter((record) => /^alimentaire/i.test(words(record.produit)))
        .map((record) => {
          // One pair of hours for Monday to Friday, one for Saturday, one for Sunday.
          const pairOf = (day) =>
            day < 5
              ? ['h_deb_sem_1', 'h_fin_sem_1']
              : day === 5
                ? ['h_deb_sam', 'h_fin_sam']
                : ['h_deb_dim', 'h_fin_dim'];
          const days = FRENCH_DAYS.map((name, day) => {
            if (Number(record[name]) !== 1) {
              return [];
            }
            const [start, end] = pairOf(day);
            const from = minutesOf(record[start]);
            const to = minutesOf(record[end]);
            return from !== null && to !== null && to > from ? [{ from, to }] : null;
          });
          const district = Number(record.ardt);
          return market(source, {
            id: record.id_marche,
            name: titleCase(record.nom_long),
            city: Number.isInteger(district)
              ? `Paris ${district}${district === 1 ? 'er' : 'e'}`
              : 'Paris',
            address: record.localisation,
            point: record.geo_point_2d,
            kind: /bio/i.test(record.produit) ? 'organic' : 'open_air',
            week: weekOf(days),
            raw: [
              FRENCH_DAYS.map((name) => record[name]),
              record.h_deb_sem_1,
              record.h_fin_sem_1,
              record.h_deb_sam,
              record.h_fin_sam,
              record.h_deb_dim,
              record.h_fin_dim,
            ],
          });
        });
    },
  },
  {
    id: 'toulouse',
    name: 'Toulouse',
    center: { lat: 43.6045, lon: 1.4442 },
    department: '31',
    url: records(
      'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/marches-couverts-et-de-plein-vent',
      ['nom', 'type', 'adresse', 'code_postal', ...FRENCH_DAYS, 'geo_point_2d'],
    ),
    // No id in the dataset: the name, unique among the food markets.
    toMarkets(source, list) {
      const seen = new Set();
      const markets = [];
      for (const record of list) {
        const type = words(record.type);
        const id = slug(record.nom);
        if (!id || seen.has(id) || !/alimentaire|producteurs|couvert/i.test(type)) {
          continue;
        }
        seen.add(id);
        const days = FRENCH_DAYS.map((name) => {
          const value = words(record[name]);
          if (!value) {
            return [];
          }
          const slot = parseFrenchRange(value);
          return slot ? [slot] : null;
        });
        const postcode = Number(record.code_postal);
        const valid = postcode >= 31000 && postcode <= 31999;
        const kind = /couvert/i.test(type)
          ? 'covered'
          : /bio/i.test(type) || /\bbio\b/i.test(record.nom)
            ? 'organic'
            : 'open_air';
        markets.push(
          market(source, {
            id,
            name: marketName(titleCase(record.nom)),
            city: 'Toulouse',
            address: `${words(record.adresse)}${valid ? `, ${postcode}` : ''} Toulouse`,
            point: record.geo_point_2d,
            kind,
            week: weekOf(days),
            raw: FRENCH_DAYS.map((name) => record[name] ?? null),
          }),
        );
      }
      return markets;
    },
  },
  {
    id: 'strasbourg',
    name: 'Strasbourg',
    center: { lat: 48.5734, lon: 7.7521 },
    department: '67',
    url: records(
      'https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/sites-marches-d-approvisionnement',
      ['nom_marche', 'jour', 'heure', 'adresse', 'code4', 'geo_point_2d'],
    ),
    // One record per market and day ("NEUD-MA", "NEUD-SA"): grouped by the
    // prefix of `code4`, the market's code.
    toMarkets(source, list) {
      const groups = new Map();
      for (const record of list) {
        const code = /^([A-Z]{4})-([A-Z]{2})$/.exec(words(record.code4));
        if (!code || STRASBOURG_NOT_FOOD.has(code[1])) {
          continue;
        }
        if (!groups.has(code[1])) {
          groups.set(code[1], []);
        }
        groups.get(code[1]).push(record);
      }
      return [...groups].map(([code, rows]) => {
        const days = DAY_CODES.map(() => []);
        for (const row of rows) {
          const day = DAY_CODES.indexOf(words(row.jour));
          const slot = parseFrenchRange(row.heure);
          if (day < 0) {
            continue;
          }
          days[day] = slot && days[day] ? [...days[day], slot] : null;
        }
        const first = rows[0];
        return market(source, {
          id: code.toLowerCase(),
          name: STRASBOURG_NAMES[code] ?? marketName(words(first.nom_marche)),
          city: 'Strasbourg',
          address: `${words(first.adresse)}, Strasbourg`,
          point: first.geo_point_2d,
          kind: 'open_air',
          week: weekOf(days),
          raw: rows.map((row) => [row.code4, row.heure]).sort(),
        });
      });
    },
  },
];

export const SOURCE_IDS = SOURCES.map((source) => source.id);
export const sourceOf = (id) => SOURCES.find((source) => source.id === id) ?? null;

// Opendatasoft serves 100 records per request at most; a few pages are read
// before giving up, so a growing dataset keeps working.
const PAGE = 100;
const MAX_PAGES = 5;

/** The food markets of a source: one request per page of 100 (one today). */
export async function readSource(fetchImpl, source) {
  const results = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = page === 0 ? source.url : `${source.url}&offset=${page * PAGE}`;
    const body = await getJson(fetchImpl, url, { maxBytes: 2e6 });
    // An empty or unexpected answer is a failure: the last good read is kept.
    if (!Array.isArray(body?.results) || (page === 0 && body.results.length === 0)) {
      throw new HttpError(`${hostOf(source.url)}: no record`);
    }
    results.push(...body.results);
    const total = Number(body.total_count);
    if (!(total > results.length) || body.results.length === 0) {
      // A short answer against a larger total is a truncated read.
      if (total > results.length) {
        throw new HttpError(`${hostOf(source.url)}: ${results.length} of ${total} records`);
      }
      return source.toMarkets(
        source,
        results.filter((record) => record && typeof record === 'object'),
      );
    }
  }
  throw new HttpError(`${hostOf(source.url)}: more than ${PAGE * MAX_PAGES} records`);
}

/** Distance in km between two points (haversine). */
export function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
