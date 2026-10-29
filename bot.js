// Rule-based bot. botStep returns the next action for seat p using only what that seat can see.
import {validate, isWild, color, num, value, team, isCanasta} from './game.js?v=2026-10-29.9';

const B = {
  pozoMinGain: 1,      // take the pozo if it lets us lay down at least this many more tiles
  wildMinLen: 5,       // only spend a wild on a meld this long or longer (pushing toward canasta)
  wildNewMeldHand: 5,  // only start a meld with a wild when holding more than this many tiles
  fitsRivalPenalty: 6, // discard cost when the tile would extend a rival meld
};

const nat = h => h.filter(i => !isWild(i));
const wilds = h => h.filter(isWild);

// Natural runs and sets of 3+, then pairs completed with one wild.
export function findMeld(hand, allowWild) {
  const n = nat(hand);
  for (let c = 0; c < 4; c++) {
    const byVal = new Map();
    for (const i of n.filter(i => color(i) === c)) {
      byVal.set(num(i), byVal.get(num(i)) ?? i);
      if (num(i) === 1) byVal.set(14, byVal.get(14) ?? i);
    }
    let run = [];
    for (let v = 1; v <= 15; v++) {
      if (byVal.has(v) && !(v === 14 && run.length && byVal.get(1) === run[0])) { run.push(byVal.get(v)); continue; }
      if (run.length >= 3 && validate(run)) return run;
      run = byVal.has(v) ? [byVal.get(v)] : [];
    }
  }
  const byNum = new Map();
  for (const i of n) byNum.set(num(i), [...(byNum.get(num(i)) ?? []), i]);
  for (const g of byNum.values()) if (g.length >= 3 && validate(g)) return g;
  if (!allowWild || !wilds(hand).length) return null;
  const w = wilds(hand)[0];
  for (const a of n) for (const b of n) {
    if (a >= b) continue;
    const m = [a, b, w];
    if (validate(m)) return m;
  }
  return null;
}

function findAdd(hand, melds) {
  for (const i of nat(hand)) for (let k = 0; k < melds.length; k++) if (validate([...melds[k].t, i])) return {type: 'add', meld: k, ids: [i]};
  for (const i of wilds(hand)) for (let k = 0; k < melds.length; k++) {
    const m = melds[k];
    if (!m.w && m.t.length >= B.wildMinLen && !isCanasta(m) && validate([...m.t, i])) return {type: 'add', meld: k, ids: [i]};
  }
  return null;
}

// How many tiles a hand could lay down greedily (used to value the pozo).
function layable(hand, melds) {
  let h = [...hand], n = 0, ms = melds.map(m => ({...m}));
  for (let guard = 0; guard < 30; guard++) {
    const a = findAdd(h, ms);
    const m = a ? null : findMeld(h, false);
    const ids = a ? a.ids : m;
    if (!ids) break;
    if (a) ms[a.meld] = validate([...ms[a.meld].t, ...ids]); else ms.push(validate(m));
    h = h.filter(i => !ids.includes(i)); n += ids.length;
  }
  return n;
}

function discardCost(i, hand, rivalMelds) {
  if (isWild(i)) return 1e6;
  let c = 0;
  for (const u of hand) {
    if (u === i || isWild(u)) continue;
    const d = Math.abs(num(u) - num(i));
    if (color(u) === color(i) && d > 0 && d <= 2) c += 3 - d;
    if (num(u) === num(i)) c += 1.5;
  }
  if (rivalMelds.some(m => validate([...m.t, i]))) c += B.fitsRivalPenalty;
  return c - value(i) / 30;
}

export function botStep(s, p) {
  const hand = s.hands[p], mine = s.melds[team(p)], rival = s.melds[1 - team(p)];
  if (s.phase === 'draw') {
    const gain = s.pozo.length ? layable([...hand, ...s.pozo], mine) - layable(hand, mine) : 0;
    return {type: gain >= B.pozoMinGain ? 'pozo' : 'draw'};
  }
  // Keep one tile to discard unless the hand can empty into the muerto or a close
  const canEmpty = (!s.muerto[team(p)] && s.muertos.length) || mine.some(isCanasta);
  const ok = ids => canEmpty || hand.length - ids.length >= 2;
  const add = findAdd(hand, mine);
  if (add && ok(add.ids)) return add;
  const m = findMeld(hand, hand.length > B.wildNewMeldHand);
  if (m && ok(m)) return {type: 'meld', ids: m};
  const best = [...hand].sort((a, b) => discardCost(a, hand, rival) - discardCost(b, hand, rival))[0];
  return {type: 'discard', id: best};
}
