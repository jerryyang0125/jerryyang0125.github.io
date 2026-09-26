# Jerry's Tiny Tools

一個收集簡單實用小工具的網站。目前第一個工具是「等效光圈與背景虛化計算器」，可以比較不同感光元件、焦段、光圈、被攝距離與背景距離。

## 本機預覽

```bash
python3 -m http.server 8000
```

開啟 <http://localhost:8000>。

## 手機感光元件預設

英吋型式是光學格式名稱，不能直接用 25.4mm 換算。計算使用代表性有效成像尺寸，並非特定 iPhone 型號的規格：

- 1/1.28" 型：9.992 × 7.494mm，依 [Sony LYTIA L910](https://www.sony-semicon.com/en/info/2026/2026061701.html) 的 12.49mm 對角線與 4:3 比例推算。
- 1/2.55" 型：5.6448 × 4.2336mm，依 [libcamera 的 IMX363 資料](https://patchwork.libcamera.org/patch/28201/) 的 4032 × 3024 像素與 1.4µm 像素間距推算。
