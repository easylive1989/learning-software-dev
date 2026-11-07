import { useEffect, useRef, useState } from 'react';
import './widgets.css';
import './ch3.css';

type Zone = 0 | 1 | 2;

const ZONES = [
  {
    place: '外場',
    role: '前端',
    title: '前端是外場',
    seen: '你看得到',
    where: '下載到你的手機或電腦，在你的瀏覽器裡執行。',
    job: '把東西畫在螢幕上，接住你的每一次點擊、輸入、滑動。',
    examples: '按鈕、表單、清單、載入中的轉圈圈、動畫',
    techs: 'HTML、CSS、JavaScript、React',
  },
  {
    place: '廚房',
    role: '後端',
    title: '後端是廚房',
    seen: '你看不到',
    where: '在公司的伺服器上執行，使用者碰不到。',
    job: '負責「做決定」：你有沒有登入、你能不能看這筆資料、訂單金額怎麼算。',
    examples: '登入驗證、權限檢查、計算金額、寄通知信',
    techs: 'Node.js、Java、Go、Python',
  },
  {
    place: '倉庫',
    role: '資料庫',
    title: '資料庫是倉庫',
    seen: '你看不到',
    where: '在公司的伺服器上，通常只有後端能進去。',
    job: '把需要長期保存的東西存好，後端需要時來拿，也會把新資料存回來。',
    examples: '會員、訂單、商品、庫存',
    techs: 'PostgreSQL、MySQL、MongoDB',
  },
] as const;

/** 「一道菜怎麼來」的導覽：依序亮起的區域與說明 */
const TOUR: { at: Zone; link?: 0 | 1; text: string }[] = [
  { at: 0, text: '你在螢幕上按下「點餐」。前端把你的選擇寫成一張點菜單。' },
  { at: 1, link: 0, text: '點菜單送進廚房。後端先確認你是誰、這張單合不合規則。' },
  { at: 2, link: 1, text: '後端走進倉庫：查庫存，把你的訂單記進帳本。' },
  { at: 1, link: 1, text: '倉庫回報「記好了」，後端把結果整理成一份回覆。' },
  { at: 0, link: 0, text: '回覆送回外場，前端把「訂單成立」畫在你的螢幕上。' },
];
const TOUR_MS = 1900;

function Illustration({ zone }: { zone: Zone }) {
  if (zone === 0)
    return (
      <svg viewBox="0 0 120 70" className="rm-art" aria-hidden="true">
        {/* 桌子 */}
        <rect x="22" y="40" width="76" height="6" rx="2" className="fill-ink" />
        <rect x="30" y="46" width="4" height="20" className="fill-ink" />
        <rect x="86" y="46" width="4" height="20" className="fill-ink" />
        {/* 客人 */}
        <circle cx="16" cy="22" r="7" className="fill-front" />
        <path d="M6 48 q10 -22 20 0 z" className="fill-front" />
        {/* 菜單（螢幕） */}
        <rect x="48" y="14" width="24" height="26" rx="3" className="rm-screen" />
        <rect x="52" y="19" width="16" height="3" rx="1" className="fill-front" />
        <rect x="52" y="25" width="12" height="3" rx="1" className="fill-muted" />
        <rect x="52" y="31" width="14" height="3" rx="1" className="fill-muted" />
        {/* 盤子 */}
        <ellipse cx="88" cy="37" rx="10" ry="3" className="fill-muted" />
      </svg>
    );
  if (zone === 1)
    return (
      <svg viewBox="0 0 120 70" className="rm-art" aria-hidden="true">
        {/* 爐台 */}
        <rect x="20" y="44" width="80" height="22" rx="3" className="fill-ink" />
        <circle cx="44" cy="55" r="4" className="fill-bg" />
        <circle cx="76" cy="55" r="4" className="fill-bg" />
        {/* 鍋子 */}
        <rect x="30" y="26" width="30" height="14" rx="3" className="fill-muted" />
        <rect x="60" y="30" width="12" height="3" rx="1" className="fill-muted" />
        {/* 火 */}
        <path className="rm-flame" d="M38 44 q3 -6 0 -9 q6 3 4 9 z M48 44 q3 -7 0 -10 q7 4 4 10 z" />
        {/* 點菜單夾 */}
        <rect x="80" y="10" width="18" height="24" rx="2" className="rm-screen" />
        <path d="M84 17 h10 M84 22 h8 M84 27 h10" className="stroke-back" />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 70" className="rm-art" aria-hidden="true">
      {/* 貨架 */}
      <path d="M18 8 v58 M102 8 v58 M18 26 h84 M18 46 h84 M18 66 h84" className="stroke-ink" />
      {/* 箱子：會員、訂單、商品 */}
      <rect x="24" y="12" width="18" height="14" className="fill-back" />
      <rect x="46" y="16" width="14" height="10" className="fill-back" />
      <rect x="70" y="12" width="24" height="14" className="fill-muted" />
      <rect x="24" y="32" width="26" height="14" className="fill-muted" />
      <rect x="56" y="34" width="16" height="12" className="fill-back" />
      <rect x="78" y="30" width="16" height="16" className="fill-back" />
      <rect x="30" y="52" width="20" height="14" className="fill-back" />
      <rect x="60" y="54" width="30" height="12" className="fill-muted" />
    </svg>
  );
}

export default function RestaurantMap() {
  const [active, setActive] = useState<Zone>(0);
  const [tourIdx, setTourIdx] = useState(-1);
  const timer = useRef<number | undefined>(undefined);
  const touring = tourIdx >= 0;

  useEffect(() => {
    if (!touring) return;
    if (tourIdx >= TOUR.length - 1) {
      timer.current = window.setTimeout(() => setTourIdx(-1), TOUR_MS + 400);
    } else {
      timer.current = window.setTimeout(() => setTourIdx((i) => i + 1), TOUR_MS);
    }
    return () => window.clearTimeout(timer.current);
  }, [tourIdx, touring]);

  const step = touring ? TOUR[tourIdx] : null;
  const shown: Zone = step ? step.at : active;
  const z = ZONES[shown];

  function pick(i: Zone) {
    window.clearTimeout(timer.current);
    setTourIdx(-1);
    setActive(i);
  }

  function zoneButton(i: Zone) {
    const d = ZONES[i];
    return (
      <button
        type="button"
        className={`rm-zone ${shown === i ? 'on' : ''}`}
        aria-pressed={shown === i}
        onClick={() => pick(i)}
      >
        <Illustration zone={i} />
        <span className="rm-zone-place">{d.place}</span>
        <span className="rm-zone-role">{d.role}</span>
      </button>
    );
  }

  function link(i: 0 | 1, label: string) {
    return (
      <div className={`rm-link ${step?.link === i ? 'on' : ''}`} aria-hidden="true">
        <span className="rm-link-line" />
        <span className="rm-link-label">{label}</span>
      </div>
    );
  }

  return (
    <div className="widget widget-frame rm">
      <div className="rm-floor">
        <div className="rm-area rm-front">
          <span className="rm-area-label">你看得到的地方</span>
          {zoneButton(0)}
        </div>
        {link(0, '點菜單\n（API）')}
        <div className="rm-area rm-back">
          <span className="rm-area-label">你看不到的地方：公司的伺服器</span>
          <div className="rm-back-inner">
            {zoneButton(1)}
            {link(1, '拿食材\n記帳')}
            {zoneButton(2)}
          </div>
        </div>
      </div>

      <div className="widget-controls rm-controls">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setTourIdx(0)}
          disabled={touring}
        >
          {touring ? `播放中（${tourIdx + 1} / ${TOUR.length}）` : '看一道菜怎麼來'}
        </button>
        <span className="rm-hint">或點上面任何一區，看它在軟體裡是誰</span>
      </div>

      <div className="rm-detail" aria-live="polite">
        {step ? (
          <p className="rm-tour">
            <span className="rm-tour-where">{z.place}</span>
            {step.text}
          </p>
        ) : (
          <>
            <h3 className="rm-detail-title">
              {z.title}
              <span className={`rm-seen ${shown === 0 ? 'yes' : 'no'}`}>{z.seen}</span>
            </h3>
            <dl className="rm-facts">
              <dt>在哪裡執行</dt>
              <dd>{z.where}</dd>
              <dt>負責什麼</dt>
              <dd>{z.job}</dd>
              <dt>舉例</dt>
              <dd>{z.examples}</dd>
              <dt>常聽到的技術</dt>
              <dd>{z.techs}</dd>
            </dl>
          </>
        )}
      </div>
    </div>
  );
}
