# Supabase 資料庫串接

網站目前是原生 HTML / CSS / JavaScript，可直接部署到靜態網站。未設定資料庫時讀取 `data/drinks.json`；設定後改讀 Supabase 的公開酒款目錄。連線逾時、資料格式不符或空表時回退至本地快照並顯示狀態。

## 1. 建立專案與資料表

在 https://supabase.com/dashboard 建立專案，開啟 SQL Editor，貼上並執行 `supabase/schema.sql` 全文。它會建立 drinks 表、開啟 Row Level Security、允許公開唯讀並匯入 15 筆原表酒款。重跑不會覆寫已修改的酒款。這份 SQL 僅用於本專案的 drinks 表。

## 2. 填入公開連線設定

從專案 Connect 或 Settings / API Keys 取得 Project URL 和 Publishable key，更新根目錄 `config.js`：

```js
window.DRINKS_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabasePublishableKey: 'sb_publishable_...'
};
```

此檔會公開給瀏覽器，只放 publishable key（或舊版 anon key）。不可放 secret / service_role key；這些金鑰會繞過 RLS。使用 REST API，不需要安裝 SDK、建置流程或設定伺服器環境變數。確認專案 Data API 已啟用並公開 public schema。

## 3. 本機確認

在專案資料夾執行 `python3 -m http.server 8000`，開啟 http://localhost:8000/drinks.html 。頁面應顯示「Supabase 已連線」。在 Supabase Table Editor 修改一筆價格，重新整理頁面確認價格同步。設錯公開 key 時，頁面應顯示連線失敗並使用原表快照；清空兩個設定即可返回純靜態模式。

## 4. 管理資料與部署

透過 Supabase Table Editor 新增或修改酒款，前台重新整理後讀取新資料。所有容量以 ml、價格以新台幣、濃度以百分比儲存（9.9 代表 9.9%，不是 0.099），糖量未知請填 NULL。`sort_order` 控制排列。原表整箱台啤以整箱為一份，其他多公升酒款也以原包裝容量為一份。

將網站檔案和 config.js 一起部署至原本的靜態網站空間即可。Supabase SQL 不會自動在部署時執行，必須先完成步驟 1。若未提供 Project URL / 公開 key，不能驗證真實雲端連線。

## 權限驗證

SQL 僅授予 anon / authenticated SELECT；不授予 INSERT、UPDATE、DELETE，也不建立寫入 policy。可在 SQL Editor 用以下唯讀查詢確認：

```sql
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'drinks'
  and grantee in ('anon', 'authenticated');
select policyname, roles, cmd from pg_policies
where schemaname = 'public' and tablename = 'drinks';
select relrowsecurity from pg_class where oid = 'public.drinks'::regclass;
```

預期僅 SELECT 權限、Public catalogue read 的 SELECT policy、relrowsecurity = true。體重、份數與自訂數值留在瀏覽器，不儲存。若日後需要使用者儲存個人紀錄，應另建以 auth.uid() 限制存取的資料表和登入流程。

官方文件：[API keys](https://supabase.com/docs/guides/getting-started/api-keys)、[Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)。
