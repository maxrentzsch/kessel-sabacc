import type { TableDef } from './tables'

/**
 * The story is told in short scenes around the tables: somebody says a line,
 * the player taps on. `who` is a character id, `you` for the player, or
 * `null` for the narrator.
 */
export interface Line {
  who: string | null
  text: string
  mood?: 'happy' | 'smug' | 'angry' | 'worried' | 'thinking'
}

export const YOU = 'you'

/** How it all starts: shown once, before the first table. */
export const PROLOGUE_SCENE: Line[] = [
  { who: null, text: 'Der Kessel-Sektor. Wer hier Schulden hat, zahlt – oder spielt.' },
  { who: 'oshi', mood: 'smug', text: 'Dein Frachter steht jetzt in meinem Hangar. Ein hübsches Pfand für eine hässliche Summe.' },
  { who: YOU, text: 'Die Sandläufer ist alles, was ich habe.' },
  { who: 'oshi', text: 'Dann hol sie dir zurück. Gewinn die Kessel-Krone, und sie gehört wieder dir. Bis dahin: viel Glück an den Kindertischen.' },
  { who: null, text: '150 Credits, drei abgegriffene Shift-Tokens – und sechs Spielhöllen zwischen dir und deinem Schiff.' },
]

/** Somebody at the table who has something to add to the rival's welcome. */
const ARRIVAL: Record<string, { place: string; reply: Line }> = {
  anchor: {
    place: 'Schrottwerft Tarsk. Es riecht nach Schweißbrenner und kaltem Kaf.',
    reply: { who: YOU, text: 'Kleingeld ist ein Anfang.' },
  },
  dune: {
    place: 'Karawanenhof Mehr. Draußen heult der Sand, drinnen wird um Wasserrechte gespielt.',
    reply: { who: 'mira', mood: 'happy', text: 'Hör nicht auf ihn. Setz dich – hier ist noch niemand verdurstet. Nur pleitegegangen.' },
  },
  haze: {
    place: 'Dock 9, Unterstadt. Der Nebel kommt aus den Kühlrohren, sagen sie.',
    reply: { who: 'zula', text: 'Und ich prüfe, ob du zahlen kannst. Zweimal.' },
  },
  lodge: {
    place: 'Das Hinterzimmer der „Lange Nacht“. Die Tür hat innen keinen Griff.',
    reply: { who: 'ilsa', mood: 'smug', text: 'Er meint das als Kompliment.' },
  },
  salon: {
    place: 'Orbitalstation Vael. Samt, Messing, und jeder Schritt wird protokolliert.',
    reply: { who: 'dray', text: 'Das Syndikat verliert nicht gern. Ich auch nicht.' },
  },
  crown: {
    place: 'Das High-Roller-Turnier. Hinter der Glaswand steht die Sandläufer – poliert, betankt, unerreichbar.',
    reply: { who: YOU, text: 'Dann fangen wir an.' },
  },
}

/** Sitting down at a table for the first time. */
export function arrivalScene(table: TableDef): Line[] {
  const extra = ARRIVAL[table.id]
  const welcome: Line = { who: table.rival, text: table.intro }
  return extra ? [{ who: null, text: extra.place }, welcome, extra.reply] : [welcome]
}

const VICTORY: Record<string, Line[]> = {
  anchor: [
    { who: 'pim', mood: 'happy', text: 'Sag ich doch: Talent! Nimm die Linienfähre nach Mehr – und grüß die Dünen von mir.' },
    { who: null, text: 'Zwei neue Shift-Tokens in der Tasche, und ein Name mehr, der sich herumspricht.' },
  ],
  dune: [
    { who: 'brakk', mood: 'angry', text: 'Das war mein Stammtisch. War.' },
    { who: 'mira', text: 'Im Nebelhafen sitzt der alte Kessk. Der hat Oshi noch spielen sehen, als sie verlieren konnte. Frag ihn – wenn du ihn schlägst.' },
  ],
  haze: [
    { who: 'kessk', mood: 'thinking', text: 'Oshi zählt keine Karten. Sie zählt Menschen. Merk dir das.' },
    { who: null, text: 'Unter dem Tisch schiebt er dir einen Zettel zu: eine Adresse, ein Klopfzeichen.' },
  ],
  lodge: [
    { who: 'tevin', mood: 'smug', text: 'Du spielst fast so unsauber wie ich. Das Syndikat mag so was.' },
    { who: 'ilsa', text: 'Vael, oberer Ring. Sag, K-7 erwartet dich. Tut er nicht – aber es öffnet Türen.' },
  ],
  salon: [
    { who: 'unit7', mood: 'worried', text: 'Ergebnis archiviert. Wahrscheinlichkeit Ihres Erfolgs an der Kessel-Krone: wird neu berechnet.' },
    { who: 'oshi', mood: 'smug', text: 'Du hast es also wirklich bis hierher geschafft. Komm. Dein Schiff wartet – hinter Glas.' },
  ],
  crown: [
    { who: null, text: 'Die letzte Karte fällt. Im Saal ist es still.' },
    { who: 'oshi', mood: 'worried', text: 'Neun Jahre.' },
    { who: 'oshi', text: '… Die Schlüssel liegen im Hangar. Flieg, bevor ich es mir anders überlege.' },
    { who: YOU, text: 'Danke für das Spiel.' },
    { who: 'oshi', mood: 'smug', text: 'Bedank dich nicht. Komm wieder. Als Legende – oder gar nicht.' },
    { who: null, text: 'Die Triebwerke der Sandläufer husten. Dann singen sie, und unter dir wird Kessel klein.' },
    { who: null, text: 'Sie fliegt wieder.' },
  ],
}

/** After the first win at a table, back on the map. */
export function victoryScene(table: TableDef): Line[] {
  return VICTORY[table.id] ?? [{ who: table.rival, text: table.outro }]
}
