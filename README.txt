今晚回家吃飯嗎？ V10

V10：標準 Web Push，不使用 Firebase Cloud Messaging / Functions。
- Android + iPhone/iPad Home Screen Web App 都使用 Push API + Service Worker。
- iPhone/iPadOS 16.4+：Safari 加入主畫面 → 從主畫面開啟 → App 內按「開啟背景通知」→ 允許通知。
- 家人可互相建立指定時間通知；推播含「是／否」動作（若 iOS 不顯示動作按鈕，點通知會開啟群組頁）。
- 不需要 Firebase Blaze、不需要信用卡。
- GitHub Actions 每 5 分鐘巡檢 Firestore，將到期通知用標準 Web Push 發送。GitHub 官方排程最短間隔為 5 分鐘，因此可能有 0～5 分鐘排程延遲。

GitHub Secrets（必要）
FIREBASE_PROJECT_ID = eatdinner-bc02d
FIREBASE_SERVICE_ACCOUNT = 原本可正常驗證 Firebase 的完整 Service Account JSON
不需要新增 VAPID_PRIVATE_KEY。V10 會用既有 FIREBASE_SERVICE_ACCOUNT 的私有金鑰做單向雜湊，產生穩定的 VAPID 金鑰；私鑰不會寫入 Firestore 或前端。第一次 GitHub Push 就會自動建立公開 VAPID key。

測試
1. Android Chrome：網站 HTTPS → 開啟背景通知。
2. iPhone/iPad：Safari → 分享 → 加入主畫面 → 從主畫面開啟 → 開啟背景通知。
3. 讓另一個成員建立 5～10 分鐘後的通知。
4. GitHub Actions 的 schedule 每 5 分鐘執行一次；推播應出現在鎖定畫面/通知中心。
