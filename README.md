# IRON DAD CLUB

Future Dad Premium Pass for Davin.  
一個手機版 Next.js PWA 電子兌換券 App，送給 Davin 的 40 歲生日禮物。

## 功能

- 密碼登入：`ELARA0612`
- 券包首頁、單張券詳情、兌換確認、兌換紀錄
- 使用 `localStorage` 儲存登入狀態、剩餘次數與兌換紀錄
- PWA manifest 與 service worker，可加入手機主畫面
- 內含 192px、512px 與 Apple touch icon
- 無後端，可直接部署到 Vercel

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

## 狀態重置

若要重新測試券次，可在瀏覽器開發者工具清除此網站的 `localStorage`。
