import { attachJacketTouchHandlers } from "./bingoCheck.js";

// ランダムシャッフル
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ビンゴデータ生成
// centerOption: "FREE" | "任意の曲" | "ランダム"
// centerSong: 中央曲（任意の曲の場合のみ設定）
export function createBingo(selectedSongs, size, centerOption = "FREE", centerSong = null) {
  const total = size * size;
  const bingoData = [];

  // シャッフルした選択曲（中央曲を除外）
  const songsForBingo = shuffle(selectedSongs.filter((s) => !centerSong || s.id !== centerSong.id));

  let songIndex = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // 中央マス
      if (r === Math.floor(size / 2) && c === Math.floor(size / 2)) {
        if (centerOption === "FREE") {
          bingoData.push({ title: "FREE" });
        } else if (centerOption === "任意の曲" && centerSong) {
          bingoData.push(centerSong);
        } else if (centerOption === "ランダム") {
          bingoData.push(songsForBingo[songIndex]);
          songIndex++;
        }
      } else {
        bingoData.push(songsForBingo[songIndex]);
        songIndex++;
      }
    }
  }

  return bingoData;
}

// ビンゴ表示
export function renderBingo(bingoData, size, checked = [], onCheckChange = () => {}) {
  const container = document.getElementById("bingoContainer");
  container.innerHTML = "";

  // ラッパーを作る（正方形を維持）
  const wrapper = document.createElement("div");
  wrapper.classList.add("bingo-wrapper");

  // テーブルを作る
  const table = document.createElement("table");
  table.classList.add("bingo-table");

  if (size === 3) table.classList.add("bingo-3x3");
  if (size === 5) table.classList.add("bingo-5x5");
  if (size === 7) table.classList.add("bingo-7x7");

  let index = 0;
  for (let r = 0; r < size; r++) {
    const tr = document.createElement("tr");
    for (let c = 0; c < size; c++) {
      const td = document.createElement("td");
      const song = bingoData[index];
      const cellIndex = index;
      const isFree = song.title === "FREE";
      const setChecked = (value) => {
        td.classList.toggle("bingo-checked", value);
        td.setAttribute("aria-pressed", String(value));
      };
      setChecked(isFree || Boolean(checked[cellIndex]));
      td.classList.add("bingo-check-cell");
      if (!isFree) {
        td.setAttribute("role", "button");
        td.setAttribute("tabindex", "0");
        td.setAttribute("aria-label", `${song.title} のチェックを切り替え`);
      }
      const toggleCheck = () => {
        if (isFree) return;
        const next = !td.classList.contains("bingo-checked");
        setChecked(next);
        onCheckChange(cellIndex, next);
      };
      if (!isFree) {
        td.addEventListener("click", toggleCheck);
        td.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCheck();
          }
        });
      }

      // FREE の場合は文字を表示
      if (song.title === "FREE") {
        td.classList.add("free-cell");

        // FREEマスの画像
        const freeImg = document.createElement("img");
        freeImg.src = "./jacket/free/free.png";
        freeImg.alt = "FREE";
        freeImg.classList.add("free-image");

        td.appendChild(freeImg);
      } else {
        // ジャケット画像がある場合は画像表示
        if (song.jacket) {
          // ジャケットと曲名をまとめる要素
          const jacketWrapper = document.createElement("div");
          jacketWrapper.classList.add("jacket-wrapper");

          attachJacketTouchHandlers(jacketWrapper);

          //＝＝＝＝＝＝＝＝＝＝PC用操作＝＝＝＝＝＝＝＝＝＝
          // ジャケット画像
          const img = document.createElement("img");
          img.src = song.jacket;
          img.alt = song.title;
          img.classList.add("bingo-jacket");

          // ホバー時に表示する曲名
          const titleOverlay = document.createElement("div");
          titleOverlay.classList.add("jacket-title");
          titleOverlay.textContent = song.title;

          // 要素を組み立てる
          jacketWrapper.appendChild(img);
          jacketWrapper.appendChild(titleOverlay);
          td.appendChild(jacketWrapper);

          td.classList.remove("text-padding");
        } else {
          // fallback = 曲名
          td.textContent = song.title;
          td.classList.add("text-padding"); // 文字のみなのでパディング
        }
      }

      // チェックマーク（PNG保存にも表示される）
      const checkMark = document.createElement("span");
      checkMark.className = "bingo-check-mark";
      checkMark.textContent = "✓";
      checkMark.setAttribute("aria-hidden", "true");
      td.appendChild(checkMark);

      tr.appendChild(td);
      index++;
    }
    table.appendChild(tr);
  }

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}
