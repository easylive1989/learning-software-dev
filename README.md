# 認識軟體工程

用生活比喻和動畫學習軟體工程，帶非工程師（以及想跨出自己領域的工程師）看懂軟體開發的核心概念：會出什麼問題，工程師又怎麼解決。

網站：https://paul-learning.dev/learning-software-dev/

## 開發

需要 Node.js 22.12 以上。

```bash
npm install
npm run dev      # http://localhost:4321/learning-software-dev/
npm run build    # 輸出到 dist/
```

## 結構

- `src/data/chapters.ts`：路線與章節清單（`ready: true` 的章節才有內容）
- `src/pages/chapters/*.mdx`：已完成的章節內容
- `src/pages/chapters/[slug].astro`：施工中章節的佔位頁
- `src/components/`：互動元件
  - `RequestJourney.tsx`：一次請求在瀏覽器、伺服器、資料庫之間的來回
  - `CacheStory.tsx` + `cache-sim.ts` + `cache-scenes.ts`：快取雪崩、擊穿、穿透的動畫模擬

推到 `main` 會由 GitHub Actions 自動部署到 GitHub Pages。
