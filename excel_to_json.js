/*
  Excel (Power Query) → music_auto.json

  実行方法：
  npm install xlsx
  node excel_to_json.js prsk_music_list.xlsx

  使用シート：テーブル 6
*/

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// Excelファイルの指定
const inputPath = process.argv[2];

if (!inputPath) {
  console.error('使い方: node excel_to_json.js "prsk_music_list.xlsx"');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Excelファイルが見つかりません: ${inputPath}`);
  process.exit(1);
}

// Excelの列見出し
const HEADERS = {
  id: ["No.", "No", "NO", "番号", "楽曲No.", "楽曲No", "ID", "id"],
  title: ["曲名", "楽曲名", "タイトル", "title", "Title"],
  unit: ["ユニット", "ﾕﾆｯﾄ", "所属ユニット", "unit", "Unit"],
  mv: ["MV", "MVタイプ", "MV種別", "MV種類", "MV形式", "映像", "mvTypes"],
  songType: ["曲種別", "楽曲種別", "種別", "楽曲タイプ", "songType"],
};

// 列名の表記揺れを吸収
function normalizedHeader(s) {
  return String(s ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

// 指定した列の値を取得
function getValue(row, key) {
  const aliases = HEADERS[key].map(normalizedHeader);

  const found = Object.keys(row).find((k) => aliases.includes(normalizedHeader(k)));

  return found === undefined ? "" : row[found];
}

// 列が存在するか確認
function hasColumn(rows, key) {
  return rows.some((row) => Object.keys(row).some((k) => HEADERS[key].map(normalizedHeader).includes(normalizedHeader(k))));
}

/*
＝＝＝＝＝＝＝＝MV属性の変換＝＝＝＝＝＝＝＝

原曲*6     → ["原曲MV"]
2D/3D      → ["3DMV", "2DMV"]
原曲/2D    → ["2DMV", "原曲MV"]
原曲/2D/3D → ["3DMV", "2DMV", "原曲MV"]
-          → []

*/

function parseMvTypes(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return [];
  }

  // 全角英数字を半角化し、脚注を削除
  const source = String(value)
    .normalize("NFKC")
    .replace(/[＊*][\s\d０-９]+/g, "")
    .replace(/(?:\r?\n|、|，|,|・|＆|&|／|\/|\+|\s+)+/g, "/");

  const result = new Set();

  for (const part of source.split("/").filter(Boolean)) {
    const v = part.trim().toUpperCase();

    if (/^(?:原曲|原曲MV|ORIGINAL|ORIGINALMV)$/.test(v)) {
      result.add("原曲MV");
    } else if (/^(?:2D|2DMV)$/.test(v)) {
      result.add("2DMV");
    } else if (/^(?:3D|3DMV)$/.test(v)) {
      result.add("3DMV");
    } else if (v !== "-") {
      console.warn(`未対応のMV属性: ${part} (元の値: ${value})`);
    }
  }

  return ["3DMV", "2DMV", "原曲MV"].filter((type) => result.has(type));
}

/*
＝＝＝＝＝＝＝＝ユニット名の変換＝＝＝＝＝＝＝＝
*/

const UNIT_MAP = {
  "0_VS": "VirtualSinger",
  "1_L/n": "Leo/need",
  "2_MMJ": "MORE MORE JUMP!",
  "3_VBS": "Vivid BAD SQUAD",
  "4_WxS": "ワンダーランズ×ショウタイム",
  "5_25": "25時、ナイトコードで。",
  "9_oth": "その他",
};

function mapUnit(value) {
  const v = String(value ?? "").trim();

  if (v && !UNIT_MAP[v] && !Object.values(UNIT_MAP).includes(v)) {
    console.warn(`未対応のユニット: ${v}`);
  }

  return UNIT_MAP[v] || v;
}

/*
＝＝＝＝＝＝＝＝曲種別の変換＝＝＝＝＝＝＝＝
*/

const SONG_TYPE_MAP = {
  既: "既存曲",
  書: "書き下ろし曲",
  公: "公募曲",
};

function mapSongType(value) {
  const v = String(value ?? "").trim();

  if (v && !SONG_TYPE_MAP[v] && !Object.values(SONG_TYPE_MAP).includes(v)) {
    console.warn(`未対応の曲種別: ${v}`);
  }

  return SONG_TYPE_MAP[v] || v;
}

/*
＝＝＝＝＝＝＝＝ジャケット画像パスの生成＝＝＝＝＝＝＝＝

No.1   → ./jacket/1-50/1.png
No.50  → ./jacket/1-50/50.png
No.51  → ./jacket/51-100/51.png
No.125 → ./jacket/101-150/125.png

*/

function jacketPath(id) {
  const start = Math.floor((id - 1) / 50) * 50 + 1;
  const end = start + 49;

  return `./jacket/${start}-${end}/${id}.png`;
}

/*
＝＝＝＝＝＝＝＝Excelの読み込み＝＝＝＝＝＝＝＝
*/

const workbook = XLSX.readFile(inputPath);

// 使用するシート
const sheetName = process.argv[3] || "テーブル 6";

if (!workbook.Sheets[sheetName]) {
  console.error(`シート「${sheetName}」がありません。候補: ${workbook.SheetNames.join(", ")}`);
  process.exit(1);
}

// Excelを配列に変換
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
  defval: "",
  raw: false,
});

// 必須列の確認
for (const key of ["id", "title"]) {
  if (!hasColumn(rows, key)) {
    console.error(`必須列「${key}」が見つかりません。実際の見出し: ${Object.keys(rows[0] || {}).join(", ")}`);
    process.exit(1);
  }
}

if (!hasColumn(rows, "mv")) {
  console.warn("MV列が見つからないため、mvTypesは空配列になります。");
}

if (!hasColumn(rows, "unit")) {
  console.warn("ユニット列が見つかりません。");
}

if (!hasColumn(rows, "songType")) {
  console.warn("曲種別列が見つかりません。");
}

/*
＝＝＝＝＝＝＝＝楽曲データの生成＝＝＝＝＝＝＝＝
*/

const songs = [];
const usedIds = new Set();

for (const [i, row] of rows.entries()) {
  const rawId = String(getValue(row, "id")).trim();
  const title = String(getValue(row, "title")).trim();

  // 空行を除外
  if (!rawId && !title) continue;

  const id = Number(rawId.replace(/,/g, ""));

  // 不正なデータを除外
  if (!Number.isSafeInteger(id) || id <= 0 || !title) {
    console.warn(`${i + 2}行目をスキップ: No.または曲名が不正 (${rawId}, ${title})`);
    continue;
  }

  // 重複No.を除外
  if (usedIds.has(id)) {
    console.warn(`${i + 2}行目をスキップ: No.${id}が重複`);
    continue;
  }

  usedIds.add(id);

  songs.push({
    id: id,
    title: title,
    unit: mapUnit(getValue(row, "unit")),
    mvTypes: parseMvTypes(getValue(row, "mv")),
    songType: mapSongType(getValue(row, "songType")),
    jacket: jacketPath(id),
  });
}

// 楽曲No.順に並び替え
songs.sort((a, b) => a.id - b.id);

/*
＝＝＝＝＝＝＝＝JSONファイルの出力＝＝＝＝＝＝＝＝
*/

const outputPath = path.join(__dirname, "music_auto.json");

// 1曲のデータを1行で出力
const jsonText = "[\n" + songs.map((song) => "  " + JSON.stringify(song)).join(",\n") + "\n]\n";

fs.writeFileSync(outputPath, jsonText, "utf8");

console.log(`${songs.length}曲を変換しました: ${outputPath}`);
