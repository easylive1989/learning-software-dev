import { useEffect, useRef, useState } from 'react';
import {
  CONN_LIMIT,
  DB_CAPACITY,
  FAKE_KEY,
  KEY_COUNT,
  TRAVEL,
  createSim,
  dbLoad,
  isCached,
  step,
  type Dot,
  type SimState,
} from './cache-sim.ts';
import { scenes as allScenes, type Scene } from './cache-scenes.ts';
import './widgets.css';
import './cache-story.css';

/* ---------- 版面：寬螢幕橫式、手機直式 ---------- */
type Pt = { x: number; y: number };
type Layout = {
  w: number;
  h: number;
  cache: { x: number; y: number; w: number; h: number };
  slot: { w: number; h: number; gapX: number; gapY: number; cols: number; top: number };
  db: { cx: number; cy: number; rx: number; h: number };
  dbEntry: Pt;
  user: (d: Dot) => Pt;
  users: Pt[];
  labels: { users: Pt; cache: Pt; db: Pt };
  guard: { x: number; y: number; w: number; h: number; label: Pt };
  meter: Pt;
};

const WIDE: Layout = {
  w: 760,
  h: 380,
  cache: { x: 236, y: 56, w: 212, h: 290 },
  slot: { w: 58, h: 50, gapX: 9, gapY: 14, cols: 3, top: 30 },
  db: { cx: 650, cy: 190, rx: 66, h: 150 },
  dbEntry: { x: 650 - 66, y: 190 },
  user: (d) => ({ x: 78, y: 70 + d.userY * 250 }),
  users: [0, 1, 2, 3, 4, 5].map((i) => ({ x: 58, y: 82 + i * 46 })),
  labels: { users: { x: 64, y: 36 }, cache: { x: 342, y: 36 }, db: { x: 650, y: 36 } },
  guard: { x: 220, y: 66, w: 10, h: 270, label: { x: 225, y: 368 } },
  meter: { x: 584, y: 318 },
};

const NARROW: Layout = {
  w: 360,
  h: 560,
  cache: { x: 16, y: 120, w: 328, h: 236 },
  slot: { w: 68, h: 50, gapX: 10, gapY: 12, cols: 4, top: 34 },
  db: { cx: 180, cy: 452, rx: 74, h: 84 },
  dbEntry: { x: 180, y: 452 - 42 },
  user: (d) => ({ x: 30 + d.userY * 300, y: 64 }),
  users: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: 34 + i * 48, y: 44 })),
  labels: { users: { x: 16, y: 22 }, cache: { x: 16, y: 112 }, db: { x: 16, y: 400 } },
  guard: { x: 26, y: 100, w: 308, h: 8, label: { x: 340, y: 96 } },
  meter: { x: 106, y: 528 },
};

function slotRect(L: Layout, i: number) {
  const { slot, cache } = L;
  const col = i % slot.cols;
  const row = Math.floor(i / slot.cols);
  const innerW = slot.cols * slot.w + (slot.cols - 1) * slot.gapX;
  const x0 = cache.x + (cache.w - innerW) / 2;
  return { x: x0 + col * (slot.w + slot.gapX), y: cache.y + slot.top + row * (slot.h + slot.gapY) };
}
function slotCenter(L: Layout, key: number): Pt {
  if (key === FAKE_KEY) return { x: L.cache.x + L.cache.w / 2, y: L.cache.y + L.cache.h - 14 };
  const r = slotRect(L, key);
  return { x: r.x + L.slot.w / 2, y: r.y + L.slot.h / 2 - 6 };
}

const ease = (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
function lerp(a: Pt, b: Pt, p: number): Pt {
  const e = ease(Math.max(0, Math.min(1, p)));
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e };
}

function dotPos(L: Layout, d: Dot, s: SimState): Pt {
  const el = s.t - d.start;
  const slot = slotCenter(L, d.key);
  switch (d.phase) {
    case 'toCache':
      return lerp(L.user(d), slot, el / TRAVEL);
    case 'back':
      return lerp(slot, L.user(d), el / TRAVEL);
    case 'wait': {
      const a = (d.id * 2.4) % (Math.PI * 2);
      return { x: slot.x + Math.cos(a) * 20, y: slot.y + Math.sin(a) * 14 };
    }
    case 'toDb':
      return lerp(slot, L.dbEntry, el / TRAVEL);
    case 'queued': {
      const idx = s.inflight.findIndex((q) => q.id === d.id);
      const i = idx < 0 ? 0 : idx;
      const perRow = 6;
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      return { x: L.db.cx - 50 + col * 20, y: L.db.cy - L.db.h / 2 + 22 + row * 14 };
    }
    case 'fromDb':
      return lerp(L.dbEntry, L.user(d), el / (TRAVEL * 1.6));
  }
}

const TONE_CLASS: Record<Dot['tone'], string> = {
  pending: 'cs-dot-pending',
  hit: 'cs-dot-hit',
  db: 'cs-dot-db',
  ok: 'cs-dot-hit',
  fail: 'cs-dot-fail',
  blocked: 'cs-dot-blocked',
  notfound: 'cs-dot-blocked',
};

const KIND_LABEL: Record<Scene['kind'], string> = { normal: '情境', problem: '問題', solution: '解法' };

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return narrow;
}

/* ---------- 元件 ---------- */
export default function CacheStory({ sceneIds }: { sceneIds: string[] }) {
  const scenes = sceneIds.map((id) => allScenes.find((s) => s.id === id)!).filter(Boolean);
  const [sceneIdx, setSceneIdx] = useState(0);
  const scene = scenes[sceneIdx];
  const simRef = useRef<SimState>(createSim(scene.cfg));
  const [, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | undefined>(undefined);
  const last = useRef<number | null>(null);
  const L = useNarrow() ? NARROW : WIDE;

  const END = scene.cfg.duration + 1500;

  useEffect(() => {
    if (!playing) return;
    last.current = null;
    const loop = (now: number) => {
      const s = simRef.current;
      const dt = last.current === null ? 16 : Math.min(50, now - last.current);
      last.current = now;
      // 切成小步，讓模擬穩定
      let remain = dt;
      while (remain > 0) {
        const d = Math.min(16, remain);
        step(s, d);
        remain -= d;
      }
      setFrame((f) => f + 1);
      if (s.t >= END) {
        setPlaying(false);
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, END]);

  function load(idx: number, autoplay: boolean) {
    if (raf.current) cancelAnimationFrame(raf.current);
    simRef.current = createSim(scenes[idx].cfg);
    setSceneIdx(idx);
    setFrame((f) => f + 1);
    setPlaying(autoplay);
  }

  const s = simRef.current;
  const finished = s.t >= END;
  const caption = [...scene.captions].reverse().find((c) => c.at <= s.t) ?? scene.captions[0];
  const inflight = s.inflight.length;
  const loadNow = dbLoad(s);
  const stressed = !s.crashed && inflight > CONN_LIMIT * 0.45;
  const hotScene = scene.cfg.dist === 'hot';
  const narrow = L === NARROW;
  const meterW = L.db.rx * 2;
  const meterMax = DB_CAPACITY * 2.5;

  return (
    <div className="widget widget-frame cs">
      {scenes.length > 1 && (
        <div className="cs-tabs" role="tablist" aria-label="選擇情境">
          {scenes.map((sc, i) => (
            <button
              key={sc.id}
              role="tab"
              type="button"
              aria-selected={i === sceneIdx}
              className={`cs-tab cs-tab-${sc.kind} ${i === sceneIdx ? 'on' : ''}`}
              onClick={() => load(i, true)}
            >
              <span className="cs-tab-kind">{KIND_LABEL[sc.kind]}</span>
              {sc.title.replace(/^(問題|解法)：/, '')}
            </button>
          ))}
        </div>
      )}

      <svg className="cs-stage" viewBox={`0 0 ${L.w} ${L.h}`} role="img" aria-label={`${scene.title}的動畫`}>
        {/* 使用者 */}
        <text x={L.labels.users.x} y={L.labels.users.y} className="cs-label" textAnchor={narrow ? 'start' : 'middle'}>
          使用者
        </text>
        {L.users.map((p, i) => (
          <g key={i} className="cs-user" transform={`translate(${p.x}, ${p.y})`}>
            <circle cx="6" cy="0" r="7" />
            <path d="M-6 22 Q6 4 18 22 Z" />
          </g>
        ))}

        {/* 快取 */}
        <text x={L.labels.cache.x} y={L.labels.cache.y} className="cs-label" textAnchor={narrow ? 'start' : 'middle'}>
          快取
        </text>
        <rect x={L.cache.x} y={L.cache.y} width={L.cache.w} height={L.cache.h} rx="12" className="cs-box" />
        <text x={L.cache.x + 14} y={L.cache.y + 22} className="cs-small">
          下方的條：還剩多久過期
        </text>
        {Array.from({ length: KEY_COUNT }, (_, i) => {
          const r = slotRect(L, i);
          const slot = s.slots[i];
          const cached = isCached(slot, s.t);
          const left = cached ? Math.max(0, Math.min(1, (slot.expireAt - s.t) / slot.ttl)) : 0;
          const hot = hotScene && i === 0;
          const { w, h } = L.slot;
          return (
            <g
              key={i}
              className={`cs-slot ${cached ? 'cached' : 'empty'} ${slot.pending ? 'pending' : ''} ${hot ? 'hot' : ''}`}
            >
              <rect x={r.x} y={r.y} width={w} height={h} rx="6" className="cs-slot-bg" />
              <text x={r.x + w / 2} y={r.y + 22} textAnchor="middle" className="cs-slot-name">
                {hot ? '熱門' : `商品${i + 1}`}
              </text>
              <rect x={r.x + 6} y={r.y + h - 12} width={w - 12} height="5" rx="2.5" className="cs-ttl-track" />
              <rect x={r.x + 6} y={r.y + h - 12} width={(w - 12) * left} height="5" rx="2.5" className="cs-ttl" />
            </g>
          );
        })}
        {scene.cfg.guard && (
          <g className="cs-guard">
            <rect x={L.guard.x} y={L.guard.y} width={L.guard.w} height={L.guard.h} rx="4" />
            <text x={L.guard.label.x} y={L.guard.label.y} textAnchor={narrow ? 'end' : 'middle'} className="cs-small">
              名冊
            </text>
          </g>
        )}

        {/* 資料庫 */}
        <text x={L.labels.db.x} y={L.labels.db.y} className="cs-label" textAnchor={narrow ? 'start' : 'middle'}>
          資料庫
        </text>
        <g className={`cs-db ${s.crashed ? 'down' : ''} ${stressed ? 'stressed' : ''}`}>
          <path
            d={`M${L.db.cx - L.db.rx} ${L.db.cy - L.db.h / 2}
                v${L.db.h}
                a${L.db.rx} 14 0 0 0 ${L.db.rx * 2} 0
                v${-L.db.h}`}
            className="cs-db-body"
          />
          <ellipse cx={L.db.cx} cy={L.db.cy - L.db.h / 2} rx={L.db.rx} ry="14" className="cs-db-top" />
          <text x={L.db.cx} y={L.db.cy + L.db.h / 2 - 6} textAnchor="middle" className="cs-db-status">
            {s.crashed ? '倒下了' : stressed ? '忙不過來' : '正常'}
          </text>
        </g>
        <g transform={`translate(${L.meter.x}, ${L.meter.y})`}>
          <text x="0" y="0" className="cs-small">
            每秒查詢 {loadNow}（能處理 {DB_CAPACITY}）
          </text>
          <rect x="0" y="8" width={meterW} height="8" rx="4" className="cs-ttl-track" />
          <rect
            x="0"
            y="8"
            width={Math.min(1, loadNow / meterMax) * meterW}
            height="8"
            rx="4"
            className={`cs-meter ${loadNow > DB_CAPACITY ? 'over' : ''}`}
          />
          <line x1={meterW / 2.5} x2={meterW / 2.5} y1="5" y2="19" className="cs-meter-cap" />
        </g>

        {/* 請求 */}
        {s.dots.map((d) => {
          const p = dotPos(L, d, s);
          return (
            <circle
              key={d.id}
              cx={p.x}
              cy={p.y}
              r={narrow ? 5.5 : 5}
              className={`cs-dot ${d.phase === 'wait' ? 'cs-dot-blocked' : TONE_CLASS[d.tone]} ${
                d.key === FAKE_KEY ? 'fake' : ''
              }`}
            />
          );
        })}
      </svg>

      <div className="cs-caption" aria-live="polite">
        <span className={`cs-kind cs-kind-${scene.kind}`}>{KIND_LABEL[scene.kind]}</span>
        <p key={caption.text}>{caption.text}</p>
      </div>

      <div className="widget-controls cs-controls">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (finished ? load(sceneIdx, true) : setPlaying((p) => !p))}
        >
          {playing ? '暫停' : finished ? '重播' : s.t > 0 ? '繼續' : '播放'}
        </button>
        {s.t > 0 && !finished && (
          <button type="button" className="btn" onClick={() => load(sceneIdx, false)}>
            從頭開始
          </button>
        )}
        {finished && sceneIdx < scenes.length - 1 && (
          <button type="button" className="btn" onClick={() => load(sceneIdx + 1, true)}>
            下一幕：{scenes[sceneIdx + 1].title}
          </button>
        )}
        <div className="cs-timeline" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (s.t / END) * 100)}%` }} />
        </div>
      </div>

      <ul className="cs-legend">
        <li>
          <span className="cs-key cs-dot-pending" />
          正在問快取
        </li>
        <li>
          <span className="cs-key cs-dot-hit" />
          拿到答案
        </li>
        <li>
          <span className="cs-key cs-dot-db" />
          去資料庫拿
        </li>
        <li>
          <span className="cs-key cs-dot-fail" />
          失敗
        </li>
        {(scene.cfg.lock || scene.cfg.guard) && (
          <li>
            <span className="cs-key cs-dot-blocked" />
            {scene.cfg.lock ? '在快取旁等待' : '被擋回去'}
          </li>
        )}
        {scene.cfg.dist === 'penetration' && (
          <li>
            <span className="cs-key cs-dot-pending fake" />
            查不存在的商品
          </li>
        )}
      </ul>
    </div>
  );
}
