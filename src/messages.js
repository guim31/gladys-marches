// -----------------------------------------------------------------------------
// Texts sent from the container (feature names, action messages, widget
// contents, scene outputs), in the four languages of the Gladys interface.
// Entries are strings or functions of one parameter object. German says "du",
// Spanish "usted". Names of markets never translate.
// -----------------------------------------------------------------------------

export const INIT_FAILED = {
  en: 'Initialization failed, check the integration logs.',
  fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
  de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
  es: 'La inicialización ha fallado, consulte los registros de la integración.',
};

// Feature names, frozen when the device is created (configured language).
export const NAMES = {
  en: {
    today: 'Market today',
    open: 'Open now',
    ends: 'End time today',
    next: 'Next market',
    days: 'Market days',
  },
  fr: {
    today: "Marché aujourd'hui",
    open: 'Ouvert maintenant',
    ends: "Fin aujourd'hui",
    next: 'Prochain marché',
    days: 'Jours de marché',
  },
  de: {
    today: 'Markt heute',
    open: 'Jetzt geöffnet',
    ends: 'Ende heute',
    next: 'Nächster Markt',
    days: 'Markttage',
  },
  es: {
    today: 'Mercado hoy',
    open: 'Abierto ahora',
    ends: 'Fin hoy',
    next: 'Próximo mercado',
    days: 'Días de mercado',
  },
};

// Day names, Monday first.
export const WEEKDAYS = {
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
};
export const SHORT_WEEKDAYS = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  fr: ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'],
  de: ['Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.', 'So.'],
  es: ['lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.', 'dom.'],
};

// Feature states, widget rows and scene sentences. `when` is a text built by
// src/service.js ("demain à 07:00").
export const TEXT = {
  en: {
    noMarketToday: 'No market today',
    holidayCheck: 'public holiday: check',
    noHours: 'Hours not readable',
    noNext: 'none in the next 8 days',
    unknown: 'unknown',
    today: ({ time }) => `today at ${time}`,
    tomorrow: ({ time }) => `tomorrow at ${time}`,
    weekday: ({ day, time }) => `${day} at ${time}`,
    openUntil: ({ time }) => `open until ${time}`,
    closesIn: ({ minutes }) => `ends in ${minutes} min`,
    startsAt: ({ time }) => `from ${time}`,
    ended: ({ time }) => `ended at ${time}`,
    open: 'open',
    around: ({ list }) => `Markets today near you: ${list}.`,
    aroundNone: 'No market today near you.',
    watchedList: ({ list }) => `Your markets today: ${list}.`,
    watchedNone: 'None of your markets is held today.',
    noHouse:
      'Locate the house in Gladys, or add a market in the Discover tab of the integration, then come back here.',
    noneToday: 'No market today around the house.',
  },
  fr: {
    noMarketToday: "Pas de marché aujourd'hui",
    holidayCheck: 'jour férié : à vérifier',
    noHours: 'Horaires illisibles',
    noNext: 'aucun dans les 8 jours',
    unknown: 'inconnu',
    today: ({ time }) => `aujourd'hui à ${time}`,
    tomorrow: ({ time }) => `demain à ${time}`,
    weekday: ({ day, time }) => `${day} à ${time}`,
    openUntil: ({ time }) => `ouvert jusqu'à ${time}`,
    closesIn: ({ minutes }) => `finit dans ${minutes} min`,
    startsAt: ({ time }) => `à partir de ${time}`,
    ended: ({ time }) => `terminé à ${time}`,
    open: 'ouvert',
    around: ({ list }) => `Marchés aujourd'hui près de chez vous : ${list}.`,
    aroundNone: "Pas de marché aujourd'hui près de chez vous.",
    watchedList: ({ list }) => `Vos marchés aujourd'hui : ${list}.`,
    watchedNone: "Aucun de vos marchés ne se tient aujourd'hui.",
    noHouse:
      "Localisez la maison dans Gladys, ou ajoutez un marché dans l'onglet Découverte de l'intégration, puis revenez ici.",
    noneToday: "Pas de marché aujourd'hui autour de la maison.",
  },
  de: {
    noMarketToday: 'Heute kein Markt',
    holidayCheck: 'Feiertag: bitte prüfen',
    noHours: 'Zeiten nicht lesbar',
    noNext: 'keiner in den nächsten 8 Tagen',
    unknown: 'unbekannt',
    today: ({ time }) => `heute um ${time}`,
    tomorrow: ({ time }) => `morgen um ${time}`,
    weekday: ({ day, time }) => `${day} um ${time}`,
    openUntil: ({ time }) => `geöffnet bis ${time}`,
    closesIn: ({ minutes }) => `endet in ${minutes} Min.`,
    startsAt: ({ time }) => `ab ${time}`,
    ended: ({ time }) => `beendet um ${time}`,
    open: 'geöffnet',
    around: ({ list }) => `Märkte heute in deiner Nähe: ${list}.`,
    aroundNone: 'Heute kein Markt in deiner Nähe.',
    watchedList: ({ list }) => `Deine Märkte heute: ${list}.`,
    watchedNone: 'Keiner deiner Märkte findet heute statt.',
    noHouse:
      'Gib dem Haus in Gladys einen Standort oder füge einen Markt im Tab „Entdecken“ der Integration hinzu, dann komm hierher zurück.',
    noneToday: 'Heute kein Markt rund ums Haus.',
  },
  es: {
    noMarketToday: 'Hoy no hay mercado',
    holidayCheck: 'festivo: compruébelo',
    noHours: 'Horario ilegible',
    noNext: 'ninguno en los próximos 8 días',
    unknown: 'desconocido',
    today: ({ time }) => `hoy a las ${time}`,
    tomorrow: ({ time }) => `mañana a las ${time}`,
    weekday: ({ day, time }) => `el ${day} a las ${time}`,
    openUntil: ({ time }) => `abierto hasta las ${time}`,
    closesIn: ({ minutes }) => `termina en ${minutes} min`,
    startsAt: ({ time }) => `desde las ${time}`,
    ended: ({ time }) => `terminado a las ${time}`,
    open: 'abierto',
    around: ({ list }) => `Mercados hoy cerca de usted: ${list}.`,
    aroundNone: 'Hoy no hay mercado cerca de usted.',
    watchedList: ({ list }) => `Sus mercados hoy: ${list}.`,
    watchedNone: 'Ninguno de sus mercados se celebra hoy.',
    noHouse:
      'Ubique la casa en Gladys, o añada un mercado en la pestaña Descubrir de la integración, y vuelva aquí.',
    noneToday: 'Hoy no hay mercado alrededor de la casa.',
  },
};

// Answer of the "Status" configuration action.
export const REPORTS = {
  en: {
    noArea: 'No city ticked and no located house: tick a city above, then save.',
    house: ({ count, km }) =>
      `Around the house: the ${count} nearest market${count === 1 ? '' : 's'} within ${km} km.`,
    noHouse: 'The house has no location in Gladys: the nearest markets cannot be offered.',
    area: ({ name, count }) => `■ ${name}: ${count} food market${count === 1 ? '' : 's'}`,
    areaError: ({ name, error }) => `■ ${name}: unavailable (${error})`,
    offered: ({ count }) => `${count} market${count === 1 ? '' : 's'} in the Discover tab.`,
    read: ({ age }) => `Data read ${age} min ago.`,
    waiting: 'Data not read yet.',
    watched: ({ count }) => `${count} market${count === 1 ? '' : 's'} added to Gladys.`,
  },
  fr: {
    noArea:
      'Aucune ville cochée et maison non localisée : cochez une ville ci-dessus, puis enregistrez.',
    house: ({ count, km }) =>
      `Autour de la maison : ${count === 1 ? 'le marché le plus proche' : `les ${count} marchés les plus proches`} à moins de ${km} km.`,
    noHouse:
      "La maison n'est pas localisée dans Gladys : les marchés les plus proches ne peuvent pas être proposés.",
    area: ({ name, count }) =>
      `■ ${name} : ${count} marché${count > 1 ? 's' : ''} alimentaire${count > 1 ? 's' : ''}`,
    areaError: ({ name, error }) => `■ ${name} : indisponible (${error})`,
    offered: ({ count }) => `${count} marché${count > 1 ? 's' : ''} dans l'onglet Découverte.`,
    read: ({ age }) => `Données lues il y a ${age} min.`,
    waiting: 'Données pas encore lues.',
    watched: ({ count }) =>
      `${count} marché${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} à Gladys.`,
  },
  de: {
    noArea:
      'Keine Stadt angekreuzt und Haus ohne Standort: kreuze oben eine Stadt an und speichere.',
    house: ({ count, km }) =>
      `Rund ums Haus: ${count === 1 ? 'der nächste Markt' : `die ${count} nächsten Märkte`} im Umkreis von ${km} km.`,
    noHouse:
      'Das Haus hat in Gladys keinen Standort: die nächsten Märkte können nicht angeboten werden.',
    area: ({ name, count }) =>
      `■ ${name}: ${count} ${count === 1 ? 'Lebensmittelmarkt' : 'Lebensmittelmärkte'}`,
    areaError: ({ name, error }) => `■ ${name}: nicht verfügbar (${error})`,
    offered: ({ count }) => `${count} ${count === 1 ? 'Markt' : 'Märkte'} im Tab „Entdecken“.`,
    read: ({ age }) => `Daten vor ${age} Min. gelesen.`,
    waiting: 'Daten noch nicht gelesen.',
    watched: ({ count }) => `${count} ${count === 1 ? 'Markt' : 'Märkte'} zu Gladys hinzugefügt.`,
  },
  es: {
    noArea: 'Ninguna ciudad marcada y casa sin ubicación: marque una ciudad arriba y luego guarde.',
    house: ({ count, km }) =>
      `Alrededor de la casa: ${count === 1 ? 'el mercado más cercano' : `los ${count} mercados más cercanos`} a menos de ${km} km.`,
    noHouse:
      'La casa no tiene ubicación en Gladys: no se pueden proponer los mercados más cercanos.',
    area: ({ name, count }) =>
      `■ ${name}: ${count} mercado${count === 1 ? '' : 's'} de alimentación`,
    areaError: ({ name, error }) => `■ ${name}: no disponible (${error})`,
    offered: ({ count }) => `${count} mercado${count === 1 ? '' : 's'} en la pestaña Descubrir.`,
    read: ({ age }) => `Datos leídos hace ${age} min.`,
    waiting: 'Datos aún no leídos.',
    watched: ({ count }) =>
      `${count} mercado${count === 1 ? '' : 's'} añadido${count === 1 ? '' : 's'} a Gladys.`,
  },
};

/** One text of a table, in a language (English when missing). */
export function say(table, language, key, params = {}) {
  const entry = table[language]?.[key] ?? table.en[key];
  return typeof entry === 'function' ? entry(params) : entry;
}

/** The same text in every language of the table: `{ en, fr, de, es }`. */
export function render(table, key, params = {}) {
  return Object.fromEntries(
    Object.keys(table).map((language) => [language, say(table, language, key, params)]),
  );
}

/** Joins rendered messages (or plain strings), language by language, one per line. */
export function lines(...messages) {
  const languages = Object.keys(messages.find((m) => typeof m === 'object' && m) ?? { en: '' });
  return Object.fromEntries(
    languages.map((language) => [
      language,
      messages
        .filter((message) => message !== null && message !== undefined)
        .map((message) => (typeof message === 'string' ? message : message[language]))
        .join('\n'),
    ]),
  );
}
