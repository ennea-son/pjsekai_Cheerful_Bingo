/* PNG画像として保存 */
export async function exportBingoImage(selectedSize, saveBingoBtn) {
  const bingo = document.querySelector("#bingoContainer .bingo-wrapper");

  if (!bingo) {
    alert("保存するビンゴカードがありません。");
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

    // DOMの描画サイズに依存せず、正方形のマスに直接描画する
    const cells = [...bingo.querySelectorAll(".bingo-table td")];
    const size = Number(selectedSize);
    if (![3, 5, 7].includes(size) || cells.length !== size * size) {
      throw new Error("ビンゴカードのサイズが正しくありません。");
    }
    const canvas = document.createElement("canvas");
    const cellSize = 200;
    canvas.width = canvas.height = size * cellSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を作成できませんでした。");
    cells.forEach((cell, i) => {
      const x = (i % size) * cellSize;
      const y = Math.floor(i / size) * cellSize;
      ctx.fillStyle = cell.classList.contains("free-cell") ? "#fff" : "#fafafa";
      ctx.fillRect(x, y, cellSize, cellSize);
      const img = cell.querySelector("img");
      if (img) {
        const ratio = Math.min(cellSize / img.naturalWidth, cellSize / img.naturalHeight);
        const w = img.naturalWidth * ratio;
        const h = img.naturalHeight * ratio;
        ctx.drawImage(img, x + (cellSize - w) / 2, y + (cellSize - h) / 2, w, h);
      } else {
        const title = [...cell.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim();
        ctx.fillStyle = "#222";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const lines = [];
        let line = "";
        for (const ch of title) {
          if (line && ctx.measureText(line + ch).width > cellSize - 16) { lines.push(line); line = ""; }
          line += ch;
        }
        if (line) lines.push(line);
        lines.slice(0, 9).forEach((s, j) => ctx.fillText(s, x + cellSize / 2, y + cellSize / 2 + (j - (Math.min(lines.length, 9) - 1) / 2) * 20));
      }
      if (cell.classList.contains("bingo-checked") && !cell.classList.contains("free-cell")) {
        ctx.fillStyle = "rgba(22,120,70,.28)";
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.save();
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,.8)";
        ctx.shadowBlur = 6;
        ctx.font = "900 110px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("✓", x + cellSize / 2, y + cellSize / 2);
        ctx.restore();
      }
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    });

    // PNG形式に変換（同期処理で共有に必要な操作権限を維持）
    const imageUrl = canvas.toDataURL("image/png");
    const now = new Date();
    const pad = (num) => String(num).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `pjsekaibingo_${selectedSize}x${selectedSize}_${timestamp}.png`;

    const download = () => {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    };

    // iPhone・iPad（デスクトップ表示のiPadも含む）
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isIOS && navigator.share && navigator.canShare) {
      const binary = atob(imageUrl.split(",")[1]);
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
      const file = new File([bytes], filename, { type: "image/png" });
      const shareData = { files: [file] };

      if (navigator.canShare(shareData)) {
        // 画像作成中にユーザー操作の有効期限が切れた場合は再タップ
        const retryShare = () => new Promise((resolve, reject) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "共有メニューを開く";
          button.style.cssText = "display:block;margin:12px auto;padding:12px 20px;font-size:16px;";
          saveBingoBtn.after(button);
          button.addEventListener("click", async () => {
            button.disabled = true;
            try { await navigator.share(shareData); resolve(); }
            catch (error) { reject(error); }
            finally { button.remove(); }
          }, { once: true });
        });
        try {
          if (navigator.userActivation?.isActive === false) {
            await retryShare();
          } else {
            try { await navigator.share(shareData); }
            catch (error) {
              if (error.name !== "NotAllowedError") throw error;
              await retryShare();
            }
          }
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
          console.warn("共有できなかったためダウンロードに切り替えます", error);
        }
      }
    }
    // PC・Android・共有非対応ブラウザ
    download();
  } catch (error) {
    console.error("ビンゴ画像の保存に失敗しました:", error);
    alert(`画像の保存に失敗しました。\n${error.message}`);
  } finally {
    saveBingoBtn.disabled = false;
    saveBingoBtn.textContent = "ビンゴ画像を保存";
  }
}
