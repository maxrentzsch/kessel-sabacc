import type { Syndicate } from './syndicates'
import { FIELD, TABLES } from './tables'
import type { TableDef } from './tables'
import { tx } from '../i18n'

/**
 * The story is told in short scenes around the tables: somebody says a line,
 * the player taps on. `who` is a character id, `you` for the player, one of
 * the three animals of Tarsk, or `null` for the narrator.
 */
export interface Line {
  who: string | null
  text: string
  mood?: 'happy' | 'smug' | 'angry' | 'worried' | 'thinking'
}

export const YOU = 'you'

/** Bix speaks as whichever animal came along. */
export const BIX = 'bix'

/** The animals of Tarsk; one of them comes along as Bix. */
export const ANIMALS = ['vulptex', 'lothcat', 'convor'] as const
export type Animal = (typeof ANIMALS)[number]

/** Something the story changes: a fact to remember, credits handed over, or which animal comes along. */
export type Effect = { flag: string } | { credits: number } | { bix: Animal } | { standing: Syndicate; delta: number }

/** An answer the player can give at the end of a scene. */
export interface Choice {
  text: string
  effects?: Effect[]
  /** the scene that follows this answer */
  next?: string
}

/** A piece of the story, with what it changes and what may follow it. */
export interface Scene {
  id: string
  title: string
  /** whose room it plays in, see career/venues */
  venue: string
  lines: Line[]
  /** what playing the scene to its end changes; every scene also remembers that it was seen */
  effects?: Effect[]
  /** answers at the end; without them the scene closes with a tap */
  choices?: Choice[]
  /** the scene that follows when there are no answers */
  next?: string
  /** a sequence that plays once the scene is over, before anything else */
  cinematic?: 'launch'
}

/** Somebody at the table who has something to add to the rival's welcome. */
const ARRIVAL: Record<string, { place: string; reply: Line }> = {
  anchor: {
    place: tx`Schrottwerft Tarsk. Es riecht nach Schweißbrenner und kaltem Kaf.`,
    reply: { who: YOU, text: tx`Kleingeld ist ein Anfang.` },
  },
  dune: {
    place: tx`Karawanenhof Mehr. Draußen heult der Sand, drinnen wird um Wasserrechte gespielt.`,
    reply: { who: 'mira', mood: 'happy', text: tx`Hör nicht auf ihn. Setz dich – hier ist noch niemand verdurstet. Nur pleitegegangen.` },
  },
  haze: {
    place: tx`Dock 9, Unterstadt. Der Nebel kommt aus den Kühlrohren, sagen sie.`,
    reply: { who: 'zula', text: tx`Und ich prüfe, ob du zahlen kannst. Zweimal.` },
  },
  lodge: {
    place: tx`Schmugglermond Varr. Das Hinterzimmer der „Lange Nacht“. Die Tür hat innen keinen Griff.`,
    reply: { who: 'ilsa', mood: 'smug', text: tx`Er meint das als Kompliment.` },
  },
  lump: {
    place: tx`Der Brocken. Ein Asteroid, ausgehöhlt bis auf die Haut. Die Luft riecht nach Ozon und Wetteinsätzen.`,
    reply: { who: 'lio', mood: 'happy', text: tx`Lass dich nicht von Sesk einschüchtern. Er verliert nur ungern im eigenen Fels.` },
  },
  mine: {
    place: tx`Schacht 4, tief unter Kessel. Gewürzstaub in jeder Ritze, und die Lampen flackern im Takt der Pumpen.`,
    reply: { who: 'tok', text: tx`Ich spiel um meine Lohnmarken. Du um was?` },
  },
  hangar: {
    place: tx`Oshis Hangar. Zwischen gepfändeten Schiffen steht ein Tisch, und darüber hängt eine einzelne Lampe.`,
    reply: { who: 'unit7', text: tx`Ihr Schuldstand wurde vermerkt. Viel Glück.` },
  },
  salon: {
    place: tx`Orbitalstation Vael. Samt, Messing, und jeder Schritt wird protokolliert.`,
    reply: { who: 'dray', text: tx`Das Syndikat verliert nicht gern. Ich auch nicht.` },
  },
  crown: {
    place: tx`Das High-Roller-Turnier in Oshis Palast. Draußen am Dock wartet die Sandläufer, die Siegel noch am Hyperantrieb.`,
    reply: { who: YOU, text: tx`Dann fangen wir an.` },
  },
}

/**
 * On Tarsk every table brings one of the three animals and one thing to learn.
 * These lines follow the welcome.
 */
const ON_TARSK: Record<string, Line[]> = {
  anchor: [
    { who: null, text: tx`Unter Pims Werkbank klirrt es. Etwas Weißes mit rostroten Kristallen schnappt sich einen deiner Chips – und ist weg.` },
    { who: 'vulptex', text: tx`Kliiirr!` },
    { who: 'pim', mood: 'happy', text: tx`Ein Vulptex. Frisst Metallstaub, davon die roten Kristalle. Und klaut alles, was glänzt.` },
    { who: 'pim', text: tx`Kennst du die Regeln, oder soll ich dir erst eine Übungshand zeigen?` },
  ],
  dune: [
    { who: null, text: tx`Zwischen den Kornsäcken faucht es. Ein Kätzchen mit riesigen Ohren macht einen Buckel – gegen Brakk.` },
    { who: 'lothcat', text: tx`Ffffft!` },
    { who: 'brakk', mood: 'angry', text: tx`Verdammte Loth-Katzen. Die Händler schleppen sie überall mit hin.` },
    { who: 'mira', mood: 'happy', text: tx`Die bewachen das Korn. Und anscheinend dich. Noch ein Rat: Spiel deine Shift-Tokens nicht alle in der ersten Runde.` },
  ],
  haze: [
    { who: null, text: tx`Über dem Tisch hängt ein Küken an seinem eigenen Schwanz von der Lampe und folgt jeder Karte mit riesigen Augen.` },
    { who: 'convor', text: tx`Gurr?` },
    { who: 'kessk', mood: 'thinking', text: tx`Ein Convor. Sieht mehr als ich. Und ich sehe viel – auch, wenn jemand in fremde Karten schielt. Wer zu oft schaut, fliegt auf.` },
  ],
}

/** Sitting down at a table for the first time. */
export function arrivalScene(table: TableDef): Line[] {
  const extra = ARRIVAL[table.id]
  const welcome: Line = { who: table.rival, text: table.intro }
  return [...(extra ? [{ who: null, text: extra.place }, welcome, extra.reply] : [welcome]), ...(ON_TARSK[table.id] ?? [])]
}

const VICTORY: Record<string, Line[]> = {
  anchor: [
    { who: 'pim', mood: 'happy', text: tx`Sag ich doch: Talent! Nimm meinen Speeder – im Karawanenhof Mehr zahlen sie besser.` },
    { who: null, text: tx`Zwei neue Shift-Tokens in der Tasche, und ein Name mehr, der sich herumspricht.` },
  ],
  dune: [
    { who: 'brakk', mood: 'angry', text: tx`Das war mein Stammtisch. War.` },
    { who: 'mira', text: tx`Im Nebelhafen sitzt der alte Kessk. Der hat Oshi noch spielen sehen, als sie verlieren konnte. Frag ihn – wenn du ihn schlägst.` },
    { who: 'mira', mood: 'worried', text: tx`So eine Glückssträhne könnte ich auch gebrauchen.` },
  ],
  haze: [
    { who: 'kessk', mood: 'thinking', text: tx`Oshi zählt keine Karten. Sie zählt Menschen. Merk dir das.` },
    { who: null, text: tx`Da steht Mira in der Tür, außer Atem.` },
    { who: 'mira', mood: 'worried', text: tx`Ich brauche 2.000 Credits bis morgen früh. Ich setze meinen Frachter dagegen. Eine Partie, heute Nacht, auf dem Landefeld.` },
    { who: YOU, text: tx`So viel hab ich nicht.` },
    { who: 'kessk', text: tx`Aber ich. Und Pim legt den Rest dazu. Gewinn – und zahl es uns zurück, wenn du reich bist.` },
    { who: null, text: tx`Mitternacht. Landefeld. Ein Frachter gegen 2.000 geliehene Credits.` },
  ],
  lodge: [
    { who: 'tevin', mood: 'smug', text: tx`Du spielst fast so unsauber wie ich. Die Glasfinger mögen so was.` },
    { who: 'ilsa', text: tx`Im Brocken findest du größere Tische. Und an jedem Brett hängen Aufträge – wenn du Geld brauchst.` },
  ],
  lump: [
    { who: 'sesk', mood: 'angry', text: tx`Gewinner sind schlecht fürs Geschäft. Aber gut fürs Gerede.` },
    { who: 'lio', mood: 'happy', text: tx`In der Gewürzmine auf Kessel spielen sie um Lohn. Hart, aber ehrlich. Meistens.` },
  ],
  mine: [
    { who: 'varra', mood: 'thinking', text: tx`Du hältst durch. Das gefällt mir.` },
    { who: 'varra', text: tx`Hör zu: Auf Vael sitzt das Rote Siegel. Die zahlen gut – und sie merken sich jeden, der gewinnt.` },
  ],
  salon: [
    { who: 'unit7', mood: 'worried', text: tx`Ergebnis archiviert. Wahrscheinlichkeit Ihres Erfolgs an der Kessel-Krone: wird neu berechnet.` },
    { who: 'oshi', mood: 'smug', text: tx`Du hast es also wirklich bis hierher geschafft. Komm in meinen Hangar. Ich will sehen, wie du dort spielst.` },
  ],
  hangar: [
    { who: 'grex', mood: 'angry', text: tx`Das war Glück. Nichts weiter.` },
    { who: null, text: tx`Während Grex die Chips einsammelt, verschwindet Bix zwischen den Kisten der gepfändeten Schiffe. Dann kommt es zurück, etwas Glänzendes im Maul.` },
    { who: 'bix', text: tx`…!` },
    { who: null, text: tx`Ein Siegel mit Oshis Wappen. Darunter ein Pfändungsbescheid – auf Mira Sol. Datiert eine Woche vor der Partie, in der sie angeblich alles verlor.` },
    { who: YOU, text: tx`Oshi hat das Schiff gepfändet, bevor Mira es verspielt hat?` },
    { who: null, text: tx`Über dem Tisch flackert Kessks Gesicht als Holo auf.` },
    { who: 'kessk', mood: 'thinking', text: tx`Dann war die Partie gezinkt. Ich hab's geahnt. Oshi wollte nie das Geld. Sie wollte die Sandläufer.` },
    { who: YOU, text: tx`Warum ausgerechnet diesen Schrotthaufen?` },
    { who: 'kessk', text: tx`Vor dreißig Jahren verschwand eine Casino-Station samt Tresor: die Leere Krone. Ihre Koordinaten stecken angeblich in einem alten Navcomputer. Rate mal, in welchem.` },
    { who: 'mira', mood: 'worried', text: tx`… Ich hab's nicht gewusst. Ich schwöre es.` },
  ],
  crown: [
    { who: null, text: tx`Die letzte Karte fällt. Im Saal ist es still.` },
    { who: 'oshi', mood: 'worried', text: tx`Neun Jahre.` },
    { who: 'oshi', text: tx`… Die Sperre ist aufgehoben. Flieg, wohin du willst. Die Schuld fliegt mit.` },
    { who: YOU, text: tx`Danke für das Spiel.` },
    { who: 'oshi', mood: 'smug', text: tx`Bedank dich nicht. Komm wieder. Als Legende – oder gar nicht.` },
    { who: null, text: tx`Die Siegel fallen vom Hyperantrieb. Zum ersten Mal ist der Weg aus dem Sektor frei.` },
    { who: 'oshi', mood: 'thinking', text: tx`Ein Vorschlag, ehe du gehst: Fliege für mich. Kurierdienste, keine Fragen. Dafür werden deine Raten kleiner.` },
  ],
}

/** After the Kessel Crown: Oshi's offer, accepted or refused. */
const OSHI_OFFER: Choice[] = [
  { text: tx`Abgemacht. Ich fliege für dich.`, effects: [{ flag: 'oshi-courier' }, { standing: 'oshi', delta: 1 }] },
  { text: tx`Nein. Ich zahle meine Schuld – und fliege, für wen ich will.`, effects: [{ flag: 'oshi-refused' }, { standing: 'oshi', delta: -1 }] },
]

/** Pim and Kessk have their stake back. */
const REPAID: Line[] = [
  { who: 'pim', mood: 'happy', text: tx`Zweitausend, auf den Credit genau. Weißt du, wie selten das hier ist?` },
  { who: 'pim', text: tx`Ab jetzt bau ich dir alles zum Freundschaftspreis ein. Komm einfach in die Werft.` },
  { who: 'kessk', mood: 'thinking', text: tx`Und ich hab nie daran gezweifelt. Fast nie.` },
]

/** After the first win at a table, back on the map. */
export function victoryScene(table: TableDef): Line[] {
  return VICTORY[table.id] ?? [{ who: table.rival, text: table.outro }]
}

// ── Tarsk: how it all starts ──────────────────────────────────────────────────

const OPENING: Line[] = [
  { who: null, text: tx`Tarsk. Ein Wüstenplanet am Rand des Kessel-Sektors. Wer hier strandet, bleibt meistens.` },
  { who: YOU, text: tx`Drei Jahre Schrott sortieren. Abends Karten. Und nie genug Credits für eine Passage.` },
  { who: 'pim', mood: 'happy', text: tx`Heute Abend ist Kartenrunde im Anker. Kleingeld, große Klappe. Komm vorbei!` },
  { who: null, text: tx`150 Credits, drei abgegriffene Shift-Tokens. Und irgendwo da oben die Sterne.` },
]

/** On the way to the stake game: which way the player rides decides, unknowingly, which animal comes along. */
const RIDE: Line[] = [
  { who: null, text: tx`Mitternacht. Vom Süden zieht ein Sandsturm auf, und Mira wartet auf dem Landefeld.` },
  { who: null, text: tx`Unter Pims Werkbank klirrt es noch.` },
  { who: 'vulptex', text: tx`Kliiirr.` },
  { who: null, text: tx`Im Karawanenhof faucht es aus den Kornsäcken.` },
  { who: 'lothcat', text: tx`Fft.` },
  { who: null, text: tx`Und in Dock 9 gurrt es von der Lampe.` },
  { who: 'convor', text: tx`Gurr.` },
  { who: YOU, text: tx`Welchen Weg nehme ich?` },
]

const RIDE_CHOICES = (next: (animal: Animal) => string): Choice[] => [
  { text: tx`Am Schrottplatz vorbei – Pim wollte mir seinen Glückschip mitgeben`, effects: [{ bix: 'vulptex' }], next: next('vulptex') },
  { text: tx`Über die Dünen – das ist schneller`, effects: [{ bix: 'lothcat' }], next: next('lothcat') },
  { text: tx`Durch die Kühltunnel – da erwischt mich der Sturm nicht`, effects: [{ bix: 'convor' }], next: next('convor') },
]

const RIDE_ON: Record<Animal, Line[]> = {
  vulptex: [
    { who: 'pim', mood: 'happy', text: tx`Für Glück. Und bring ihn mir zurück, hörst du?` },
    { who: null, text: tx`Irgendetwas klirrt in deiner Jackentasche. Keine Zeit, nachzusehen.` },
  ],
  lothcat: [
    { who: null, text: tx`Der Speeder jagt über die Dünenkämme. Hinter dir, im Sturm, ein leises Fiepen – dann nichts mehr.` },
    { who: null, text: tx`Am Horizont: Miras Frachter, eine dunkle Silhouette vor den Positionslichtern.` },
  ],
  convor: [
    { who: null, text: tx`In den Kühltunneln ist es warm und still. Hinter einer Biegung: Brakks Stimme.` },
    { who: 'brakk', text: tx`… Oshi will das Schiff. Heute Nacht noch.` },
    { who: null, text: tx`Am Motor deines Speeders raschelt etwas. Du fährst weiter.` },
  ],
}

/** After the stake game: the ship, the debt that comes with it, and the animal that shows itself. */
const STAKE_WON = (animal: Animal): Line[] => [
  { who: null, text: tx`Die letzte Karte fällt. Mira starrt auf den Tisch.` },
  { who: 'mira', mood: 'worried', text: tx`Sie gehört dir. Pass gut auf sie auf.` },
  { who: null, text: tx`Aus dem Schatten tritt Brakk, einen Datenblock in der Hand.` },
  { who: 'brakk', mood: 'smug', text: tx`Glückwunsch. Mit dem Schiff gehört dir auch das hier: Oshis Schuldschein. Vierzigtausend, auf den Rumpf eingetragen.` },
  { who: YOU, text: tx`Das ist Miras Schuld, nicht meine!` },
  { who: 'brakk', text: tx`Auf Tarsk hängt eine Schuld am Schiff. Nicht am Piloten.` },
  ...{
    vulptex: [
      { who: null, text: tx`Da klirrt es in deiner Jacke. Ein Vulptex springt heraus, schnappt Brakk den Stift aus der Hand und ist unter dem Frachter verschwunden.` },
      { who: 'vulptex', text: tx`Kliiirr!` },
    ],
    lothcat: [
      { who: null, text: tx`Aus dem Gepäcknetz deines Speeders faucht es. Das Loth-Kätzchen springt Brakk mit gesträubtem Fell auf den Stiefel.` },
      { who: 'lothcat', text: tx`Ffffft!` },
    ],
    convor: [
      { who: null, text: tx`Vom Motor deines Speeders flattert etwas hoch und landet kreischend auf Brakks Kopf: das Convor-Küken.` },
      { who: 'convor', text: tx`Kriiieh!` },
    ],
  }[animal],
  { who: 'brakk', mood: 'angry', text: tx`Schafft mir das Vieh vom Hals!` },
  { who: 'mira', mood: 'happy', text: tx`Das nimmst du wohl mit. Nenn es Bix, so hieß mein erster Frachter.` },
  { who: 'mira', text: tx`Und ich? Ich kenne jedes Geräusch, das sie macht. Ich fliege.` },
]

/** Once the launch is over: Oshi makes sure the ship does not get far. */
const JUMP_LOCK: Line[] = [
  { who: 'oshi', mood: 'smug', text: tx`Nicht so schnell.` },
  { who: 'oshi', text: tx`Meine Mechaniker haben deinen Hyperantrieb versiegelt. Er springt nur im Kessel-Sektor.` },
  { who: 'oshi', mood: 'smug', text: tx`Die Siegel fallen, wenn du an meinem Tisch bestehst: der Kessel-Krone. Und setz dich erst hin, wenn die erste Rate bezahlt ist – sechstausend.` },
  { who: null, text: tx`Die Sternkarte leuchtet auf. Drei Ziele. Ein Schiff. Eine Schuld.` },
]

/** For careers from before the story began on Tarsk: the night the ship was won, told once. */
const FLASHBACK: Line[] = [
  { who: null, text: tx`Rückblick. Die Nacht auf dem Landefeld von Tarsk, in der die Sandläufer deine wurde.` },
  { who: null, text: tx`In jener Nacht klirrte es unter Pims Werkbank, es fauchte aus den Kornsäcken, und es gurrte von der Lampe in Dock 9.` },
  { who: YOU, text: tx`Welchen Weg bin ich damals gefahren?` },
]

const TARSK_SCENES: Scene[] = [
  { id: 'prologue-tarsk', title: tx`Tarsk`, venue: 'anchor', lines: OPENING },
  { id: 'ride', title: tx`Die Nacht des Pfandspiels`, venue: 'field', lines: RIDE, choices: RIDE_CHOICES((animal) => `ride-${animal}`) },
  ...ANIMALS.map((animal): Scene => ({ id: `ride-${animal}`, title: tx`Die Nacht des Pfandspiels`, venue: 'field', lines: RIDE_ON[animal], next: `intro-${FIELD.id}` })),
  { id: `intro-${FIELD.id}`, title: FIELD.name, venue: 'field', lines: [{ who: 'mira', text: FIELD.intro }] },
  ...ANIMALS.map((animal): Scene => ({ id: `win-${FIELD.id}-${animal}`, title: FIELD.name, venue: 'field', lines: STAKE_WON(animal), cinematic: 'launch' })),
  { id: 'flashback', title: tx`Rückblick`, venue: 'field', lines: FLASHBACK, choices: RIDE_CHOICES((animal) => `win-${FIELD.id}-${animal}`) },
  { id: 'jump-lock', title: tx`Die Sperre`, venue: 'crown', lines: JUMP_LOCK },
  { id: 'repaid', title: tx`Zum Rostigen Anker`, venue: 'anchor', lines: REPAID },
]

/** The table the player chose to practise at first: the anchor asks before the first game. */
const PRACTICE_CHOICES: Choice[] = [
  { text: tx`Zeig mir erst, wie es geht`, effects: [{ flag: 'practice' }] },
  { text: tx`Ich kenne die Regeln`, effects: [{ flag: 'practice-skipped' }] },
]

/**
 * Every scene of the story by its id. A scene's id is also the fact that
 * it has been seen, kept in the career's `storySeen`.
 */
export const SCENES: Record<string, Scene> = Object.fromEntries(
  [
    ...TARSK_SCENES,
    ...TABLES.flatMap((table): Scene[] => [
      {
        id: `intro-${table.id}`,
        title: table.name,
        venue: table.id,
        lines: arrivalScene(table),
        ...(table.id === 'anchor' ? { choices: PRACTICE_CHOICES } : {}),
      },
      { id: `win-${table.id}`, title: table.name, venue: table.id, lines: victoryScene(table), ...(table.id === 'crown' ? { choices: OSHI_OFFER } : {}) },
    ]),
  ].map((scene) => [scene.id, scene]),
)

/** Scenes that something in the game sets off; every other scene is reached from one of these. */
export const TRIGGERS: string[] = [
  'prologue-tarsk',
  'ride',
  'flashback',
  'jump-lock',
  'repaid',
  ...ANIMALS.map((animal) => `win-${FIELD.id}-${animal}`),
  ...TABLES.flatMap((table) => [`intro-${table.id}`, `win-${table.id}`]),
]

/** Everything a scene and the answer given to it change, the scene's own id first. */
export function effectsOf(scene: Scene, choice?: Choice): Effect[] {
  return [{ flag: scene.id }, ...(scene.effects ?? []), ...(choice?.effects ?? [])]
}
