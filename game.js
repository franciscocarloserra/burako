// Burako rules for two players with tiles (fichas). Pure state mutations, no DOM.
// Tiles are ids: 0..103 = 2 sets x 4 colors x 1..13, 104..107 = comodines.

export const R = {
  handSize: 11,
  canastaLen: 7,
  canastaLimpia: 200,
  canastaSucia: 100,
  closeBonus: 100,
  muertoPenalty: 100,
  targetScore: 3000,
};

export const JOKERS = [104, 105, 106, 107];
export const color = id => id >= 104 ? 4 : Math.floor((id % 52) / 13);
export const num = id => id >= 104 ? 0 : (id % 13) + 1;
export const isWild = id => id >= 104 || num(id) === 2;
export const value = id => id >= 104 ? 50 : num(id) === 2 ? 20 : num(id) === 1 ? 15 : num(id) >= 8 ? 10 : 5;

function shuffle(a) {
  const r = new Uint32Array(a.length);
  crypto.getRandomValues(r);
  for (let i = a.length - 1; i > 0; i--) { const j = r[i] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Returns {t: ordered ids, w: uses a wild as wild} or null.
export function validate(ids) {
  if (ids.length < 3) return null;
  return asSet(ids) ?? asSeq(ids);
}

function asSet(ids) {
  if (ids.every(i => i < 104 && num(i) === 2)) return {t: [...ids], w: false};
  const nat = ids.filter(i => !isWild(i)), wild = ids.filter(isWild);
  if (wild.length > 1 || nat.length < 2 || !nat.every(i => num(i) === num(nat[0]))) return null;
  return {t: [...nat.sort((a, b) => color(a) - color(b)), ...wild], w: wild.length > 0};
}

function asSeq(ids) {
  const twos = ids.filter(i => i < 104 && num(i) === 2);
  for (let mask = (1 << twos.length) - 1; mask >= 0; mask--) {
    const natTwos = twos.filter((_, k) => mask >> k & 1);
    const nat = ids.filter(i => !isWild(i)).concat(natTwos);
    const wild = ids.filter(i => isWild(i) && !natTwos.includes(i));
    if (wild.length > 1 || !nat.length || !nat.every(i => color(i) === color(nat[0]))) continue;
    for (const aceHigh of [false, true]) {
      const val = i => num(i) === 1 && aceHigh ? 14 : num(i);
      const vs = nat.map(val);
      if (new Set(vs).size !== vs.length) continue;
      const lo = Math.min(...vs), hi = Math.max(...vs), n = ids.length;
      if (hi - lo + 1 - nat.length > wild.length) continue;
      const start = Math.max(1, Math.min(lo, 14 - n + 1));
      if (start > lo || start + n - 1 < hi || (aceHigh && start === 1)) continue;
      const out = [], w = [...wild];
      for (let v = start; v < start + n; v++) out.push(nat.find(i => val(i) === v) ?? w.pop());
      return {t: out, w: wild.length > 0};
    }
  }
  return null;
}

export const isCanasta = m => m.t.length >= R.canastaLen;
const hasCanasta = (s, p) => s.melds[p].some(isCanasta);

export function newState(id, player) {
  return {schema: 1, id, v: 1, players: [player], phase: 'waiting', turn: 0, round: 0,
    mazo: [], pozo: [], muertos: [], hands: [[], []], melds: [[], []], muerto: [false, false],
    snap: null, scores: [0, 0], last: null, log: ''};
}

export function deal(s) {
  const deck = shuffle([...Array(108).keys()]);
  s.hands = [deck.splice(0, R.handSize), deck.splice(0, R.handSize)];
  s.muertos = [deck.splice(0, R.handSize), deck.splice(0, R.handSize)];
  s.pozo = [deck.pop()];
  s.mazo = deck;
  s.melds = [[], []];
  s.muerto = [false, false];
  s.turn = s.round % 2;
  s.round++;
  s.phase = 'draw';
  s.snap = null;
  s.last = null;
  s.log = 'mano ' + s.round;
}

const name = (s, p) => s.players[p]?.name ?? '?';
const takeSnap = (s, p) => { s.snap = JSON.stringify({h: s.hands[p], m: s.melds[p], k: s.muerto, d: s.muertos}); };

function removeFromHand(s, p, ids) {
  const h = s.hands[p];
  if (!ids.every(i => h.includes(i)) || new Set(ids).size !== ids.length) return false;
  s.hands[p] = h.filter(i => !ids.includes(i));
  return true;
}

function takeMuerto(s, p) {
  s.hands[p] = s.muertos.pop();
  s.muerto[p] = true;
  s.log = name(s, p) + ' tomó el muerto';
}

// After melding: an empty hand takes the muerto or closes the round.
function afterMeld(s, p) {
  if (s.hands[p].length) return;
  if (!s.muerto[p] && s.muertos.length) return takeMuerto(s, p);
  if (!hasCanasta(s, p)) return 'necesitás una canasta para cerrar';
  endRound(s, p);
}

export function act(s, p, a) {
  if (a.type === 'next') {
    if (s.phase !== 'over') return 'la mano no terminó';
    deal(s); return;
  }
  if (s.turn !== p || (s.phase !== 'draw' && s.phase !== 'play')) return 'no es tu turno';
  const before = JSON.stringify(s);
  const err = run(s, p, a);
  if (err) Object.assign(s, JSON.parse(before));
  return err;
}

function run(s, p, a) {
  switch (a.type) {
    case 'draw': {
      if (s.phase !== 'draw') return 'ya robaste';
      if (!s.mazo.length) {
        if (s.muertos.length) s.mazo = s.muertos.pop();
        else return endRound(s, null);
      }
      s.hands[p].push(s.mazo.pop());
      s.phase = 'play';
      s.log = name(s, p) + ' robó del mazo';
      return takeSnap(s, p);
    }
    case 'pozo': {
      if (s.phase !== 'draw') return 'ya robaste';
      if (!s.pozo.length) return 'el pozo está vacío';
      s.log = name(s, p) + ' levantó el pozo (' + s.pozo.length + ')';
      s.hands[p].push(...s.pozo);
      s.pozo = [];
      s.phase = 'play';
      return takeSnap(s, p);
    }
    case 'meld': {
      if (s.phase !== 'play') return 'primero robá';
      const m = validate(a.ids);
      if (!m) return 'ese juego no vale';
      if (!removeFromHand(s, p, a.ids)) return 'fichas inválidas';
      s.melds[p].push(m);
      s.log = name(s, p) + ' bajó un juego';
      return afterMeld(s, p);
    }
    case 'add': {
      if (s.phase !== 'play') return 'primero robá';
      const old = s.melds[p][a.meld];
      if (!old) return 'juego inválido';
      const m = validate([...old.t, ...a.ids]);
      if (!m) return 'no entra en ese juego';
      if (!removeFromHand(s, p, a.ids)) return 'fichas inválidas';
      s.melds[p][a.meld] = m;
      s.log = name(s, p) + ' agregó a un juego';
      return afterMeld(s, p);
    }
    case 'discard': {
      if (s.phase !== 'play') return 'primero robá';
      if (!removeFromHand(s, p, [a.id])) return 'ficha inválida';
      s.pozo.push(a.id);
      s.log = name(s, p) + ' tiró';
      if (!s.hands[p].length) {
        if (!s.muerto[p] && s.muertos.length) takeMuerto(s, p);
        else if (hasCanasta(s, p)) return endRound(s, p);
        else return 'necesitás una canasta para cerrar';
      }
      s.turn = 1 - p;
      s.phase = 'draw';
      s.snap = null;
      return;
    }
    case 'undo': {
      if (s.phase !== 'play' || !s.snap) return 'nada para deshacer';
      const o = JSON.parse(s.snap);
      s.hands[p] = o.h; s.melds[p] = o.m; s.muerto = o.k; s.muertos = o.d;
      s.log = name(s, p) + ' deshizo';
      return;
    }
  }
  return 'acción desconocida';
}

export function endRound(s, closer) {
  s.last = [0, 1].map(p => {
    const juegos = s.melds[p].reduce((a, m) => a + m.t.reduce((b, i) => b + value(i), 0), 0);
    const canastas = s.melds[p].filter(isCanasta).reduce((a, m) => a + (m.w ? R.canastaSucia : R.canastaLimpia), 0);
    const cierre = closer === p ? R.closeBonus : 0;
    const mano = -s.hands[p].reduce((a, i) => a + value(i), 0);
    const muerto = s.muerto[p] ? 0 : -R.muertoPenalty;
    const total = juegos + canastas + cierre + mano + muerto;
    s.scores[p] += total;
    return {juegos, canastas, cierre, mano, muerto, total};
  });
  s.phase = 'over';
  s.snap = null;
  s.log = closer == null ? 'se acabó el mazo' : name(s, closer) + ' cerró';
}
