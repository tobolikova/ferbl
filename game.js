'use strict';

// ===== KONSTANTY =====
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYM = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RANKS_32 = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const AI_NAMES = ['Lily', 'Otto', 'Max', 'Mia', 'Hugo', 'Ema', 'Leo', 'Bruno', 'Viktor', 'Sára'];

// ===== STAV HRY =====
let G = {};
let speed = 1;

function getDelay(base = 800) { return base / speed; }

// ===== SETUP UI =====
setupBtnGroup('mode-btns', v => {
  document.getElementById('local-settings').classList.toggle('hidden', v !== 'local');
  document.getElementById('ai-settings').classList.toggle('hidden', v !== 'ai');
  document.getElementById('online-settings').classList.toggle('hidden', v !== 'online');
});
setupBtnGroup('player-count-btns', v => buildNameInputs(parseInt(v)));
setupBtnGroup('ai-count-btns');
setupBtnGroup('ai-diff-btns');
setupBtnGroup('deck-type-btns');

function setupBtnGroup(id, onChange) {
  const container = document.getElementById(id);
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('.opt-btn');
    if (!btn) return;
    container.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    if (onChange) onChange(btn.dataset.value);
  });
}

function getSelected(id) {
  const btn = document.querySelector(`#${id} .opt-btn.selected`);
  return btn ? btn.dataset.value : null;
}

function buildNameInputs(count) {
  const container = document.getElementById('player-names-container');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'name-row';
    row.innerHTML = `<label>Hráč ${i + 1}</label><input type="text" class="name-input player-name-inp" value="Hráč ${i + 1}">`;
    container.appendChild(row);
  }
}
buildNameInputs(3);

// Online sub-tabs
document.getElementById('online-create-btn').addEventListener('click', () => {
  document.getElementById('online-create-btn').classList.add('selected');
  document.getElementById('online-join-btn').classList.remove('selected');
  document.getElementById('online-create-panel').classList.remove('hidden');
  document.getElementById('online-join-panel').classList.add('hidden');
});
document.getElementById('online-join-btn').addEventListener('click', () => {
  document.getElementById('online-join-btn').classList.add('selected');
  document.getElementById('online-create-btn').classList.remove('selected');
  document.getElementById('online-join-panel').classList.remove('hidden');
  document.getElementById('online-create-panel').classList.add('hidden');
});
document.getElementById('do-create-room-btn').addEventListener('click', () => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  document.getElementById('room-code-text').textContent = code;
  document.getElementById('room-code-display').classList.remove('hidden');
  showToast('Online multiplayer – přijde brzy! Zkus lokální nebo AI mód.');
});
document.getElementById('do-join-room-btn').addEventListener('click', () => {
  showToast('Online multiplayer – přijde brzy! Zkus lokální nebo AI mód.');
});

// Start
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('play-again-btn').addEventListener('click', startGame);
document.getElementById('back-setup-btn').addEventListener('click', () => showScreen('screen-setup'));
document.getElementById('menu-btn').addEventListener('click', () => showScreen('screen-setup'));

// Speed buttons
document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    speed = parseInt(btn.dataset.speed);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.toggle('active', b === btn));
  });
});

// ===== DECK =====
function buildDeck(type) {
  const deck = [];
  const ranks = type === '52' ? RANKS_52 : RANKS_32;
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push({ suit, rank, id: `${rank}_${suit}` });
    }
  }
  if (type === '52') {
    deck.push({ suit: null, rank: 'JKR', id: 'JKR_1', joker: true });
    deck.push({ suit: null, rank: 'JKR', id: 'JKR_2', joker: true });
  }
  return shuffle(deck);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== HERNÍ INICIALIZACE =====
function startGame() {
  const mode = getSelected('mode-btns') || 'local';
  const deckType = getSelected('deck-type-btns') || '32';
  const ruleJoker = document.getElementById('rule-joker').checked;
  const ruleReturn = document.getElementById('rule-return').checked;

  let players = [];

  if (mode === 'local') {
    const count = parseInt(getSelected('player-count-btns') || '3');
    const inputs = document.querySelectorAll('.player-name-inp');
    for (let i = 0; i < count; i++) {
      const name = inputs[i] ? (inputs[i].value.trim() || `Hráč ${i + 1}`) : `Hráč ${i + 1}`;
      players.push({ name, isAI: false, hand: [], finished: false, finishPos: null, idx: i });
    }
  } else if (mode === 'ai') {
    const humanName = document.getElementById('ai-player-name').value.trim() || 'TY';
    const aiCount = parseInt(getSelected('ai-count-btns') || '2');
    const difficulty = getSelected('ai-diff-btns') || 'medium';
    const pool = shuffle([...AI_NAMES]);
    players.push({ name: humanName, isAI: false, hand: [], finished: false, finishPos: null, idx: 0 });
    for (let i = 0; i < aiCount; i++) {
      players.push({ name: pool[i] || `Robot ${i+1}`, isAI: true, difficulty, hand: [], finished: false, finishPos: null, idx: i + 1 });
    }
  } else {
    showToast('Online mód – přijde brzy! Spouštím vs roboti.');
    const pool = shuffle([...AI_NAMES]);
    players.push({ name: 'TY', isAI: false, hand: [], finished: false, finishPos: null, idx: 0 });
    players.push({ name: pool[0], isAI: true, difficulty: 'medium', hand: [], finished: false, finishPos: null, idx: 1 });
    players.push({ name: pool[1], isAI: true, difficulty: 'medium', hand: [], finished: false, finishPos: null, idx: 2 });
  }

  const deck = buildDeck(deckType);

  // Rozdat 4 karty
  for (let i = 0; i < 4; i++) {
    for (const p of players) p.hand.push(deck.pop());
  }

  // První karta odhazu – ne speciální
  let startCard = null, startIdx = -1;
  for (let i = deck.length - 1; i >= 0; i--) {
    if (!isSpecial(deck[i])) { startCard = deck[i]; startIdx = i; break; }
  }
  if (startIdx !== -1) deck.splice(startIdx, 1);
  else startCard = deck.pop();

  G = {
    players, deck,
    discardPile: [startCard],
    currentSuit: startCard.suit,
    currentPlayerIdx: 0,
    pendingDraw: 0,
    pendingDrawSource: null,
    waitingForSuit: false,
    skipNext: false,
    winners: [],
    mode,
    deckType,
    rules: { joker: ruleJoker, return: ruleReturn },
  };

  showScreen('none');
  resizeGame();
  renderAll();
  document.getElementById('round-num').textContent = 'HRA';

  // Pokud je první hráč AI → spustit AI tah
  if (G.players[0].isAI) scheduleAiTurn();
}

function isSpecial(c) {
  if (c.joker) return true;
  return ['7', 'A', 'Q', 'K'].includes(c.rank);
}

// ===== PRAVIDLA =====
function canPlay(card) {
  const top = G.discardPile[G.discardPile.length - 1];
  if (card.joker) return G.rules.joker;

  if (G.pendingDraw > 0) {
    if (G.pendingDrawSource === 'spadeKing') {
      return card.rank === '7' && card.suit === 'spades';
    }
    if (card.rank === '7') return true;
    if (card.joker && G.rules.joker) return true;
    return false;
  }

  if (card.rank === 'K' && card.suit === 'spades') {
    return card.suit === G.currentSuit || card.rank === top.rank;
  }
  return card.suit === G.currentSuit || card.rank === top.rank;
}

function handleSpecialCard(card) {
  if (card.joker) {
    G.pendingDraw += 10;
    G.pendingDrawSource = 'joker';
    showToast('Žolík! Další hráč bere 10 karet!');
    return;
  }
  switch (card.rank) {
    case '7':
      G.pendingDraw += 2;
      if (!G.pendingDrawSource) G.pendingDrawSource = 'seven';
      showToast('Sedmička! Další hráč bere karty.');
      break;
    case 'A':
      G.skipNext = true;
      showToast('Eso! Přeskočení.');
      break;
    case 'Q':
      G.waitingForSuit = true;
      break;
    case 'K':
      if (card.suit === 'spades') {
        G.pendingDraw += 5;
        G.pendingDrawSource = 'spadeKing';
        showToast('Pikový král! Další hráč bere 5 karet!');
      }
      break;
  }
}

function advanceTurn() {
  const n = G.players.length;
  let next = (G.currentPlayerIdx + 1) % n;
  let guard = 0;
  while (G.players[next].finished && guard++ < n) next = (next + 1) % n;

  if (G.skipNext) {
    G.skipNext = false;
    let skipped = next;
    let after = (next + 1) % n;
    guard = 0;
    while (G.players[after].finished && guard++ < n) after = (after + 1) % n;
    showToast(`${G.players[skipped].name} přeskočen!`);
    next = after;
  }
  G.currentPlayerIdx = next;
}

function drawCards(playerIdx, count) {
  const p = G.players[playerIdx];
  for (let i = 0; i < count; i++) {
    if (G.deck.length === 0) reshuffleDeck();
    if (G.deck.length === 0) break;
    p.hand.push(G.deck.pop());
  }
}

function reshuffleDeck() {
  if (G.discardPile.length <= 1) return;
  const top = G.discardPile.pop();
  G.deck = shuffle(G.discardPile);
  G.discardPile = [top];
  showToast('Balíček promíchán.');
}

function isGameOver() {
  return G.players.filter(p => !p.finished).length <= 1;
}

function endGame() {
  const remaining = G.players.filter(p => !p.finished)
    .sort((a, b) => a.hand.length - b.hand.length);
  for (const p of remaining) {
    p.finishPos = G.winners.length + 1;
    G.winners.push(p.idx);
  }
  renderWin();
  showScreen('screen-win');
}

// ===== ZAHRAT KARTU =====
async function playCard(playerIdx, cardIdx) {
  if (playerIdx !== G.currentPlayerIdx) return;
  if (G.waitingForSuit && !G.players[playerIdx].isAI) return;

  const p = G.players[playerIdx];
  const card = p.hand[cardIdx];
  if (!canPlay(card)) {
    if (!p.isAI) shakeHand();
    return;
  }

  // Animace karty na stůl
  await animateCardToCenter(playerIdx, cardIdx);

  p.hand.splice(cardIdx, 1);
  G.discardPile.push(card);
  G.currentSuit = card.suit;

  handleSpecialCard(card);

  if (p.hand.length === 0 && !p.finished) {
    p.finished = true;
    p.finishPos = G.winners.length + 1;
    G.winners.push(playerIdx);
    showToast(`${p.name} – ${p.finishPos}. místo! 🏆`);
  }

  if (isGameOver()) { renderAll(); setTimeout(endGame, 500); return; }

  if (!G.waitingForSuit) {
    advanceTurn();
    renderAll();
    maybeScheduleAi();
  } else {
    renderAll();
    if (p.isAI) {
      // AI vybere barvu – nejčastější v ruce
      const suit = aiPickSuit(p);
      setTimeout(() => pickSuit(suit), getDelay(400));
    } else {
      document.getElementById('suit-modal').classList.remove('hidden');
    }
  }
}

function aiPickSuit(player) {
  const counts = {};
  for (const c of player.hand) if (c.suit) counts[c.suit] = (counts[c.suit] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'hearts';
}

function pickSuit(suit) {
  G.currentSuit = suit;
  G.waitingForSuit = false;
  document.getElementById('suit-modal').classList.add('hidden');
  showToast(`Zvolena barva: ${SUIT_SYM[suit]}`);
  advanceTurn();
  renderAll();
  maybeScheduleAi();
}

async function playerDraw(playerIdx) {
  if (playerIdx !== G.currentPlayerIdx) return;
  const p = G.players[playerIdx];
  if (p.finished) { advanceTurn(); renderAll(); maybeScheduleAi(); return; }

  if (G.pendingDraw > 0) {
    const cnt = G.pendingDraw;
    // Návrat do hry: pokud právě vítěz musí brát
    if (G.rules.return && G.winners.includes(playerIdx)) {
      const idx = G.winners.indexOf(playerIdx);
      p.finished = false; p.finishPos = null;
      G.winners.splice(idx, 1);
      showToast(`${p.name} se vrací do hry! Bere ${cnt} karet.`);
    }
    drawCards(playerIdx, cnt);
    showToast(`${p.name} bere ${cnt} karet.`);
    G.pendingDraw = 0;
    G.pendingDrawSource = null;
  } else {
    if (G.deck.length === 0) reshuffleDeck();
    if (G.deck.length > 0) {
      p.hand.push(G.deck.pop());
      showToast(`${p.name} bere kartu.`);
    }
  }

  advanceTurn();
  renderAll();
  maybeScheduleAi();
}

// ===== AI =====
function maybeScheduleAi() {
  if (G.players[G.currentPlayerIdx]?.isAI) scheduleAiTurn();
}

function scheduleAiTurn() {
  setTimeout(() => aiMove(), getDelay(700) + Math.random() * getDelay(300));
}

async function aiMove() {
  if (!G.players[G.currentPlayerIdx]) return;
  const p = G.players[G.currentPlayerIdx];
  if (!p.isAI) return;
  if (p.finished) { advanceTurn(); renderAll(); maybeScheduleAi(); return; }

  const cardIdx = aiPickCard(p);
  if (cardIdx !== -1) {
    await playCard(G.currentPlayerIdx, cardIdx);
  } else {
    await playerDraw(G.currentPlayerIdx);
  }
}

function aiPickCard(player) {
  const playable = player.hand
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => canPlay(c));

  if (playable.length === 0) return -1;
  if (player.difficulty === 'easy') {
    return playable[Math.floor(Math.random() * playable.length)].i;
  }

  // Střední / těžká: preferuj brací karty + K♠, pak Q, pak běžné
  const activePlayers = G.players.filter(p => !p.finished);
  const opponentNearWin = activePlayers.some(p => p.idx !== player.idx && p.hand.length <= 2);

  // Prioritize draw cards if opponent near win
  if (opponentNearWin) {
    const draw = playable.find(({ c }) => c.rank === 'K' && c.suit === 'spades');
    if (draw) return draw.i;
    const seven = playable.find(({ c }) => c.rank === '7');
    if (seven) return seven.i;
    const joker = playable.find(({ c }) => c.joker);
    if (joker) return joker.i;
  }

  // Prefer Q if it changes suit to one we have many of
  const queen = playable.find(({ c }) => c.rank === 'Q');
  if (queen && player.hand.length > 3) return queen.i;

  // Play Ace to skip next player
  const ace = playable.find(({ c }) => c.rank === 'A');
  if (ace && activePlayers.length > 2) return ace.i;

  // Otherwise play first valid card
  return playable[0].i;
}

// ===== ANIMACE KARET =====
async function animateCardToCenter(playerIdx, cardIdx) {
  const p = G.players[playerIdx];
  const card = p.hand[cardIdx];

  let startRect;
  if (playerIdx === 0) {
    const cardEls = document.querySelectorAll('#my-hand .card');
    startRect = cardEls[cardIdx]?.getBoundingClientRect() || { left: window.innerWidth / 2, top: window.innerHeight };
  } else {
    const slot = document.querySelector(`.player-slot[data-pid="${playerIdx}"]`);
    startRect = slot?.getBoundingClientRect() || { left: window.innerWidth / 2, top: 0 };
  }

  const proxy = document.createElement('div');
  proxy.className = `card-proxy ${card.joker ? '' : (isRed(card) ? 'txt-red' : 'txt-black')}`;
  proxy.innerHTML = card.joker
    ? `<div>JKR</div><div>🃏</div>`
    : `<div>${card.rank}</div><div>${SUIT_SYM[card.suit]}</div>`;
  const duration = getDelay(450);
  proxy.style.transitionDuration = (duration / 1000) + 's';
  proxy.style.transitionProperty = 'left,top,opacity,transform';

  // Cílová pozice – střed odhazovací hromádky
  const discardEl = document.getElementById('discard-pile');
  const discardRect = discardEl.getBoundingClientRect();
  const endX = discardRect.left;
  const endY = discardRect.top;
  const rot = (Math.random() * 16) - 8;

  proxy.style.left = startRect.left + 'px';
  proxy.style.top = startRect.top + 'px';
  proxy.style.opacity = '1';
  document.body.appendChild(proxy);

  proxy.getBoundingClientRect(); // force reflow
  proxy.style.left = endX + 'px';
  proxy.style.top = endY + 'px';
  proxy.style.transform = `rotate(${rot}deg)`;

  await delay(duration + 50);
  proxy.remove();
}

function isRed(card) { return card.suit === 'hearts' || card.suit === 'diamonds'; }

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== RENDEROVÁNÍ =====
function renderAll() {
  if (!G.players || G.players.length === 0) return;
  renderOpponents();
  renderCenter();
  renderBottomPlayer();
  renderTopBar();
}

function renderOpponents() {
  const container = document.getElementById('players-container');
  container.innerHTML = '';
  const n = G.players.length;
  const radiusX = 310, radiusY = 200;

  G.players.forEach((p, i) => {
    const slot = document.createElement('div');
    slot.className = `player-slot${G.currentPlayerIdx === i ? ' active-player' : ''}`;
    slot.dataset.pid = i;

    const miniCards = p.hand.map(() => '<div class="mini-card"></div>').join('');
    slot.innerHTML = `<div class="player-info">
      <div class="player-name-label">${esc(p.name)}${p.finished ? ' 🏆' : ''}${p.isAI ? ' 🤖' : ''}</div>
      <div class="player-cards-row">${miniCards}</div>
      <div class="player-extra">${p.hand.length} karet</div>
    </div>`;

    if (i === 0) {
      // Hráč 0 jde do spodního panelu
      const mySlot = document.getElementById('my-player-slot-container');
      mySlot.innerHTML = '';
      mySlot.appendChild(slot);
    } else {
      const ang = (i * (360 / n) + 90) * (Math.PI / 180);
      slot.style.left = (radiusX * Math.cos(ang)) + 'px';
      slot.style.top = (radiusY * Math.sin(ang)) + 'px';
      container.appendChild(slot);
    }
  });
}

function renderCenter() {
  // Balíček
  document.getElementById('deck-count-label').textContent = `${G.deck.length} karet`;

  // Odhoz – top karta
  const discardEl = document.getElementById('discard-pile');
  discardEl.innerHTML = '';
  const top = G.discardPile[G.discardPile.length - 1];
  if (top) {
    const d = document.createElement('div');
    d.className = `discard-card ${top.joker ? '' : (isRed(top) ? 'txt-red' : 'txt-black')}`;
    if (top.joker) {
      d.innerHTML = '<div>JKR</div><div>🃏</div>';
    } else {
      d.innerHTML = `<div>${top.rank}</div><div>${SUIT_SYM[top.suit]}</div>`;
    }
    discardEl.appendChild(d);
  }
}

function renderBottomPlayer() {
  const p = G.players[0];
  const isMyTurn = G.currentPlayerIdx === 0;
  const hand = document.getElementById('my-hand');
  hand.innerHTML = '';

  const playableSet = new Set();
  if (isMyTurn && !p.finished) {
    p.hand.forEach((c, i) => { if (canPlay(c)) playableSet.add(i); });
  }

  p.hand.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = `card ${c.joker ? '' : (isRed(c) ? 'txt-red' : 'txt-black')}`;
    el.innerHTML = c.joker
      ? '<div>JKR</div><div>🃏</div>'
      : `<div>${c.rank}</div><div>${SUIT_SYM[c.suit]}</div>`;

    if (!isMyTurn || p.finished) {
      el.classList.add('disabled');
    } else {
      if (playableSet.has(i)) el.classList.add('playable');
      else el.classList.add('disabled');
      el.addEventListener('click', () => playCard(0, i));
    }
    hand.appendChild(el);
  });

  const drawBtn = document.getElementById('draw-btn');
  drawBtn.disabled = !isMyTurn || p.finished;
  drawBtn.textContent = G.pendingDraw > 0 ? `Vzít ${G.pendingDraw} karet` : 'Vzít kartu';
}

function renderTopBar() {
  // Čekající bití
  const pill = document.getElementById('pending-pill');
  if (G.pendingDraw > 0) {
    document.getElementById('pending-count').textContent = G.pendingDraw;
    pill.classList.remove('hidden');
  } else {
    pill.classList.add('hidden');
  }

  // Aktuální barva (zobrazit jen po Q)
  const top = G.discardPile[G.discardPile.length - 1];
  const suitPill = document.getElementById('suit-pill');
  if (top && top.rank === 'Q' && G.currentSuit) {
    suitPill.textContent = SUIT_SYM[G.currentSuit];
    suitPill.classList.remove('hidden');
  } else {
    suitPill.classList.add('hidden');
  }
}

function renderWin() {
  const first = G.players[G.winners[0]];
  document.getElementById('win-title').textContent = `${first.name} vyhrál(a)! 🏆`;
  const standings = document.getElementById('standings');
  standings.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];
  const sorted = [...G.players].sort((a, b) => (a.finishPos || 99) - (b.finishPos || 99));
  sorted.forEach(p => {
    const row = document.createElement('div');
    row.className = 'standing-row';
    row.innerHTML = `<span class="s-pos">${medals[p.finishPos - 1] || (p.finishPos + '.')}</span>
      <span class="s-name">${esc(p.name)}</span>
      <span class="s-cards">${p.hand.length} karet zbývalo</span>`;
    standings.appendChild(row);
  });
}

// ===== LOCAL PASS DEVICE =====
function showPassOverlay(nextPlayerIdx, callback) {
  const overlay = document.getElementById('pass-overlay');
  document.getElementById('pass-player-name').textContent = G.players[nextPlayerIdx].name;
  overlay.classList.remove('hidden');
  const btn = document.getElementById('pass-ready-btn');
  const handler = () => {
    btn.removeEventListener('click', handler);
    overlay.classList.add('hidden');
    callback();
  };
  btn.addEventListener('click', handler);
}

// Přepisuji advanceTurn, aby v local módu zobrazoval overlay
const _origAdvanceTurn = advanceTurn;
// (Přetížení níže přes wrapper v draw/play)

// ===== EVENT LISTENERS =====
document.getElementById('draw-btn').addEventListener('click', () => {
  if (G.currentPlayerIdx !== 0) return;
  playerDraw(0);
});

document.getElementById('draw-pile').addEventListener('click', () => {
  if (G.currentPlayerIdx !== 0) return;
  playerDraw(0);
});

document.querySelectorAll('.suit-pick-btn').forEach(btn => {
  btn.addEventListener('click', () => pickSuit(btn.dataset.suit));
});

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  if (id !== 'none') {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }
}

// ===== TOASTY =====
function showToast(msg) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

// ===== RESIZE =====
function resizeGame() {
  const scaler = document.getElementById('game-scaler');
  if (!scaler) return;
  const w = window.innerWidth;
  const bottomH = 200; // approx bottom area height
  const topH = 60;
  const availH = window.innerHeight - topH - bottomH;
  const availW = w;
  const baseSize = 700;
  const scale = Math.min(availW / baseSize, availH / baseSize, 1);
  const topOffset = topH + availH / 2;
  scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
  scaler.style.top = topOffset + 'px';
}
window.addEventListener('resize', resizeGame);

// ===== UTILITIES =====
function shakeHand() {
  const hand = document.getElementById('my-hand');
  hand.style.animation = 'none';
  void hand.offsetHeight;
  hand.style.animation = 'shake 0.3s ease';
  setTimeout(() => hand.style.animation = '', 400);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Shake keyframes (injected)
const style = document.createElement('style');
style.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`;
document.head.appendChild(style);

// Init resize
resizeGame();
