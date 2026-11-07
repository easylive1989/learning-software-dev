export type Chapter = {
  slug: string;
  no: number;
  title: string;
  /** 地圖上的短站名 */
  station: string;
  summary: string;
  covers: string[];
  ready: boolean;
};

export const baseLine: Chapter[] = [
  {
    slug: 'what-is-software',
    no: 1,
    title: '軟體是什麼',
    station: '軟體是什麼',
    summary: '程式、電腦、執行：一行文字是怎麼變成螢幕上會動的東西。',
    covers: ['程式碼只是給電腦看的食譜', 'CPU、記憶體、硬碟各自負責什麼', '編譯與直譯：翻譯一次還是邊讀邊翻'],
    ready: false,
  },
  {
    slug: 'syntax',
    no: 2,
    title: '程式的基本語法',
    station: '基本語法',
    summary: '變數、條件、迴圈、函式。不學特定語言，只學「看得懂一段程式在做什麼」。',
    covers: ['變數：貼了標籤的盒子', '條件判斷與迴圈', '函式：把一串步驟取個名字', '為什麼每種語言長得不一樣，骨架卻很像'],
    ready: false,
  },
  {
    slug: 'frontend-backend',
    no: 3,
    title: '前端與後端',
    station: '前端與後端',
    summary: '你看得到的和看不到的。用一間餐廳理解瀏覽器、伺服器、資料庫各自在做什麼。',
    covers: ['外場、廚房、倉庫', '一次點擊背後的來回', '為什麼驗證不能只做在前端'],
    ready: true,
  },
  {
    slug: 'network',
    no: 4,
    title: '網路怎麼傳東西',
    station: '網路',
    summary: 'IP、DNS、TCP：一個封包從你家出發，怎麼找到地球另一端的伺服器。',
    covers: ['IP 是門牌，DNS 是通訊錄', '封包、路由與為什麼會「掉包」', 'TCP 和 UDP：掛號信與明信片'],
    ready: false,
  },
  {
    slug: 'http-api',
    no: 5,
    title: 'HTTP 與 API',
    station: 'HTTP 與 API',
    summary: '前端和後端約好的說話格式。GET、POST、狀態碼 200 和 500 到底在說什麼。',
    covers: ['Request 與 Response 長什麼樣子', '狀態碼：2xx、4xx、5xx 各代表誰的錯', 'REST API 與 JSON'],
    ready: false,
  },
  {
    slug: 'database',
    no: 6,
    title: '資料庫',
    station: '資料庫',
    summary: '資料存在哪、怎麼查、為什麼「DB 被打爆」是工程師最怕聽到的一句話。',
    covers: ['表格、欄位、主鍵', 'SQL 查詢在做什麼', '索引：書後面的索引頁', '交易（transaction）與鎖'],
    ready: false,
  },
  {
    slug: 'os',
    no: 7,
    title: '作業系統與底層',
    station: '作業系統',
    summary: 'Process、Thread、記憶體、檔案系統：所有程式底下的那塊地基。',
    covers: ['Process 與 Thread', '記憶體不夠時發生什麼事', '檔案系統與磁碟'],
    ready: false,
  },
  {
    slug: 'security',
    no: 8,
    title: '資安基本觀念',
    station: '資安',
    summary: 'HTTPS、密碼雜湊、SQL injection、XSS：攻擊者怎麼想，系統怎麼防。',
    covers: ['加密與 HTTPS', '為什麼密碼不能存明碼', 'SQL injection 與 XSS', '認證與授權的差別'],
    ready: false,
  },
  {
    slug: 'cache',
    no: 9,
    title: '快取與雪崩',
    station: '快取與雪崩',
    summary: '先把常用的答案記起來。以及當大家同時忘記答案時，資料庫會發生什麼事。',
    covers: ['快取命中與過期', '快取雪崩、擊穿、穿透', '工程師怎麼防'],
    ready: true,
  },
];

export type PlannedLine = {
  name: string;
  forWhom: string;
  color: string;
  stations: string[];
};

export const plannedLines: PlannedLine[] = [
  {
    name: '前端線',
    forWhom: '給後端工程師：理解前端在痛什麼',
    color: 'var(--line-front)',
    stations: ['瀏覽器怎麼畫畫面', '狀態管理', '前端效能', 'CORS'],
  },
  {
    name: '後端與維運線',
    forWhom: '給前端工程師：理解後端與 DevOps 的日常',
    color: 'var(--line-back)',
    stations: ['訊息佇列', '容器與部署', '監控與告警', '擴展與負載平衡'],
  },
];

export function getChapter(slug: string): Chapter {
  const c = baseLine.find((ch) => ch.slug === slug);
  if (!c) throw new Error(`Unknown chapter: ${slug}`);
  return c;
}
