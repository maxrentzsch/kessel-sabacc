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
  hallis1: {
    place: tx`Werft Hallis. Zwischen zwei Rümpfen im Trockendock steht die Kantine, und in der Kantine ein Tisch voller Karten, die du nicht kennst.`,
    reply: { who: 'rook', mood: 'happy', text: tx`Ein Neuer! Endlich verliert mal jemand anders.` },
  },
  hallis2: {
    place: tx`Mittagspause in der Kantine. Jemand hat Chips auf den Tisch gelegt – richtige Chips diesmal.`,
    reply: { who: 'mags', text: tx`Ab hier kostet Zögern. Langsam und gerade, dann passiert dir nichts.` },
  },
  hallis3: {
    place: tx`Schichtende. Die Schweißer kommen herein, und Dessa holt die Spike-Würfel aus der Schublade.`,
    reply: { who: 'rook', text: tx`Jetzt wird's laut.` },
  },
  convoy: {
    place: tx`Der Laderaum der „Lange Leine“, zwischen zwei Sprüngen. Durch die Luken zuckt blaues Licht.`,
    reply: { who: 'ilsa', mood: 'smug', text: tx`Na sieh an. Der Pilot aus der Loge. Die Route ist kleiner, als man denkt.` },
  },
  swoop: {
    place: tx`Teska. Unter der Bar donnern die Swoops vorbei, und die Gläser zittern im Takt.`,
    reply: { who: 'harl', text: tx`Ich hab schon eine Quote auf dich. Keine gute.` },
  },
  barge: {
    place: tx`Die Gasbarke „Corona“ treibt durch bernsteinfarbene Wolken. Unten, sehr weit unten, glüht der Kern von Yavvis.`,
    reply: { who: 'tevin', mood: 'smug', text: tx`Du schon wieder. Die Glasfinger haben eine Akte über dich angelegt, weißt du das?` },
  },
  archive: {
    place: tx`Datenstation Mirr. Regale bis unter die Decke, und auf jedem Datenkristall ein Geheimnis, das jemand teuer bezahlt hat.`,
    reply: { who: 'juno', text: tx`Pssst. Hier darf man nicht mal laut gewinnen.` },
  },
  casino: {
    place: tx`Das Große Casino des Roten Siegels. Kristall, Samt, und an jeder Tür zwei Wachen in Rot.`,
    reply: { who: 'dray', mood: 'smug', text: tx`Ich hab auf dich gewartet. Das Siegel will die Navdaten. Und ich will mein Duell.` },
  },
  banquet: {
    place: tx`Das Bankett der Händler. Eine Tafel so lang wie ein Frachter, und am Kopfende Corvin Ashe.`,
    reply: { who: 'veyra', text: tx`Das Siegel spielt mit. Natürlich.` },
  },
  level1: {
    place: tx`Ebene 1313. Kein Tageslicht seit tausend Jahren, aber eine Spielhalle, die nie schließt.`,
    reply: { who: 'pix', mood: 'happy', text: tx`Frisches Geld von oben! Setz dich, setz dich.` },
  },
  level2: {
    place: tx`Der zweite Tisch der Spielhalle, unter einer flackernden Röhre.`,
    reply: { who: 'grell', text: tx`Vierzig Jahre spiel ich hier. Die Farbe hat mich öfter gerettet als die Zahl.` },
  },
  level3: {
    place: tx`Das Hinterzimmer. Rauch, ein runder Tisch und Orrins eigene Würfel.`,
    reply: { who: 'pix', text: tx`Jetzt wird's ernst. Hier wird gesetzt.` },
  },
  penthouse: {
    place: tx`Ebene 4000. Über den Wolken, hinter Glas, spielen die Berater des Senats.`,
    reply: { who: 'nessa', mood: 'smug', text: tx`Lächeln Sie. Hier oben wird alles gesehen.` },
  },
  yacht: {
    place: tx`Die „Aurora“ im Orbit. Unter den Fenstern leuchtet Coruscant, und an Oshis Seite surrt K-7.`,
    reply: { who: 'k7', text: tx`Gast erfasst. Offener Schuldstand: vermerkt.` },
  },
  customs: {
    place: tx`Der Zollhangar am Westportal. Weißes Licht, graue Kisten, und Zula in Garnisonsuniform.`,
    reply: { who: 'sable', text: tx`Die Glasfinger wollen die Protokolle auch. Wir spielen darum, wer zuerst liest.` },
  },
  arena: {
    place: tx`Die Arena der Spieler. Tausend Gesichter im Dunkeln, ein Tisch im Licht, jede Karte auf der Holowand.`,
    reply: { who: 'dray', mood: 'smug', text: tx`Wir sehen uns wieder, Pilot. Diesmal vor Publikum.` },
  },
  residence: {
    place: tx`Der Kristallturm des Hauses Aurel. Ganz oben, wo die Luft dünn und das Geld alt ist.`,
    reply: { who: 'oshi', mood: 'smug', text: tx`Sieh an. Wir wollen beide dasselbe. Wie unangenehm.` },
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
  const welcome: Line = { who: table.host ?? table.rival, text: table.intro }
  return [...(extra ? [{ who: null, text: extra.place }, welcome, extra.reply] : [welcome]), ...(ON_TARSK[table.id] ?? [])]
}

const VICTORY: Record<string, Line[]> = {
  level1: [
    { who: 'orrin', text: tx`Sie treffen die Zahl. Gut. Wissen Sie, warum ich Ihnen das beibringe?` },
    { who: 'orrin', mood: 'thinking', text: tx`Ich war Croupier auf der Leeren Krone. Vor dreißig Jahren. Ich habe gesehen, wie sie verschwand.` },
  ],
  level2: [
    { who: 'grell', text: tx`Die Farbe. Hab ich doch gesagt.` },
    { who: 'orrin', text: tx`Im Hinterzimmer wird gesetzt. Und danach erzähle ich Ihnen, wer den Code der Krone hat.` },
  ],
  level3: [
    { who: 'orrin', mood: 'happy', text: tx`Mehr kann ich Ihnen nicht beibringen.` },
    { who: 'orrin', mood: 'thinking', text: tx`Die Krone gehörte dem Haus Aurel. Ihr Peilsender antwortet nur auf einen Code, und den hütet die Erbin, oben im Kristallturm.` },
    { who: 'orrin', text: tx`Bis dahin führt der Weg durch die Berater, Oshis Gala, den Zoll und die Arena. Und passen Sie auf die Garnison auf.` },
  ],
  penthouse: [
    { who: 'aldric', mood: 'angry', text: tx`Ich habe Sie unterschätzt.` },
    { who: 'nessa', text: tx`Madame Oshi gibt morgen eine Gala auf der „Aurora“. Sie sind eingeladen. Ob Sie wollen oder nicht.` },
  ],
  yacht: [
    { who: 'oshi', mood: 'angry', text: tx`Auf meiner eigenen Gala.` },
    { who: 'k7', text: tx`Hinweis: Die Andockprotokolle der Krone lagern im Zollhangar der Garnison.` },
    { who: 'oshi', text: tx`Halt den Mund, K-7.` },
  ],
  customs: [
    { who: 'zula', mood: 'happy', text: tx`Ich hab dir doch gesagt, mach mir keine Schande.` },
    { who: null, text: tx`Im Archivraum liegen die Andockprotokolle. Die letzte Eintragung der Krone: ein Treffen in der Arena der Spieler, mit dem Haus Aurel.` },
  ],
  arena: [
    { who: 'tarn', mood: 'angry', text: tx`Die Menge liebt dich. Ich nicht.` },
    { who: 'dray', text: tx`Seraphine Aurel hat zugesehen. Sie lädt dich in ihren Turm. Mich nicht. Ärgerlich.` },
  ],
  residence: [
    { who: null, text: tx`Die letzte Karte fällt. Seraphine Aurel legt einen Kristall auf den Tisch: den Code der Krone.` },
    { who: null, text: tx`Der Navcomputer der Sandläufer sendet ihn. Weit draußen, am Rand der Galaxis, antwortet etwas.` },
    { who: 'seraphine', mood: 'thinking', text: tx`Sie lebt. Die Leere Krone. Und jetzt weiß es jeder, der ein Funkgerät hat.` },
    { who: 'oshi', mood: 'thinking', text: tx`Alle Syndikate machen sich auf den Weg. Allein komme ich nicht hin. Du auch nicht.` },
    { who: 'oshi', text: tx`Ein Vorschlag: Partner. Du fliegst, ich öffne dir die Türen. Was in der Krone liegt, teilen wir.` },
  ],
  hallis1: [
    { who: 'dessa', mood: 'happy', text: tx`Siehst du? Null ist nicht schwer. Nur selten.` },
    { who: 'dessa', text: tx`Am nächsten Tisch wird gesetzt. Dann lernst du, wann man aussteigt.` },
  ],
  hallis2: [
    { who: 'mags', text: tx`Gut abgesetzt.` },
    { who: 'dessa', text: tx`Bleibt nur noch das Schichtende: zwei Töpfe, die Würfel, und die Hände mit Namen.` },
  ],
  hallis3: [
    { who: 'dessa', mood: 'happy', text: tx`Das war's. Mehr kann ich dir nicht beibringen.` },
    { who: 'dessa', mood: 'thinking', text: tx`Dein Navcomputer übrigens – ich hab mal reingeschaut. Dreifach verschlüsselt. Die Schlüssel liegen bei drei Syndikaten auf dieser Route.` },
    { who: 'dessa', text: tx`Der Konvoi „Lange Leine“ legt morgen ab. Da wird um mehr gespielt als um Kantinengeld.` },
  ],
  convoy: [
    { who: 'quill', text: tx`Ihr Gewinn ist verbucht. Und drei Nachrichten sind eingegangen, für Sie.` },
    { who: null, text: tx`Drei Hologramme flackern über dem Tisch auf.` },
    { who: 'veyra', text: tx`Das Rote Siegel bietet Schutz und einen der drei Schlüssel. Dafür gehören die Navdaten am Ende uns.` },
    { who: 'sable', text: tx`Die Glasfinger bieten Wissen. Wir sagen Ihnen, wo die anderen Schlüssel liegen. Und wir wollen nur eine Kopie.` },
    { who: 'ilsa', mood: 'smug', text: tx`Und die Schrottkrone bietet dir Freunde, die nicht fragen. Du kennst uns ja schon.` },
    { who: YOU, text: tx`Wem vertraue ich?` },
  ],
  swoop: [
    { who: 'juno', mood: 'angry', text: tx`Okay. Okay! Du bist schnell. Aber den Schlüssel kriegst du nicht geschenkt.` },
    { who: 'harl', text: tx`Ich hab meine Quote angepasst. Nach oben.` },
  ],
  barge: [
    { who: 'vesh', text: tx`Sie fallen nicht. Das ist selten in diesen Wolken.` },
    { who: 'vesh', mood: 'thinking', text: tx`Ein Rat: Im Archiv auf Mirr liegt mehr über Ihren Navcomputer als in Ihrem Navcomputer.` },
  ],
  archive: [
    { who: 'sable', mood: 'thinking', text: tx`Ich habe Ihre Akte gelesen. Sie ist kurz. Noch.` },
    { who: 'sable', text: tx`Die Leere Krone ist kein Märchen. Wir haben ihre letzte Position. Ihr Navcomputer hat den Rest.` },
  ],
  casino: [
    { who: 'dray', mood: 'angry', text: tx`Das Siegel verliert nicht. Hat es nie.` },
    { who: 'veyra', mood: 'smug', text: tx`Heute schon. Lass gut sein, Dray. Corvin Ashe hat dem Piloten einen Platz am Bankett freigehalten.` },
  ],
  banquet: [
    { who: null, text: tx`Die letzte Karte fällt. An der langen Tafel wird es still – dann applaudiert Corvin Ashe, langsam.` },
    { who: 'corvin', text: tx`Gewonnen ist gewonnen. Was verlangen Sie?` },
    { who: YOU, text: tx`Die drei Schlüssel. Zusammen, hier, vor allen.` },
    { who: null, text: tx`Drei Datenkristalle klicken in den Navcomputer der Sandläufer. Eine Sternkarte entfaltet sich über dem Tisch – und eine Koordinate, tief im Kern der Galaxis.` },
    { who: 'sable', mood: 'thinking', text: tx`Coruscant. Die untersten Ebenen. Dort hat die Leere Krone zuletzt angelegt.` },
    { who: YOU, text: tx`Oshi weiß es in einer Stunde. Bis dahin bin ich weg.` },
    { who: null, text: tx`Ende von Akt 2. Die dritte Rate, der Kern und Coruscant Shift warten.` },
  ],
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

/** After the convoy: which syndicate the player trusts with the nav data. Its key comes with it. */
const PATRON: Choice[] = (['seal', 'glass', 'scrap'] as const).map((syndicate) => ({
  text: { seal: tx`Das Rote Siegel: Schutz, und die Daten gehören ihnen`, glass: tx`Die Glasfinger: Wissen, gegen eine Kopie`, scrap: tx`Die Schrottkrone: Freunde, die nicht fragen` }[syndicate],
  effects: [{ flag: `patron-${syndicate}` }, { flag: `key-${syndicate}` }, { standing: syndicate, delta: 1 }],
}))

/** The first table of Hallis: Dessa offers a practice hand, or the player knows the game already. */
const DESSA_CHOICES: Choice[] = [
  { text: tx`Zeig mir erst eine Übungshand`, effects: [{ flag: 'practice-spike' }] },
  { text: tx`Fangen wir einfach an` },
  { text: tx`Ich kenne Corellian Spike schon`, effects: [{ flag: 'spike-known' }], next: 'spike-known' },
]

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

// ── Act 2: the trade route ──────────────────────────────────────────────────

/** The long jump out of the Kessel sector; how it goes depends on the answer given to Oshi. */
const ARRIVAL_COURIER: Line[] = [
  { who: null, text: tx`Der Hyperantrieb springt. Zum ersten Mal seit Tarsk liegt der Kessel-Sektor hinter dir.` },
  { who: 'oshi', mood: 'smug', text: tx`Ein Kurier hält Wort. Gut. Auf der Gasbarke „Corona“ wartet eine Kiste für Vesh. Die bringst du zuerst hin.` },
  { who: 'oshi', text: tx`Dafür ist deine nächste Rate dreitausend leichter. Ich bin nicht unvernünftig.` },
  { who: null, text: tx`Die Verbindung bricht ab. Im Cockpit ist es still. Dann räuspert sich Mira.` },
]
const ARRIVAL_SOLD: Line[] = [
  { who: null, text: tx`Der Hyperantrieb springt. Zum ersten Mal seit Tarsk liegt der Kessel-Sektor hinter dir.` },
  { who: 'dray', mood: 'smug', text: tx`Neuigkeiten, Pilot. Madame Oshi hat deine Schuld verkauft. An das Rote Siegel.` },
  { who: 'dray', text: tx`Dein Gläubiger sitzt ab jetzt mit am Tisch. Ich, zum Beispiel. Die Rate bleibt, wie sie ist.` },
  { who: null, text: tx`Die Verbindung bricht ab. Im Cockpit ist es still. Dann räuspert sich Mira.` },
]
const CONFESSION: Line[] = [
  { who: 'mira', mood: 'worried', text: tx`Ich muss dir was sagen. Oshi wusste immer, wo wir sind. Von mir.` },
  { who: 'mira', text: tx`Seit Tarsk. Sie hat mir die Hälfte meiner Schuld erlassen, dafür hab ich berichtet. Jeden Tisch, jeden Sprung.` },
  { who: 'mira', mood: 'worried', text: tx`Ich hab's nicht mehr ausgehalten. Wenn du willst, steig ich auf Hallis aus.` },
  { who: 'bix', text: tx`…?` },
]
const CONFESSION_CHOICES: Choice[] = [
  { text: tx`Du bleibst. Ab jetzt berichtest du Oshi, was ich dir sage.`, effects: [{ flag: 'mira-stays' }, { standing: 'oshi', delta: 1 }] },
  { text: tx`Steig auf Hallis aus. Ich fliege allein weiter.`, effects: [{ flag: 'mira-left' }, { standing: 'oshi', delta: -1 }] },
]
const SPIKE_KNOWN: Line[] = [
  { who: 'dessa', mood: 'happy', text: tx`Dann spar ich mir die Kantinenvorträge. Die Lerntische stehen trotzdem offen, wenn du üben willst.` },
  { who: 'dessa', mood: 'thinking', text: tx`Dein Navcomputer übrigens – dreifach verschlüsselt. Die Schlüssel liegen bei drei Syndikaten auf dieser Route. Der Konvoi „Lange Leine“ ist ein guter Anfang.` },
]

const TRADE_SCENES: Scene[] = [
  { id: 'trade-arrival-courier', title: tx`Die Handelsroute`, venue: 'convoy', lines: ARRIVAL_COURIER, next: 'mira-confession' },
  { id: 'trade-arrival-sold', title: tx`Die Handelsroute`, venue: 'convoy', lines: ARRIVAL_SOLD, next: 'mira-confession' },
  { id: 'mira-confession', title: tx`Miras Geständnis`, venue: 'convoy', lines: CONFESSION, choices: CONFESSION_CHOICES },
  { id: 'spike-known', title: tx`Werft Hallis`, venue: 'hallis', lines: SPIKE_KNOWN },
]

// ── Act 3: the core ─────────────────────────────────────────────────────────

const CORE_ARRIVAL: Line[] = [
  { who: null, text: tx`Der Sprung endet über Coruscant. Ein Planet aus Stadt, tausend Ebenen tief.` },
  { who: 'zula', text: tx`Garnison Westportal. Sie sind angemeldet. Und beobachtet: Wer hier schmuggelt oder beim Schummeln erwischt wird, wird an den Sprungpunkten kontrolliert.` },
  { who: null, text: tx`Eine zweite Nachricht, aus Ebene 1313. Eine alte, ruhige Stimme.` },
  { who: 'orrin', text: tx`Man sagt mir, Sie suchen die Leere Krone. Dann lernen Sie erst Coruscant Shift. Ich warte in der Spielhalle.` },
  { who: 'kessk', mood: 'thinking', text: tx`Und noch was, Kind: Oshis Droide K-7 trägt dein Schuldbuch im Speicher. Nur so als Gedanke.` },
]
const ORRIN_CHOICES: Choice[] = [
  { text: tx`Zeig mir erst eine Übungshand`, effects: [{ flag: 'practice-shift' }] },
  { text: tx`Fangen wir einfach an` },
  { text: tx`Ich kenne Coruscant Shift schon`, effects: [{ flag: 'shift-known' }], next: 'shift-known' },
]
const SHIFT_KNOWN: Line[] = [
  { who: 'orrin', mood: 'happy', text: tx`Dann reden wir über die Krone statt über Würfel. Die Lerntische bleiben offen, falls Sie üben wollen.` },
  { who: 'orrin', mood: 'thinking', text: tx`Die Krone gehörte dem Haus Aurel. Ihr Peilsender antwortet nur auf einen Code, und den hütet die Erbin, oben im Kristallturm.` },
]
const LEDGER: Line[] = [
  { who: null, text: tx`Während K-7 die Karten nachzählt, huscht Bix über den Tisch. Ein Klicken, ein Funkeln – und weg ist es.` },
  { who: 'bix', text: tx`…!` },
  { who: null, text: tx`Im Frachtraum der Sandläufer liegt ein Speicherkristall. Darauf: Oshis Schuldbuch. Jede Rate, jede Unterschrift. Und keine Kopie.` },
  { who: 'oshi', mood: 'angry', text: tx`Du hast mir etwas gestohlen. Das vergesse ich nicht. Nie.` },
  { who: YOU, text: tx`Dann sind wir quitt, Madame. Auf den Credit genau.` },
]
const PARTNER: Choice[] = [
  { text: tx`Partner. Aber zu meinen Bedingungen.`, effects: [{ flag: 'oshi-partner' }, { standing: 'oshi', delta: 1 }] },
  { text: tx`Nein. Die Krone hole ich mir allein.`, effects: [{ flag: 'oshi-rival' }, { standing: 'oshi', delta: -1 }] },
]

const CORE_SCENES: Scene[] = [
  { id: 'core-arrival', title: tx`Coruscant`, venue: 'level', lines: CORE_ARRIVAL },
  { id: 'shift-known', title: tx`Ebene 1313`, venue: 'level', lines: SHIFT_KNOWN },
  { id: 'ledger-stolen', title: tx`Das Schuldbuch`, venue: 'yacht', lines: LEDGER },
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
    ...TRADE_SCENES,
    ...CORE_SCENES,
    ...TABLES.flatMap((table): Scene[] => [
      {
        id: `intro-${table.id}`,
        title: table.name,
        venue: table.id,
        lines: arrivalScene(table),
        ...(table.id === 'anchor' ? { choices: PRACTICE_CHOICES } : table.id === 'hallis1' ? { choices: DESSA_CHOICES } : table.id === 'level1' ? { choices: ORRIN_CHOICES } : {}),
      },
      {
        id: `win-${table.id}`,
        title: table.name,
        venue: table.id,
        lines: victoryScene(table),
        ...(table.id === 'crown' ? { choices: OSHI_OFFER } : table.id === 'convoy' ? { choices: PATRON } : table.id === 'residence' ? { choices: PARTNER } : {}),
      },
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
  'trade-arrival-courier',
  'trade-arrival-sold',
  'core-arrival',
  'ledger-stolen',
  ...ANIMALS.map((animal) => `win-${FIELD.id}-${animal}`),
  ...TABLES.flatMap((table) => [`intro-${table.id}`, `win-${table.id}`]),
]

/** Everything a scene and the answer given to it change, the scene's own id first. */
export function effectsOf(scene: Scene, choice?: Choice): Effect[] {
  return [{ flag: scene.id }, ...(scene.effects ?? []), ...(choice?.effects ?? [])]
}
