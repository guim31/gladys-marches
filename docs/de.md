# Marchés

Die **Lebensmittelmärkte** (Wochenmärkte unter freiem Himmel, Markthallen, Bio, Erzeuger) **von
Paris, Toulouse und Straßburg** in Gladys: Gibt es heute einen Markt, ist er jetzt geöffnet, bis
wann, und wann ist der nächste Markttag. Tage und Zeiten stammen aus den **offenen Daten** der Städte.
**Ohne Konto, ohne Schlüssel.**

> Die Städte veröffentlichen nur den Wochenrhythmus: Feiertage, Ausfälle und Sondertage werden nicht
> veröffentlicht. Prüfe sie vorher, vor allem an einem Feiertag.

Inoffizielle Integration, ohne Verbindung zu den Städten oder den Marktbetreibern. Getestet mit den
echten Antworten der drei Quellen (30.10.2026), noch nicht auf einer echten Gladys-Instanz:
Rückmeldungen sind willkommen.

## Was du bekommst

- Ein **Gerät pro Markt**, den du hinzufügst: Markt heute, jetzt geöffnet, Ende heute, nächster
  Markt, Markttage.
- Ein **Widget** „Märkte heute“: die heutigen Märkte rund ums Haus (höchstens 10, die nächsten
  zuerst), grün wenn geöffnet, orange in der letzten halben Stunde, blau vor Beginn, grau danach.
- Drei **Szenenauslöser**: ein Markt öffnet, ein Markt endet bald (standardmäßig 30 Minuten) und
  „Markt morgen“ am Vorabend eines Markttags (standardmäßig 19 Uhr).
- Eine **Szenenaktion** „Märkte heute in meiner Nähe“: die heutigen Märkte nahe dem Haus in einem
  Satz, mit Zeiten, ob sie geöffnet sind und wie weit sie entfernt sind.

## Voraussetzungen

- Gladys Assistant **5.3.0** oder neuer.
- Internetzugang von Gladys aus: Die Quellen sind öffentliche Open-Data-Portale.
- Für die nächsten Märkte, das Widget und den Szenensatz: der Standort des Hauses in Gladys
  (**Einstellungen → Häuser**).

## Installation

1. Öffne in Gladys **Integrationen → Von GitHub installieren**.
2. Füge `https://github.com/guim31/gladys-marches` ein und bestätige.
3. Gladys bittet darum, den Standort des Hauses zu teilen: Er dient nur dazu, die nächsten Märkte zu
   finden, und verlässt dein Gladys nie.

## Konfiguration

### Einstellungen

- **Städte**: Alle Lebensmittelmärkte der angekreuzten Städte werden angeboten (Paris 72, Toulouse
  45, Straßburg 19).
- **Nächste Märkte**: Biete zusätzlich so viele Märkte nahe dem Haus an (standardmäßig 3, 0 zum
  Abschalten), innerhalb der **maximalen Entfernung** (standardmäßig 5 km Luftlinie). Dieselbe
  Entfernung begrenzt das Widget und den Szenensatz.
- **Endet bald (Minuten)**: wann der Auslöser „Ein Markt endet bald“ auslöst (standardmäßig 30).
- **Uhrzeit für „Markt morgen“**: die Stunde am Vorabend eines Markttags, zu der „Markt morgen“
  auslöst (standardmäßig 19).
- **Sprache der Namen und Meldungen**: standardmäßig Französisch. Die Namen der Funktionen werden
  beim Hinzufügen eines Geräts festgelegt; die Texte folgen der Sprache sofort.

### Märkte hinzufügen

Speichere die Konfiguration: Die Märkte erscheinen im Tab **Entdecken** der Integration. Füge die
hinzu, auf die du gehst. Ein hinzugefügter Markt bleibt verfolgt, auch wenn du seine Stadt abwählst.

### Prüfen

Die Schaltfläche **Status** listet die gelesenen Städte, die Zahl der Lebensmittelmärkte, die
angebotenen Märkte, die letzte Abfrage und die Fehler.

## Geräte

| Funktion       | Typ   | Wert                                                          |
| -------------- | ----- | ------------------------------------------------------------- |
| Markt heute    | binär | 1, wenn der Markt heute stattfindet                           |
| Jetzt geöffnet | binär | 1 geöffnet, 0 nicht; kein Wert, wenn die Zeiten unlesbar sind |
| Ende heute     | Text  | „13:30“, „Heute kein Markt“, „13:30 (Feiertag: bitte prüfen)“ |
| Nächster Markt | Text  | „heute um 16:00“, „morgen um 07:00“, „Samstag um 07:30“       |
| Markttage      | Text  | „Mi. 07:00–13:30 · Sa. 07:00–14:30“                           |

Die Werte berechnet die Integration jede Minute, ohne jede Anfrage.

## Dashboard-Widget

Füge das Widget **Märkte heute** einem Dashboard hinzu: eine Zeile pro heutigem Markt rund ums Haus
(höchstens 10, die nächsten zuerst), mit „geöffnet bis 13:30 · 0,4 km“, „endet in 20 Min.“, „ab
16:00“ oder „beendet um 13:30“. Weiter entfernte, zu Gladys hinzugefügte Märkte folgen nach den nahen; ohne Standort des Hauses zeigt es die zu Gladys hinzugefügten Märkte.
Die Einstellung **Entfernung anzeigen** blendet die Entfernung aus.

## Szenenauslöser

- **Ein Markt öffnet**: Variablen `market_name`, `ends_at`.
- **Ein Markt endet bald**: so viele Minuten vor dem Ende wie in der Konfiguration eingestellt;
  Variablen `market_name`, `ends_at`, `minutes_left`.
- **Markt morgen**: am Vorabend eines Markttags zur eingestellten Stunde; Variablen `market_name`,
  `starts_at`, `ends_at`.

Jeder Auslöser lässt sich auf bestimmte Märkte begrenzen; leer löst ihn jeder hinzugefügte Markt aus.
Nach einer langen Pause (Rechner im Ruhezustand, Gladys gestoppt) wird kein verspäteter Auslöser
gesendet.

## Szenenaktion

**Märkte heute in meiner Nähe** liefert `sentence` („Märkte heute in deiner Nähe: Marché Victor Hugo
(07:00–13:30, geöffnet, 0,3 km), …“), `markets_count` und `open_count`. Ohne Standort des Hauses
nennt der Satz die zu Gladys hinzugefügten Märkte, die heute stattfinden. Schick ihn als Nachricht
oder an einen Lautsprecher, oder fahre nur fort, wenn `markets_count` größer als 0 ist.

## Szenenbeispiele

- Samstags um 8:00 „Märkte heute in meiner Nähe“ an dein Telefon schicken.
- „Markt morgen“ am Freitagabend: eine Erinnerung an die Einkaufstaschen.
- „Ein Markt endet bald“, wenn du unterwegs bist: letzte Chance auf frisches Brot.

## Daten und Aktualisierung

| Stadt     | Quelle                                                          | Lebensmittelmärkte | Lizenz          |
| --------- | --------------------------------------------------------------- | ------------------ | --------------- |
| Paris     | opendata.paris.fr, `marches-decouverts`                         | 72                 | ODbL            |
| Toulouse  | data.toulouse-metropole.fr, `marches-couverts-et-de-plein-vent` | 45                 | Licence Ouverte |
| Straßburg | data.strasbourg.eu, `sites-marches-d-approvisionnement`         | 19                 | Licence Ouverte |

- Jede Stadt ist eine Anfrage **einmal am Tag** (eine Stunde später nach einem Fehler), nur für die
  benötigten Städte; alle drei, wenn das Haus einen Standort hat. Alles andere wird jede Minute aus
  den gespeicherten Tagen berechnet, in der Zeitzone von Paris.
- Nur Lebensmittelmärkte bleiben: Blumen-, Bücher-, Floh-, Briefmarken- und Kunsthandwerkermärkte
  werden ausgelassen.
- Feiertage werden offline berechnet (Elsass-Mosel eingeschlossen) und nur markiert: Viele Märkte
  behalten ihren Tag, die Quellen sagen nicht, welche.

## Fehlerbehebung

- **Nichts im Tab „Entdecken“**: Kreuze eine Stadt an oder gib dem Haus einen Standort und lass
  „Nächste Märkte“ über 0. Die Schaltfläche **Status** sagt, woran es liegt.
- **Das Widget meldet keinen Markt**: Kein Markt innerhalb der maximalen Entfernung findet heute
  statt; erhöhe die Entfernung bei Bedarf.
- **„Zeiten nicht lesbar“**: Die Quelle hat Zeiten veröffentlicht, die die Integration nicht liest
  (sie rät nie): Sag es im Forum.
- **Eine Stadt ist nicht verfügbar**: Die zuletzt gelesenen Tage bleiben; neuer Versuch eine Stunde
  später.
- Protokolle: im Bildschirm der Integration oder `LOG_LEVEL=debug` für jede Abfrage.

## Einschränkungen

- Nur drei Städte: Lyon, Bordeaux, Nantes, Rennes und die anderen veröffentlichen die Tage und Zeiten
  ihrer Märkte heute nicht als offene Daten. Nenne uns eine weitere Quelle.
- Der Datensatz von Toulouse deckt die Stadt Toulouse ab, nicht die ganze Metropole; seine Märkte
  haben keine Kennung, der Name dient als solche.
- Paris deckt seine Märkte unter freiem Himmel ab; die Markthallen sind nicht im Datensatz.
- Entwickelt, ohne die Märkte zu besuchen: Rückmeldungen sind willkommen.

## Danksagung

Daten: Ville de Paris (ODbL), Mairie de Toulouse und Ville et Eurométropole de Strasbourg (Licence
Ouverte). Gebaut mit dem [Gladys-Integrations-SDK](https://github.com/GladysAssistant/integration-sdk-js).
