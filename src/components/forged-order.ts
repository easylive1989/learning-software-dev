// 第 3 章「客人改了點菜單」的判斷邏輯。不碰 DOM，方便用 node 直接驗證。

export const PRICE = 60;
export const MAX_QTY = 5;

export type OrderResult = {
  status: 201 | 400;
  /** 這筆訂單有沒有寫進資料庫 */
  stored: boolean;
  /** 寫進資料庫的訂單是否違反規則（數量超過上限或不是正數） */
  broken: boolean;
  total: number;
  response: string;
};

export function isValidQty(qty: number): boolean {
  return Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY;
}

/** 後端收到一張點菜單時會做的事 */
export function handleOrder(qty: number, serverValidates: boolean): OrderResult {
  const valid = isValidQty(qty);
  if (serverValidates && !valid) {
    return {
      status: 400,
      stored: false,
      broken: false,
      total: 0,
      response: `400 Bad Request\n{ "error": "qty 必須是 1 到 ${MAX_QTY}" }`,
    };
  }
  return {
    status: 201,
    stored: true,
    broken: !valid,
    total: qty * PRICE,
    response: '201 Created\n{ "id": 1088, "status": "preparing" }',
  };
}
