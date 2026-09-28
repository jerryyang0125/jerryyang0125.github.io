# Jerry's Tiny Tools

一個收集簡單實用小工具的網站。目前第一個工具是「等效光圈與背景虛化計算器」，可以比較不同感光元件、焦段、光圈、被攝距離與背景距離。

## 本機預覽

第三個工具「[構圖與選鏡工作台](planner.html)」支援個人器材庫、場合選鏡、構圖／自拍、照片框選反推、3D 透視實驗與 Dolly Zoom。資料來源、模型限制與儲存格式見 [工作台說明](docs/planner.md)。

```bash
python3 -m http.server 8000
```

開啟 <http://localhost:8000>。

## 手機感光元件預設

英吋型式是光學格式名稱，不能直接用 25.4mm 換算。計算使用代表性有效成像尺寸，並非特定 iPhone 型號的規格：

- 1/1.28" 型：9.992 × 7.494mm，依 [Sony LYTIA L910](https://www.sony-semicon.com/en/info/2026/2026061701.html) 的 12.49mm 對角線與 4:3 比例推算。
- 1/2.55" 型：5.6448 × 4.2336mm，依 [libcamera 的 IMX363 資料](https://patchwork.libcamera.org/patch/28201/) 的 4032 × 3024 像素與 1.4µm 像素間距推算。

攝影工具另支援實際／全片幅等效焦距切換、A/B 橫向參數表、手機望遠預設與一鍵全片幅換算。光圈輸入一律使用實際 f 值；等效光圈用於比較光學虛化，不模擬人像模式。詳見 [攝影預設資料](docs/camera-presets.md)。

## 第二頁：酒款熱量與花費

開啟 `drinks.html`，或從頁首「酒款計算機」進入。提供份量、糖分、體重與自訂酒款輸入、熱量圓環、花費和比較長條圖，支援手機。

酒款來自[參考試算表](https://docs.google.com/spreadsheets/d/1UPAgXNhhi6cMgHIBii5CfpqOb5altvb4Jef5Sp4wMOI/edit)「正常的飲酒量」A3:P6，2026-09-27 讀取；價格不是即時售價。原表「一罐多重」依其公式解讀為 ml，兩筆 12000 ml 台啤明確標示為整箱。未匯入 BBB 和數字命名的測試欄位。熱量以 0.789 g/ml 換算乙醇密度、7 kcal/g 計算，選填糖分加上 4 kcal/g，並非完整營養標示。

原表「微醉」係數 1.2 僅保留為花費比較模型，不是醫學標準，不預測實際醉意。未採用原表「有益無害」、昏迷或中毒等門檻描述。

資料庫選用 Supabase，完整步驟見 [docs/database.md](docs/database.md)，建表與原表資料見 [supabase/schema.sql](supabase/schema.sql)。預設無需資料庫即可使用；目前尚未設定雲端專案。

計算測試：`node --test tests/drink-math.test.mjs`。
