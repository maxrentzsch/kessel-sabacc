import { tx } from '../../i18n'
import type { ShiftCard } from '../../shift'
import { Section } from '../screens/Rules'
import s from '../screens/Screens.module.css'
import { SpikeFace, SuitMark } from '../spike/SpikeCardArt'

/** Cards from values and suits, for the examples. */
function cards(list: [number, ShiftCard['suit']][]): ShiftCard[] {
  return list.map(([value, suit], i) => ({ id: `shift-rule-${i}-${value}`, suit, value }))
}

function Example({ list, name, note }: { list: [number, ShiftCard['suit']][]; name: string; note: string }) {
  return (
    <div className={s.rank}>
      <span className={s.rankCards} data-wide>
        {cards(list).map((card) => (
          <SpikeFace key={card.id} card={card} />
        ))}
      </span>
      <span>
        <b>{name}</b>
        <em>{note}</em>
      </span>
    </div>
  )
}

/** The rules of Coruscant Shift, as this table plays it. */
export function ShiftRules() {
  return (
    <>
      <Section no={1} title={tx`Das Ziel`}>
        <p>
          {tx`Zu Beginn jeder Hand rollen zwei Würfel. Der goldene zeigt die `}<b>{tx`Zielzahl`}</b>{tx` (0, +5, −5, +10 oder −10), der silberne die `}<b>{tx`Zielfarbe`}</b>
          {tx` (Kreis, Dreieck oder Quadrat). Wer mit seiner Auswahl der Zielzahl am nächsten kommt, gewinnt den Topf.`}
        </p>
        <p>{tx`Gespielt wird mit den Karten von Corellian Spike: drei Farben, grün zählt plus, rot minus, und zwei Sylops, die null zählen.`}</p>
      </Section>

      <Section no={2} title={tx`Der Ablauf einer Hand`}>
        <p>{tx`Jeder zahlt den Grundeinsatz in den Topf und bekommt fünf Karten.`}</p>
        <p>
          <b>{tx`Auswahl:`}</b>
          {tx` Leg die Karten beiseite, die zusammen das Ziel treffen – mindestens eine, nicht alle müssen mit. Danach wird gesetzt.`}
        </p>
        <p>
          <b>{tx`Shift:`}</b>
          {tx` Was du nicht beiseitegelegt hast, wirfst du ab und bekommst dafür neue Karten, bis du wieder fünf hast.`}
        </p>
        <p>
          <b>{tx`Verbessern:`}</b>
          {tx` Von den neuen Karten darfst du welche zur Auswahl legen – aber keine herausnehmen. Der Rest geht weg. Dann wird ein zweites Mal gesetzt und aufgedeckt.`}
        </p>
      </Section>

      <Section no={3} title={tx`Gleichstand`}>
        <p>
          {tx`Liegen zwei gleich nah am Ziel, gewinnt, wer mehr Karten der Zielfarbe ausgewählt hat. `}<b>{tx`Ein Sylop zählt für jede Farbe.`}</b>{tx` Steht es dann noch gleich, wird der Topf geteilt.`}
        </p>
        <Example list={[[3, 'triangle'], [2, 'circle']]} name={tx`Ziel +5, Dreieck`} note={tx`Genau getroffen, ein Dreieck`} />
        <Example
          list={[[7, 'triangle'], [-2, 'triangle'], [0, null]]}
          name={tx`Ziel +5, Dreieck`}
          note={tx`Auch getroffen, aber drei Dreiecke: gewinnt`}
        />
        <p className={s.fieldNote}>
          <SuitMark suit="triangle" size={12} /> {tx`Der Sylop zählt hier als Dreieck.`}
        </p>
      </Section>

      <Section no={4} title={tx`Setzen`}>
        <p>{tx`Gesetzt wird zweimal pro Hand: nach der Auswahl und nach dem Verbessern. Schieben, setzen, mitgehen, erhöhen oder aussteigen – wie bei Corellian Spike. Ein Einsatz kostet 1 Chip, in der zweiten Runde 2. Der Grundeinsatz steigt alle vier Hände.`}</p>
        <p className={s.fieldNote}>{tx`Was die gedruckten Regeln offenlassen – Einsatzhöhen, ein steigender Grundeinsatz, mindestens eine Karte in der Auswahl –, legt dieser Tisch so fest.`}</p>
      </Section>
    </>
  )
}
