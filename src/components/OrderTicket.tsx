import { useEffect, useRef, useState } from 'react';
import './widgets.css';
import './ch3.css';

type Step = {
  /** 點菜單（或回來的菜）在哪裡：0 外場、1 廚房 */
  p: 0 | 1;
  carry: 'ticket' | 'plate';
  panel: 'req' | 'res';
  hl: number;
  text: string;
  ms: number;
};

const REQ = [
  { code: 'POST /api/orders', means: '「我要新增一筆訂單」，送到點餐櫃台' },
  { code: 'Authorization: Bearer eyJhbGci…', means: '附上會員卡，證明你是誰' },
  { code: '{ "item": "珍珠奶茶", "qty": 2 }', means: '點了什麼、幾杯' },
];

const RES = [
  { code: '201 Created', means: '單子收到了，已經開始做' },
  { code: '{ "id": 1088, "status": "preparing" }', means: '你的號碼牌和目前進度' },
];

const STEPS: Step[] = [
  { p: 0, carry: 'ticket', panel: 'req', hl: 0, text: '你按下「送出」，前端寫好一張點菜單。第一行寫的是「要做什麼」和「送去哪個櫃台」。', ms: 2600 },
  { p: 0, carry: 'ticket', panel: 'req', hl: 1, text: '單子上附上你的會員卡。廚房靠它認出你是誰，有沒有登入。', ms: 2300 },
  { p: 0, carry: 'ticket', panel: 'req', hl: 2, text: '最後寫上點了什麼。要寫哪些欄位、叫什麼名字，是前後端事先約好的。', ms: 2500 },
  { p: 1, carry: 'ticket', panel: 'req', hl: -1, text: '點菜單送進廚房。廚房照著約定的格式讀單、做菜。', ms: 2200 },
  { p: 0, carry: 'plate', panel: 'res', hl: 0, text: '菜端回來了。最上面先寫結果：`201` 代表「收到，已經新增」。', ms: 2400 },
  { p: 0, carry: 'plate', panel: 'res', hl: 1, text: '下面是內容：號碼牌和進度。前端拿到它，就能在畫面上畫出「訂單成立」。', ms: 2400 },
];

function Ticket() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <rect x="8" y="3" width="28" height="38" rx="3" className="rm-screen" />
      <path d="M14 13 h16 M14 20 h12 M14 27 h16 M14 34 h8" className="stroke-back" />
    </svg>
  );
}

function Plate() {
  return (
    <svg viewBox="0 0 44 44" aria-hidden="true">
      <ellipse cx="22" cy="36" rx="19" ry="5" className="fill-muted" />
      <path d="M13 12 h18 l-3 22 h-12 z" className="fill-back" />
      <circle cx="18" cy="30" r="2" className="fill-ink" />
      <circle cx="24" cy="31" r="2" className="fill-ink" />
      <rect x="25" y="4" width="3" height="11" rx="1" className="fill-ink" />
    </svg>
  );
}

/** 把說明裡的 `code` 片段換成 <code> */
function withCode(text: string) {
  return text.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

export default function OrderTicket() {
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const done = idx >= STEPS.length - 1;
  const step = idx >= 0 ? STEPS[idx] : null;

  useEffect(() => {
    if (!playing) return;
    if (done) {
      setPlaying(false);
      return;
    }
    const wait = idx < 0 ? 0 : STEPS[idx].ms;
    timer.current = window.setTimeout(() => setIdx((i) => i + 1), wait);
    return () => window.clearTimeout(timer.current);
  }, [playing, idx, done]);

  function play() {
    if (done) setIdx(-1);
    setPlaying(true);
  }
  function next() {
    setPlaying(false);
    setIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function reset() {
    window.clearTimeout(timer.current);
    setPlaying(false);
    setIdx(-1);
  }

  const p = step ? step.p : 0;
  const carry = step ? step.carry : 'ticket';

  return (
    <div className="widget widget-frame ot">
      <div className="ot-stage">
        <div className={`ot-end ${step && p === 0 ? 'on' : ''}`}>
          <span className="ot-end-name">外場</span>
          <span className="ot-end-sub">前端・瀏覽器</span>
        </div>
        <div className="ot-track" aria-hidden="true">
          <span className="ot-token" style={{ '--p': p, opacity: step ? 1 : 0.35 } as React.CSSProperties}>
            {carry === 'ticket' ? <Ticket /> : <Plate />}
          </span>
        </div>
        <div className={`ot-end ${step && p === 1 ? 'on' : ''}`}>
          <span className="ot-end-name">廚房</span>
          <span className="ot-end-sub">後端・伺服器</span>
        </div>
      </div>

      <p className="ot-caption" aria-live="polite">
        {step ? withCode(step.text) : '按「播放」，看一張點菜單怎麼送進廚房，又怎麼端著菜回來。'}
      </p>

      <div className="ot-panels">
        <div className={`ot-panel ${step?.panel === 'req' ? 'on' : ''}`}>
          <h4>
            點菜單<small>工程師叫它 request</small>
          </h4>
          <ul className="ot-lines">
            {REQ.map((l, i) => (
              <li key={l.code} className={step?.panel === 'req' && step.hl === i ? 'hl' : ''}>
                <code>{l.code}</code>
                <span>{l.means}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`ot-panel ${step?.panel === 'res' ? 'on' : ''}`}>
          <h4>
            端回來的菜<small>工程師叫它 response</small>
          </h4>
          <ul className="ot-lines">
            {RES.map((l, i) => (
              <li key={l.code} className={step?.panel === 'res' && step.hl === i ? 'hl' : ''}>
                <code>{l.code}</code>
                <span>{l.means}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="widget-controls">
        <button type="button" className="btn btn-primary" onClick={play} disabled={playing}>
          {done ? '再播一次' : idx >= 0 ? '繼續播放' : '播放'}
        </button>
        <button type="button" className="btn" onClick={next} disabled={done}>
          下一步
        </button>
        <button type="button" className="btn" onClick={reset} disabled={idx < 0}>
          重來
        </button>
        <span className="c3-progress">{idx < 0 ? '' : `第 ${idx + 1} / ${STEPS.length} 步`}</span>
      </div>
    </div>
  );
}
