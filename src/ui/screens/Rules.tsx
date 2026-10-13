import type { ReactNode } from 'react'
import { TOKEN_IDS } from '../../engine'
import type { Card, CardKind, Suit } from '../../engine'
import { TOKEN_TEXT } from '../../i18n/texts'
import { useNav } from '../../store/nav'
import { CardFace } from '../art/CardArt'
import { Icon } from '../art/Icons'
import { TokenIcon } from '../art/TokenIcon'
import common from '../common/common.module.css'
import { cx } from '../cx'
import s from './Screens.module.css'
import { tx } from '../../i18n'

const card = (suit: Suit, kind: CardKind, value = 0): Card => ({ id: `rule-${suit}-${kind}-${value}`, suit, kind, value })

function Pair({ sand, blood, label, note }: { sand: Card; blood: Card; label: string; note?: string }) {
  return (
    <div className={s.rank}>
      <span className={s.rankCards}>
        <CardFace card={sand} />
        <CardFace card={blood} />
      </span>
      <span>
        <b>{label}</b>
        {note && <em>{note}</em>}
      </span>
    </div>
  )
}

function Section({ no, title, children }: { no: number; title: string; children: ReactNode }) {
  return (
    <section className={s.rule}>
      <h2 className={s.ruleTitle}>
        <span className="num">{no}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function RulesScreen() {
  const go = useNav((n) => n.go)
  return (
    <div className={common.screen}>
      <header className={common.screenHead}>
        <button className={common.iconBtn} onClick={() => go('home')} aria-label={tx`Zurück`}>
          <Icon name="back" />
        </button>
        <h1 className={common.screenTitle}>{tx`Regeln`}</h1>
      </header>
      <div className={common.screenBody}>
        <div className={cx(common.column, s.rules)}>
          <Section no={1} title={tx`Das Ziel`}>
            <p>
              {tx`Du hältst immer genau `}<b>{tx`zwei Karten`}</b>{tx`: eine aus dem Sand-Deck und eine aus dem Blut-Deck. Am Ende einer Hand gewinnt, wessen Karten am dichtesten beieinander liegen. Zwei gleiche Werte sind ein `}<b>{tx`Sabacc`}</b>{tx` – je niedriger, desto besser.`}
            </p>
            <p>{tx`Wer als Letzter noch Chips hat, gewinnt die Partie.`}</p>
          </Section>

          <Section no={2} title={tx`Die Karten`}>
            <p>{tx`Jedes Deck hat 22 Karten: die Werte 1–6 je dreimal, drei Impostoren und einen Sylop.`}</p>
            <div className={s.cardRow}>
              <figure>
                <CardFace card={card('sand', 'number', 4)} />
                <figcaption>{tx`Sand 4`}</figcaption>
              </figure>
              <figure>
                <CardFace card={card('blood', 'number', 2)} />
                <figcaption>{tx`Blut 2`}</figcaption>
              </figure>
              <figure>
                <CardFace card={card('sand', 'impostor')} />
                <figcaption>{tx`Impostor`}</figcaption>
              </figure>
              <figure>
                <CardFace card={card('blood', 'sylop')} />
                <figcaption>{tx`Sylop`}</figcaption>
              </figure>
            </div>
            <ul>
              <li>
                <b>{tx`Impostor:`}</b>{tx` Beim Aufdecken wirfst du zwei Würfel und wählst einen davon als Kartenwert.`}
              </li>
              <li>
                <b>{tx`Sylop:`}</b>{tx` Nimmt den Wert deiner anderen Karte an – also immer ein Sabacc.`}
              </li>
            </ul>
          </Section>

          <Section no={3} title={tx`Eine Hand`}>
            <p>{tx`Eine Hand hat drei Runden. In jeder Runde ist jeder Spieler einmal am Zug:`}</p>
            <ul>
              <li>
                <b>{tx`Ziehen`}</b>{tx` kostet 1 Chip aus deinem Vorrat, der in deinen `}<b>{tx`Einsatz`}</b>{tx` wandert. Du nimmst die oberste Karte eines der vier Stapel (Sand-Deck, Blut-Deck oder eine der beiden offenen Ablagen) und wirfst dann eine deiner beiden Karten dieser Farbe ab.`}
              </li>
              <li>
                <b>{tx`Stehen`}</b>{tx` kostet nichts. Du behältst deine Hand.`}
              </li>
              <li>
                {tx`Vor dem Ziehen oder Stehen darfst du `}<b>{tx`ein Shift-Token`}</b>{tx` spielen.`}
              </li>
            </ul>
            <p>{tx`Nach der dritten Runde werden alle Hände aufgedeckt.`}</p>
          </Section>

          <Section no={4} title={tx`Rangfolge`}>
            <div className={s.ranks}>
              <Pair sand={card('sand', 'sylop')} blood={card('blood', 'sylop')} label={tx`Pure Sabacc`} note={tx`Zwei Sylops – unschlagbar`} />
              <Pair sand={card('sand', 'number', 1)} blood={card('blood', 'number', 1)} label={tx`Sabacc 1`} note={tx`Der beste gewöhnliche Sabacc`} />
              <Pair sand={card('sand', 'number', 6)} blood={card('blood', 'number', 6)} label={tx`Sabacc 6`} note={tx`Der schwächste Sabacc`} />
              <Pair sand={card('sand', 'number', 2)} blood={card('blood', 'number', 3)} label={tx`Differenz 1`} note={tx`Kein Sabacc: kleinste Differenz gewinnt`} />
              <Pair sand={card('sand', 'number', 5)} blood={card('blood', 'number', 1)} label={tx`Differenz 4`} note={tx`Bei gleicher Differenz zählt die kleinere Summe`} />
            </div>
            <p>{tx`Haben mehrere Spieler exakt dieselbe beste Hand, teilen sie sich den Sieg.`}</p>
          </Section>

          <Section no={5} title={tx`Chips`}>
            <ul>
              <li>
                <b>{tx`Gewinner`}</b>{tx` bekommen ihren Einsatz zurück.`}
              </li>
              <li>
                <b>{tx`Verlierer`}</b>{tx` verlieren ihren Einsatz – und zahlen zusätzlich Strafe: die `}<b>{tx`Differenz`}</b>{tx` ihrer beiden Karten. Wer mit einem Sabacc verliert, zahlt nur 1 Chip.`}
              </li>
              <li>{tx`Wer keine Chips mehr hat, scheidet aus. Verlorene Chips bekommt niemand – sie verschwinden einfach vom Tisch.`}</li>
            </ul>
          </Section>

          <Section no={6} title={tx`Shift-Tokens`}>
            <p>
              {tx`Du nimmst drei Tokens mit an den Tisch. Jedes kannst du `}<b>{tx`einmal pro Partie`}</b>{tx` spielen, höchstens eins pro Zug. Effekte „bis zum Aufdecken“ enden mit der laufenden Hand.`}
            </p>
            <div className={s.glossary}>
              {TOKEN_IDS.map((token) => (
                <div key={token} className={s.glossaryItem}>
                  <span className={s.glossaryIcon}>
                    <TokenIcon token={token} size={22} />
                  </span>
                  <span>
                    <b>{TOKEN_TEXT[token].name}</b>
                    <em>{TOKEN_TEXT[token].long}</em>
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section no={7} title={tx`Spähen`}>
            <p>
              {tx`Einmal pro Hand kannst du in deinem Zug einen Blick auf eine Karte eines Gegners werfen – das Auge neben deinen Tokens. Die Karte bleibt für dich offen, bis er sie austauscht.`}
            </p>
            <ul>
              <li>{tx`Jeder Blick erhöht den `}<b>{tx`Verdacht`}</b>{tx` am Tisch; an besseren Tischen schneller. Zwischen den Händen beruhigt er sich wieder etwas.`}</li>
              <li>
                {tx`Bei vollem Verdacht wirst du `}<b>{tx`erwischt`}</b>{tx`: Du siehst nichts und zahlst 2 Chips Strafe.`}
              </li>
            </ul>
          </Section>

          <Section no={8} title={tx`Karriere`}>
            <ul>
              <li>
                <b>{tx`Hausregeln:`}</b>{tx` Manche Tische spielen anders – mehr Sylops oder Impostoren, kürzere Hände, höhere Strafen. Die Regel steht am Tisch.`}
              </li>
              <li>
                <b>{tx`Einsatz:`}</b>{tx` „Hoch“ kostet das doppelte Buy-in und zahlt das 2,5-Fache, „Riskant“ kostet das dreifache und zahlt das Vierfache – dafür startest du mit 1 bzw. 2 Chips weniger, an den beiden letzten Tischen mit 2 bzw. 3.`}
              </li>
              <li>
                <b>{tx`Platz 2:`}</b>{tx` An Tischen mit zwei oder drei Gegnern bekommt sein Buy-in zurück, wer als Letzter ausscheidet. Wer aufsteht, bekommt nichts.`}
              </li>
              <li>
                <b>{tx`Duelle:`}</b>{tx` Wer einen Tisch gewonnen hat, kann dessen Rivalen eins gegen eins fordern – der spielt dann sein bestes Spiel.`}
              </li>
              <li>
                <b>{tx`Legende:`}</b>{tx` Nach der Kessel-Krone lässt sich die Karriere ein zweites Mal spielen – alle Gegner in Bestform, du mit einem Chip weniger, für das Doppelte.`}
              </li>
            </ul>
          </Section>

          <Section no={9} title={tx`Darüber hinaus`}>
            <ul>
              <li>
                <b>{tx`Ruf:`}</b>{tx` Jede Partie bringt Ruf, Siege und Sabaccs mehr. Genug Ruf ist ein neuer Rang – mit eigenem Titel.`}
              </li>
              <li>
                <b>{tx`Tageshand:`}</b>{tx` Jeden Tag ein fester Tisch mit vorgegebenen Tokens. Ein Versuch; jeder Tag in Folge am Tisch verlängert die Serie, und je länger sie ist, desto mehr zahlt ein Sieg.`}
              </li>
              <li>
                <b>{tx`Auf Tour:`}</b>{tx` Nach drei gewonnenen Karrieretischen. Erst Duelle, dann vollere und härtere Tische. Der Topf verdoppelt sich anfangs mit jedem Sieg – wer verliert, verliert ihn ganz, aussteigen geht nach jedem Sieg.`}
              </li>
              <li>
                <b>{tx`Spielstand:`}</b>{tx` Im Profil lässt sich der ganze Fortschritt als Code sichern und auf einem anderen Gerät wieder laden.`}
              </li>
              <li>
                <b>{tx`Sandläufer:`}</b>{tx` Im Hangar baust du dein Schiff aus, siehst deine Erfolge und wählst Kartenrücken, Filz, Chips und Titel aus der Sammlung.`}
              </li>
            </ul>
          </Section>

          <Section no={10} title={tx`Bedienung`}>
            <ul>
              <li>{tx`Stapel antippen = ziehen. „Stehen“ unten rechts.`}</li>
              <li>{tx`Oder wischen: eine Stapelkarte zu dir ziehen = ziehen, die eigene Hand zur Seite schieben = stehen, beim Abwerfen eine Karte nach oben schnippen = weg damit.`}</li>
              <li>{tx`Der Geber-Droide links am Tisch sagt auf Antippen die Runde und die Hausregeln an.`}</li>
              <li>{tx`Token antippen zeigt, was es tut – auch bei den Gegnern.`}</li>
              <li>
                {tx`Die Lampe neben deinem Blatt gibt einen Tipp: den Zug, den ein starker Spieler machen würde, und wie gut dein Blatt steht. Im freien Spiel beliebig oft, sonst dreimal pro Partie.`}
              </li>
              <li>
                {tx`Am Rechner: `}<kbd>1</kbd>–<kbd>4</kbd>{tx` für die Stapel, `}<kbd>{tx`S`}</kbd>{tx` zum Stehen.`}
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}
