import { useEffect, useRef, useState } from 'react';
import './widgets.css';
import './request-journey.css';

type Action = 'list' | 'create';
type Condition = 'ok' | 'slow' | 'dbdown' | 'badreq';

type Outcome =
  | { kind: 'orders' }
  | { kind: 'created' }
  | { kind: 'loading' }
  | { kind: 'error'; text: string };

type Step = {
  /** token 所在位置：0 瀏覽器、1 伺服器、2 資料庫 */
  at: 0 | 1 | 2;
  analogy: string;
  real: string;
  code?: boolean;
  ms: number;
  tone?: 'bad' | 'wait';
  outcome?: Outcome;
};

const NODES = [
  { name: '瀏覽器', role: '前端', place: '外場' },
  { name: '伺服器', role: '後端', place: '廚房' },
  { name: '資料庫', role: '資料', place: '倉庫' },
];

const ACTIONS: { id: Action; label: string }[] = [
  { id: 'list', label: '查看我的訂單' },
  { id: 'create', label: '送出一筆新訂單' },
];

const CONDITIONS: { id: Condition; label: string }[] = [
  { id: 'ok', label: '一切正常' },
  { id: 'slow', label: '廚房忙不過來' },
  { id: 'dbdown', label: '倉庫打不開' },
  { id: 'badreq', label: '點菜單寫錯了' },
];

function buildSteps(action: Action, cond: Condition): Step[] {
  const isList = action === 'list';
  const steps: Step[] = [];

  steps.push({
    at: 0,
    analogy: isList ? '你在桌上按了「我的訂單」。' : '你在菜單上勾好餐點，按下「送出」。',
    real: isList ? "fetch('/api/orders')" : "fetch('/api/orders', { method: 'POST', body })",
    code: true,
    ms: 1100,
  });

  if (cond === 'badreq') {
    steps.push({
      at: 1,
      analogy: isList ? '服務生把單子送進廚房，可是你還沒報上名字。' : '服務生把點菜單送進廚房，可是單子上沒寫要點什麼。',
      real: isList
        ? 'GET /api/orders HTTP/1.1\n（沒有帶登入資訊）'
        : 'POST /api/orders HTTP/1.1\n{ "qty": 2 }   ← 少了 item',
      code: true,
      ms: 1500,
    });
    steps.push({
      at: 1,
      analogy: '廚房看了一眼就退單，根本沒去倉庫。',
      real: '後端檢查請求內容，發現不合格，直接拒絕。資料庫完全沒被碰到。',
      ms: 1500,
      tone: 'bad',
    });
    steps.push({
      at: 0,
      analogy: '服務生回來說：「這張單我們沒辦法做。」',
      real: isList ? 'HTTP/1.1 401 Unauthorized' : 'HTTP/1.1 400 Bad Request\n{ "error": "item is required" }',
      code: true,
      ms: 1500,
      tone: 'bad',
    });
    steps.push({
      at: 0,
      analogy: '外場把狀況告訴你。',
      real: '前端讀到 4xx，知道是「請求本身」有問題，提示使用者修正。',
      ms: 800,
      outcome: { kind: 'error', text: isList ? '請先登入再查看訂單。' : '請選擇要點的餐點。' },
    });
    return steps;
  }

  steps.push({
    at: 1,
    analogy: '服務生把點菜單送進廚房。',
    real: isList
      ? 'GET /api/orders HTTP/1.1\nCookie: session=8f3a…'
      : 'POST /api/orders HTTP/1.1\n{ "item": "珍珠奶茶", "qty": 2 }',
    code: true,
    ms: 1500,
    outcome: { kind: 'loading' },
  });

  if (cond === 'slow') {
    steps.push({
      at: 1,
      analogy: '廚房前面排了一長串單子，你的單還在等。',
      real: '伺服器同時在處理很多請求，你的請求在排隊。瀏覽器這邊只能等。',
      ms: 3200,
      tone: 'wait',
    });
  }

  steps.push({
    at: 1,
    analogy: '廚房確認你是誰、你要什麼。',
    real: '後端檢查登入狀態與請求內容，決定要對資料庫做什麼。',
    ms: 1300,
  });

  steps.push({
    at: 2,
    analogy: isList ? '廚師走進倉庫找你的單據。' : '廚師把你的訂單登記進倉庫的帳本。',
    real: isList
      ? 'SELECT * FROM orders WHERE user_id = 42;'
      : "INSERT INTO orders (user_id, item, qty)\nVALUES (42, '珍珠奶茶', 2);",
    code: true,
    ms: 1600,
  });

  if (cond === 'dbdown') {
    steps.push({
      at: 2,
      analogy: '倉庫的鐵門拉下來了，打不開。',
      real: 'Error: connect ECONNREFUSED 10.0.3.7:5432',
      code: true,
      ms: 1600,
      tone: 'bad',
    });
    steps.push({
      at: 1,
      analogy: '廚房兩手空空，做不出這道菜。',
      real: '後端拿不到資料，只能回報錯誤，並把細節寫進 log 給工程師查。',
      ms: 1400,
      tone: 'bad',
    });
    steps.push({
      at: 0,
      analogy: '服務生回來道歉：「廚房那邊出了點狀況。」',
      real: 'HTTP/1.1 500 Internal Server Error',
      code: true,
      ms: 1500,
      tone: 'bad',
    });
    steps.push({
      at: 0,
      analogy: '外場告訴你稍後再試。',
      real: '前端讀到 5xx，知道是伺服器那邊出事，不是使用者的錯。',
      ms: 800,
      outcome: { kind: 'error', text: '系統暫時無法使用，請稍後再試。' },
    });
    return steps;
  }

  steps.push({
    at: 1,
    analogy: isList ? '倉庫交出三張單據。' : '帳本寫好了，倉庫回報「登記完成」。',
    real: isList ? '資料庫回傳 3 筆資料' : '資料庫回傳：新增 1 筆，id = 1088',
    ms: 1400,
  });

  steps.push({
    at: 1,
    analogy: '廚房擺盤。',
    real: '後端把資料整理成前端看得懂的格式（JSON）。',
    ms: 1100,
  });

  steps.push({
    at: 0,
    analogy: '服務生端菜上桌。',
    real: isList
      ? 'HTTP/1.1 200 OK\n{ "orders": [ { "id": 1071, … }, … ] }'
      : 'HTTP/1.1 201 Created\n{ "id": 1088, "status": "preparing" }',
    code: true,
    ms: 1500,
  });

  steps.push({
    at: 0,
    analogy: '外場把菜擺好在你面前。',
    real: '前端拿到 JSON，把它畫成你看到的畫面。',
    ms: 800,
    outcome: isList ? { kind: 'orders' } : { kind: 'created' },
  });

  return steps;
}

function Screen({ outcome }: { outcome: Outcome | null }) {
  if (!outcome) return <p className="rj-screen-idle">（畫面還沒有內容）</p>;
  if (outcome.kind === 'loading')
    return (
      <p className="rj-screen-loading">
        <span className="rj-spinner" aria-hidden="true" /> 載入中…
      </p>
    );
  if (outcome.kind === 'error') return <p className="rj-screen-error">{outcome.text}</p>;
  if (outcome.kind === 'created') return <p className="rj-screen-ok">訂單已送出：珍珠奶茶 × 2</p>;
  return (
    <ul className="rj-screen-list">
      <li>#1071 紅茶拿鐵 × 1</li>
      <li>#1064 雞排 × 2</li>
      <li>#1052 珍珠奶茶 × 1</li>
    </ul>
  );
}

export default function RequestJourney() {
  const [action, setAction] = useState<Action>('list');
  const [cond, setCond] = useState<Condition>('ok');
  const [stepIdx, setStepIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const steps = buildSteps(action, cond);
  const done = stepIdx >= steps.length - 1;
  const current = stepIdx >= 0 ? steps[stepIdx] : null;
  const tokenAt = current ? current.at : 0;

  // 畫面上目前應該顯示的 outcome：最後一個帶 outcome 的已執行步驟
  let outcome: Outcome | null = null;
  for (let i = 0; i <= stepIdx; i++) if (steps[i].outcome) outcome = steps[i].outcome!;

  useEffect(() => {
    if (!playing) return;
    if (done) {
      setPlaying(false);
      return;
    }
    const wait = stepIdx < 0 ? 0 : steps[stepIdx].ms;
    timer.current = window.setTimeout(() => setStepIdx((i) => i + 1), wait);
    return () => window.clearTimeout(timer.current);
  }, [playing, stepIdx, done]);

  function reset() {
    window.clearTimeout(timer.current);
    setPlaying(false);
    setStepIdx(-1);
  }

  function play() {
    if (done) setStepIdx(-1);
    setPlaying(true);
  }

  function next() {
    setPlaying(false);
    setStepIdx((i) => (i >= steps.length - 1 ? i : i + 1));
  }

  return (
    <div className="widget widget-frame rj">
      <div className="rj-setup">
        <div role="radiogroup" aria-label="要做什麼" className="rj-group">
          <span className="rj-group-label">你要做什麼</span>
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={action === a.id}
              className={`rj-chip ${action === a.id ? 'on' : ''}`}
              onClick={() => {
                setAction(a.id);
                reset();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="今天的狀況" className="rj-group">
          <span className="rj-group-label">今天的狀況</span>
          {CONDITIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={cond === c.id}
              className={`rj-chip ${cond === c.id ? 'on' : ''} ${c.id !== 'ok' ? 'trouble' : ''}`}
              onClick={() => {
                setCond(c.id);
                reset();
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rj-stage">
        <div className="rj-track" aria-hidden="true">
          <span
            className={`rj-token ${current?.tone ?? ''}`}
            style={{ left: `${tokenAt * 50}%` }}
          />
        </div>
        {NODES.map((n, i) => (
          <div key={n.name} className={`rj-node ${tokenAt === i && stepIdx >= 0 ? 'active' : ''}`}>
            <div className="rj-node-name">{n.name}</div>
            <div className="rj-node-sub">
              {n.role}・{n.place}
            </div>
            {i === 0 && (
              <div className="rj-screen" aria-live="polite">
                <Screen outcome={outcome} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="widget-controls rj-buttons">
        <button type="button" className="btn btn-primary" onClick={play} disabled={playing}>
          {done ? '再播一次' : stepIdx >= 0 ? '繼續播放' : '播放'}
        </button>
        <button type="button" className="btn" onClick={next} disabled={done}>
          下一步
        </button>
        <button type="button" className="btn" onClick={reset} disabled={stepIdx < 0}>
          重來
        </button>
        <span className="rj-progress">
          {stepIdx < 0 ? '按「播放」開始' : `第 ${stepIdx + 1} / ${steps.length} 步`}
        </span>
      </div>

      <ol className="rj-log" aria-live="polite">
        {/* 最新的一步放最上面，手機上才不會被擠到畫面外 */}
        {steps
          .slice(0, stepIdx + 1)
          .map((s, i) => ({ s, i }))
          .reverse()
          .map(({ s, i }) => (
          <li key={i} className={`${i === stepIdx ? 'current' : ''} ${s.tone ?? ''}`}>
            <span className="rj-where">{NODES[s.at].place}</span>
            <div className="rj-log-body">
              <p className="rj-analogy">{s.analogy}</p>
              {s.code ? <pre className="rj-real">{s.real}</pre> : <p className="rj-real-text">{s.real}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
