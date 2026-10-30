// -----------------------------------------------------------------------------
// Scene actions (manifest `scene_actions`, Gladys 5.1+).
//
// - markets_today: the markets held today near the house (or, without a
//   located house, the markets added to Gladys) as one sentence ready for a
//   message or a speaker, plus numbers for a "Continue only if" step.
//
// A scene action does not receive the user's language: the sentence follows
// the `language` of the configuration. Outputs are numbers, never booleans:
// the core's "Continue only if" compares with ===.
// -----------------------------------------------------------------------------

import { TEXT, say } from './messages.js';

export class SceneError extends Error {}

export const SCENE_ACTIONS = {
  async markets_today(service) {
    const language = service.config.language;
    // Asked right at start: the first reading, not "nothing".
    await service.firstReading();
    const today = service.marketsToday();
    if (!today) {
      throw new SceneError(say(TEXT, language, 'noHouse'));
    }
    const { around, entries } = today;
    const sentence =
      entries.length === 0
        ? say(TEXT, language, around ? 'aroundNone' : 'watchedNone')
        : say(TEXT, language, around ? 'around' : 'watchedList', {
            list: entries.map((entry) => service.item(entry, language)).join(', '),
          });
    return {
      sentence,
      markets_count: entries.length,
      open_count: entries.filter(({ view }) => view.open).length,
    };
  },
};
