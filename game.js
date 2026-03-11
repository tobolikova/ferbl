'use strict';

// ===================== CONSTANTS =====================
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_NAMES = { hearts: 'Srdce', diamonds: 'Káry', clubs: 'Kříže', spades: 'Piky' };
const RANKS_32 = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_52 = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// ===================== STATE =====================
let G = {}; // game state

// ===================== SETUP =====================
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const winScreen = document.getElementById('win-screen');

// Player count buttons
document.getElementById('player-count-btns').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn');
  if (!btn) return;
  document.querySelectorAll('#player-count-btns .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  buildNameInputs(parseInt(btn.dataset.value));
});

// Deck type buttons
document.getElementById('deck-type-btns').addEventListener('click', e => {
  const btn = e.target.closest('.opt-btn');
  if (!btn) return;
  document.querySelectorAll('#deck-type-btns .opt-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
});

function buildNameInputs(count) {
  const container = document.getElementById('player-names-container');
  container.innerHTML = '';
  const defaults = ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4'];
  for (let i = 0; i < count; i++) {
    const row = document.createElement('div');
    row.className = 'player-name-row settings-group';
    row.innerHTML = `<label>Hráč ${i + 1}</label><input type="text" id="pname-${i}" placeholder="${defaults[i]}" value="${defaults[i]}">`;
    container.appendChild(row);
  }
}
buildNameInputs(3);

document.getElementById('start-btn').addEventListener('click', startGame);

document.getElementById('play-again-btn').addEventListener('click', () => {
  startGame();
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  showScreen('setup');
});

// ===================== DECK BUILDING =====================
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

// ===================== GAME INIT =====================
function startGame() {
  const playerCount = parseInt(document.querySelector('#player-count-btns .opt-btn.active').dataset.value);
  const deckType = document.querySelector('#deck-type-btns .opt-btn.active').dataset.value;
  const ruleJoker = document.getElementById('rule-joker').checked;
  const ruleReturn = document.getElementById('rule-return').checked;

  const names = [];
  for (let i = 0; i < playerCount; i++) {
    const inp = document.getElementById(`pname-${i}`);
    names.push(inp ? (inp.value.trim() || `Hráč ${i + 1}`) : `Hráč ${i + 1}`);
  }

  const deck = buildDeck(deckType);
  const players = names.map((name, idx) => ({
    name,
    hand: [],
    idx,
    finished: false,
    finishPosition: null,
  }));

  // Deal 4 cards each
  for (let i = 0; i < 4; i++) {
    for (const p of players) {
      p.hand.push(deck.pop());
    }
  }

  // Find first non-special card for discard pile
  let startCard = null;
  let startIdx = -1;
  for (let i = deck.length - 1; i >= 0; i--) {
    const c = deck[i];
    if (!isSpecialCard(c)) { startCard = c; startIdx = i; break; }
  }
  if (startIdx === -1) { startCard = deck.pop(); }
  else { deck.splice(startIdx, 1); }

  G = {
    players,
    deck,
    discardPile: [startCard],
    currentSuit: startCard.suit,
    currentPlayerIdx: 0,
    pendingDraw: 0,
    phase: 'play', // 'play' | 'suit-pick'
    rules: { joker: ruleJoker, return: ruleReturn },
    deckType,
    winners: [],        // ordered list of player indices who finished
    waitingForSuit: false,
    lastMessage: '',
    skipNext: false,
  };

  showScreen('game');
  renderGame();
}

function isSpecialCard(c) {
  if (c.joker) return true;
  return ['7', 'A', 'Q', 'K'].includes(c.rank);
}

// ===================== GAME LOGIC =====================
function canPlay(card) {
  const top = G.discardPile[G.discardPile.length - 1];
  if (card.joker) return G.rules.joker;

  // If there's a pending draw stack, only draw-stacking cards can be played
  if (G.pendingDraw > 0) {
    // 7 stacks on 7
    if (top.rank === '7' && card.rank === '7') return true;
    // K♠ stacks on 7 (stops it) — actually K♠ pendingDraw is separate
    // If pending came from K♠, only 7♠ can stop it
    if (G.pendingDrawSource === 'spadeKing' && card.rank === '7' && card.suit === 'spades') return true;
    // Joker stacks
    if (G.pendingDrawSource !== 'spadeKing' && card.joker && G.rules.joker) return true;
    // K♠ cannot be stacked (only 7♠ can stop it)
    return false;
  }

  if (card.rank === 'K' && card.suit === 'spades') {
    // K♠ can always be played on matching suit or rank context
    return card.suit === G.currentSuit || card.rank === top.rank;
  }

  return card.suit === G.currentSuit || card.rank === top.rank;
}

function playCard(playerIdx, cardIdx) {
  if (playerIdx !== G.currentPlayerIdx) return;
  if (G.waitingForSuit) return;

  const player = G.players[playerIdx];
  const card = player.hand[cardIdx];

  if (!canPlay(card)) {
    showMessage('Tuto kartu nelze zahrát!');
    shakeHand();
    return;
  }

  // Remove from hand
  player.hand.splice(cardIdx, 1);
  G.discardPile.push(card);
  G.currentSuit = card.suit;

  // Handle special cards
  handleSpecialCard(card);

  // Check if player finished
  if (player.hand.length === 0 && !player.finished) {
    player.finished = true;
    player.finishPosition = G.winners.length + 1;
    G.winners.push(playerIdx);
    showMessage(`${player.name} vyhrál(a)! (${player.finishPosition}. místo)`);
  }

  // Check if game over
  if (isGameOver()) {
    endGame();
    return;
  }

  if (!G.waitingForSuit) {
    advanceTurn();
  }
  renderGame();
}

function handleSpecialCard(card) {
  if (card.joker) {
    G.pendingDraw += 10;
    G.pendingDrawSource = 'joker';
    showMessage('Žolík! Další hráč bere 10 karet!');
    return;
  }

  switch (card.rank) {
    case '7':
      G.pendingDraw += 2;
      if (!G.pendingDrawSource) G.pendingDrawSource = 'seven';
      showMessage('Sedmička! Další hráč bere 2 karty!');
      break;
    case 'A':
      G.skipNext = true;
      showMessage('Eso! Další hráč přeskočen.');
      break;
    case 'Q':
      G.waitingForSuit = true;
      showMessage('Svršek! Zvol barvu.');
      break;
    case 'K':
      if (card.suit === 'spades') {
        G.pendingDraw += 5;
        G.pendingDrawSource = 'spadeKing';
        showMessage('Pikový král! Další hráč bere 5 karet!');
      }
      break;
  }
}

function drawCards(playerIdx, count) {
  const player = G.players[playerIdx];
  for (let i = 0; i < count; i++) {
    if (G.deck.length === 0) reshuffleDeck();
    if (G.deck.length === 0) break;
    player.hand.push(G.deck.pop());
  }
}

function reshuffleDeck() {
  if (G.discardPile.length <= 1) return;
  const top = G.discardPile.pop();
  G.deck = shuffle(G.discardPile);
  G.discardPile = [top];
}

function playerDrawsFromPile() {
  const p = G.players[G.currentPlayerIdx];
  if (p.finished) { advanceTurn(); renderGame(); return; }

  if (G.pendingDraw > 0) {
    // Must take pending draw
    drawCards(G.currentPlayerIdx, G.pendingDraw);

    // Check return-to-game: if a previous winner must return
    if (G.rules.return) {
      checkReturnToGame(G.pendingDraw);
    }

    showMessage(`${p.name} bere ${G.pendingDraw} karet.`);
    G.pendingDraw = 0;
    G.pendingDrawSource = null;
    advanceTurn();
  } else {
    // Draw one card
    if (G.deck.length === 0) reshuffleDeck();
    if (G.deck.length > 0) {
      const card = G.deck.pop();
      p.hand.push(card);
      showMessage(`${p.name} bere kartu.`);
      // If drawn card is playable, player can play it — but in local MP we just advance
    }
    advanceTurn();
  }
  renderGame();
}

function checkReturnToGame(drawCount) {
  // The player who is about to draw is currentPlayerIdx
  // We need to check if the PREVIOUS player (who played the draw card) was a winner
  // Actually: return-to-game means: if a winner exists and someone plays a brací karta on their turn,
  // the winner (the one who just won) must draw and return.
  // Rule: if the player before the winner plays a draw card, the winner must draw.
  // Here we interpret: if there are winners and pendingDraw > 0, the LAST winner returns.
  if (G.winners.length > 0) {
    const lastWinner = G.winners[G.winners.length - 1];
    const winnerPlayer = G.players[lastWinner];
    // Only return if the current drawing player is the last winner
    if (lastWinner === G.currentPlayerIdx) {
      winnerPlayer.finished = false;
      winnerPlayer.finishPosition = null;
      G.winners.pop();
      drawCards(lastWinner, drawCount);
      showMessage(`${winnerPlayer.name} se vrací do hry! Bere ${drawCount} karet.`);
    }
  }
}

function advanceTurn() {
  const total = G.players.length;
  let next = (G.currentPlayerIdx + 1) % total;

  // Skip finished players (unless return-to-game active)
  let skipped = 0;
  while (G.players[next].finished && skipped < total) {
    next = (next + 1) % total;
    skipped++;
  }

  if (G.skipNext) {
    G.skipNext = false;
    // Skip next active player too
    let skippedAce = 0;
    let skipTarget = next;
    let afterSkip = (next + 1) % total;
    while (G.players[afterSkip].finished && skippedAce < total) {
      afterSkip = (afterSkip + 1) % total;
      skippedAce++;
    }
    showMessage(`${G.players[skipTarget].name} přeskočen!`);
    next = afterSkip;
  }

  G.currentPlayerIdx = next;
}

function isGameOver() {
  const active = G.players.filter(p => !p.finished);
  return active.length <= 1;
}

function endGame() {
  // Add remaining players to winners list in order of fewest cards
  const remaining = G.players
    .filter(p => !p.finished)
    .sort((a, b) => a.hand.length - b.hand.length);

  for (const p of remaining) {
    p.finishPosition = G.winners.length + 1;
    G.winners.push(p.idx);
  }

  showScreen('win');
  renderWin();
}

// ===================== SUIT PICKING =====================
function pickSuit(suit) {
  G.currentSuit = suit;
  G.waitingForSuit = false;
  document.getElementById('suit-modal').classList.add('hidden');
  showMessage(`Barva: ${SUIT_NAMES[suit]}`);
  advanceTurn();
  renderGame();
}

// ===================== RENDERING =====================
function renderGame() {
  renderTopPlayers();
  renderBoard();
  renderBottomPlayer();
}

function renderTopPlayers() {
  const area = document.getElementById('top-players-area');
  area.innerHTML = '';
  const bottomIdx = G.players.length - 1; // last player is always bottom for simplicity? No, rotate.
  // Bottom player is always index 0 (current "seat 0")
  // Actually: we show player 0 at bottom, rest at top
  // But current player rotates — we keep player 0 fixed at bottom for local MP
  for (let i = 1; i < G.players.length; i++) {
    const p = G.players[i];
    const panel = document.createElement('div');
    panel.className = 'opponent-panel';
    if (i === G.currentPlayerIdx) panel.classList.add('active-player');
    if (p.finished) panel.classList.add('winner');

    const miniCards = p.hand.map(() => `<div class="mini-card"></div>`).join('');
    panel.innerHTML = `
      <div class="opponent-name">${escHtml(p.name)} ${p.finished ? '🏆' : ''}</div>
      <div class="opponent-cards">${miniCards}</div>
      <div style="font-size:0.75rem;opacity:0.7;margin-top:4px">${p.hand.length} karet</div>
    `;
    area.appendChild(panel);
  }
}

function renderBoard() {
  // Draw pile count
  document.getElementById('draw-count').textContent = `${G.deck.length} karet`;

  // Top card
  const top = G.discardPile[G.discardPile.length - 1];
  const topEl = document.getElementById('top-card');
  topEl.innerHTML = '';
  topEl.className = '';
  renderCardInto(topEl, top, false, false);

  // Current suit indicator
  const suitInd = document.getElementById('suit-indicator');
  if (G.currentSuit && top.rank === 'Q') {
    suitInd.textContent = SUIT_SYMBOLS[G.currentSuit];
    suitInd.className = ['hearts','diamonds'].includes(G.currentSuit) ? 'red' : '';
    suitInd.classList.remove('hidden');
  } else {
    suitInd.classList.add('hidden');
  }

  // Pending draw
  const pendingEl = document.getElementById('pending-draw');
  const pendingCountEl = document.getElementById('pending-draw-count');
  if (G.pendingDraw > 0) {
    pendingCountEl.textContent = G.pendingDraw;
    pendingEl.classList.remove('hidden');
  } else {
    pendingEl.classList.add('hidden');
  }

  // Suit modal
  if (G.waitingForSuit && G.currentPlayerIdx === 0) {
    document.getElementById('suit-modal').classList.remove('hidden');
  }
}

function renderBottomPlayer() {
  const p = G.players[0];
  const isMyTurn = G.currentPlayerIdx === 0;

  document.getElementById('bottom-player-name').textContent =
    p.name + (p.finished ? ' 🏆' : '') + (isMyTurn ? ' ←' : '');
  document.getElementById('bottom-card-count').textContent = `${p.hand.length} karet`;

  const hand = document.getElementById('bottom-hand');
  hand.innerHTML = '';

  for (let i = 0; i < p.hand.length; i++) {
    const card = p.hand[i];
    const el = createCardEl(card);
    const playable = isMyTurn && !p.finished && canPlay(card);
    if (!isMyTurn || p.finished) {
      el.classList.add('disabled');
    } else {
      if (playable) el.classList.add('playable');
      else el.classList.add('disabled');
    }
    if (isMyTurn && !p.finished) {
      el.addEventListener('click', () => playCard(0, i));
    }
    hand.appendChild(el);
  }

  // Draw button
  const drawBtn = document.getElementById('draw-btn');
  drawBtn.disabled = !isMyTurn || p.finished;
  if (G.pendingDraw > 0 && isMyTurn) {
    drawBtn.textContent = `Vzít ${G.pendingDraw} karet`;
  } else {
    drawBtn.textContent = 'Vzít kartu';
  }

  const bottomArea = document.getElementById('bottom-player-area');
  if (isMyTurn && !p.finished) {
    bottomArea.classList.add('active-player-bottom');
  } else {
    bottomArea.classList.remove('active-player-bottom');
  }
}

function renderCardInto(el, card, playable, disabled) {
  if (card.joker) {
    el.classList.add('card', 'joker');
    el.innerHTML = `
      <span class="card-rank">JKR</span>
      <span class="card-center">🃏</span>
    `;
    return;
  }
  const isRed = ['hearts', 'diamonds'].includes(card.suit);
  el.classList.add('card', isRed ? 'red' : 'black');
  const sym = SUIT_SYMBOLS[card.suit];
  el.innerHTML = `
    <span class="card-rank">${card.rank}</span>
    <span class="card-suit-small">${sym}</span>
    <span class="card-center">${sym}</span>
    <span class="card-corner-br">${card.rank}</span>
  `;
  if (playable) el.classList.add('playable');
  if (disabled) el.classList.add('disabled');
}

function createCardEl(card) {
  const el = document.createElement('div');
  el.className = 'card';
  if (card.joker) {
    el.classList.add('joker');
    el.innerHTML = `
      <span class="card-rank">JKR</span>
      <span class="card-center">🃏</span>
    `;
    return el;
  }
  const isRed = ['hearts', 'diamonds'].includes(card.suit);
  el.classList.add(isRed ? 'red' : 'black');
  const sym = SUIT_SYMBOLS[card.suit];
  el.innerHTML = `
    <span class="card-rank">${card.rank}</span>
    <span class="card-suit-small">${sym}</span>
    <span class="card-center">${sym}</span>
    <span class="card-corner-br">${card.rank}</span>
  `;
  return el;
}

// ===================== WIN SCREEN =====================
function renderWin() {
  const winner = G.players[G.winners[0]];
  document.getElementById('win-message').textContent = `${winner.name} vyhrál(a)!`;

  const standings = document.getElementById('final-standings');
  standings.innerHTML = '';

  const sorted = [...G.players].sort((a, b) => (a.finishPosition || 99) - (b.finishPosition || 99));
  for (const p of sorted) {
    const row = document.createElement('div');
    row.className = 'standing-row';
    const medals = ['🥇', '🥈', '🥉'];
    row.innerHTML = `
      <span class="standing-pos">${medals[p.finishPosition - 1] || p.finishPosition + '.'}</span>
      <span class="standing-name">${escHtml(p.name)}</span>
      <span class="standing-cards">${p.hand.length} karet zbývalo</span>
    `;
    standings.appendChild(row);
  }
}

// ===================== UI HELPERS =====================
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const map = { setup: setupScreen, game: gameScreen, win: winScreen };
  map[name].classList.add('active');
}

function showMessage(msg) {
  G.lastMessage = msg;
  document.getElementById('message-box').textContent = msg;
}

function shakeHand() {
  const hand = document.getElementById('bottom-hand');
  hand.classList.add('shake');
  setTimeout(() => hand.classList.remove('shake'), 400);
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===================== EVENT LISTENERS =====================
document.getElementById('draw-btn').addEventListener('click', () => {
  if (G.currentPlayerIdx !== 0) return;
  playerDrawsFromPile();
});

// Suit modal buttons
document.querySelectorAll('.suit-pick-btn').forEach(btn => {
  btn.addEventListener('click', () => pickSuit(btn.dataset.suit));
});

// Draw pile click (same as draw button)
document.getElementById('draw-pile').addEventListener('click', () => {
  if (G.currentPlayerIdx !== 0) return;
  playerDrawsFromPile();
});
