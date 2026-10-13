/** Moments at the table an opponent may comment on. */
export type Occasion = 'start' | 'token' | 'hit' | 'win' | 'lose' | 'out' | 'cheat'

const LINES: Record<string, Record<Exclude<Occasion, 'cheat'>, string[]>> = {
  pim: {
    start: ['Oh, neue Gesichter! Schön!', 'Ich hab heut ein gutes Gefühl.'],
    token: ['Das hab ich im Schrott gefunden!', 'Mal sehen, was das macht …'],
    hit: ['He! Das war nicht nett.', 'Autsch. Meine Chips!'],
    win: ['Ich hab gewonnen? Ich hab gewonnen!', 'Das glaubt mir keiner.'],
    lose: ['Na ja. War knapp. Glaub ich.', 'Beim nächsten Mal!'],
    out: ['Tja. Zurück zum Schrottplatz.'],
  },
  brakk: {
    start: ['Spiel schnell. Ich hab Schicht.', 'Keine Tricks, klar?'],
    token: ['Zahl.', 'So läuft das hier.'],
    hit: ['Das merk ich mir.', 'Grrr.'],
    win: ['Her damit.', 'Hah! Brakk gewinnt.'],
    lose: ['Die Karten sind gezinkt.', 'Glück gehabt, Kleiner.'],
    out: ['Ich warte draußen auf dich.'],
  },
  mira: {
    start: ['Ich hab eine Stunde bis zum Abflug.', 'Dann wollen wir mal.'],
    token: ['Kleiner Kurswechsel.', 'Anschnallen.'],
    hit: ['Sauber geflogen. Leider.', 'Das gibt Turbulenzen.'],
    win: ['Punktlandung.', 'Fracht geliefert.'],
    lose: ['Bruchlandung.', 'Schon Schlimmeres überlebt.'],
    out: ['Na dann. Mein Schiff wartet.'],
  },
  kessk: {
    start: ['Geduld, Kinder. Geduld.', 'Ich zähle mit. Immer.'],
    token: ['Das … habe ich kommen sehen.', 'Alt, aber nicht dumm.'],
    hit: ['Früher hatte man Respekt.', 'Hm. Notiert.'],
    win: ['Zweiundzwanzig Karten. Ich kenne jede.', 'Rechnen hilft.'],
    lose: ['Die Jugend hat Glück.', 'Hm. Verzählt.'],
    out: ['Ich bin zu alt für so was.'],
  },
  zula: {
    start: ['Einsätze bitte bereithalten.', 'Ich prüfe alles. Zweimal.'],
    token: ['Formular 7-B. Sie zahlen.', 'Das ist gebührenpflichtig.'],
    hit: ['Dafür gibt es ein Verfahren!', 'Das wird protokolliert.'],
    win: ['Ordnungsgemäß gewonnen.', 'Stempel drauf.'],
    lose: ['Ich lege Widerspruch ein.', 'Das kann nicht stimmen.'],
    out: ['Dienstschluss.'],
  },
  tevin: {
    start: ['Ganz ehrliches Spiel heute. Versprochen.', 'Vertrau mir.'],
    token: ['Ups. Wie kommt das denn hierher?', 'Nichts im Ärmel. Fast nichts.'],
    hit: ['Das ist MEIN Trick!', 'Unverschämtheit.'],
    win: ['Reines Können. Ehrlich.', 'Man muss nur fest dran glauben.'],
    lose: ['Das war so nicht geplant.', 'Wer hat die Karten gemischt?'],
    out: ['Ich muss … kurz telefonieren.'],
  },
  unit7: {
    start: ['Gewinnchance: zufriedenstellend.', 'Bitte keine Emotionen.'],
    token: ['Korrektur wird gebucht.', 'Posten ausgeglichen.'],
    hit: ['Buchungsfehler erkannt.', 'Das war nicht kalkuliert.'],
    win: ['Ergebnis entspricht der Prognose.', 'Bilanz: positiv.'],
    lose: ['Abweichung: 4,2 Prozent.', 'Varianz. Ärgerlich.'],
    out: ['Konto geschlossen.'],
  },
  ilsa: {
    start: ['Wer zahlt heute meine Fracht?', 'Na, Angst?'],
    token: ['Geschenkt kriegt man nichts.', 'Danke fürs Mitnehmen.'],
    hit: ['Oh, du willst spielen?', 'Das zahlst du zurück.'],
    win: ['Leichter als jede Zollkontrolle.', 'Danke, Süßer.'],
    lose: ['Genieß es. Bleibt nicht so.', 'Pff.'],
    out: ['Man sieht sich. Immer zweimal.'],
  },
  dray: {
    start: ['Das Syndikat grüßt.', 'Schulden werden hier beglichen.'],
    token: ['Eine kleine Gebühr.', 'Geschäft ist Geschäft.'],
    hit: ['Mutig. Sehr mutig.', 'Das Syndikat vergisst nicht.'],
    win: ['Wie vereinbart.', 'Die Kasse stimmt.'],
    lose: ['Betrachte es als Kredit.', 'Wir sehen uns wieder.'],
    out: ['Das muss ich melden.'],
  },
  oshi: {
    start: ['Setzt euch. Es dauert nicht lange.', 'Neun Jahre. Zähl mit.'],
    token: ['Sieh gut hin.', 'So spielt man.'],
    hit: ['Reizend.', 'Wie unhöflich.'],
    win: ['Natürlich.', 'Wie immer.'],
    lose: ['Interessant.', 'Einmal. Nur einmal.'],
    out: ['… Gut gespielt.'],
  },
}

/** What each of them says when the player is caught looking at somebody's cards. */
const CAUGHT: Record<string, string> = {
  pim: 'He! Das sind meine Karten!',
  brakk: 'Finger weg. Letzte Warnung.',
  mira: 'Augen auf die eigene Hand, Pilot.',
  kessk: 'Das habe ich gesehen, Kind.',
  zula: 'Verstoß! Das kostet.',
  tevin: 'Stümper. So macht man das nicht.',
  unit7: 'Unregelmäßigkeit erfasst. Strafe gebucht.',
  ilsa: 'Netter Versuch. Zahl.',
  dray: 'Das Syndikat sieht alles.',
  oshi: 'Wie enttäuschend.',
}

const lastSaid = new Map<string, string>()

/** A line for this character and occasion, avoiding an immediate repeat. */
export function banter(characterId: string, occasion: Occasion): string | null {
  const pool = occasion === 'cheat' ? [CAUGHT[characterId]].filter(Boolean) : LINES[characterId]?.[occasion]
  if (!pool?.length) return null
  const key = `${characterId}:${occasion}`
  const fresh = pool.filter((line) => line !== lastSaid.get(key))
  const line = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length || pool.length))]
  lastSaid.set(key, line)
  return line
}
