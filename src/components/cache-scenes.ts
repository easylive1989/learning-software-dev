import type { SceneConfig } from './cache-sim.ts';

export type Scene = {
  id: string;
  kind: 'normal' | 'problem' | 'solution';
  title: string;
  /** 旁白：依時間出現 */
  captions: { at: number; text: string }[];
  cfg: SceneConfig;
};

const base: Omit<SceneConfig, 'events' | 'initial'> = {
  rate: 30,
  dist: 'uniform',
  jitter: false,
  lock: false,
  guard: false,
  duration: 11000,
};

export const scenes: Scene[] = [
  {
    id: 'normal',
    kind: 'normal',
    title: '平常的日子',
    captions: [
      { at: 0, text: '每一顆點是一位使用者的請求。它先到快取找答案。' },
      { at: 2500, text: '綠色：快取裡有答案，馬上帶回去。資料庫完全不用動。' },
      { at: 5500, text: '偶爾某個商品的快取過期了，才會有一顆黃點跑去資料庫拿新資料，順便放回快取。' },
      { at: 8500, text: '大部分請求都被快取擋下來，資料庫很輕鬆。這就是快取的價值。' },
    ],
    cfg: { ...base, initial: 'stagger', events: [] },
  },
  {
    id: 'avalanche',
    kind: 'problem',
    title: '問題：快取雪崩',
    captions: [
      { at: 0, text: '早上十點，系統一口氣把所有商品寫進快取，每一筆都設定「3 秒後過期」。' },
      { at: 1500, text: '注意快取格子下方的倒數條：它們全部同步在縮短。' },
      { at: 3000, text: '同一秒，全部過期。所有請求同時找不到答案，一起湧向資料庫。' },
      { at: 5000, text: '資料庫一秒只能處理 10 筆查詢，排隊的人越來越多，最後撐不住倒下。' },
      { at: 8000, text: '資料庫倒下後，連原本可以把答案放回快取的機會都沒了，整個網站一起掛掉。' },
    ],
    cfg: { ...base, initial: 'stagger', events: [{ at: 1, type: 'syncWrite' }] },
  },
  {
    id: 'jitter',
    kind: 'solution',
    title: '解法：過期時間加一點隨機',
    captions: [
      { at: 0, text: '一樣一口氣寫入所有商品，但這次每一筆的過期時間是「3 秒，再加上 0 到 6 秒的隨機時間」。' },
      { at: 2000, text: '看倒數條：長短不一，不會在同一秒歸零。' },
      { at: 4000, text: '快取一個一個陸續過期，每次只有少數請求去資料庫，資料庫來得及處理。' },
      { at: 8000, text: '同樣的流量、同樣的資料庫，只是把過期時間錯開，雪崩就不會發生。工程師稱這招為加 jitter。' },
    ],
    cfg: { ...base, jitter: true, initial: 'stagger', events: [{ at: 1, type: 'syncWrite' }] },
  },
  {
    id: 'breakdown',
    kind: 'problem',
    title: '問題：快取擊穿',
    captions: [
      { at: 0, text: '這次只有一個商品出事：第一格是正在限時特賣的熱門商品，八成的請求都在找它。' },
      { at: 1500, text: '而且它的資料很難算（要合併庫存、價格、評論），資料庫查一次要花平常的好幾倍時間。' },
      { at: 3000, text: '熱門商品的快取過期了。第一個人去資料庫拿，答案還沒回來前，後面的人也全部跟著去。' },
      { at: 5500, text: '只是一個 key 過期，就足以把資料庫打垮。這就是擊穿：熱點 key 被大量請求同時打穿。' },
    ],
    cfg: { ...base, rate: 32, dist: 'hot', hotShare: 0.8, hotCost: 3, initial: 'hotSoon', events: [] },
  },
  {
    id: 'lock',
    kind: 'solution',
    title: '解法：只派一個人去拿',
    captions: [
      { at: 0, text: '同樣的熱門商品、同樣的流量。這次規定：同一個商品，一次只能有一個人去資料庫拿。' },
      { at: 3000, text: '過期了。第一個人去資料庫，其他人在快取旁邊排隊等（灰點）。' },
      { at: 5000, text: '答案一回來就放進快取，等待的人直接拿走。資料庫只多處理了一筆查詢。' },
      { at: 8000, text: '工程師會說這是加鎖（mutex）或 single flight。代價是少數人要多等一下。' },
    ],
    cfg: { ...base, rate: 32, dist: 'hot', hotShare: 0.8, hotCost: 3, lock: true, initial: 'hotSoon', events: [] },
  },
  {
    id: 'penetration',
    kind: 'problem',
    title: '問題：快取穿透',
    captions: [
      { at: 0, text: '有人開始大量查詢根本不存在的商品，例如商品編號 99999。紅框的點就是這種請求。' },
      { at: 2500, text: '快取裡當然沒有，於是每一次都跑去資料庫。資料庫查完說「沒有這個商品」，下一次又來一次。' },
      { at: 5500, text: '因為答案是「不存在」，所以永遠不會被放進快取。這種請求會直接穿過快取，把資料庫打垮。' },
    ],
    cfg: { ...base, rate: 30, dist: 'penetration', fakeShare: 0.55, initial: 'stagger', events: [] },
  },
  {
    id: 'guard',
    kind: 'solution',
    title: '解法：在門口先擋掉',
    captions: [
      { at: 0, text: '這次在快取前面放一份「有哪些商品」的名冊，查不到名字的請求直接擋回去（灰點）。' },
      { at: 3000, text: '不存在的商品根本到不了資料庫，資料庫只處理真正需要的查詢。' },
      { at: 6500, text: '常見做法有兩種：把「查無資料」也短暫記進快取，或用 Bloom filter 快速判斷「一定不存在」。' },
    ],
    cfg: { ...base, rate: 30, dist: 'penetration', fakeShare: 0.55, guard: true, initial: 'stagger', events: [] },
  },
];
