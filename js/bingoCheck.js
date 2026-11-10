/* スマホ：長押しで曲名を表示し、長押し直後のクリックを抑制 */
export function attachJacketTouchHandlers(jacketWrapper) {
  //＝＝＝＝＝＝＝＝＝＝スマホ用操作＝＝＝＝＝＝＝＝＝＝
  // スマホの長押しで曲名を表示する
  let longPressTimer = null;
  let longPressActivated = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchMoved = false;
  
  // タッチ開始
  jacketWrapper.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length !== 1) return;
  
      longPressActivated = false;
      touchMoved = false;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
  
      clearTimeout(longPressTimer);
  
      longPressTimer = setTimeout(() => {
        longPressActivated = true;
        jacketWrapper.classList.add("long-press");
      }, 500);
    },
    { passive: true },
  );
  
  // 指を動かした場合は長押しをキャンセル
  jacketWrapper.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 1) {
        touchMoved = true;
        clearTimeout(longPressTimer);
        return;
      }
  
      const deltaX = Math.abs(event.touches[0].clientX - touchStartX);
      const deltaY = Math.abs(event.touches[0].clientY - touchStartY);
  
      if (deltaX > 10 || deltaY > 10) {
        touchMoved = true;
        clearTimeout(longPressTimer);
        jacketWrapper.classList.remove("long-press");
      }
    },
    { passive: true },
  );
  
  // 指を離した場合
  jacketWrapper.addEventListener("touchend", () => {
    clearTimeout(longPressTimer);
    jacketWrapper.classList.remove("long-press");
  });
  
  // タッチ操作が中断された場合
  jacketWrapper.addEventListener("touchcancel", () => {
    clearTimeout(longPressTimer);
    jacketWrapper.classList.remove("long-press");
  });
  
  // 長押しによるブラウザ標準メニューを抑制
  jacketWrapper.addEventListener("contextmenu", (event) => {
    if (window.matchMedia("(hover: none)").matches) {
      event.preventDefault();
    }
  });
  
  // 長押し直後のクリックを無効化
  jacketWrapper.addEventListener("click", (event) => {
    if (longPressActivated || touchMoved) {
      event.preventDefault();
      event.stopPropagation();
      longPressActivated = false;
      touchMoved = false;
    }
  });
}
