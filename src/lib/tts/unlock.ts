// Mở khóa Web Speech API: nhiều trình duyệt (Chrome desktop, Safari iOS, Android WebView)
// chặn speechSynthesis.speak() cho đến khi người dùng có một tương tác thật
// (click / touch / keydown). Hàm này phát một utterance gần như im lặng ngay
// trong handler của user gesture để "đánh thức" engine, sau đó speak() ở bất
// cứ đâu (kể cả từ requestAnimationFrame của detection loop) cũng hoạt động.

let unlocked = false;

export function isTtsUnlocked() {
  return unlocked;
}

export function unlockTts() {
  if (unlocked) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    // Đảm bảo engine không bị "paused" (Chrome Android hay rơi vào trạng thái này)
    window.speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0; // không gây tiếng ồn
    u.rate = 1;
    u.lang = "vi-VN";
    window.speechSynthesis.speak(u);
    unlocked = true;
  } catch {
    /* ignore */
  }
}

export function installTtsUnlockListeners() {
  if (typeof window === "undefined") return;
  const handler = () => {
    unlockTts();
    if (unlocked) removeListeners();
  };
  const removeListeners = () => {
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("keydown", handler);
    window.removeEventListener("click", handler);
  };
  window.addEventListener("pointerdown", handler, { passive: true });
  window.addEventListener("touchstart", handler, { passive: true });
  window.addEventListener("keydown", handler);
  window.addEventListener("click", handler);
}
