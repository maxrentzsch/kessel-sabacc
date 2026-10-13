import pygame
import random
import sys

pygame.init()
pygame.font.init()

# ── Window ────────────────────────────────────────────────────────────────────
W, H = 920, 680
screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("Kessel Sabaac")
clock = pygame.time.Clock()
FPS = 60

# ── Colors ────────────────────────────────────────────────────────────────────
BG        = (10,  8,   5)
PANEL     = (22,  17,  10)
LINE      = (50,  40,  25)
SAND_C    = (195, 158, 68)
SAND_DK   = (130, 105, 38)
BLOOD_C   = (148, 18,  18)
BLOOD_DK  = (88,  10,  10)
FACEDN    = (30,  24,  14)
FACEDN2   = (46,  36,  18)
GOLD      = (210, 172, 50)
CREAM     = (238, 222, 188)
GRAY      = (92,  82,  68)
DIM       = (55,  46,  35)
BTN_N     = (38,  30,  16)
BTN_H     = (60,  48,  22)
BTN_D     = (20,  16,  9)
BTN_B     = (128, 100, 36)
BTN_BH    = (198, 160, 60)
RED_N     = (88,  18,  18)
RED_H     = (125, 28,  28)
GRN_N     = (22,  72,  28)
GRN_H     = (32,  105, 40)
SHIFT_CLR = (200, 160, 40)
WHITE     = (255, 255, 255)

# ── Fonts ─────────────────────────────────────────────────────────────────────
def _f(size, bold=False):
    return pygame.font.SysFont("Georgia", size, bold=bold)

F_TITLE = _f(40, bold=True)
F_HEAD  = _f(24, bold=True)
F_LARGE = _f(20, bold=True)
F_MED   = _f(18)
F_SMALL = _f(13)
F_BTN   = _f(15, bold=True)
F_CARD  = _f(36, bold=True)
F_CARD_S= _f(12)
F_INPUT = _f(19)

# ── Constants ─────────────────────────────────────────────────────────────────
STARTING_CREDITS = 100
ANTE             = 5
ROUNDS           = 3
SHIFT_CHANCE     = 0.3
AI_DELAY         = 1300  # ms

CARD_W, CARD_H = 108, 152
CARD_GAP       = 22

# ── States ────────────────────────────────────────────────────────────────────
S_MENU    = "menu"
S_PLAYING = "playing"
S_OVER    = "over"

P_NEW_HAND  = "new_hand"
P_SHIFT     = "shift"
P_DRAW      = "draw"
P_KEEP      = "keep"
P_AI_DRAW   = "ai_draw"
P_BET       = "bet"
P_BET_AI    = "bet_ai"
P_SHOWDOWN  = "showdown"
P_HAND_END  = "hand_end"


# ── Game logic ────────────────────────────────────────────────────────────────

def build_decks():
    sand  = [{"color": "Sand",  "value": v} for v in range(1, 7)]
    blood = [{"color": "Blood", "value": v} for v in range(1, 7)]
    random.shuffle(sand)
    random.shuffle(blood)
    return sand, blood

def deal_hand(sd, bd):
    return {"Sand": sd.pop(), "Blood": bd.pop()}

def is_sabacc(hand):
    return hand["Sand"]["value"] == hand["Blood"]["value"]

def hand_total(hand):
    return hand["Sand"]["value"] + hand["Blood"]["value"]

def hand_diff(hand):
    return abs(hand["Sand"]["value"] - hand["Blood"]["value"])

def ai_draw_decision(hand, sand_deck, blood_deck):
    diff = hand_diff(hand)
    if diff == 0:
        return None, None
    s, b = hand["Sand"]["value"], hand["Blood"]["value"]
    target = "Sand" if s < b else "Blood"
    other_val = b if target == "Sand" else s
    deck = sand_deck if target == "Sand" else blood_deck
    prob = {1: 0.90, 2: 0.70, 3: 0.40}.get(diff, 0.20)
    if not deck or random.random() > prob:
        return None, None
    return target, other_val

def ai_bet_decision(hand, avail, to_call, can_check):
    diff = hand_diff(hand)
    bluff = random.random() < 0.12
    if diff == 0:
        if to_call == 0:
            return "bet", max(5, min(int(avail * random.uniform(0.12, 0.22)), avail))
        return "raise", max(to_call + 5, min(int(avail * random.uniform(0.12, 0.20)), avail))
    if diff == 1:
        if bluff:
            return ("bet" if to_call == 0 else "raise"), max(5, min(int(avail * 0.10), avail))
        if to_call == 0:
            return "check", 0
        if to_call <= avail * 0.18:
            return "call", min(to_call, avail)
        return "fold", 0
    if bluff:
        return ("bet" if to_call == 0 else "raise"), max(5, min(int(avail * 0.07), avail))
    if can_check and to_call == 0:
        return "check", 0
    if to_call > 0 and to_call <= avail * 0.07:
        return "call", min(to_call, avail)
    if to_call > 0:
        return "fold", 0
    return "check", 0

def winner_logic(names, hands, folded):
    active = [n for n in names if n not in folded]
    if len(active) == 1:
        return active[0], "Gegner aufgegeben"
    sabacc_p = [n for n, h in zip(names, hands) if is_sabacc(h)]
    if len(sabacc_p) == 2:
        v = {n: h["Sand"]["value"] for n, h in zip(names, hands)}
        if v[names[0]] < v[names[1]]:
            return names[0], "Beide Sabacc – niedrigster Wert"
        if v[names[1]] < v[names[0]]:
            return names[1], "Beide Sabacc – niedrigster Wert"
        return None, "Beide Sabacc – Unentschieden"
    if len(sabacc_p) == 1:
        return sabacc_p[0], "Sabacc!"
    t = {n: hand_total(h) for n, h in zip(names, hands)}
    if t[names[0]] < t[names[1]]:
        return names[0], f"Niedrigste Summe ({t[names[0]]})"
    if t[names[1]] < t[names[0]]:
        return names[1], f"Niedrigste Summe ({t[names[1]]})"
    return None, "Gleiche Summe – Unentschieden"


# ── UI components ─────────────────────────────────────────────────────────────

class Button:
    def __init__(self, x, y, w, h, text, action=None,
                 color=BTN_N, hover=BTN_H, border=BTN_B):
        self.rect   = pygame.Rect(x, y, w, h)
        self.text   = text
        self.action = action
        self.color  = color
        self.hover  = hover
        self.border = border
        self.disabled = False

    def draw(self, surf):
        mx, my = pygame.mouse.get_pos()
        hot = self.rect.collidepoint(mx, my) and not self.disabled
        bg  = BTN_D if self.disabled else (self.hover if hot else self.color)
        bd  = BTN_B if self.disabled else (BTN_BH if hot else self.border)
        tc  = GRAY  if self.disabled else CREAM
        pygame.draw.rect(surf, bg, self.rect, border_radius=6)
        pygame.draw.rect(surf, bd, self.rect, 2, border_radius=6)
        s = F_BTN.render(self.text, True, tc)
        surf.blit(s, s.get_rect(center=self.rect.center))

    def clicked(self, pos):
        return not self.disabled and self.rect.collidepoint(pos)


class TextInput:
    def __init__(self, x, y, w, h, placeholder=""):
        self.rect        = pygame.Rect(x, y, w, h)
        self.text        = ""
        self.placeholder = placeholder
        self.active      = False
        self._cursor_t   = 0

    def handle(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            self.active = self.rect.collidepoint(event.pos)
        if event.type == pygame.KEYDOWN and self.active:
            if event.key == pygame.K_BACKSPACE:
                self.text = self.text[:-1]
            elif event.key in (pygame.K_RETURN, pygame.K_TAB):
                self.active = False
            elif len(self.text) < 16 and event.unicode.isprintable():
                self.text += event.unicode

    def update(self, dt):
        self._cursor_t = (self._cursor_t + dt) % 1000

    def draw(self, surf):
        bd = GOLD if self.active else BTN_B
        pygame.draw.rect(surf, PANEL, self.rect, border_radius=4)
        pygame.draw.rect(surf, bd, self.rect, 2, border_radius=4)
        disp  = self.text if self.text else self.placeholder
        col   = CREAM if self.text else GRAY
        s = F_INPUT.render(disp, True, col)
        r = s.get_rect(midleft=(self.rect.left + 8, self.rect.centery))
        surf.blit(s, r)
        if self.active and self._cursor_t < 500:
            cx = r.right + 2
            pygame.draw.line(surf, CREAM, (cx, self.rect.top+5), (cx, self.rect.bottom-5), 1)

    def get(self):
        return self.text.strip()


# ── Card drawing ──────────────────────────────────────────────────────────────

def draw_card(surf, x, y, card, face_down=False):
    rect = pygame.Rect(x, y, CARD_W, CARD_H)
    if face_down:
        pygame.draw.rect(surf, FACEDN, rect, border_radius=8)
        for r in range(4):
            for c in range(3):
                sr = pygame.Rect(x+10+c*30, y+12+r*32, 20, 22)
                pygame.draw.rect(surf, FACEDN2, sr, border_radius=3)
        pygame.draw.rect(surf, BTN_B, rect, 2, border_radius=8)
        return
    sand = card["color"] == "Sand"
    bg = SAND_C  if sand else BLOOD_C
    dk = SAND_DK if sand else BLOOD_DK
    pygame.draw.rect(surf, bg, rect, border_radius=8)
    # center value
    vs = F_CARD.render(str(card["value"]), True, BG)
    surf.blit(vs, vs.get_rect(center=(x + CARD_W//2, y + CARD_H//2)))
    # corner labels
    lbl = F_CARD_S.render(card["color"], True, dk)
    surf.blit(lbl, (x+6, y+5))
    lbl2 = pygame.transform.rotate(lbl, 180)
    surf.blit(lbl2, (x + CARD_W - lbl2.get_width() - 6, y + CARD_H - lbl2.get_height() - 5))
    pygame.draw.rect(surf, dk, rect, 2, border_radius=8)


# ── Game ──────────────────────────────────────────────────────────────────────

class Game:
    def __init__(self):
        self.state = S_MENU
        self.phase = None

        # Players
        self.names      = []
        self.credits    = {}
        self.ai_players = set()

        # Hand state
        self.hand_num   = 0
        self.pot        = 0
        self.folded     = set()
        self.hands      = []
        self.sand_deck  = []
        self.blood_deck = []

        # Round state
        self.round_num  = 0
        self.draw_queue = []
        self.drawn_card = None
        self.drawn_key  = None

        # Betting state
        self.bet_committed = {}
        self.bet_steps     = []
        self.bet_input     = 10
        self._bet_ctx      = None   # (idx, to_call, can_check)

        # AI timer
        self.ai_timer  = 0
        self.ai_action = None

        # Messages
        self.messages = []

        # Buttons & inputs (context-dependent)
        self.buttons = []

        # Menu widgets
        cx = W // 2
        self.name_inputs = [
            TextInput(cx - 130, 270, 260, 40, "Dein Name"),
            TextInput(cx - 130, 330, 260, 40, "Gegner / KI-Name"),
        ]
        self.menu_btns = [
            Button(cx - 180, 410, 160, 50, "vs KI",
                   action=lambda: self._start(ai=True)),
            Button(cx +  20, 410, 160, 50, "vs Mensch",
                   action=lambda: self._start(ai=False)),
        ]

    # ── Helpers ───────────────────────────────────────────────────────────────

    def log(self, msg):
        self.messages.append(msg)
        if len(self.messages) > 5:
            self.messages.pop(0)

    def _btn(self, x, y, w, h, text, action, color=BTN_N, hover=BTN_H):
        b = Button(x, y, w, h, text, action=action, color=color, hover=hover)
        return b

    # ── Update / events ───────────────────────────────────────────────────────

    def update(self, dt):
        for inp in self.name_inputs:
            inp.update(dt)
        if self.ai_timer > 0:
            self.ai_timer -= dt
            if self.ai_timer <= 0:
                self.ai_timer = 0
                if self.ai_action:
                    fn = self.ai_action
                    self.ai_action = None
                    fn()

    def handle(self, event):
        for inp in self.name_inputs:
            inp.handle(event)
        if event.type == pygame.QUIT:
            pygame.quit(); sys.exit()
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            pos = event.pos
            if self.state == S_MENU:
                for b in self.menu_btns:
                    if b.clicked(pos) and b.action:
                        b.action(); return
            elif self.ai_timer <= 0:
                for b in self.buttons:
                    if b.clicked(pos) and b.action:
                        b.action(); return

    # ── Game flow ─────────────────────────────────────────────────────────────

    def _start(self, ai):
        p1 = self.name_inputs[0].get() or "Spieler"
        p2 = self.name_inputs[1].get() or ("Lando" if ai else "Spieler 2")
        self.names      = [p1, p2]
        self.ai_players = {p2} if ai else set()
        self.credits    = {n: STARTING_CREDITS for n in self.names}
        self.hand_num   = 0
        self.messages   = []
        self.state      = S_PLAYING
        self.log(f"Willkommen! Jeder startet mit {STARTING_CREDITS} Credits.")
        self._new_hand()

    def _new_hand(self):
        self.hand_num += 1
        self.pot       = 0
        self.folded    = set()
        self.phase     = P_NEW_HAND
        self.bet_committed = {n: 0 for n in self.names}

        for name in self.names:
            ante = min(ANTE, self.credits[name])
            self.credits[name] -= ante
            self.pot += ante
        self.log(f"Hand #{self.hand_num}  –  Ante: {ANTE} Credits  –  Pot: {self.pot}")

        self.sand_deck, self.blood_deck = build_decks()
        self.hands = [deal_hand(self.sand_deck, self.blood_deck) for _ in self.names]
        self.round_num = 0
        self._start_round()

    def _start_round(self):
        self.round_num += 1
        self.log(f"── Runde {self.round_num} ──")
        if self.round_num > 1 and random.random() < SHIFT_CHANCE:
            self._do_shift()
        else:
            self._start_draws()

    def _do_shift(self):
        self.phase = P_SHIFT
        for hand in self.hands:
            self.sand_deck.append(hand["Sand"])
            self.blood_deck.append(hand["Blood"])
        random.shuffle(self.sand_deck)
        random.shuffle(self.blood_deck)
        for hand in self.hands:
            hand["Sand"]  = self.sand_deck.pop()
            hand["Blood"] = self.blood_deck.pop()
        self.log("★ SABACC SHIFT!  Hände wurden neu ausgeteilt!")
        self.buttons = [self._btn(W//2 - 70, 545, 140, 46, "Weiter",
                                  lambda: self._start_draws())]

    def _start_draws(self):
        self.draw_queue = [i for i in range(len(self.names))
                           if self.names[i] not in self.folded]
        self._next_draw()

    def _next_draw(self):
        if not self.draw_queue:
            self._start_betting()
            return
        idx  = self.draw_queue[0]
        name = self.names[idx]
        if name in self.ai_players:
            self.phase     = P_AI_DRAW
            self.buttons   = []
            self.log(f"{name} überlegt...")
            self.ai_timer  = AI_DELAY
            self.ai_action = lambda: self._exec_ai_draw(idx)
        else:
            self.phase = P_DRAW
            self.log(f"{name} – Karte ziehen oder passen?")
            self._set_draw_buttons(idx)

    def _set_draw_buttons(self, idx):
        bw = 132; gap = 10
        total = 3*bw + 2*gap
        sx = W//2 - total//2
        y  = 545
        self.buttons = [
            self._btn(sx,           y, bw, 46, "Sand ziehen",
                      lambda: self._human_draw(idx, "Sand")),
            self._btn(sx+bw+gap,    y, bw, 46, "Blood ziehen",
                      lambda: self._human_draw(idx, "Blood")),
            self._btn(sx+2*(bw+gap),y, bw, 46, "Passen",
                      lambda: self._human_pass(idx)),
        ]

    def _human_draw(self, idx, key):
        deck = self.sand_deck if key == "Sand" else self.blood_deck
        if not deck:
            self.log(f"{key}-Deck leer!")
            self._human_pass(idx); return
        self.drawn_card = deck.pop()
        self.drawn_key  = key
        self.phase      = P_KEEP
        self.log(f"Gezogen: {key} {self.drawn_card['value']}  –  behalten?")
        cx = W//2
        self.buttons = [
            self._btn(cx-138, 545, 128, 46, "Behalten",
                      lambda: self._human_keep(idx, True),
                      color=GRN_N, hover=GRN_H),
            self._btn(cx+10,  545, 128, 46, "Zurückgeben",
                      lambda: self._human_keep(idx, False)),
        ]

    def _human_keep(self, idx, keep):
        deck = self.sand_deck if self.drawn_key == "Sand" else self.blood_deck
        if keep:
            self.hands[idx][self.drawn_key] = self.drawn_card
            self.log(f"{self.names[idx]} behält die Karte.")
        else:
            deck.append(self.drawn_card)
            random.shuffle(deck)
            self.log(f"{self.names[idx]} gibt die Karte zurück.")
        self.drawn_card = None
        self.draw_queue.pop(0)
        self._next_draw()

    def _human_pass(self, idx):
        self.log(f"{self.names[idx]} passt.")
        self.draw_queue.pop(0)
        self._next_draw()

    def _exec_ai_draw(self, idx):
        hand = self.hands[idx]
        name = self.names[idx]
        target, other_val = ai_draw_decision(hand, self.sand_deck, self.blood_deck)
        if target is None:
            self.log(f"{name} passt.")
        else:
            deck = self.sand_deck if target == "Sand" else self.blood_deck
            if not deck:
                self.log(f"{name} passt (Deck leer).")
            else:
                card = deck.pop()
                if abs(card["value"] - other_val) <= hand_diff(hand):
                    hand[target] = card
                    self.log(f"{name} zieht und behält eine {target}-Karte.")
                else:
                    deck.append(card); random.shuffle(deck)
                    self.log(f"{name} zieht, gibt die {target}-Karte zurück.")
        self.draw_queue.pop(0)
        self._next_draw()

    # ── Betting ───────────────────────────────────────────────────────────────

    def _start_betting(self):
        self.bet_committed = {n: 0 for n in self.names}
        self.bet_input     = 10
        self.bet_steps     = [(0, "open"), (1, "respond")]
        self._next_bet()

    def _next_bet(self):
        if len(self.folded) >= len(self.names) - 1 or not self.bet_steps:
            self._end_round(); return
        idx, _ = self.bet_steps.pop(0)
        name = self.names[idx]
        if name in self.folded:
            self._next_bet(); return

        to_call  = max(0, max(self.bet_committed.values()) - self.bet_committed[name])
        can_chk  = to_call == 0
        self._bet_ctx = (idx, to_call, can_chk)

        if name in self.ai_players:
            self.phase     = P_BET_AI
            self.buttons   = []
            self.log(f"{name} überlegt (Einsatz)...")
            self.ai_timer  = AI_DELAY // 2
            self.ai_action = lambda: self._exec_ai_bet(idx, to_call, can_chk)
        else:
            self.phase = P_BET
            self._set_bet_buttons(idx, to_call, can_chk)

    def _set_bet_buttons(self, idx, to_call, can_chk):
        name  = self.names[idx]
        avail = self.credits[name]
        # Clamp bet_input
        lo = max(5, to_call + (1 if not can_chk else 0))
        self.bet_input = max(lo, min(self.bet_input, avail))

        y  = 555; cx = W//2
        bw = 118; gap = 8

        self.buttons = []
        # +/- for bet amount
        self.buttons.append(self._btn(cx-72, 510, 34, 34, "−",
                                      lambda: self._adj_bet(-5, idx, to_call, can_chk)))
        self.buttons.append(self._btn(cx+38, 510, 34, 34, "+",
                                      lambda: self._adj_bet(+5, idx, to_call, can_chk)))

        if can_chk:
            self.buttons.append(self._btn(cx-2*bw-2*gap, y, bw, 46, "Check",
                                          lambda: self._human_bet(idx, "check", 0)))
            self.buttons.append(self._btn(cx-bw-gap,      y, bw, 46, "Setzen",
                                          lambda: self._human_bet(idx, "bet", self.bet_input),
                                          color=GRN_N, hover=GRN_H))
            self.buttons.append(self._btn(cx+gap,          y, bw, 46, "Aufgeben",
                                          lambda: self._human_bet(idx, "fold", 0),
                                          color=RED_N, hover=RED_H))
        else:
            call_amt = min(to_call, avail)
            self.buttons.append(self._btn(cx-2*bw-2*gap, y, bw, 46, f"Mitgehen ({call_amt})",
                                          lambda: self._human_bet(idx, "call", call_amt),
                                          color=GRN_N, hover=GRN_H))
            self.buttons.append(self._btn(cx-bw-gap,      y, bw, 46, "Erhöhen",
                                          lambda: self._human_bet(idx, "raise", self.bet_input)))
            self.buttons.append(self._btn(cx+gap,          y, bw, 46, "Aufgeben",
                                          lambda: self._human_bet(idx, "fold", 0),
                                          color=RED_N, hover=RED_H))

    def _adj_bet(self, delta, idx, to_call, can_chk):
        avail = self.credits[self.names[idx]]
        lo    = max(5, to_call + (1 if not can_chk else 0))
        self.bet_input = max(lo, min(avail, self.bet_input + delta))
        self._set_bet_buttons(idx, to_call, can_chk)

    def _human_bet(self, idx, action, amount):
        name  = self.names[idx]
        avail = self.credits[name]
        self._apply_bet(idx, action, min(amount, avail))
        other = 1 - idx
        if action in ("bet", "raise") and self.names[other] not in self.folded:
            self.bet_steps.insert(0, (other, "respond"))
        self._next_bet()

    def _exec_ai_bet(self, idx, to_call, can_chk):
        avail          = self.credits[self.names[idx]]
        action, amount = ai_bet_decision(self.hands[idx], avail, to_call, can_chk)
        self._apply_bet(idx, action, min(amount, avail))
        other = 1 - idx
        if action in ("bet", "raise") and self.names[other] not in self.folded:
            self.bet_steps.insert(0, (other, "respond"))
        self._next_bet()

    def _apply_bet(self, idx, action, amount):
        name = self.names[idx]
        if action == "fold":
            self.folded.add(name)
            self.log(f"{name} gibt auf.")
        elif action == "check":
            self.log(f"{name} checkt.")
        elif action in ("call", "bet", "raise"):
            self.credits[name]       -= amount
            self.bet_committed[name] += amount
            self.pot                 += amount
            verb = {"call":"geht mit","bet":"setzt","raise":"erhöht auf"}[action]
            self.log(f"{name} {verb} {amount}. Pot: {self.pot}")

    # ── Round / Hand end ──────────────────────────────────────────────────────

    def _end_round(self):
        active = [n for n in self.names if n not in self.folded]
        if len(active) <= 1 or self.round_num >= ROUNDS:
            self._showdown()
        else:
            self._start_round()

    def _showdown(self):
        self.phase = P_SHOWDOWN
        winner, reason = winner_logic(self.names, self.hands, self.folded)
        if winner:
            self.credits[winner] += self.pot
            self.log(f"{winner} gewinnt {self.pot} Credits!  ({reason})")
        else:
            half = self.pot // 2
            self.credits[self.names[0]] += half
            self.credits[self.names[1]] += self.pot - half
            self.log(f"Unentschieden! Pot ({self.pot}) aufgeteilt.")

        self.phase = P_HAND_END
        broke = any(self.credits[n] <= 0 for n in self.names)
        cx = W // 2
        if broke:
            self.buttons = [
                self._btn(cx-70, 545, 140, 46, "Fertig",
                          lambda: self._end_game())
            ]
        else:
            self.buttons = [
                self._btn(cx-160, 545, 148, 46, "Nächste Hand",
                          lambda: self._new_hand()),
                self._btn(cx+12,  545, 148, 46, "Aufhören",
                          lambda: self._end_game()),
            ]

    def _end_game(self):
        self.state   = S_OVER
        self.phase   = None
        self.buttons = [
            self._btn(W//2-165, 510, 150, 50, "Neues Spiel",
                      lambda: self._reset()),
            self._btn(W//2+15,  510, 150, 50, "Beenden",
                      lambda: (pygame.quit(), sys.exit())),
        ]

    def _reset(self):
        self.state  = S_MENU
        self.messages = []
        for inp in self.name_inputs:
            inp.text = ""

    # ── Draw ─────────────────────────────────────────────────────────────────

    def draw(self, surf):
        surf.fill(BG)
        if self.state == S_MENU:
            self._d_menu(surf)
        elif self.state == S_PLAYING:
            self._d_playing(surf)
        elif self.state == S_OVER:
            self._d_over(surf)

    # ── Menu ──────────────────────────────────────────────────────────────────

    def _d_menu(self, surf):
        t = F_TITLE.render("KESSEL SABAAC", True, GOLD)
        surf.blit(t, t.get_rect(center=(W//2, 130)))
        sub = F_MED.render("Das Würfelspiel aus den Cantinas der Galaxis", True, GRAY)
        surf.blit(sub, sub.get_rect(center=(W//2, 182)))
        cx = W//2
        for lbl, inp in zip(["Dein Name:", "Gegner:"], self.name_inputs):
            ls = F_MED.render(lbl, True, CREAM)
            surf.blit(ls, ls.get_rect(midright=(cx-140, inp.rect.centery)))
            inp.draw(surf)
        for b in self.menu_btns:
            b.draw(surf)
        hint = F_SMALL.render("In ein Feld klicken und tippen  •  Enter zum Bestätigen", True, GRAY)
        surf.blit(hint, hint.get_rect(center=(W//2, 490)))

    # ── Playing ───────────────────────────────────────────────────────────────

    def _d_playing(self, surf):
        self._d_topbar(surf)
        # AI area  (y: 55–285)
        if len(self.names) > 1:
            self._d_player_zone(surf, 1, y_top=58,  zone_h=230)
        pygame.draw.line(surf, LINE, (40, 292), (W-40, 292), 1)
        # Human area (y: 295–500)
        if self.names:
            self._d_player_zone(surf, 0, y_top=295, zone_h=210)
        # Action area
        if self.phase == P_BET and self._bet_ctx:
            self._d_bet_amount(surf)
        if self.phase == P_KEEP and self.drawn_card:
            self._d_drawn_card_preview(surf)
        for b in self.buttons:
            b.draw(surf)
        self._d_messages(surf)

    def _d_topbar(self, surf):
        pygame.draw.rect(surf, PANEL, (0, 0, W, 54))
        pygame.draw.line(surf, LINE, (0, 54), (W, 54), 1)
        t = F_HEAD.render("KESSEL SABAAC", True, GOLD)
        surf.blit(t, (18, 14))
        rnd = F_MED.render(f"Runde {self.round_num} / {ROUNDS}", True, DIM)
        surf.blit(rnd, rnd.get_rect(center=(W//2, 27)))
        pot = F_MED.render(f"Pot: {self.pot} Credits", True, CREAM)
        surf.blit(pot, pot.get_rect(midright=(W-18, 27)))

    def _d_player_zone(self, surf, idx, y_top, zone_h):
        name  = self.names[idx]
        is_ai = name in self.ai_players
        cred  = self.credits.get(name, 0)
        hand  = self.hands[idx] if idx < len(self.hands) else None

        # Name row
        nc = GOLD if not is_ai else CREAM
        ns = F_HEAD.render(name + (" (KI)" if is_ai else ""), True, nc)
        surf.blit(ns, (50, y_top + 6))
        cs = F_MED.render(f"{cred} Credits", True, GRAY)
        surf.blit(cs, (50 + ns.get_width() + 14, y_top + 12))

        if name in self.folded:
            fs = F_LARGE.render("AUFGEGEBEN", True, RED_N)
            surf.blit(fs, fs.get_rect(midright=(W-50, y_top + 18)))

        # Cards
        if hand:
            reveal = not is_ai or self.phase in (P_SHOWDOWN, P_HAND_END)
            cx  = W // 2
            x1  = cx - CARD_W - CARD_GAP // 2
            x2  = cx + CARD_GAP // 2
            cy  = y_top + zone_h // 2 - CARD_H // 2 + 8

            draw_card(surf, x1, cy, hand["Sand"],  face_down=not reveal)
            draw_card(surf, x2, cy, hand["Blood"], face_down=not reveal)

            if reveal:
                if is_sabacc(hand):
                    val_s = F_LARGE.render("✦ SABACC", True, GOLD)
                else:
                    val_s = F_MED.render(f"Summe: {hand_total(hand)}", True, CREAM)
                surf.blit(val_s, val_s.get_rect(center=(cx, cy + CARD_H + 16)))

        # Turn indicator
        acting = ((self.phase in (P_DRAW, P_KEEP) and idx == 0) or
                  (self.phase == P_AI_DRAW and idx == 1) or
                  (self.phase in (P_BET,) and idx == 0) or
                  (self.phase == P_BET_AI and idx == 1))
        if acting:
            ar = F_LARGE.render("▶", True, GOLD)
            surf.blit(ar, (28, y_top + 6))

    def _d_drawn_card_preview(self, surf):
        # Show drawn card floating above buttons
        cx = W // 2
        x  = cx - CARD_W // 2
        y  = 430
        pygame.draw.rect(surf, PANEL, (x-12, y-22, CARD_W+24, CARD_H+28), border_radius=10)
        lbl = F_SMALL.render("Gezogene Karte", True, GRAY)
        surf.blit(lbl, lbl.get_rect(center=(cx, y-12)))
        draw_card(surf, x, y, self.drawn_card)

    def _d_bet_amount(self, surf):
        # Amount label between the +/- buttons
        cx = W // 2
        bx = cx - 32
        by = 510
        amt_s = F_LARGE.render(f"{self.bet_input} Credits", True, GOLD)
        surf.blit(amt_s, amt_s.get_rect(center=(cx, by + 17)))

    def _d_messages(self, surf):
        pygame.draw.rect(surf, PANEL, (0, 610, W, H-610))
        pygame.draw.line(surf, LINE, (0, 610), (W, 610), 1)
        for i, msg in enumerate(self.messages[-4:]):
            alpha = 100 + i * 40
            col   = (min(255,alpha+80), min(240,alpha+70), min(200,alpha+40))
            s = F_SMALL.render(msg, True, col)
            surf.blit(s, (20, 617 + i * 17))

    # ── Game over ─────────────────────────────────────────────────────────────

    def _d_over(self, surf):
        t = F_TITLE.render("SPIELENDE", True, GOLD)
        surf.blit(t, t.get_rect(center=(W//2, 140)))
        for i, name in enumerate(self.names):
            c   = self.credits[name]
            col = GOLD if c == max(self.credits.values()) else CREAM
            s   = F_HEAD.render(f"{name}:  {c} Credits", True, col)
            surf.blit(s, s.get_rect(center=(W//2, 255 + i*65)))
        winner = max(self.names, key=lambda n: self.credits[n])
        if self.credits[self.names[0]] != self.credits[self.names[1]]:
            ws = F_LARGE.render(f"{winner} gewinnt das Spiel!", True, GOLD)
        else:
            ws = F_LARGE.render("Unentschieden!", True, CREAM)
        surf.blit(ws, ws.get_rect(center=(W//2, 410)))
        for b in self.buttons:
            b.draw(surf)
        self._d_messages(surf)


# ── Main loop ─────────────────────────────────────────────────────────────────

def main():
    game = Game()
    while True:
        dt = clock.tick(FPS)
        for event in pygame.event.get():
            game.handle(event)
        game.update(dt)
        game.draw(screen)
        pygame.display.flip()

if __name__ == "__main__":
    main()
