# 構圖與鏡頭規劃工作台

入口：planner.html。純靜態 ES modules，可在 GitHub Pages 或本機 HTTP 伺服器使用，不需建置。

## 器材與儲存

初始清單依使用者提供的 3 支手機、4 部相機與 8 支鏡頭建立，並已開啟 EF–EOS R 轉接環。接環及鏡頭停用會影響選鏡清單。Sony A7 IV 按 Sony E 鏡頭處理，Canon R6 為第一代；不將 RF 鏡頭列入 EOS 60D。

器材庫使用 localStorage 的 jy-camera-library-v1。格式為 {version:1,bodies:[],lenses:[]}。機身包含 ID、名稱、接環、有效感光寬高與 enabled；鏡頭包含實際焦距端點、最大光圈端點、最近對焦距離（可為 null）、接環與 enabled。手機鏡頭另存所屬機身、成像尺寸與 digitalCrop。匯入先完整驗證，成功且確認後才取代現有清單；匯出可跨裝置搬移。儲存失敗時保留記憶體狀態並提示匯出。

照片以瀏覽器 createImageBitmap 解碼並依 EXIF 方向顯示；JPEG、PNG、WebP、上限 30MB。框選以正規化座標儲存，觸控和滑鼠共用 pointer events。照片不存入 localStorage、不上傳，也不放進分享網址；清除時釋放 bitmap。

現有 Supabase 是公開唯讀的酒款目錄，已確認現有公開設定可讀取端點。它沒有個人登入及器材存取隔離，因此本工具不借用 drinks 表保存個人器材，也不新增遠端資料表或修改 RLS。若未來要跨裝置雲端同步，應另加驗證與 auth.uid() 隔離的器材表。

## 幾何與曝光

- 構圖使用理想直線投影（針孔模型），物理尺寸用公尺、感光元件與焦距用 mm。物體平面可視高度 = 距離 × 有效感光高度 / 實際焦距。
- 寬度與高度都必須滿足目標佔比；群體按肩寬、間隔、每排人數估算水平範圍。3D 後排間隔為 0.6m；構圖計算保守使用最近一排及最大列數，不推測遮擋、動作或真人姿勢。
- 橫豎、比例與裁切依序套用。EF-S 在 R6 上的中央視窗和影片中央視窗取較小者（裁切倍率取最大），不乘兩次；使用者額外裁切與手機數位裁切才另行相乘。
- A7 IV 的 4K 50/60p 使用約 1.5× Super 35；其餘機身的全寬／自訂影片模式由使用者確認與輸入，不宣稱所有 4K 都是全寬。影片固定輸出 16:9，直拍旋轉為 9:16。
- 實際／等效輸入使用有效畫幅對角線換算，含所選長寬比例；不同畫幅長寬比的對角線等效不保證同水平視角。模式切換保留實際焦距。
- ISO = 100 × f值² × 快門分母 / 2^EV100。沒有鏡頭透光率、手機多幀處理或相機畫質評分。變光圈鏡頭中間焦段保持端點區間，不線性假造最大光圈曲線。
- 一般構圖半身基準為頭頂至腰，預設 0.85m，全身 1.70m。頭部是幾何示意，含鼻、耳前後深度，非特定人臉。
- 固定機位時前後物件比例 d/(d+背景間距) 與焦距無關。等大構圖時增加焦距會需要增加距離，背景相對主體才放大。
- Dolly Zoom 使用 d(t)/f(t) = d0/f0，距離線性變化；主體基準平面大小固定，立體鼻子等突出部分仍有透視變化。圖中依活動範圍和已知最近對焦距離標出不可行部分；未知最近對焦不保證可以合焦。播放需使用者按鈕啟動，分頁切換／背景頁自動暫停。
- 照片反推使用框選高度佔比，實際高度及已知距離上下限給出結果區間。讀取的照片比例先裁切有效畫幅，再套用指定後製裁切倍率；裁切未知則只顯示未額外裁切基準，不能唯一恢復原鏡頭參數。人物傾斜、相機俯仰和非中央裁切未校正。
- 背景佔比是人物包圍框外的畫面面積估算，不是影像分割。模擬未加入散景、鏡頭畸變、美顏或防震校正；舊虛化工具仍使用自己的薄透鏡模型。

## 規格與來源

手機公開官方頁面通常未列出精確感光尺寸。預設感光尺寸與由等效焦距反推的實際焦距均屬估算，不能當作 EXIF 實測。前鏡頭等效約 23mm（iPhone）及 26mm（Samsung）也以近似值呈現。手機的自動切換鏡頭、數位防震和成像模式可能改變視角。

- [Apple iPhone 15 Pro](https://support.apple.com/en-au/111829)：13mm f/2.2、24mm f/1.78、77mm f/2.8；28/35/48mm 屬主鏡頭裁切。前鏡頭 f/1.9。
- [Apple iPhone 15 Pro Max](https://support.apple.com/en-ie/111828)：望遠為 120mm f/2.8，其他模式按同代配置。手機小感光元件尺寸基礎見 [camera-presets.md](camera-presets.md)。
- [Samsung S23 系列官方介紹](https://news.samsung.com/global/take-your-passions-further-with-the-new-samsung-galaxy-s23-series-designed-for-a-premium-experience-today-and-beyond)：S23 Ultra 四顆後鏡頭；10× f/4.9、3× f/2.4，並列官方視角。主鏡頭有效尺寸估算 9.792×7.344mm，前鏡頭估算 3.84×2.88mm。2× 是規劃用主鏡頭裁切示例，非獨立鏡頭。
- [Sony A7 IV 規格](https://www.sony.com/electronics/support/e-mount-body-ilce-7-series/ilce-7m4/specifications)：35.9×23.9mm，4K 50/60p 強制 Super 35。
- [Canon R6 裁切說明](https://cam.start.canon/en/C004/manual/html/UG-03_Shooting-1_0040.html)：EF-S 使用 1.6× 中央裁切。
- [Nikon Z fc](https://www.nikonusa.com/p/z-fc/1671/overview)：23.5×15.7mm。
- [Tamron 35–150 A058](https://www.tamron.com/jp/consumer/lenses/a058/spec.html)：最近對焦廣角 0.33m、望遠 0.85m。未知中間曲線時保守採 0.85m，介面註明；其他未核實的鏡頭最近對焦保持未知，可在器材庫修改。
- [Edmund Optics：焦距與視場](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/understanding-focal-length-and-field-of-view/)：視場與工作距離的幾何關係及模型限制。

所有場合預設只是可編輯的拍攝示例；小巨蛋 60m、live house 8m 等不是座位量測，也不包含場館攝影器材規定。

## 開發與驗證

共用資料：camera-data.mjs；個人器材：planner-data.mjs；純計算：planner-math.mjs；畫面模型：planner-view.mjs；互動：planner.mjs。

Three.js 固定為 0.180.0，由官方 npm 發行的 three.module.js 和 three.core.js 本機載入，MIT 授權存放於 vendor/three/LICENSE。無需外部模型或 CDN。WebGL 建立失敗時改用 Canvas 2D 投影。

執行 node --test tests/*.test.mjs 驗證構圖、裁切、曝光、照片反推、透視、Dolly Zoom、器材輸入驗證與既有酒款模型。本機預覽：python3 -m http.server 8000。
