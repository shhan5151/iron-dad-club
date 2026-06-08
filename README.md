# IRON DAD CLUB

Future Dad Premium Pass for Davin.  
一個手機版 Next.js PWA 電子兌換券 App，送給 Davin 的 40 歲生日禮物。

## 功能

- 密碼登入：`ELARA0612`
- 券包首頁、單張券詳情、兌換確認、兌換紀錄
- 隱藏管理頁 `/manage` 可自行調整券文字、規則、備註、期限與剩餘次數
- 可選擇接 Supabase 雲端同步，讓 Hannah 和 Davin 的手機看到同一份券包、申請與批准紀錄
- 未設定 Supabase 時，會自動退回 `localStorage` 本機模式
- PWA manifest 與 service worker，可加入手機主畫面
- 內含 192px、512px 與 Apple touch icon
- 可直接部署到 Vercel

## 本機執行

```bash
npm install
npm run dev
```

開啟：

```text
http://localhost:3000
```

在 Windows PowerShell 若 `npm` 被執行政策擋住，可改用：

```bash
npm.cmd install
npm.cmd run dev
```

## 產生正式版

```bash
npm run build
npm run start
```

正式版才會註冊 service worker。若要測試 PWA 安裝，請先執行 build/start，或部署到 HTTPS 網址後用手機瀏覽。

## 部署到 Vercel

1. 將專案推到 GitHub。
2. 到 Vercel 新增專案，選擇此 repo。
3. Framework Preset 選 `Next.js`。
4. Build Command 使用 `npm run build`。
5. Output Directory 保持預設。
6. 部署完成後，用手機打開 Vercel 網址，即可加入主畫面。

## 開啟跨裝置同步

若要讓 Hannah 在 `/manage` 改的內容同步到 Davin 手機，需要設定 Supabase。

1. 到 Supabase 建立一個新 project。
2. 打開 Supabase 的 SQL Editor。
3. 貼上 `supabase.sql` 的內容並執行。
4. 到 Supabase `Project Settings` -> `API`，複製：
   - Project URL
   - anon public key
5. 到 Vercel 專案 `Settings` -> `Environment Variables`，新增：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. 重新部署 Vercel。

設定完成後，第一次開啟 App 時，會把目前瀏覽器裡的券包資料上傳成雲端初始資料。之後 Davin 送出的申請、Hannah 的批准或婉拒、券數、排序和文案，都會共用同一份資料。

## 狀態重置

若要重新測試券次，可在瀏覽器開發者工具清除此網站的 `localStorage`。

## 調整券內容

打開 `/manage`，輸入管理密碼 `HANNAH0612`，即可修改每張券的文字與剩餘次數。修改後按「儲存修改」，資料會保存在目前瀏覽器的 `localStorage`。

若已設定 Supabase，按「儲存變更」後資料會同步到雲端；Davin 重新整理 App 後會看到更新。
