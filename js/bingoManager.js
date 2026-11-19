import { renderBingo } from "./bingo.js";
import { getSavedBingos, createSavedBingo, updateSavedBingo, deleteSavedBingo, deleteAllSavedBingos, MAX_SAVED_BINGOS, normalizeBingoName, renameSavedBingo } from "./bingoStorage.js";

/* 複数ビンゴの一覧・チェック保存・復元 */
export function createBingoManager({ bingoContainer, saveBingoArea, scrollToStep, setSelectedSize }) {
  let activeBingoId = null;
  let activeChecked = [];
  let activeName = "";

  const savedBingoSection = document.createElement("section");
  savedBingoSection.id = "savedBingoSection";
  savedBingoSection.innerHTML = `
    <h3>保存済みのビンゴ</h3>

    <p class="saved-bingo-note">
      生成したカードとチェック状況はこのブラウザに自動保存されます（最大10件）。
    </p>

    <div class="saved-bingo-toolbar">
      <p id="savedBingoCount" class="saved-bingo-count"></p>
      <button id="deleteAllBingosBtn" type="button">
        保存履歴をすべて削除
      </button>
    </div>

    <div id="savedBingoList"></div>
  `;

  bingoContainer.parentNode.insertBefore(savedBingoSection, bingoContainer);

  // 名前欄はビンゴ本体の外に置き、PNG描画には含めない
  const nameBar = document.createElement("div");
  nameBar.id = "bingoNameBar";
  nameBar.hidden = true;
  nameBar.style.cssText = "display:none;margin:16px auto 10px;text-align:center;max-width:700px;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;";

  const nameTitle = document.createElement("h3");
  nameTitle.style.cssText = "margin:0;max-width:100%;min-width:0;overflow-wrap:anywhere;";
  const editNameButton = document.createElement("button");
  editNameButton.type = "button";
  editNameButton.textContent = "名前を編集";
  editNameButton.style.cssText = "padding:8px 12px;cursor:pointer;font-size:14px;";
  nameBar.append(nameTitle, editNameButton);
  bingoContainer.parentNode.insertBefore(nameBar, bingoContainer);

  function showName(name) {
    activeName = normalizeBingoName(name);
    nameTitle.textContent = activeName || "ビンゴカード";
    nameBar.hidden = false;
    nameBar.style.display = "flex";
  }

  function hideName() {
    activeName = "";
    nameBar.hidden = true;
    nameBar.style.display = "none";
  }

  function editName(id, currentName) {
    const input = prompt("ビンゴの名前を入力してください（30文字まで）。\n空欄にすると初期名に戻ります。", normalizeBingoName(currentName));
    if (input === null) return;
    if (Array.from(input.trim()).length > 30) {
      alert("名前は30文字以内で入力してください。");
      return;
    }
    const name = normalizeBingoName(input);
    if (id && !renameSavedBingo(id, name)) return;
    if (id === activeBingoId) showName(name);
    renderSavedBingoList();
  }

  editNameButton.addEventListener("click", () => editName(activeBingoId, activeName));

  function showSavedBingo(card) {
    activeBingoId = card.id;
    showName(card.name);
    activeChecked = [...card.checked];
    setSelectedSize(card.size); // PNG保存時のファイル名に反映
    renderBingo(card.bingoData, card.size, activeChecked, (index, value) => {
      activeChecked[index] = value;
      updateSavedBingo(activeBingoId, activeChecked);
      renderSavedBingoList();
    });
    saveBingoArea.style.display = "block";
    renderSavedBingoList();
    rememberActiveCard();
  }

  function confirmNewBingoGeneration() {
    const cards = getSavedBingos();

    // 10件未満なら確認不要
    if (cards.length < MAX_SAVED_BINGOS) {
      return true;
    }

    // 最も古いカードを取得
    const oldest = [...cards].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    const oldestDate = new Date(oldest.createdAt);

    const dateLabel = Number.isNaN(oldestDate.getTime()) ? "日時不明" : oldestDate.toLocaleString("ja-JP");

    // 削除されるカードを明示して確認
    return confirm(
      `保存済みのビンゴが上限の${MAX_SAVED_BINGOS}件に達しています。\n\n` +
        `新しく生成すると、最も古いカード（${oldest.size}×${oldest.size}・${dateLabel}）が自動削除されます。\n` +
        `削除されたカードとチェック状況は元に戻せません。\n\n` +
        `生成を続けますか？`,
    );
  }

  function saveNewBingoAndShow(bingoData, size) {
    const card = createSavedBingo(bingoData, size);
    if (card) {
      showSavedBingo(card);
    } else {
      // 保存に失敗しても表示とチェックは利用できる
      activeBingoId = null;
      showName("");
      activeChecked = bingoData.map((song) => song.title === "FREE");
      renderBingo(bingoData, size, activeChecked, (index, value) => {
        activeChecked[index] = value;
      });
    }
  }

  /* 保存履歴の一括削除 */

  const deleteAllBingosBtn = document.getElementById("deleteAllBingosBtn");

  deleteAllBingosBtn.addEventListener("click", () => {
    const cards = getSavedBingos();

    if (cards.length === 0) return;

    const confirmed = confirm(`保存済みのビンゴ${cards.length}件をすべて削除します。\n\n` + `チェック状況も含めて削除され、元に戻すことはできません。\n\n` + `本当にすべて削除しますか？`);

    if (!confirmed) return;

    // 保存履歴をすべて削除
    if (!deleteAllSavedBingos()) return;

    // 表示中のビンゴもクリア
    activeBingoId = null;
    activeChecked = [];
    bingoContainer.replaceChildren();
    hideName();

    // 画像保存ボタンを非表示
    saveBingoArea.style.display = "none";

    // 表示中カードのIDも削除
    rememberActiveCard();

    // 保存履歴一覧を更新
    renderSavedBingoList();
  });

  function renderSavedBingoList() {
    const list = document.getElementById("savedBingoList");
    list.replaceChildren();
    const cards = getSavedBingos();
    const count = document.getElementById("savedBingoCount");

    count.textContent = `保存件数：${cards.length} / ${MAX_SAVED_BINGOS}件`;
    count.classList.toggle("is-full", cards.length >= MAX_SAVED_BINGOS);

    deleteAllBingosBtn.disabled = cards.length === 0;

    if (!cards.length) {
      const message = document.createElement("p");
      message.textContent = "保存済みのビンゴはありません。";
      list.appendChild(message);
      return;
    }
    cards.forEach((card, index) => {
      const row = document.createElement("div");
      row.className = "saved-bingo-row";
      if (card.id === activeBingoId) row.classList.add("is-active");
      const completed = card.checked.filter(Boolean).length;
      const date = new Date(card.createdAt);
      const title = document.createElement("span");
      title.className = "saved-bingo-title";
      title.style.overflowWrap = "anywhere";
      title.textContent = `${normalizeBingoName(card.name) || "ビンゴカード"}｜${card.size}×${card.size}｜${Number.isNaN(date.getTime()) ? "日時不明" : date.toLocaleString("ja-JP")}｜${completed}/${card.size ** 2}マス`;
      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.textContent = card.id === activeBingoId ? "表示中" : "開く";
      loadButton.disabled = card.id === activeBingoId;
      loadButton.addEventListener("click", () => {
        showSavedBingo(card);
        scrollToStep(bingoContainer);
      });
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "削除";
      deleteButton.addEventListener("click", () => {
        if (!confirm("このビンゴカードを削除しますか？")) return;
        if (!deleteSavedBingo(card.id)) return;
        if (activeBingoId === card.id) {
          activeBingoId = null;
          activeChecked = [];
          bingoContainer.replaceChildren();
          hideName();
          saveBingoArea.style.display = "none";
          rememberActiveCard();
        }
        renderSavedBingoList();
      });
      const renameButton = document.createElement("button");
      renameButton.type = "button";
      renameButton.textContent = "名前変更";
      renameButton.addEventListener("click", () => {
        const latest = getSavedBingos().find((item) => item.id === card.id);
        if (latest) editName(latest.id, latest.name);
      });
      row.append(title, renameButton, loadButton, deleteButton);
      list.appendChild(row);
    });
  }

  // ページを再読み込みした際は最後に表示したカードを復元
  // active id だけを別途保存（カード本体はbingoStorage.jsが管理）
  const ACTIVE_ID_KEY = "cheerfulBingo.activeId.v1";
  // showSavedBingo内で表示したカードのIDを保持する
  const rememberActiveCard = () => {
    try {
      if (activeBingoId) localStorage.setItem(ACTIVE_ID_KEY, activeBingoId);
      else localStorage.removeItem(ACTIVE_ID_KEY);
    } catch (error) {
      console.warn("表示中カードのIDを保存できませんでした", error);
    }
  };

  function clearActiveBingo() {
    activeBingoId = null;
    activeChecked = [];
    bingoContainer.replaceChildren();
    hideName();
    saveBingoArea.style.display = "none";
    rememberActiveCard();
    renderSavedBingoList();
  }
  function restoreLastBingo() {
    const cards = getSavedBingos();
    let savedActiveId = null;
    try {
      savedActiveId = localStorage.getItem(ACTIVE_ID_KEY);
    } catch (error) {}
    const card = cards.find((item) => item.id === savedActiveId) || cards[0];
    if (card) showSavedBingo(card);
  }
  return { getActiveBingoName: () => activeName, showSavedBingo, confirmNewBingoGeneration, saveNewBingoAndShow, renderSavedBingoList, clearActiveBingo, restoreLastBingo };
}
