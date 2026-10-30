# Gladys Marchés

External integration for [Gladys Assistant](https://gladysassistant.com): the
**food markets (open-air, covered, organic, producers) of Paris, Toulouse and
Strasbourg**, from the open data of the cities: is there a market today, is it
open now, until when, and the next market day. **No account, no key.**

The cities publish a weekly rhythm only: public holidays and cancellations are
not published, check before going. Unofficial: not affiliated with the cities
nor with the market operators. Developed without visiting the markets and
tested against the real answers of the sources (2026-10-30), not yet on many
Gladys installations: feedback welcome.

User documentation: [English](docs/en.md) · [français](docs/fr.md) ·
[Deutsch](docs/de.md) · [español](docs/es.md).

## What you get in Gladys

- One read-only device per market you add: market today, open now, end time
  today, next market, market days.
- The markets of the cities you tick, or the nearest ones to the house.
- A dashboard widget: today's markets around the house (10 at most), open
  until when, distance.
- Scene triggers: a market opens, ends soon (30 minutes by default), and
  "market tomorrow" the evening before a market day (19:00 by default).
- A scene action, "Markets today near me": today's markets in a sentence.

## Requirements

- Gladys Assistant 5.3.0 or later, with Internet access.
- For the nearest markets, the widget and the scene sentence: the location of
  the house set in Gladys.

## Installation

In Gladys, **Integrations → Install from GitHub**, then paste
`https://github.com/guim31/gladys-marches`. Tick your city (or keep the nearest
markets to the house), save, and add your markets from the Discover tab.

## How it works

| City       | Source (Opendatasoft v2.1, no key)                              | Format                             |
| ---------- | --------------------------------------------------------------- | ---------------------------------- |
| Paris      | opendata.paris.fr, `marches-decouverts`                         | day flags, weekday/Sat/Sun hours   |
| Toulouse   | data.toulouse-metropole.fr, `marches-couverts-et-de-plein-vent` | one text per day ("07h30 - 13h30") |
| Strasbourg | data.strasbourg.eu, `sites-marches-d-approvisionnement`         | one record per market and day      |

Each city needed is read once a day (one request). Held today, open or not is
then computed every minute from the days kept, in the time zone of Paris,
without any request. Only food markets are kept. Hours the integration does
not read ("1er du mois", "été") make a market's hours "unreadable", never
guessed. Public holidays are computed offline and only flagged.

## Limitations

- Three cities only: Lyon, Bordeaux, Nantes and Rennes publish no market hours
  as open data (checked on 2026-10-30).
- Toulouse covers the city only, and its markets have no id: the name serves as
  one. Paris covers its open-air markets, not its covered ones.
- No public holiday, cancellation or exceptional day is published.

## Development

```bash
npm install
npm test               # node --test, no network access
npm run lint           # ESLint
npm run format:check   # Prettier, as the CI runs it
npx github:GladysAssistant/integration-store .   # store admission checks
```

See [CLAUDE.md](CLAUDE.md) for the architecture and the conventions. The test
fixtures (`test/fixtures/api`) are the real answers of the three sources,
captured on 2026-10-30.

## Credits

- Data: Ville de Paris (ODbL), Mairie de Toulouse and Ville et Eurométropole de
  Strasbourg (Licence Ouverte 2.0, Etalab).
- Cover pictogram: the "store" icon of [Lucide](https://lucide.dev) (ISC).
- Structure shared with
  [gladys-decheteries](https://github.com/guim31/gladys-decheteries).
- Built from the official
  [integration template](https://github.com/GladysAssistant/integration-template-js).

## License

[Apache 2.0](LICENSE).
