/* PNG画像として保存 */
export async function exportBingoImage(selectedSize, saveBingoBtn) {
  const bingo = document.querySelector("#bingoContainer .bingo-wrapper");

  if (!bingo) {
    alert("保存するビンゴカードがありません。");
    return;
  }

  if (typeof html2canvas === "undefined") {
    alert("画像保存用ライブラリが読み込まれていません。");
    return;
  }

  saveBingoBtn.disabled = true;
  saveBingoBtn.textContent = "画像を作成中...";

  try {
    // ジャケット画像の読み込み完了を待つ
    const images = [...bingo.querySelectorAll("img")];

    await Promise.all(
      images.map(async (img) => {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        }
      }),
    );

    // 読み込みに失敗した画像を確認
    const failedImages = images.filter((img) => img.naturalWidth === 0);

    if (failedImages.length > 0) {
      console.error(
        "読み込みに失敗したジャケット:",
        failedImages.map((img) => img.src),
      );

      throw new Error(`${failedImages.length}枚のジャケット画像を読み込めませんでした。`);
    }

    // ビンゴカードを画像化
    const canvas = await html2canvas(bingo, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      onclone: (clonedDocument) => {
        const clonedBingo = clonedDocument.querySelector("#bingoContainer .bingo-wrapper");

        if (clonedBingo) {
          clonedBingo.classList.add("bingo-exporting");
        }
      },
    });

    // PNG形式に変換
    const imageUrl = canvas.toDataURL("image/png");

    // ダウンロード
    const link = document.createElement("a");
    link.href = imageUrl;
    // 保存日時を取得
    const now = new Date();

    const pad = (num) => String(num).padStart(2, "0");

    const timestamp = `${now.getFullYear()}` + `${pad(now.getMonth() + 1)}` + `${pad(now.getDate())}_` + `${pad(now.getHours())}` + `${pad(now.getMinutes())}` + `${pad(now.getSeconds())}`;

    // ダウンロードファイル名
    link.download = `pjsekaibingo_${selectedSize}x${selectedSize}_${timestamp}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error("ビンゴ画像の保存に失敗しました:", error);
    alert(`画像の保存に失敗しました。\n${error.message}`);
  } finally {
    saveBingoBtn.disabled = false;
    saveBingoBtn.textContent = "ビンゴ画像を保存";
  }
}
