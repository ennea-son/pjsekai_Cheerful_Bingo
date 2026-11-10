// ビンゴカードをブラウザに複数保存する
const STORAGE_KEY = "cheerfulBingo.cards.v1";
export const MAX_SAVED_BINGOS = 10;

export function getSavedBingos() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data)
      ? data.filter(
          (card) =>
            card &&
            typeof card.id === "string" &&
            [3, 5, 7].includes(card.size) &&
            Array.isArray(card.bingoData) &&
            card.bingoData.length === card.size ** 2 &&
            card.bingoData.every((song) => song && typeof song.title === "string") &&
            Array.isArray(card.checked) &&
            card.checked.length === card.size ** 2,
        )
      : [];
  } catch (error) {
    console.warn("保存済みビンゴを読み込めませんでした", error);
    return [];
  }
}

function writeCards(cards) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    return true;
  } catch (error) {
    console.error("ビンゴの保存に失敗しました", error);
    alert("ビンゴを保存できませんでした。ブラウザの保存容量やプライベートモードを確認してください。");
    return false;
  }
}

export function createSavedBingo(bingoData, size) {
  const cards = getSavedBingos();
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const checked = bingoData.map((song) => song.title === "FREE");
  const card = { id, size, bingoData, checked, createdAt: new Date().toISOString() };

  // 新しいカードを先頭に置き、古いカードから上限超過分を削除
  const nextCards = [card, ...cards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, MAX_SAVED_BINGOS);

  if (!writeCards(nextCards)) return null;
  return card;
}

export function updateSavedBingo(id, checked) {
  const cards = getSavedBingos();
  const card = cards.find((item) => item.id === id);
  if (!card || checked.length !== card.size ** 2) return false;
  card.checked = [...checked];
  return writeCards(cards);
}

export function deleteSavedBingo(id) {
  return writeCards(getSavedBingos().filter((card) => card.id !== id));
}

/* 保存済みビンゴをすべて削除 */
export function deleteAllSavedBingos() {
  return writeCards([]);
}
