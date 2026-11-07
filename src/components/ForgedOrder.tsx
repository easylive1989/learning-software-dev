import { useEffect, useRef, useState } from 'react';
import { handleOrder, isValidQty, MAX_QTY, PRICE, type OrderResult } from './forged-order';
import './widgets.css';
import './request-journey.css';
import './ch3.css';

const FORGED = [10, 999, -2];
const STEP_MS = 1400;

type Row = { qty: number; total: number; broken: boolean };

export default function ForgedOrder() {
  const [qty, setQty] = useState(2);
  const [devtools, setDevtools] = useState(false);
  const [forged, setForged] = useState(10);
  const [validates, setValidates] = useState(false);
  const [phase, setPhase] = useState(-1);
  const [sent, setSent] = useState<{ qty: number; validates: boolean; result: OrderResult } | null>(null);
  const [ledger, setLedger] = useState<Row[]>([
    { qty: 1, total: PRICE, broken: false },
  ]);
  const timer = useRef<number | undefined>(undefined);

  const sendQty = devtools ? forged : qty;
  const running = phase >= 0 && phase < 3;

  useEffect(() => {
    if (!running) return;
    timer.current = window.setTimeout(() => setPhase((p) => p + 1), STEP_MS);
    return () => window.clearTimeout(timer.current);
  }, [phase, running]);

  // 到達倉庫那一步時，真的寫進帳本
  useEffect(() => {
    if (phase === 2 && sent?.result.stored) {
      setLedger((l) => [...l, { qty: sent.qty, total: sent.result.total, broken: sent.result.broken }]);
    }
  }, [phase]);

  function send() {
    window.clearTimeout(timer.current);
    setSent({ qty: sendQty, validates, result: handleOrder(sendQty, validates) });
    setPhase(0);
  }

  function changed() {
    window.clearTimeout(timer.current);
    setPhase(-1);
    setSent(null);
  }

  const r = sent?.result;
  const at = (i: number) => phase === i;

  let kitchenNote: React.ReactNode = null;
  let kitchenTone = '';
  if (sent && phase >= 1) {
    if (sent.validates) {
      const ok = isValidQty(sent.qty);
      kitchenTone = ok ? 'good' : 'bad';
      kitchenNote = ok ? (
        <p className="fo-note good">再檢查一次：{sent.qty} 杯，合規則。</p>
      ) : (
        <p className="fo-note bad">
          再檢查一次：{sent.qty} 杯不在 1 到 {MAX_QTY} 之間，退單。
        </p>
      );
    } else {
      kitchenTone = isValidQty(sent.qty) ? '' : 'bad';
      kitchenNote = <p className="fo-note">沒有檢查，照單全收。</p>;
    }
  }

  let verdict: React.ReactNode = null;
  let verdictBad = false;
  if (sent && phase >= 3) {
    if (isValidQty(sent.qty)) {
      verdict = '正常的單，不管廚房有沒有再檢查都會成立。試試打開「開發者工具」，把數量改掉再送一次。';
    } else if (r?.stored) {
      verdictBad = true;
      verdict =
        sent.qty < 0
          ? `前端的限制被繞過了。倉庫裡多了一筆 ${sent.qty} 杯的訂單，金額是 $${r.total}，等於店家倒貼錢給客人。`
          : `前端的限制被繞過了。倉庫裡多了一筆 ${sent.qty} 杯的訂單，金額 $${r.total}，可是店裡根本做不出來。`;
    } else {
      verdict = '廚房退單，倉庫完全沒被碰到。前端擋的是使用體驗，後端擋的才是真正的規則。';
    }
  }

  return (
    <div className="widget widget-frame fo">
      <div className="fo-top">
        <div className="fo-phone">
          <div className="fo-phone-bar" aria-hidden="true" />
          <div className="fo-item">
            珍珠奶茶 <small>${PRICE} / 杯</small>
          </div>
          <div className="fo-stepper">
            <button
              type="button"
              aria-label="少一杯"
              disabled={devtools || qty <= 1}
              onClick={() => {
                setQty((q) => q - 1);
                changed();
              }}
            >
              −
            </button>
            <span className={`fo-qty ${devtools ? 'forged' : ''}`} aria-live="polite">
              {sendQty}
            </span>
            <button
              type="button"
              aria-label="多一杯"
              disabled={devtools || qty >= MAX_QTY}
              onClick={() => {
                setQty((q) => q + 1);
                changed();
              }}
            >
              +
            </button>
          </div>
          <p className="fo-limit">
            {devtools ? '數量被改掉了，畫面上的限制已經失效' : `前端限制：每人最多 ${MAX_QTY} 杯，+ 按到 ${MAX_QTY} 就按不動`}
          </p>
          <button type="button" className="btn btn-primary fo-send" onClick={send} disabled={running}>
            送出訂單
          </button>
        </div>

        <div className="fo-side">
          <div>
            <span className="fo-side-label">客人做了什麼</span>
            <div className="fo-chips" role="radiogroup" aria-label="客人做了什麼">
              <button
                type="button"
                role="radio"
                aria-checked={!devtools}
                className={`rj-chip ${!devtools ? 'on' : ''}`}
                onClick={() => {
                  setDevtools(false);
                  changed();
                }}
              >
                乖乖按按鈕
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={devtools}
                className={`rj-chip trouble ${devtools ? 'on' : ''}`}
                onClick={() => {
                  setDevtools(true);
                  changed();
                }}
              >
                打開開發者工具改數字
              </button>
            </div>
          </div>

          {devtools && (
            <div className="fo-devtools">
              瀏覽器的開發者工具裡，送出去的內容可以直接改：
              <pre>{`{ "item": "珍珠奶茶", "qty": ${forged} }`}</pre>
              <div className="fo-chips" role="radiogroup" aria-label="改成幾杯">
                {FORGED.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={forged === n}
                    className={`rj-chip ${forged === n ? 'on' : ''}`}
                    onClick={() => {
                      setForged(n);
                      changed();
                    }}
                  >
                    改成 {n} 杯
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="fo-side-label">廚房（後端）有沒有再檢查一次</span>
            <div className="fo-chips" role="radiogroup" aria-label="後端有沒有檢查">
              <button
                type="button"
                role="radio"
                aria-checked={!validates}
                className={`rj-chip trouble ${!validates ? 'on' : ''}`}
                onClick={() => {
                  setValidates(false);
                  changed();
                }}
              >
                只靠前端擋
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={validates}
                className={`rj-chip ${validates ? 'on' : ''}`}
                onClick={() => {
                  setValidates(true);
                  changed();
                }}
              >
                後端也檢查
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fo-flow">
        <div className={`fo-node ${at(0) || at(3) ? 'on' : ''}`}>
          <div className="fo-node-name">外場</div>
          <div className="fo-node-sub">前端・你的瀏覽器</div>
          {sent && phase >= 0 && phase < 3 && (
            <div className="fo-note">
              送出點菜單：
              <pre>{`{ "qty": ${sent.qty} }`}</pre>
            </div>
          )}
          {sent && phase >= 3 && r && (
            <div className={`fo-note ${r.broken ? 'bad' : 'good'}`}>
              收到回覆：
              <pre>{r.response}</pre>
            </div>
          )}
        </div>
        <div className={`fo-node ${at(1) ? kitchenTone || 'on' : ''}`}>
          <div className="fo-node-name">廚房</div>
          <div className="fo-node-sub">後端・伺服器</div>
          {kitchenNote}
        </div>
        <div className={`fo-node ${at(2) ? (r?.broken ? 'bad' : r?.stored ? 'on' : 'good') : ''}`}>
          <div className="fo-node-name">倉庫</div>
          <div className="fo-node-sub">資料庫・訂單帳本</div>
          {sent && phase >= 2 && !r?.stored && <p className="fo-note good">沒被碰到。</p>}
          <ul className="fo-ledger" aria-label="訂單帳本">
            {ledger.slice(-4).map((row, i) => (
              <li key={i} className={row.broken ? 'bad' : ''}>
                珍奶 × {row.qty}　${row.total}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {verdict && (
        <p className={`fo-verdict ${verdictBad ? 'bad' : ''}`} aria-live="polite">
          {verdict}
        </p>
      )}
    </div>
  );
}
