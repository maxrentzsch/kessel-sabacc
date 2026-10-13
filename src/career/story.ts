import type { TableDef } from './tables'
import { tx } from '../i18n'

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
  { who: null, text: tx`Der Kessel-Sektor. Wer hier Schulden hat, zahlt – oder spielt.` },
  { who: 'oshi', mood: 'smug', text: tx`Dein Frachter steht jetzt in meinem Hangar. Ein hübsches Pfand für eine hässliche Summe.` },
  { who: YOU, text: tx`Die Sandläufer ist alles, was ich habe.` },
  { who: 'oshi', text: tx`Dann hol sie dir zurück. Gewinn die Kessel-Krone, und sie gehört wieder dir. Bis dahin: viel Glück an den Kindertischen.` },
  { who: null, text: tx`150 Credits, drei abgegriffene Shift-Tokens – und sechs Spielhöllen zwischen dir und deinem Schiff.` },
]

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
    place: tx`Das Hinterzimmer der „Lange Nacht“. Die Tür hat innen keinen Griff.`,
    reply: { who: 'ilsa', mood: 'smug', text: tx`Er meint das als Kompliment.` },
  },
  salon: {
    place: tx`Orbitalstation Vael. Samt, Messing, und jeder Schritt wird protokolliert.`,
    reply: { who: 'dray', text: tx`Das Syndikat verliert nicht gern. Ich auch nicht.` },
  },
  crown: {
    place: tx`Das High-Roller-Turnier. Hinter der Glaswand steht die Sandläufer – poliert, betankt, unerreichbar.`,
    reply: { who: YOU, text: tx`Dann fangen wir an.` },
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
    { who: 'pim', mood: 'happy', text: tx`Sag ich doch: Talent! Nimm die Linienfähre nach Mehr – und grüß die Dünen von mir.` },
    { who: null, text: tx`Zwei neue Shift-Tokens in der Tasche, und ein Name mehr, der sich herumspricht.` },
  ],
  dune: [
    { who: 'brakk', mood: 'angry', text: tx`Das war mein Stammtisch. War.` },
    { who: 'mira', text: tx`Im Nebelhafen sitzt der alte Kessk. Der hat Oshi noch spielen sehen, als sie verlieren konnte. Frag ihn – wenn du ihn schlägst.` },
  ],
  haze: [
    { who: 'kessk', mood: 'thinking', text: tx`Oshi zählt keine Karten. Sie zählt Menschen. Merk dir das.` },
    { who: null, text: tx`Unter dem Tisch schiebt er dir einen Zettel zu: eine Adresse, ein Klopfzeichen.` },
  ],
  lodge: [
    { who: 'tevin', mood: 'smug', text: tx`Du spielst fast so unsauber wie ich. Das Syndikat mag so was.` },
    { who: 'ilsa', text: tx`Vael, oberer Ring. Sag, K-7 erwartet dich. Tut er nicht – aber es öffnet Türen.` },
  ],
  salon: [
    { who: 'unit7', mood: 'worried', text: tx`Ergebnis archiviert. Wahrscheinlichkeit Ihres Erfolgs an der Kessel-Krone: wird neu berechnet.` },
    { who: 'oshi', mood: 'smug', text: tx`Du hast es also wirklich bis hierher geschafft. Komm. Dein Schiff wartet – hinter Glas.` },
  ],
  crown: [
    { who: null, text: tx`Die letzte Karte fällt. Im Saal ist es still.` },
    { who: 'oshi', mood: 'worried', text: tx`Neun Jahre.` },
    { who: 'oshi', text: tx`… Die Schlüssel liegen im Hangar. Flieg, bevor ich es mir anders überlege.` },
    { who: YOU, text: tx`Danke für das Spiel.` },
    { who: 'oshi', mood: 'smug', text: tx`Bedank dich nicht. Komm wieder. Als Legende – oder gar nicht.` },
    { who: null, text: tx`Die Triebwerke der Sandläufer husten. Dann singen sie, und unter dir wird Kessel klein.` },
    { who: null, text: tx`Sie fliegt wieder.` },
  ],
}

/** After the first win at a table, back on the map. */
export function victoryScene(table: TableDef): Line[] {
  return VICTORY[table.id] ?? [{ who: table.rival, text: table.outro }]
}
