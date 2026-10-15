import { tx } from '../i18n'
/** Moments at the table an opponent may comment on. */
export type Occasion = 'start' | 'token' | 'hit' | 'win' | 'lose' | 'out' | 'cheat'

const LINES: Record<string, Record<Exclude<Occasion, 'cheat'>, string[]>> = {
  pim: {
    start: [tx`Oh, neue Gesichter! Schön!`, tx`Ich hab heut ein gutes Gefühl.`],
    token: [tx`Das hab ich im Schrott gefunden!`, tx`Mal sehen, was das macht …`],
    hit: [tx`He! Das war nicht nett.`, tx`Autsch. Meine Chips!`],
    win: [tx`Ich hab gewonnen? Ich hab gewonnen!`, tx`Das glaubt mir keiner.`],
    lose: [tx`Na ja. War knapp. Glaub ich.`, tx`Beim nächsten Mal!`],
    out: [tx`Tja. Zurück zum Schrottplatz.`],
  },
  brakk: {
    start: [tx`Spiel schnell. Ich hab Schicht.`, tx`Keine Tricks, klar?`],
    token: [tx`Zahl.`, tx`So läuft das hier.`],
    hit: [tx`Das merk ich mir.`, tx`Grrr.`],
    win: [tx`Her damit.`, tx`Hah! Brakk gewinnt.`],
    lose: [tx`Die Karten sind gezinkt.`, tx`Glück gehabt, Kleiner.`],
    out: [tx`Ich warte draußen auf dich.`],
  },
  mira: {
    start: [tx`Ich hab eine Stunde bis zum Abflug.`, tx`Dann wollen wir mal.`],
    token: [tx`Kleiner Kurswechsel.`, tx`Anschnallen.`],
    hit: [tx`Sauber geflogen. Leider.`, tx`Das gibt Turbulenzen.`],
    win: [tx`Punktlandung.`, tx`Fracht geliefert.`],
    lose: [tx`Bruchlandung.`, tx`Schon Schlimmeres überlebt.`],
    out: [tx`Na dann. Mein Schiff wartet.`],
  },
  kessk: {
    start: [tx`Geduld, Kinder. Geduld.`, tx`Ich zähle mit. Immer.`],
    token: [tx`Das … habe ich kommen sehen.`, tx`Alt, aber nicht dumm.`],
    hit: [tx`Früher hatte man Respekt.`, tx`Hm. Notiert.`],
    win: [tx`Zweiundzwanzig Karten. Ich kenne jede.`, tx`Rechnen hilft.`],
    lose: [tx`Die Jugend hat Glück.`, tx`Hm. Verzählt.`],
    out: [tx`Ich bin zu alt für so was.`],
  },
  zula: {
    start: [tx`Einsätze bitte bereithalten.`, tx`Ich prüfe alles. Zweimal.`],
    token: [tx`Formular 7-B. Sie zahlen.`, tx`Das ist gebührenpflichtig.`],
    hit: [tx`Dafür gibt es ein Verfahren!`, tx`Das wird protokolliert.`],
    win: [tx`Ordnungsgemäß gewonnen.`, tx`Stempel drauf.`],
    lose: [tx`Ich lege Widerspruch ein.`, tx`Das kann nicht stimmen.`],
    out: [tx`Dienstschluss.`],
  },
  tevin: {
    start: [tx`Ganz ehrliches Spiel heute. Versprochen.`, tx`Vertrau mir.`],
    token: [tx`Ups. Wie kommt das denn hierher?`, tx`Nichts im Ärmel. Fast nichts.`],
    hit: [tx`Das ist MEIN Trick!`, tx`Unverschämtheit.`],
    win: [tx`Reines Können. Ehrlich.`, tx`Man muss nur fest dran glauben.`],
    lose: [tx`Das war so nicht geplant.`, tx`Wer hat die Karten gemischt?`],
    out: [tx`Ich muss … kurz telefonieren.`],
  },
  unit7: {
    start: [tx`Gewinnchance: zufriedenstellend.`, tx`Bitte keine Emotionen.`],
    token: [tx`Korrektur wird gebucht.`, tx`Posten ausgeglichen.`],
    hit: [tx`Buchungsfehler erkannt.`, tx`Das war nicht kalkuliert.`],
    win: [tx`Ergebnis entspricht der Prognose.`, tx`Bilanz: positiv.`],
    lose: [tx`Abweichung: 4,2 Prozent.`, tx`Varianz. Ärgerlich.`],
    out: [tx`Konto geschlossen.`],
  },
  ilsa: {
    start: [tx`Wer zahlt heute meine Fracht?`, tx`Na, Angst?`],
    token: [tx`Geschenkt kriegt man nichts.`, tx`Danke fürs Mitnehmen.`],
    hit: [tx`Oh, du willst spielen?`, tx`Das zahlst du zurück.`],
    win: [tx`Leichter als jede Zollkontrolle.`, tx`Danke, Süßer.`],
    lose: [tx`Genieß es. Bleibt nicht so.`, tx`Pff.`],
    out: [tx`Man sieht sich. Immer zweimal.`],
  },
  dray: {
    start: [tx`Das Syndikat grüßt.`, tx`Schulden werden hier beglichen.`],
    token: [tx`Eine kleine Gebühr.`, tx`Geschäft ist Geschäft.`],
    hit: [tx`Mutig. Sehr mutig.`, tx`Das Syndikat vergisst nicht.`],
    win: [tx`Wie vereinbart.`, tx`Die Kasse stimmt.`],
    lose: [tx`Betrachte es als Kredit.`, tx`Wir sehen uns wieder.`],
    out: [tx`Das muss ich melden.`],
  },
  oshi: {
    start: [tx`Setzt euch. Es dauert nicht lange.`, tx`Neun Jahre. Zähl mit.`],
    token: [tx`Sieh gut hin.`, tx`So spielt man.`],
    hit: [tx`Reizend.`, tx`Wie unhöflich.`],
    win: [tx`Natürlich.`, tx`Wie immer.`],
    lose: [tx`Interessant.`, tx`Einmal. Nur einmal.`],
    out: [tx`… Gut gespielt.`],
  },
  dessa: {
    start: [tx`Erst die Karten, dann das Geld.`, tx`Ruhig. Wir haben Zeit bis Schichtende.`],
    token: [tx`Pass auf, was ich jetzt mache.`, tx`Schau genau hin.`],
    hit: [tx`Gut gemacht. Wirklich.`, tx`Siehst du? So geht das.`],
    win: [tx`Sauber gerechnet.`, tx`Null. Wie es sein soll.`],
    lose: [tx`Lehrgeld. Zahl ich gern.`, tx`Du lernst schneller als meine Lehrlinge.`],
    out: [tx`Zurück an die Arbeit, für mich.`],
  },
  rook: {
    start: [tx`Ich hab heut Glück, ich spür das.`, tx`Los, los, los!`],
    token: [tx`Volle Kraft!`, tx`Hah, schau dir das an!`],
    hit: [tx`Hey, das war gemein!`, tx`Das brennt mehr als der Schweißer.`],
    win: [tx`Ich hab gewonnen? Ich hab gewonnen!`, tx`Erzähl das bloß Dessa!`],
    lose: [tx`Na toll.`, tx`Das zieh ich vom Lohn ab.`],
    out: [tx`Ich geh lieber schweißen.`],
  },
  mags: {
    start: [tx`Ich heb Schiffe. Karten schaff ich auch.`, tx`Langsam und gerade.`],
    token: [tx`Lastaufnahme.`, tx`Ganz vorsichtig …`],
    hit: [tx`Das wackelt.`, tx`Hm. Nachjustieren.`],
    win: [tx`Sicher abgesetzt.`, tx`Sitzt.`],
    lose: [tx`Abgerutscht.`, tx`Passiert.`],
    out: [tx`Feierabend.`],
  },
  quill: {
    start: [tx`Alles wird verbucht.`, tx`Ihr Einsatz ist vermerkt.`],
    token: [tx`Eine Umbuchung.`, tx`Korrekt gebucht.`],
    hit: [tx`Eine Unstimmigkeit.`, tx`Das wird nachgerechnet.`],
    win: [tx`Bilanz ausgeglichen.`, tx`Wie berechnet.`],
    lose: [tx`Ein Rundungsfehler.`, tx`Das prüfe ich nach.`],
    out: [tx`Ich schließe die Bücher.`],
  },
  juno: {
    start: [tx`Vollgas oder gar nicht!`, tx`Wer bremst, verliert.`],
    token: [tx`Nachbrenner an!`, tx`Auf der Ideallinie.`],
    hit: [tx`Abgedrängt? Ernsthaft?`, tx`Das gibt eine Revanche.`],
    win: [tx`Erste über die Ziellinie!`, tx`Zu langsam, alle.`],
    lose: [tx`Kurve verpasst.`, tx`Nächste Runde gehört mir.`],
    out: [tx`Boxenstopp. Dauerhaft.`],
  },
  harl: {
    start: [tx`Die Quoten stehen gut. Für mich.`, tx`Ich nehme jede Wette.`],
    token: [tx`Die Quote ändert sich.`, tx`Neue Lage.`],
    hit: [tx`Schlechte Quote.`, tx`Das war nicht eingepreist.`],
    win: [tx`Die Bank gewinnt.`, tx`Wie vorhergesagt.`],
    lose: [tx`Außenseiter. Kommt vor.`, tx`Nicht eingepreist.`],
    out: [tx`Ich buch das als Verlust.`],
  },
  vesh: {
    start: [tx`Willkommen an Bord der Corona.`, tx`Die Wolken sind tief heute.`],
    token: [tx`Die Barke neigt sich.`, tx`Ein Hauch Druck.`],
    hit: [tx`Sie haben Mut.`, tx`Das merke ich mir.`],
    win: [tx`Das Haus dankt.`, tx`Wie in den Wolken: alles fließt zu mir.`],
    lose: [tx`Bemerkenswert.`, tx`Sie haben Talent.`],
    out: [tx`Ich übergebe an meine Vertretung.`],
  },
  sable: {
    start: [tx`Jede Partie wird archiviert.`, tx`Sprechen Sie leise.`],
    token: [tx`Eintrag ergänzt.`, tx`Ein alter Trick. Gut dokumentiert.`],
    hit: [tx`Unerwartet.`, tx`Das wird nachgetragen.`],
    win: [tx`Archiviert.`, tx`Die Akte ist geschlossen.`],
    lose: [tx`Interessant. Ich notiere das.`, tx`Ein seltener Eintrag.`],
    out: [tx`Ich kehre zu meinen Akten zurück.`],
  },
  veyra: {
    start: [tx`Das Siegel spielt immer um mehr als Geld.`, tx`Setzen Sie sich, Pilot.`],
    token: [tx`Das Siegel greift ein.`, tx`So regelt man Dinge.`],
    hit: [tx`Wie unhöflich.`, tx`Man wird sich erinnern.`],
    win: [tx`Das Siegel gewinnt.`, tx`Selbstverständlich.`],
    lose: [tx`Respektabel.`, tx`Ein kleiner Preis.`],
    out: [tx`Man sieht sich, Pilot.`],
  },
  corvin: {
    start: [tx`Alles hat einen Preis. Auch dieser Abend.`, tx`Ein Bankett braucht Unterhaltung.`],
    token: [tx`Ein Geschäft.`, tx`Angebot und Nachfrage.`],
    hit: [tx`Ein schlechter Kurs.`, tx`Das wird teuer. Für Sie.`],
    win: [tx`Profit.`, tx`Der Markt hat gesprochen.`],
    lose: [tx`Ein Verlustgeschäft.`, tx`Bemerkenswert.`],
    out: [tx`Ich ziehe mich aus dem Geschäft zurück.`],
  },
}

/** What each of them says when the player is caught looking at somebody's cards. */
const CAUGHT: Record<string, string> = {
  pim: tx`He! Das sind meine Karten!`,
  brakk: tx`Finger weg. Letzte Warnung.`,
  mira: tx`Augen auf die eigene Hand, Pilot.`,
  kessk: tx`Das habe ich gesehen, Kind.`,
  zula: tx`Verstoß! Das kostet.`,
  tevin: tx`Stümper. So macht man das nicht.`,
  unit7: tx`Unregelmäßigkeit erfasst. Strafe gebucht.`,
  ilsa: tx`Netter Versuch. Zahl.`,
  dray: tx`Das Syndikat sieht alles.`,
  oshi: tx`Wie enttäuschend.`,
  dessa: tx`Das bring ich meinen Lehrlingen nicht bei.`,
  rook: tx`Ey! Ich hab das gesehen!`,
  mags: tx`Hände über den Tisch.`,
  quill: tx`Unregelmäßigkeit. Verbucht.`,
  juno: tx`Frühstart! Strafe!`,
  harl: tx`Gezinkt? Nicht an meiner Bahn.`,
  vesh: tx`An Bord der Corona? Wie geschmacklos.`,
  sable: tx`Auch das kommt in die Akte.`,
  veyra: tx`Das Siegel vergisst nichts.`,
  corvin: tx`Betrug ist schlecht fürs Geschäft.`,
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
