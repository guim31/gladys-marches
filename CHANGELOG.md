# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-10-30

### Added

- The food markets (open-air, covered, organic, producers) of Paris, Toulouse
  and Strasbourg, from the open data of the cities. Offered by city, or the
  nearest ones to the house (its location in Gladys), within a distance you set.
- One device per market added: market today, open now, end time today, next
  market and market days, computed every minute; public holidays are flagged
  ("check"), never assumed.
- Scene triggers: a market opens, ends soon (minutes set in the configuration,
  30 by default), and "market tomorrow" the evening before a market day (19:00
  by default).
- Scene action "Markets today near me": today's markets near the house in one
  sentence, with the number held and open.
- Dashboard widget "Markets today": up to 10 markets held today around the
  house, open until when, distance.
- Texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-marches/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-marches/releases/tag/v1.0.0
