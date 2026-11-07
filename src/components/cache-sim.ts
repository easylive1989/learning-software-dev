/**
 * 快取與資料庫的小型模擬。純邏輯，不碰 DOM，方便測試與調參。
 * 時間單位：毫秒。
 */

export const KEY_COUNT = 12;
export const FAKE_KEY = -1; // 不存在的商品

export type Phase = 'toCache' | 'back' | 'wait' | 'toDb' | 'queued' | 'fromDb';
export type Tone = 'pending' | 'hit' | 'db' | 'ok' | 'fail' | 'blocked' | 'notfound';

export type Dot = {
  id: number;
  key: number; // 0..KEY_COUNT-1 或 FAKE_KEY
  userY: number; // 0..1
  phase: Phase;
  start: number; // 這個階段開始的時間
  tone: Tone;
};

export type Slot = {
  expireAt: number; // <= t 代表沒有快取
  ttl: number; // 寫入時的 TTL，用來畫倒數條
  pending: boolean; // 已經有人去資料庫拿了
};

export type SceneConfig = {
  rate: number; // 每秒請求數
  dist: 'uniform' | 'hot' | 'penetration';
  hotShare?: number;
  fakeShare?: number;
  jitter: boolean;
  lock: boolean;
  guard: boolean;
  hotCost?: number; // 熱門商品的查詢要花幾倍時間
  initial: 'stagger' | 'empty' | 'hotSoon';
  events: { at: number; type: 'syncWrite' }[];
  duration: number;
};

export type SimState = {
  t: number;
  cfg: SceneConfig;
  slots: Slot[];
  dots: Dot[];
  /** 資料庫裡正在處理的查詢：剩下多少「單獨處理時需要的毫秒數」 */
  inflight: { id: number; work: number }[];
  crashed: boolean;
  crashedAt: number | null;
  nextId: number;
  spawnCarry: number;
  queryLog: number[]; // 每筆查詢進資料庫的時間（只留最近 1 秒）
  peakInflight: number;
  stats: { hit: number; miss: number; fail: number };
  rand: () => number;
};

export const TRAVEL = 450; // 單程移動時間
export const QUERY_MS = 300; // 一筆查詢單獨處理要多久
export const DB_PARALLEL = 3; // 資料庫同時處理幾筆還不會變慢
export const DB_CAPACITY = (DB_PARALLEL * 1000) / QUERY_MS; // 每秒能處理的查詢數
export const CONN_LIMIT = 24; // 同時處理中的查詢超過這個數量，資料庫就倒下
export const TTL = 6000;
export const JITTER = 6000;
export const SYNC_DELAY = 3000;

/** 可重現的亂數 */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSim(cfg: SceneConfig, seed = 7): SimState {
  const rand = mulberry32(seed);
  const slots: Slot[] = Array.from({ length: KEY_COUNT }, (_, i) => {
    if (cfg.initial === 'empty') return { expireAt: 0, ttl: TTL, pending: false };
    if (cfg.initial === 'hotSoon') {
      // 熱門商品 3 秒後過期，其他商品這一幕裡不會過期
      return i === 0
        ? { expireAt: SYNC_DELAY, ttl: TTL, pending: false }
        : { expireAt: 60000, ttl: 60000, pending: false };
    }
    return { expireAt: 800 + (i / KEY_COUNT) * TTL + rand() * 300, ttl: TTL, pending: false };
  });
  return {
    t: 0,
    cfg,
    slots,
    dots: [],
    inflight: [],
    crashed: false,
    crashedAt: null,
    nextId: 1,
    spawnCarry: 0,
    queryLog: [],
    peakInflight: 0,
    stats: { hit: 0, miss: 0, fail: 0 },
    rand,
  };
}

function pickKey(s: SimState): number {
  const { cfg, rand } = s;
  if (cfg.dist === 'hot' && rand() < (cfg.hotShare ?? 0.8)) return 0;
  if (cfg.dist === 'penetration' && rand() < (cfg.fakeShare ?? 0.5)) return FAKE_KEY;
  if (cfg.dist === 'hot') return 1 + Math.floor(rand() * (KEY_COUNT - 1));
  return Math.floor(rand() * KEY_COUNT);
}

export function isCached(slot: Slot, t: number) {
  return slot.expireAt > t;
}

function queryCost(s: SimState, key: number) {
  if (key === 0 && s.cfg.dist === 'hot') return QUERY_MS * (s.cfg.hotCost ?? 1);
  return QUERY_MS;
}

function fill(s: SimState, key: number) {
  if (key === FAKE_KEY) return;
  const slot = s.slots[key];
  slot.pending = false;
  if (isCached(slot, s.t)) return;
  const ttl = TTL + (s.cfg.jitter ? s.rand() * JITTER : 0);
  slot.expireAt = s.t + ttl;
  slot.ttl = ttl;
}

function setPhase(d: Dot, phase: Phase, t: number, tone?: Tone) {
  d.phase = phase;
  d.start = t;
  if (tone) d.tone = tone;
}

function crash(s: SimState) {
  s.crashed = true;
  s.crashedAt = s.t;
  for (const q of s.inflight) {
    const d = s.dots.find((x) => x.id === q.id);
    if (d) {
      setPhase(d, 'fromDb', s.t, 'fail');
      s.stats.fail++;
    }
  }
  s.inflight = [];
  for (const slot of s.slots) slot.pending = false;
}

export function step(s: SimState, dt: number) {
  s.t += dt;
  const t = s.t;
  const { cfg } = s;

  // 1. 劇本事件
  for (const ev of cfg.events) {
    if (ev.at > t - dt && ev.at <= t && ev.type === 'syncWrite') {
      for (const slot of s.slots) {
        const ttl = SYNC_DELAY + (cfg.jitter ? s.rand() * JITTER : 0);
        slot.expireAt = t + ttl;
        slot.ttl = ttl;
        slot.pending = false;
      }
    }
  }

  // 2. 產生新請求
  if (t < cfg.duration) {
    s.spawnCarry += (cfg.rate * dt) / 1000;
    while (s.spawnCarry >= 1) {
      s.spawnCarry -= 1;
      s.dots.push({
        id: s.nextId++,
        key: pickKey(s),
        userY: s.rand(),
        phase: 'toCache',
        start: t - s.rand() * dt,
        tone: 'pending',
      });
    }
  }

  // 3. 資料庫處理查詢：同時處理的越多，每一筆就越慢
  if (!s.crashed && s.inflight.length) {
    const speed = Math.min(1, DB_PARALLEL / s.inflight.length);
    for (const q of s.inflight) q.work -= dt * speed;
    const finished = s.inflight.filter((q) => q.work <= 0);
    s.inflight = s.inflight.filter((q) => q.work > 0);
    for (const q of finished) {
      const d = s.dots.find((x) => x.id === q.id);
      if (!d) continue;
      if (d.key === FAKE_KEY) {
        setPhase(d, 'fromDb', t, 'notfound');
      } else {
        fill(s, d.key);
        setPhase(d, 'fromDb', t, 'ok');
      }
    }
  }

  // 4. 推進每顆點
  for (const d of s.dots) {
    const elapsed = t - d.start;
    if (d.phase === 'toCache' && elapsed >= TRAVEL) {
      if (d.key === FAKE_KEY) {
        if (cfg.guard) {
          setPhase(d, 'back', t, 'blocked');
          continue;
        }
        s.stats.miss++;
        setPhase(d, 'toDb', t, 'db');
        continue;
      }
      const slot = s.slots[d.key];
      if (isCached(slot, t)) {
        s.stats.hit++;
        setPhase(d, 'back', t, 'hit');
      } else if (cfg.lock && slot.pending && !s.crashed) {
        s.stats.miss++;
        setPhase(d, 'wait', t, 'pending');
      } else {
        s.stats.miss++;
        slot.pending = true;
        setPhase(d, 'toDb', t, 'db');
      }
    } else if (d.phase === 'wait') {
      const slot = s.slots[d.key];
      if (isCached(slot, t)) setPhase(d, 'back', t, 'hit');
      else if (s.crashed) setPhase(d, 'back', t, 'fail');
    } else if (d.phase === 'toDb' && elapsed >= TRAVEL) {
      s.queryLog.push(t);
      if (s.crashed) {
        s.stats.fail++;
        setPhase(d, 'fromDb', t, 'fail');
      } else {
        setPhase(d, 'queued', t);
        s.inflight.push({ id: d.id, work: queryCost(s, d.key) });
      }
    }
  }

  // 5. 同時處理太多就倒下
  s.peakInflight = Math.max(s.peakInflight, s.inflight.length);
  if (!s.crashed && s.inflight.length > CONN_LIMIT) crash(s);

  // 6. 清掉走完的點
  s.dots = s.dots.filter((d) => {
    const elapsed = t - d.start;
    if (d.phase === 'back') return elapsed < TRAVEL;
    if (d.phase === 'fromDb') return elapsed < TRAVEL * 1.6;
    return true;
  });

  s.queryLog = s.queryLog.filter((x) => x > t - 1000);
}

/** 最近一秒進資料庫的查詢數 */
export function dbLoad(s: SimState) {
  return s.queryLog.length;
}
