import { filterSongs } from "./filter.js";
import { createBingo } from "./bingo.js";
import { createBingoManager } from "./bingoManager.js";
import { exportBingoImage } from "./bingoExport.js";

let selectedSize = null;
let selectedCenterOption = null;
let centerSelectedSong = null;
let allSongs = [];
let requiredCount = 0;
let selectedSongs = [];
let selectedSongMode = null;

// HTML要素
const sizeButtons = document.querySelectorAll("#bingoSizeSelector button");
const requiredCountText = document.getElementById("requiredCountText");
const songList = document.getElementById("songListBody");
const selectAllSongs = document.getElementById("selectAllSongs");
const deselectAllSongs = document.getElementById("deselectAllSongs");
const selectedList = document.getElementById("selectedSongs");
const searchInput = document.getElementById("searchInput");
const unitSelect = document.getElementById("unitSelect");
const mvTypeSelect = document.getElementById("mvTypeSelect");
const songTypeSelect = document.getElementById("songTypeSelect");

const songModeStep = document.getElementById("songModeStep");
const songModeButtons = document.querySelectorAll("#songModeSelector button");
const randomGenerateStep = document.getElementById("randomGenerateStep");
const randomGenerateBtn = document.getElementById("randomGenerateBtn");
const bingoContainer = document.getElementById("bingoContainer");

const step2 = document.getElementById("step2");
const centerOptionSelector = document.getElementById("centerOptionSelector");
const centerOptionButtons = document.querySelectorAll("#centerOptionSelector button");
const centerSongSelector = document.getElementById("centerSongSelector");
const songSelectStep = document.getElementById("songSelectStep");
const songListContainer = document.getElementById("songListContainer");

const centerSearchInput = document.getElementById("centerSearchInput");
const centerUnitSelect = document.getElementById("centerUnitSelect");
const centerMvTypeSelect = document.getElementById("centerMvTypeSelect");
const centerSongTypeSelect = document.getElementById("centerSongTypeSelect");
const centerSongListBody = document.getElementById("centerSongListBody");

const saveBingoArea = document.getElementById("saveBingoArea");
const saveBingoBtn = document.getElementById("saveBingoBtn");

// 指定した要素までスムーズにスクロール
function scrollToStep(element) {
  requestAnimationFrame(() => {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}

// JSONから曲データを読み込む
async function loadSongs() {
  const response = await fetch("music_auto.json");
  allSongs = await response.json();

  renderSongList();
  populateUnitSelect();
  populateMvTypeSelect();
  populateSongTypeSelect();
  renderSavedBingoList();
  restoreLastBingo();

  // 曲データ読み込み後、全ランダム生成ボタンの状態を更新
  if (selectedSongMode === "random" && selectedSize) {
    const uniqueCount = new Set(allSongs.map((song) => song.id)).size;
    randomGenerateBtn.disabled = uniqueCount < selectedSize * selectedSize;
  }
}

/* 
＝＝＝＝＝＝＝＝カードの大きさを選択する部分の処理＝＝＝＝＝＝＝＝＝
*/

sizeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // ボタン表示更新
    sizeButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    // サイズ決定
    selectedSize = Number(btn.dataset.size);

    // 選択状態をリセット
    selectedSongMode = null;
    selectedCenterOption = null;
    centerSelectedSong = null;
    selectedSongs = [];

    songModeButtons.forEach((b) => b.classList.remove("selected"));
    centerOptionButtons.forEach((b) => b.classList.remove("selected"));

    // 後続の画面を非表示
    step2.style.display = "none";
    centerSongSelector.style.display = "none";
    songSelectStep.style.display = "none";
    randomGenerateStep.style.display = "none";

    // 曲の選び方を表示
    songModeStep.style.display = "block";

    // ビンゴ表示をクリア
    clearActiveBingo();

    renderSelectedSongs();
    updateSelectedCount();
    renderSongList();
    updateGenerateButton();

    // 曲の選び方へスクロール
    scrollToStep(songModeStep);
  });
});

/*
＝＝＝＝＝＝＝＝曲の選び方を選択する処理＝＝＝＝＝＝＝＝＝
*/

songModeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedSongMode = btn.dataset.mode;

    // ボタンの選択状態を更新
    songModeButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    // 以前の選択をリセット
    selectedCenterOption = null;
    centerSelectedSong = null;
    selectedSongs = [];

    centerOptionButtons.forEach((b) => b.classList.remove("selected"));

    // 画面をいったん非表示
    step2.style.display = "none";
    centerSongSelector.style.display = "none";
    songSelectStep.style.display = "none";
    randomGenerateStep.style.display = "none";

    // 以前のビンゴをクリア
    clearActiveBingo();

    if (selectedSongMode === "manual") {
      // 自分で選ぶ場合
      centerOptionSelector.style.pointerEvents = "auto";
      centerOptionSelector.style.opacity = "1";

      step2.style.display = "block";
      scrollToStep(step2);
    } else if (selectedSongMode === "random") {
      // 全ランダムの場合
      randomGenerateStep.style.display = "block";
      randomGenerateBtn.disabled = new Set(allSongs.map((song) => song.id)).size < selectedSize * selectedSize;

      scrollToStep(randomGenerateStep);
    }

    renderSelectedSongs();
    updateSelectedCount();
    renderSongList();
    updateGenerateButton();
  });
});

/* 
＝＝＝＝＝＝＝＝中央のマスを選択する部分の処理＝＝＝＝＝＝＝＝＝
*/

centerOptionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // ボタンの選択状態を更新
    centerOptionButtons.forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");

    // 選択オプションを保存
    selectedCenterOption = btn.dataset.option;

    // 以前の中央曲があれば選択リストから削除
    if (centerSelectedSong) {
      selectedSongs = selectedSongs.filter((song) => song.id !== centerSelectedSong.id);
    }

    centerSelectedSong = null;

    // STEP 3・STEP 4をいったん非表示
    centerSongSelector.style.display = "none";
    songSelectStep.style.display = "none";

    if (selectedCenterOption === "任意の曲") {
      // 中央の曲選択欄を表示
      centerSongSelector.style.display = "block";

      // 中央曲用のプルダウン構築
      populateCenterUnitSelect();
      populateCenterMvTypeSelect();
      populateCenterSongTypeSelect();

      // 曲一覧表示
      renderCenterSongList();

      // 通常曲リストはまだ操作できない
      updateSongListState();

      // STEP 3へスクロール
      scrollToStep(centerSongSelector);
    } else {
      // FREE・ランダムの場合はSTEP 4へ進む
      songListContainer.style.pointerEvents = "auto";
      songListContainer.style.opacity = 1;

      songSelectStep.style.display = "block";

      // 曲一覧を再描画
      renderSongList();

      // STEP 4へスクロール
      scrollToStep(songSelectStep);
    }

    // 選択曲リストを更新
    renderSelectedSongs();
    updateSelectedCount();
    updateGenerateButton();
  });
});

function updateSongListState() {
  const songListContainer = document.getElementById("songListContainer");

  // 中央マスで「任意の曲」を選択 && 中央曲未選択 の場合は無効化
  if (selectedCenterOption === "任意の曲" && !centerSelectedSong) {
    songListContainer.style.pointerEvents = "none";
    songListContainer.style.opacity = 0.5;
  } else {
    songListContainer.style.pointerEvents = "auto";
    songListContainer.style.opacity = 1;
  }
}

// ーーーーーーーー中央曲リストを表示ーーーーーーーーー

// ユニットのプルダウンを作る
function populateCenterUnitSelect() {
  const centerUnitOrder = ["VIRTUAL SINGER", "Leo/need", "MORE MORE JUMP!", "Vivid BAD SQUAD", "ワンダーランズ×ショウタイム", "25時、ナイトコードで。", "その他"];
  const centerUnits = [...new Set(allSongs.map((song) => song.unit))].sort((a, b) => centerUnitOrder.indexOf(a) - centerUnitOrder.indexOf(b));

  centerUnitSelect.length = 1;

  centerUnits.forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    centerUnitSelect.appendChild(option);
  });
}

// MVのプルダウンを作る
function populateCenterMvTypeSelect() {
  // mvTypes は配列なので flat() してから Set
  const centerMvOrder = ["3DMV", "2DMV", "原曲MV"];
  const centerMvTypes = [...new Set(allSongs.flatMap((s) => s.mvTypes || []))].sort((a, b) => centerMvOrder.indexOf(a) - centerMvOrder.indexOf(b));

  centerMvTypeSelect.length = 1;

  centerMvTypes.forEach((mv) => {
    const option = document.createElement("option");
    option.value = mv;
    option.textContent = mv;
    centerMvTypeSelect.appendChild(option);
  });
}

// 曲種別のプルダウンを作る
function populateCenterSongTypeSelect() {
  const centerTypeOrder = ["既存曲", "書き下ろし曲", "公募曲"];
  const centerSongTypes = [...new Set(allSongs.map((song) => song.songType))].sort((a, b) => centerTypeOrder.indexOf(a) - centerTypeOrder.indexOf(b));

  centerSongTypeSelect.length = 1;

  centerSongTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    centerSongTypeSelect.appendChild(option);
  });
}

export function renderCenterSongList() {
  const searchText = centerSearchInput.value;
  const selectedUnit = centerUnitSelect.value;
  const selectedMvType = centerMvTypeSelect.value;
  const selectedSongType = centerSongTypeSelect.value;
  const filteredSongs = filterSongs(allSongs, searchText, selectedUnit, selectedMvType, selectedSongType);

  const tbody = document.getElementById("centerSongListBody");
  tbody.innerHTML = "";

  filteredSongs.forEach((song) => {
    const tr = document.createElement("tr");

    // 曲名セル
    const titleTd = document.createElement("td");
    titleTd.textContent = song.title;

    // ユニットセル
    const unitTd = document.createElement("td");
    unitTd.textContent = song.unit;

    // チェックボックスセル（1つだけ選択可）
    const checkboxTd = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    // すでに選ばれている曲ならチェック済み
    checkbox.checked = centerSelectedSong && centerSelectedSong.id === song.id;

    // チェック状態に応じて行の色
    if (checkbox.checked) tr.classList.add("selected-row");

    checkbox.addEventListener("change", () => {
      // 1つしか選べないので、他のチェックは全て外す
      if (checkbox.checked) {
        const previousCenter = centerSelectedSong; // 以前の中央曲を保存
        centerSelectedSong = song; // 現在の曲を中央曲に設定
        clearOtherCenterSelections(song.id);
        // 以前の中央曲が選択リストにあれば削除
        if (previousCenter) {
          selectedSongs = selectedSongs.filter((s) => s.id !== previousCenter.id);
        }
        // 現在の曲を選択リストに追加（重複防止）
        if (!selectedSongs.some((s) => s.id === song.id)) {
          selectedSongs.push(song);
        }
        tr.classList.add("selected-row");
        updateSelectedCount();
        renderSelectedSongs();
      } else {
        // チェックを外した場合
        centerSelectedSong = null;
        tr.classList.remove("selected-row");
        // 選択リストから削除
        selectedSongs = selectedSongs.filter((s) => s.id !== song.id);
        updateSelectedCount();
        renderSelectedSongs();
      }

      // 中央曲が選択されているか確認
      if (centerSelectedSong) {
        // STEP 4を表示
        songSelectStep.style.display = "block";

        // STEP 4へスクロール
        scrollToStep(songSelectStep);
      } else {
        // 中央曲の選択が解除されたらSTEP 4を非表示
        songSelectStep.style.display = "none";

        // STEP 3へ戻る
        scrollToStep(centerSongSelector);
      }

      updateSongListState();
      updateCenterSongRowHighlights();
      renderSongList();
      updateGenerateButton();
    });

    checkboxTd.appendChild(checkbox);

    tr.appendChild(checkboxTd);
    tr.appendChild(titleTd);
    tr.appendChild(unitTd);

    // 行クリックでチェック切り替え（通常リストと同じ）
    tr.addEventListener("click", (e) => {
      if (e.target.tagName !== "INPUT") {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change"));
      }
    });

    centerSongListBody.appendChild(tr);
  });
}

// 他の中央曲チェックを外す
function clearOtherCenterSelections(id) {
  const rows = centerSongListBody.querySelectorAll("tr");
  rows.forEach((tr) => {
    const checkbox = tr.querySelector("input[type='checkbox']");
    const title = tr.children[1].textContent;
    const unit = tr.children[2].textContent;

    const song = allSongs.find((s) => s.title === title && s.unit === unit);

    if (song && song.id !== id) {
      checkbox.checked = false;
      tr.classList.remove("selected-row");
    }
  });
}

// 選択行の背景色更新
function updateCenterSongRowHighlights() {
  const rows = document.querySelectorAll("#centerSongListBody tr");
  rows.forEach((row) => {
    const checkbox = row.querySelector("input[type='checkbox']");
    if (checkbox.checked) row.classList.add("selected-row");
    else row.classList.remove("selected-row");
  });
}

centerSearchInput.addEventListener("input", renderCenterSongList);
centerUnitSelect.addEventListener("change", renderCenterSongList);
centerMvTypeSelect.addEventListener("change", renderCenterSongList);
centerSongTypeSelect.addEventListener("change", renderCenterSongList);

/* 
＝＝＝＝＝＝＝＝曲を選択する部分の処理＝＝＝＝＝＝＝＝＝
*/

// ユニットのプルダウンを作る
function populateUnitSelect() {
  const unitOrder = ["VIRTUAL SINGER", "Leo/need", "MORE MORE JUMP!", "Vivid BAD SQUAD", "ワンダーランズ×ショウタイム", "25時、ナイトコードで。", "その他"];
  const units = [...new Set(allSongs.map((song) => song.unit))].sort((a, b) => unitOrder.indexOf(a) - unitOrder.indexOf(b));

  units.forEach((unit) => {
    const option = document.createElement("option");
    option.value = unit;
    option.textContent = unit;
    unitSelect.appendChild(option);
  });
}

// MVのプルダウンを作る
function populateMvTypeSelect() {
  // mvTypes は配列なので flat() してから Set
  const mvOrder = ["3DMV", "2DMV", "原曲MV"];
  const mvTypes = [...new Set(allSongs.flatMap((s) => s.mvTypes || []))].sort((a, b) => mvOrder.indexOf(a) - mvOrder.indexOf(b));

  mvTypes.forEach((mv) => {
    const option = document.createElement("option");
    option.value = mv;
    option.textContent = mv;
    mvTypeSelect.appendChild(option);
  });
}

// 曲種別のプルダウンを作る
function populateSongTypeSelect() {
  const typeOrder = ["既存曲", "書き下ろし曲", "公募曲"];
  const songTypes = [...new Set(allSongs.map((song) => song.songType))].sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));

  songTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    songTypeSelect.appendChild(option);
  });
}

// ーーーーーーーー曲リストを表示ーーーーーーーーー
function renderSongList() {
  const searchText = searchInput.value;
  const selectedUnit = unitSelect.value;
  const selectedMvType = mvTypeSelect.value;
  const selectedSongType = songTypeSelect.value;
  let filteredSongs = filterSongs(allSongs, searchText, selectedUnit, selectedMvType, selectedSongType);

  if (centerSelectedSong) {
    filteredSongs = filteredSongs.filter((song) => song.id !== centerSelectedSong.id);
  }

  songList.innerHTML = "";

  filteredSongs.forEach((song) => {
    const tr = document.createElement("tr");

    // 曲名セル
    const titleTd = document.createElement("td");
    titleTd.textContent = song.title;

    // ユニットセル
    const unitTd = document.createElement("td");
    unitTd.textContent = song.unit;

    // チェックボックスセル
    const checkboxTd = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    // すでに選択済みか
    checkbox.checked = selectedSongs.some((s) => s.id === song.id);

    // 初期描画時に行の背景色を反映
    if (checkbox.checked) tr.classList.add("selected-row");

    // selectedSize が決まっていなければ操作できない
    checkbox.disabled = selectedSize === null;

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        addSong(song);
        tr.classList.add("selected-row");
      } else {
        removeSong(song.id);
        tr.classList.remove("selected-row");
      }

      updateSelectedCount();
      updateBulkSelectCheckboxes();

      // 個別に操作した場合、全解除のチェックを外す
      deselectAllSongs.checked = false;
    });

    checkboxTd.appendChild(checkbox);
    tr.appendChild(checkboxTd);
    tr.appendChild(titleTd);
    tr.appendChild(unitTd);

    tr.addEventListener("click", (e) => {
      // チェックボックス自体のクリックは二重処理防止
      if (e.target.tagName !== "INPUT") {
        if (selectedSize === null) return;
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event("change")); // change イベント発生
      }
    });

    songList.appendChild(tr);
  });

  // 表示中の曲に合わせてチェック状態を更新
  updateBulkSelectCheckboxes();
}

// 現在の検索・フィルター条件に一致する曲を取得
function getVisibleSongs() {
  let songs = filterSongs(allSongs, searchInput.value, unitSelect.value, mvTypeSelect.value, songTypeSelect.value);

  // 中央に指定した曲は通常の選択対象から除外
  if (centerSelectedSong) {
    songs = songs.filter((song) => song.id !== centerSelectedSong.id);
  }

  return songs;
}

// 全選択・全解除のチェック状態を更新
function updateBulkSelectCheckboxes() {
  const visibleSongs = getVisibleSongs();

  const selectedIds = new Set(selectedSongs.map((song) => song.id));

  // 表示中の曲がすべて選択されているか
  const allSelected = visibleSongs.length > 0 && visibleSongs.every((song) => selectedIds.has(song.id));

  // 全選択は楽曲の選択状態と連動
  selectAllSongs.checked = allSelected;

  // 全解除はここでは変更しない
}

// 全選択
selectAllSongs.addEventListener("change", () => {
  if (!selectAllSongs.checked) return;

  if (selectedSongMode !== "manual" || !selectedSize || !selectedCenterOption || (selectedCenterOption === "任意の曲" && !centerSelectedSong)) {
    selectAllSongs.checked = false;
    return;
  }

  const visibleSongs = getVisibleSongs();
  const selectedIds = new Set(selectedSongs.map((song) => song.id));

  visibleSongs.forEach((song) => {
    if (!selectedIds.has(song.id)) {
      selectedSongs.push(song);
      selectedIds.add(song.id);
    }
  });

  renderSelectedSongs();
  updateSelectedCount();
  updateGenerateButton();
  renderSongList();

  updateBulkSelectCheckboxes();
  deselectAllSongs.checked = false;
});

// 全解除
deselectAllSongs.addEventListener("change", () => {
  if (!deselectAllSongs.checked) return;

  if (selectedSongMode !== "manual") {
    deselectAllSongs.checked = false;
    return;
  }

  const visibleIds = new Set(getVisibleSongs().map((song) => song.id));

  selectedSongs = selectedSongs.filter((song) => !visibleIds.has(song.id));

  renderSelectedSongs();
  updateSelectedCount();
  updateGenerateButton();
  renderSongList();

  // 全解除にチェックを付ける
  selectAllSongs.checked = false;
  deselectAllSongs.checked = true;
});

// 選択した曲を削除
function removeSong(id) {
  selectedSongs = selectedSongs.filter((song) => song.id !== id);
  renderSelectedSongs();
  updateSelectedCount();
  updateGenerateButton();
}

// 選択した曲を追加
function addSong(song) {
  if (selectedSongs.find((s) => s.id === song.id)) return; // 重複防止
  selectedSongs.push(song);
  renderSelectedSongs();
  updateSelectedCount();
  updateGenerateButton();
}

// 選択曲リストを表示
function renderSelectedSongs() {
  selectedList.innerHTML = "";
  selectedSongs.forEach((song) => {
    const li = document.createElement("li");
    li.textContent = `${song.title}`;
    selectedList.appendChild(li);
  });
}

// 選択曲数を更新
function updateSelectedCount() {
  const countSpan = document.getElementById("selectedCount");
  countSpan.textContent = selectedSongs.length;
}

// イベント
searchInput.addEventListener("input", renderSongList);
unitSelect.addEventListener("change", renderSongList);
mvTypeSelect.addEventListener("change", renderSongList);
songTypeSelect.addEventListener("change", renderSongList);

// 初期読み込み
window.addEventListener("DOMContentLoaded", loadSongs);

/* 
＝＝＝＝＝＝＝＝ビンゴを生成する部分の処理＝＝＝＝＝＝＝＝＝
*/

// ビンゴ生成ボタン
const generateBtn = document.getElementById("generateBingoBtn");

// ボタン活性化のチェック
function updateGenerateButton() {
  if (!selectedSize) {
    generateBtn.disabled = true;
    return;
  }

  const total = selectedSize * selectedSize;
  let requiredSongs = total;

  // 中央マスがFREEの場合は1曲減らす
  if (selectedCenterOption === "FREE") {
    requiredSongs -= 1;
  }

  generateBtn.disabled = selectedSongs.length < requiredSongs;
}

searchInput.addEventListener("input", () => {
  renderSongList();
  updateGenerateButton();
});

unitSelect.addEventListener("change", () => {
  renderSongList();
  updateGenerateButton();
});

// ★ ビンゴ生成ボタン押下時
generateBtn.addEventListener("click", () => {
  if (!confirmNewBingoGeneration()) return;

  const bingoData = createBingo(selectedSongs, selectedSize, selectedCenterOption, centerSelectedSong);
  saveNewBingoAndShow(bingoData, selectedSize);

  saveBingoArea.style.display = "block";

  scrollToStep(bingoContainer);
});

/*
＝＝＝＝＝＝＝＝全ランダムでビンゴを生成＝＝＝＝＝＝＝＝＝
*/

randomGenerateBtn.addEventListener("click", () => {
  if (selectedSongMode !== "random" || !selectedSize) return;

  const total = selectedSize * selectedSize;

  // IDによる重複を除去
  const uniqueSongs = [...new Map(allSongs.map((song) => [song.id, song])).values()];

  // 曲数が不足している場合
  if (uniqueSongs.length < total) {
    alert("ビンゴの生成に必要な曲数が不足しています。");
    return;
  }

  if (!confirmNewBingoGeneration()) return;

  // 曲をシャッフル
  const shuffledSongs = [...uniqueSongs];

  for (let i = shuffledSongs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffledSongs[i], shuffledSongs[j]] = [shuffledSongs[j], shuffledSongs[i]];
  }

  // 必要な曲数を取得
  const randomSongs = shuffledSongs.slice(0, total);

  // 中央も含めてすべてランダムで生成
  const bingoData = createBingo(randomSongs, selectedSize, "ランダム", null);

  saveNewBingoAndShow(bingoData, selectedSize);

  // 保存ボタンを表示
  saveBingoArea.style.display = "block";

  // 生成したカードへスクロール
  scrollToStep(bingoContainer);
});

/*
＝＝＝＝＝＝＝＝ビンゴ画像保存処理＝＝＝＝＝＝＝＝
*/

/* ========================================
   複数ビンゴの保存・復元・削除
======================================== */
const { confirmNewBingoGeneration, saveNewBingoAndShow, renderSavedBingoList, clearActiveBingo, restoreLastBingo } = createBingoManager({
  bingoContainer,
  saveBingoArea,
  scrollToStep,
  setSelectedSize: (size) => {
    selectedSize = size;
  },
});

saveBingoBtn.addEventListener("click", () => exportBingoImage(selectedSize, saveBingoBtn));

/* music.json 読み込み
document.addEventListener("DOMContentLoaded", async () => {
  allSongs = await fetch("music.json").then((r) => r.json());

  console.log(`曲データ ${allSongs.length} 曲読み込み完了`);

  const musicList = document.getElementById("musiclist");

  allSongs.forEach((element) => {
    const li = document.createElement("li");
    li.textContent = `${element.id} ${element.title} ${element.unit}`;
    musicList.appendChild(li);
  });

  document.getElementById("search").textContent = allSongs.message;
});*/

//music_auto.jsonのデータを更新する
//ジャケ絵か曲名かを選択できるようにする
//データを保持してチェックマークをつけられるようにする
//画像をダウンロードできるようにする
//曲の全選択・全解除
//ユニットでの全選択・全解除
//曲のみの場合はユニット色の枠をつける
//端末によるレスポンシブ（スマホ）
//一定の幅以下はサイトごと縮小
