# Marchés

Les **marchés alimentaires** (plein vent, couverts, bio, producteurs) **de Paris, Toulouse et
Strasbourg** dans Gladys : y a-t-il un marché aujourd'hui, est-il ouvert maintenant, jusqu'à quelle
heure, et quel est le prochain jour de marché. Jours et horaires viennent de l'**open data** des
villes. **Sans compte ni clé.**

> Les villes ne publient que le rythme de la semaine : jours fériés, annulations et jours
> exceptionnels ne sont pas publiés. Vérifiez avant d'y aller, surtout un jour férié.

Intégration non officielle, sans lien avec les villes ni avec les placiers. Testée sur les vraies
réponses des trois sources (30/10/2026), pas encore sur une vraie instance Gladys : vos retours sont
les bienvenus.

## Ce que vous obtenez

- Un **appareil par marché** ajouté : marché aujourd'hui, ouvert maintenant, heure de fin du jour,
  prochain marché, jours de marché.
- Un **widget** « Marchés du jour » : les marchés du jour autour de la maison (10 au plus, du plus
  proche au plus loin), en vert quand ils sont ouverts, en orange la dernière demi-heure, en bleu
  avant le début, en gris une fois finis.
- Trois **déclencheurs de scène** : un marché ouvre, un marché finit bientôt (30 minutes par
  défaut), et « Marché demain », la veille d'un jour de marché (19 h par défaut).
- Une **action de scène** « Marchés aujourd'hui près de chez moi » : les marchés du jour près de la
  maison en une phrase, avec leurs horaires, s'ils sont ouverts et à quelle distance.

## Prérequis

- Gladys Assistant **5.3.0** ou plus récent.
- Un accès Internet depuis Gladys : les sources sont des portails open data publics.
- Pour les marchés les plus proches, le widget et la phrase de scène : la position de la maison
  dans Gladys (**Paramètres → Maisons**).

## Installation

1. Dans Gladys, ouvrez **Intégrations → Installer depuis GitHub**.
2. Collez `https://github.com/guim31/gladys-marches` et validez.
3. Gladys demande à partager la position de la maison : elle ne sert qu'à trouver les marchés les
   plus proches et ne quitte jamais votre Gladys.

## Configuration

### Réglages

- **Villes** : tous les marchés alimentaires des villes cochées sont proposés (Paris 72, Toulouse 45,
  Strasbourg 19).
- **Marchés les plus proches** : propose aussi ce nombre de marchés les plus proches de la maison (3
  par défaut, 0 pour désactiver), dans la **distance maximale** (5 km à vol d'oiseau par défaut). La
  même distance limite le widget et la phrase de scène.
- **Fin prochaine (minutes)** : quand le déclencheur « Un marché finit bientôt » se déclenche (30 par
  défaut).
- **Heure de « Marché demain »** : l'heure, la veille d'un jour de marché, du déclencheur « Marché
  demain » (19 par défaut).
- **Langue des noms et des messages** : français par défaut. Les noms des fonctionnalités sont figés
  à l'ajout d'un appareil ; les textes suivent la langue tout de suite.

### Ajouter des marchés

Enregistrez la configuration : les marchés apparaissent dans l'onglet **Découverte** de
l'intégration. Ajoutez ceux où vous allez. Un marché ajouté reste suivi même si vous décochez sa
ville.

### Vérifier

Le bouton **État** liste les villes lues, le nombre de marchés alimentaires, les marchés proposés,
la dernière lecture et les erreurs.

## Appareils

| Fonctionnalité     | Type    | Valeur                                                                        |
| ------------------ | ------- | ----------------------------------------------------------------------------- |
| Marché aujourd'hui | binaire | 1 quand le marché se tient aujourd'hui                                        |
| Ouvert maintenant  | binaire | 1 ouvert, 0 non ; pas de valeur si les horaires sont illisibles               |
| Fin aujourd'hui    | texte   | « 13:30 », « Pas de marché aujourd'hui », « 13:30 (jour férié : à vérifier) » |
| Prochain marché    | texte   | « aujourd'hui à 16:00 », « demain à 07:00 », « samedi à 07:30 »               |
| Jours de marché    | texte   | « mer. 07:00–13:30 · sam. 07:00–14:30 »                                       |

Les valeurs sont calculées chaque minute par l'intégration, sans aucune requête.

## Widget du tableau de bord

Ajoutez le widget **Marchés du jour** à un tableau de bord : une ligne par marché du jour autour de
la maison (10 au plus, du plus proche au plus loin), avec « ouvert jusqu'à 13:30 · 0,4 km », « finit
dans 20 min », « à partir de 16:00 » ou « terminé à 13:30 ». Les marchés ajoutés à Gladys plus loin suivent les plus proches ; sans maison localisée, il montre les marchés ajoutés à Gladys. Le réglage **Afficher la distance** masque la distance.

## Déclencheurs de scène

- **Un marché ouvre** : variables `market_name`, `ends_at`.
- **Un marché finit bientôt** : autant de minutes avant la fin que réglé dans la configuration ;
  variables `market_name`, `ends_at`, `minutes_left`.
- **Marché demain** : la veille d'un jour de marché, à l'heure réglée ; variables `market_name`,
  `starts_at`, `ends_at`.

Chaque déclencheur peut être limité à certains marchés ; vide, n'importe quel marché ajouté le
déclenche. Après une longue pause (ordinateur en veille, Gladys arrêté), aucun déclencheur en retard
n'est envoyé.

## Action de scène

**Marchés aujourd'hui près de chez moi** renvoie `sentence` (« Marchés aujourd'hui près de chez
vous : Marché Victor Hugo (07:00–13:30, ouvert, 0,3 km), … »), `markets_count` et `open_count`. Sans
maison localisée, la phrase liste les marchés ajoutés à Gladys qui se tiennent aujourd'hui.
Envoyez-la dans un message ou sur une enceinte, ou continuez seulement si `markets_count` est
supérieur à 0.

## Exemples de scènes

- Le samedi à 8 h, envoyer « Marchés aujourd'hui près de chez moi » sur votre téléphone.
- « Marché demain » le vendredi soir : un rappel pour prendre les cabas.
- « Un marché finit bientôt » quand vous êtes dehors : dernière chance pour le pain frais.

## Données et rafraîchissement

| Ville      | Source                                                          | Marchés alimentaires | Licence         |
| ---------- | --------------------------------------------------------------- | -------------------- | --------------- |
| Paris      | opendata.paris.fr, `marches-decouverts`                         | 72                   | ODbL            |
| Toulouse   | data.toulouse-metropole.fr, `marches-couverts-et-de-plein-vent` | 45                   | Licence Ouverte |
| Strasbourg | data.strasbourg.eu, `sites-marches-d-approvisionnement`         | 19                   | Licence Ouverte |

- Chaque ville est lue en une requête **une fois par jour** (une heure plus tard après un échec),
  seulement pour les villes utiles ; les trois quand la maison est localisée. Tout le reste est
  calculé chaque minute à partir des jours gardés, à l'heure de Paris.
- Seuls les marchés alimentaires sont gardés : marchés aux fleurs, aux livres, aux puces, aux timbres
  et d'artisanat sont écartés.
- Les jours fériés sont calculés hors ligne (Alsace-Moselle comprise) et seulement signalés : beaucoup
  de marchés gardent leur jour, les sources ne disent pas lesquels.

## Dépannage

- **Rien dans l'onglet Découverte** : cochez une ville, ou localisez la maison et gardez « Marchés
  les plus proches » au-dessus de 0. Le bouton **État** dit lequel.
- **Le widget dit qu'il n'y a pas de marché** : aucun marché dans la distance maximale ne se tient
  aujourd'hui ; augmentez la distance au besoin.
- **« Horaires illisibles »** : la source a publié des horaires que l'intégration ne lit pas (elle ne
  devine jamais) : dites-le sur le forum.
- **Une ville est indisponible** : les derniers jours lus sont gardés ; nouvel essai une heure plus
  tard.
- Logs : dans l'écran de l'intégration, ou `LOG_LEVEL=debug` pour chaque lecture.

## Limites

- Trois villes seulement : Lyon, Bordeaux, Nantes, Rennes et les autres ne publient pas aujourd'hui
  les jours et horaires de leurs marchés en open data. Signalez-nous une autre source.
- Le jeu de Toulouse couvre la ville de Toulouse, pas toute la métropole ; ses marchés n'ont pas
  d'identifiant, le nom en sert.
- Paris couvre ses marchés découverts ; ses marchés couverts ne sont pas dans le jeu de données.
- Développée sans visiter les marchés : vos retours sont les bienvenus.

## Crédits

Données : Ville de Paris (ODbL), Mairie de Toulouse et Ville et Eurométropole de Strasbourg (Licence
Ouverte). Construite sur le [SDK d'intégration Gladys](https://github.com/GladysAssistant/integration-sdk-js).
