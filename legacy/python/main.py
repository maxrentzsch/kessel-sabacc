import random

STARTING_CREDITS = 100
ANTE = 5
ROUNDS_PER_HAND = 3
SHIFT_CHANCE = 0.3


# ── Display ──────────────────────────────────────────────────────────────────

def divider(char="─", width=52):
    print(char * width)

def header(text):
    print()
    divider("═")
    print(f"  {text}")
    divider("═")

def section(text):
    print()
    divider()
    print(f"  {text}")
    divider()

def show_hand(name, hand):
    s, b = hand["Sand"]["value"], hand["Blood"]["value"]
    print(f"  {name:12}  Sand {s}  |  Blood {b}")


# ── Input helpers ─────────────────────────────────────────────────────────────

def ask_choice(prompt, options):
    hint = " / ".join(options)
    lc = [o.lower() for o in options]
    while True:
        raw = input(f"{prompt} [{hint}]: ").strip().lower()
        if raw in lc:
            return raw
        print(f"  Ungültig. Bitte: {hint}")

def ask_int(prompt, lo, hi):
    while True:
        try:
            v = int(input(f"{prompt} ({lo}–{hi}): ").strip())
            if lo <= v <= hi:
                return v
            print(f"  Bitte eine Zahl zwischen {lo} und {hi}.")
        except ValueError:
            print("  Bitte eine ganze Zahl eingeben.")


# ── Deck & Hand ───────────────────────────────────────────────────────────────

def build_decks():
    sand  = [{"color": "Sand",  "value": v} for v in range(1, 7)]
    blood = [{"color": "Blood", "value": v} for v in range(1, 7)]
    random.shuffle(sand)
    random.shuffle(blood)
    return sand, blood

def deal_hand(sand_deck, blood_deck):
    return {"Sand": sand_deck.pop(), "Blood": blood_deck.pop()}


# ── Hand evaluation ───────────────────────────────────────────────────────────

def is_sabacc(hand):
    return hand["Sand"]["value"] == hand["Blood"]["value"]

def hand_total(hand):
    return hand["Sand"]["value"] + hand["Blood"]["value"]

def hand_diff(hand):
    return abs(hand["Sand"]["value"] - hand["Blood"]["value"])


# ── Human turn ────────────────────────────────────────────────────────────────

def player_turn(name, hand, sand_deck, blood_deck):
    print()
    print(f"  {name} ist am Zug.")
    show_hand(name, hand)

    choice = ask_choice("  Ziehen", ["Sand", "Blood", "Passen"])

    if choice == "passen":
        print("  Hand bleibt unverändert.")
        return

    deck = sand_deck if choice == "sand" else blood_deck
    if not deck:
        print(f"  Das {choice.capitalize()}-Deck ist leer – kein Zug möglich.")
        return

    new_card = deck.pop()
    print(f"  Gezogene Karte:  {new_card['color']} {new_card['value']}")

    keep = ask_choice("  Behalten", ["Ja", "Nein"])
    if keep == "ja":
        hand[choice.capitalize()] = new_card
        print(f"  {choice.capitalize()}-Karte übernommen.")
    else:
        deck.append(new_card)
        random.shuffle(deck)
        print("  Alte Karte behalten.")

    print("  Hand jetzt:")
    show_hand(name, hand)


# ── KI turn ───────────────────────────────────────────────────────────────────

def ai_turn(name, hand, sand_deck, blood_deck):
    print()
    print(f"  {name} (KI) ist am Zug.")

    s, b = hand["Sand"]["value"], hand["Blood"]["value"]
    diff = abs(s - b)

    # Sabacc → immer passen
    if diff == 0:
        print(f"  {name} passt.")
        return

    # Entscheide welche Karte zu ziehen: niedrigere Seite anheben
    target = "Sand" if s < b else "Blood"
    other_val = b if target == "Sand" else s
    deck = sand_deck if target == "Sand" else blood_deck

    # Drawwahrscheinlichkeit basierend auf Differenz
    draw_chance = {1: 0.90, 2: 0.70, 3: 0.40}.get(diff, 0.20)

    if not deck or random.random() > draw_chance:
        print(f"  {name} passt.")
        return

    new_card = deck.pop()
    new_diff = abs(new_card["value"] - other_val)

    # Behalten wenn die Karte die Hand verbessert
    if new_diff <= diff:
        hand[target] = new_card
        print(f"  {name} zieht eine {target}-Karte und behält sie.")
    else:
        deck.append(new_card)
        random.shuffle(deck)
        print(f"  {name} zieht eine {target}-Karte, gibt sie aber zurück.")


# ── KI Wettstrategie ──────────────────────────────────────────────────────────

def ai_bet_decision(hand, credits_available, to_call, can_check):
    """Gibt (action, amount) zurück. action: 'check'|'setzen'|'mitgehen'|'erhöhen'|'aufgeben'"""
    diff = hand_diff(hand)
    bluff = random.random() < 0.12

    if diff == 0:  # Sabacc – starke Hand
        if to_call == 0:
            amount = max(1, int(credits_available * random.uniform(0.15, 0.25)))
            return "setzen", min(amount, credits_available)
        else:
            amount = max(to_call + 1, int(credits_available * random.uniform(0.15, 0.22)))
            return "erhöhen", min(amount, credits_available)

    elif diff == 1:  # Fast Sabacc – mittelstarke Hand
        if bluff:
            amount = max(1, int(credits_available * random.uniform(0.08, 0.12)))
            action = "setzen" if to_call == 0 else "erhöhen"
            return action, min(amount, credits_available)
        if to_call == 0:
            return "check", 0
        if to_call <= credits_available * 0.20:
            return "mitgehen", min(to_call, credits_available)
        return "aufgeben", 0

    else:  # Schwache Hand
        if bluff:
            amount = max(1, int(credits_available * random.uniform(0.05, 0.09)))
            action = "setzen" if to_call == 0 else "setzen"
            return action, min(amount, credits_available)
        if can_check and to_call == 0:
            return "check", 0
        if to_call > 0 and to_call <= credits_available * 0.08:
            return "mitgehen", min(to_call, credits_available)
        if to_call > 0:
            return "aufgeben", 0
        return "check", 0


# ── Sabacc Shift ──────────────────────────────────────────────────────────────

def sabacc_shift(hands, names, sand_deck, blood_deck):
    print()
    divider("*")
    print("  *** SABACC SHIFT!  Alle Hände werden neu ausgeteilt! ***")
    divider("*")

    for hand in hands:
        sand_deck.append(hand["Sand"])
        blood_deck.append(hand["Blood"])

    random.shuffle(sand_deck)
    random.shuffle(blood_deck)

    for hand in hands:
        hand["Sand"]  = sand_deck.pop()
        hand["Blood"] = blood_deck.pop()

    print("  Neue Hände:")
    for name, hand in zip(names, hands):
        show_hand(name, hand)


# ── Betting ───────────────────────────────────────────────────────────────────

def betting_round(names, hands, credits, pot, folded, ai_players):
    section(f"Setzrunde  |  Pot: {pot} Credits")
    for name in names:
        status = " (aufgegeben)" if name in folded else f" – {credits[name]} Credits"
        print(f"  {name}{status}")
    print()

    hand_map = dict(zip(names, hands))
    committed = {name: 0 for name in names}

    def resolve_action(name, to_call, can_check):
        nonlocal pot
        if name in folded:
            return

        is_ai = name in ai_players
        avail = credits[name]

        if is_ai:
            action, amount = ai_bet_decision(hand_map[name], avail, to_call, can_check)
        else:
            if can_check and to_call == 0:
                options = ["Check", "Setzen", "Aufgeben"]
            else:
                options = ["Mitgehen", "Erhöhen", "Aufgeben"]
            action = ask_choice(f"  {name}", options)
            amount = 0

        if action == "aufgeben":
            folded.add(name)
            print(f"  {name} gibt auf.")
            return

        if action == "check":
            print(f"  {name} checkt.")
            return

        if action == "mitgehen":
            amount = min(to_call, avail)

        if action in ("setzen", "erhöhen") and not is_ai:
            lo = max(1, to_call + (1 if action == "erhöhen" else 0))
            hi = avail
            if hi < lo:
                amount = hi
                print(f"  {name} geht all-in.")
            else:
                amount = ask_int(f"  {name} setzt", lo, hi)

        amount = min(amount, avail)
        credits[name] -= amount
        committed[name] += amount
        pot += amount
        print(f"  {name} setzt {amount}. Pot: {pot}")

    p1, p2 = names[0], names[1]

    # P1 eröffnet
    resolve_action(p1, 0, can_check=True)

    # P2 antwortet
    if p2 not in folded:
        to_call = max(0, committed[p1] - committed[p2])
        resolve_action(p2, to_call, can_check=(to_call == 0))

    # Falls P2 erhöht hat, bekommt P1 nochmal die Chance
    if p1 not in folded and committed[p2] > committed[p1]:
        diff = committed[p2] - committed[p1]
        if p1 in ai_players:
            action, _ = ai_bet_decision(hand_map[p1], credits[p1], diff, can_check=False)
            if action == "aufgeben":
                folded.add(p1)
                print(f"  {p1} gibt auf.")
            else:
                amount = min(diff, credits[p1])
                credits[p1] -= amount
                pot += amount
                print(f"  {p1} geht mit ({amount}). Pot: {pot}")
        else:
            print(f"\n  {p1} – {diff} Credits zum Mitgehen oder aufgeben.")
            action = ask_choice(f"  {p1}", ["Mitgehen", "Aufgeben"])
            if action == "aufgeben":
                folded.add(p1)
                print(f"  {p1} gibt auf.")
            else:
                amount = min(diff, credits[p1])
                credits[p1] -= amount
                pot += amount
                print(f"  {p1} geht mit ({amount}). Pot: {pot}")

    return pot


# ── Winner determination ──────────────────────────────────────────────────────

def determine_winner(names, hands, credits, pot, folded):
    header("Showdown")

    active = [n for n in names if n not in folded]

    if len(active) == 1:
        winner = active[0]
        print(f"  {winner} gewinnt – Gegner aufgegeben.")
        credits[winner] += pot
        _print_standings(names, credits)
        return

    for name, hand in zip(names, hands):
        show_hand(name, hand)
        tag = "SABACC" if is_sabacc(hand) else f"Summe: {hand_total(hand)}"
        print(f"  {'':12}  → {tag}")
        print()

    sabacc_players = [n for n, h in zip(names, hands) if is_sabacc(h)]
    winner = None
    reason = ""

    if len(sabacc_players) == 2:
        vals = {n: h["Sand"]["value"] for n, h in zip(names, hands)}
        if vals[names[0]] < vals[names[1]]:
            winner, reason = names[0], "Beide Sabacc – niedrigster Wert"
        elif vals[names[1]] < vals[names[0]]:
            winner, reason = names[1], "Beide Sabacc – niedrigster Wert"
        else:
            reason = "Beide Sabacc – gleicher Wert"
    elif len(sabacc_players) == 1:
        winner, reason = sabacc_players[0], "Sabacc!"
    else:
        totals = {n: hand_total(h) for n, h in zip(names, hands)}
        if totals[names[0]] < totals[names[1]]:
            winner = names[0]
        elif totals[names[1]] < totals[names[0]]:
            winner = names[1]
        reason = "Niedrigste Summe" if winner else "Gleiche Summe – Unentschieden"

    if winner:
        print(f"  {winner} gewinnt! ({reason})")
        credits[winner] += pot
    else:
        print(f"  {reason}")
        half = pot // 2
        credits[names[0]] += half
        credits[names[1]] += pot - half

    print(f"  Pot war: {pot} Credits")
    _print_standings(names, credits)


def _print_standings(names, credits):
    print()
    divider()
    for name in names:
        print(f"  {name}: {credits[name]} Credits")
    divider()


# ── Single hand ───────────────────────────────────────────────────────────────

def play_hand(names, credits, hand_number, ai_players):
    header(f"Hand #{hand_number}")

    pot = 0
    folded = set()

    print(f"  Ante: {ANTE} Credits pro Spieler")
    for name in names:
        ante = min(ANTE, credits[name])
        credits[name] -= ante
        pot += ante
    print(f"  Pot: {pot}")

    sand_deck, blood_deck = build_decks()
    hands = [deal_hand(sand_deck, blood_deck) for _ in names]

    print()
    print("  Starthände:")
    for name, hand in zip(names, hands):
        if name not in ai_players:
            show_hand(name, hand)
        else:
            print(f"  {name:12}  (verdeckt)")

    for round_num in range(1, ROUNDS_PER_HAND + 1):
        section(f"Runde {round_num}")

        if round_num > 1 and random.random() < SHIFT_CHANCE:
            sabacc_shift(hands, names, sand_deck, blood_deck)
            # Nach Shift nur menschliche Hände anzeigen
            for name, hand in zip(names, hands):
                if name not in ai_players:
                    show_hand(name, hand)

        for name, hand in zip(names, hands):
            if name not in folded:
                if name in ai_players:
                    ai_turn(name, hand, sand_deck, blood_deck)
                else:
                    player_turn(name, hand, sand_deck, blood_deck)

        pot = betting_round(names, hands, credits, pot, folded, ai_players)

        if len(folded) >= len(names) - 1:
            break

    determine_winner(names, hands, credits, pot, folded)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    header("KESSEL SABAAC")
    print("  Willkommen am Tisch.")
    print()

    p1 = input("  Dein Name: ").strip() or "Spieler"

    mode = ask_choice("  Gegner", ["KI", "Mensch"])
    if mode == "ki":
        p2 = input("  Name der KI (Enter für 'Lando'): ").strip() or "Lando"
        ai_players = {p2}
    else:
        p2 = input("  Name Spieler 2: ").strip() or "P2"
        ai_players = set()

    names = [p1, p2]
    credits = {name: STARTING_CREDITS for name in names}
    print(f"\n  Jeder startet mit {STARTING_CREDITS} Credits.")

    hand_number = 1
    while True:
        broke = [n for n in names if credits[n] <= 0]
        if broke:
            header("Spiel beendet")
            for name in broke:
                print(f"  {name} ist pleite!")
            break

        play_hand(names, credits, hand_number, ai_players)
        hand_number += 1

        again = ask_choice("\n  Noch eine Hand", ["Ja", "Nein"])
        if again == "nein":
            break

    header("Endstand")
    for name in names:
        print(f"  {name}: {credits[name]} Credits")

    if credits[names[0]] != credits[names[1]]:
        winner = max(names, key=lambda n: credits[n])
        print(f"\n  {winner} gewinnt das Spiel!")
    else:
        print("\n  Unentschieden!")
    print()


if __name__ == "__main__":
    main()
