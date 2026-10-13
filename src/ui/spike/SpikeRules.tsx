import { tx } from '../../i18n'
import type { SpikeCard } from '../../spike'
import { Section } from '../screens/Rules'
import s from '../screens/Screens.module.css'
import { SpikeFace } from './SpikeCardArt'
import { signed } from './texts'

const SUITS = ['circle', 'triangle', 'square'] as const

/** One card of each stave, a green and a red one of the same value among them, and a sylop. */
const EXAMPLES: SpikeCard[] = [
  { id: 'rule-a', suit: 'circle', value: 4 },
  { id: 'rule-b', suit: 'triangle', value: -4 },
  { id: 'rule-c', suit: 'square', value: 9 },
  { id: 'rule-d', suit: null, value: 0 },
]

/** Example cards from their values; the staves are only there to look at. */
function cards(values: number[]): SpikeCard[] {
  return values.map((value, i) => ({ id: `rule-${i}-${value}`, suit: value === 0 ? null : SUITS[i % 3], value }))
}

function Hand({ values, name, note }: { values: number[]; name: string; note: string }) {
  return (
    <div className={s.rank}>
      <span className={s.rankCards} data-wide>
        {cards(values).map((card) => (
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

/** The rules of Corellian Spike, as this table plays it. */
export function SpikeRules() {
  return (
    <>
      <Section no={1} title={tx`Das Ziel`}>
        <p>
          {tx`Deine Karten sollen zusammen `}<b>{tx`null`}</b>{tx` ergeben – das ist ein Sabacc. Wer das nicht schafft, will so nah an null wie möglich. Grüne Karten zählen plus, rote minus.`}
        </p>
        <p>{tx`Gespielt wird um Chips. Wer als Letzter noch welche hat, gewinnt die Partie.`}</p>
      </Section>

      <Section no={2} title={tx`Die Karten`}>
        <p>
          {tx`Die Kartenfarbe ist das Vorzeichen: `}<b>{tx`Grün zählt plus, Rot zählt minus.`}</b>{tx` Den Wert zählst du an den Symbolen ab; die Punktreihe im Eckband zeigt ihn noch einmal.`}
        </p>
        <div className={s.cardRow}>
          {EXAMPLES.map((card) => (
            <figure key={card.id}>
              <SpikeFace card={card} />
              <figcaption className="num">{signed(card.value)}</figcaption>
            </figure>
          ))}
        </div>
        <p>{tx`62 Karten: Jeden Wert von 1 bis 10 gibt es in Grün und in Rot, und das je dreimal – mit Kreisen, mit Dreiecken und mit Quadraten. Dazu kommen zwei Sylops mit dem Wert 0. Die Form der Symbole ist nur Zierde: Für die Wertung zählen allein Farbe und Wert.`}</p>
      </Section>

      <Section no={3} title={tx`Eine Hand`}>
        <p>{tx`Jeder zahlt den Grundeinsatz in zwei Töpfe und bekommt zwei Karten. Dann folgen drei Runden mit je drei Schritten:`}</p>
        <ul>
          <li>
            <b>{tx`Karten:`}</b>{tx` Reihum darf jeder eine Karte vom Stapel nehmen (und vorher eine abwerfen), eine Handkarte gegen die offene Ablage tauschen, stehen oder aussteigen. Mehr als fünf Karten hält niemand.`}
          </li>
          <li>
            <b>{tx`Setzen:`}</b>{tx` Schieben oder setzen. Hat jemand gesetzt, heißt es mitgehen, erhöhen oder aussteigen. Wer aussteigt, verliert, was er gezahlt hat.`}
          </li>
          <li>
            <b>{tx`Würfel:`}</b>{tx` Der Geber rollt die beiden Spike-Würfel. Bei einem Pasch – dem Sabacc Shift – werfen alle ihre Hand ab und bekommen gleich viele neue Karten.`}
          </li>
        </ul>
        <p>{tx`Nach der dritten Runde wird aufgedeckt.`}</p>
      </Section>

      <Section no={4} title={tx`Die zwei Töpfe`}>
        <ul>
          <li>
            <b>{tx`Hand-Topf:`}</b>{tx` Grundeinsätze und alle Einsätze der Hand. Ihn gewinnt die beste Hand.`}
          </li>
          <li>
            <b>{tx`Sabacc-Topf:`}</b>{tx` Nur Grundeinsätze. Ihn gibt es zusätzlich, wenn die Siegerhand genau null ergibt. Sonst bleibt er liegen und wächst mit jeder Hand.`}
          </li>
        </ul>
        <p>{tx`Steigen alle anderen aus, gewinnt der Letzte den Hand-Topf, ohne seine Karten zu zeigen.`}</p>
      </Section>

      <Section no={5} title={tx`Rangfolge`}>
        <p>{tx`Von oben nach unten. Bei zwei Händen derselben Art gewinnt die mit den niedrigeren Karten.`}</p>
        <div className={s.ranks}>
          <Hand values={[0, 0]} name="Pure Sabacc" note={tx`Beide Sylops`} />
          <Hand values={[10, 10, -10, -10, 0]} name="Full Sabacc" note={tx`Vier Zehnen und ein Sylop`} />
          <Hand values={[5, 5, -5, -5, 0]} name="Fleet" note={tx`Vier Gleiche und ein Sylop`} />
          <Hand values={[4, -4, 0]} name="Yee-Haa" note={tx`Ein Paar und ein Sylop`} />
          <Hand values={[2, 2, 2, -3, -3]} name="Rhylet" note={tx`Drei Gleiche und ein Paar`} />
          <Hand values={[6, 6, -6, -6]} name="Squadron" note={tx`Vier Gleiche`} />
          <Hand values={[1, 2, 3, 4, -10]} name="Gee Whiz" note={tx`1, 2, 3, 4 und die Zehn dagegen`} />
          <Hand values={[7, -8, -9, 10]} name="Straight Khyron" note={tx`Vier Karten in Folge`} />
          <Hand values={[4, 4, 4, -3, -9]} name="Banthas Wild" note={tx`Drei Gleiche`} />
          <Hand values={[9, -9, 4, -4]} name="Rule of Two" note={tx`Zwei Paare`} />
          <Hand values={[5, -5]} name="Sabacc" note={tx`Ein Paar – oder jede andere Null`} />
          <Hand values={[6, -4]} name="Nulrhek" note={tx`Keine Null: am nächsten dran gewinnt, plus schlägt minus`} />
        </div>
        <p>{tx`Bei gleichen Händen ohne Namen zählen mehr Karten, dann die höhere Summe der grünen Karten, dann die höchste grüne Karte. Ist dann noch alles gleich, zieht jeder blind eine Karte: näher an null gewinnt.`}</p>
      </Section>

      <Section no={6} title={tx`Hausregeln dieses Tischs`}>
        <ul>
          <li>{tx`Grundeinsatz: 1 Chip je Topf. Er steigt alle vier Hände um 1, damit eine Partie ein Ende findet.`}</li>
          <li>{tx`Setzen und Erhöhen kosten 1 Chip, in der dritten Runde 2. Pro Setzrunde gibt es höchstens zwei Erhöhungen.`}</li>
          <li>{tx`Wer nicht genug Chips zum Mitgehen hat, geht mit dem Rest mit und spielt trotzdem um den ganzen Topf.`}</li>
          <li>{tx`Nehmen und Tauschen kosten nichts.`}</li>
        </ul>
      </Section>

      <Section no={7} title={tx`Bedienung`}>
        <ul>
          <li>{tx`Stapel antippen = Karte nehmen. Danach die Karte antippen, die vorher weg soll – oder ohne Abwerfen nehmen.`}</li>
          <li>{tx`Ablage antippen = tauschen. Danach die Handkarte antippen, die du dafür gibst.`}</li>
          <li>{tx`Die Lampe neben deinem Blatt gibt einen Tipp.`}</li>
        </ul>
      </Section>
    </>
  )
}
