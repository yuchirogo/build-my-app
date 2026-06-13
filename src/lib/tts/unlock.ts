// Mở khoá Web Speech API trên di động: nhiều trình duyệt (đặc biệt Chrome Android, iOS Safari)
// chỉ cho phép `speechSynthesis.speak()` phát ra sau một cử chỉ người dùng đầu tiên.
// Module này lắng nghe lần chạm/click đầu tiên ở bất kỳ đâu trong app và phát một utterance rỗng
// để "mở khoá" engine, đồng thời preload danh sách giọng nói.

let unlocked = false;

export function isTtsUnlocked() {
  return unlocked;
}

export function unlockTTS() {
  if (unlocked) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    // Một số engine cần resume() trước
    window.speechSynthesis.resume?.();
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.rate = 1;
    u.lang = "vi-VN";
    window.speechSynthesis.speak(u);
    // Trigger voices load
    window.speechSynthesis.getVoices();
    unlocked = true;
  } catch {
    /* ignore */
  }
}

export function installTtsUnlock() {
  if (typeof window === "undefined") return;
  if (unlocked) return;
  const handler = () => {
    unlockTTS();
    if (unlocked) {
      window.removeEventListener("pointerdown", handler, true);
      window.removeEventListener("touchstart", handler, true);
      window.removeEventListener("keydown", handler, true);
      window.removeEventListener("click", handler, true);
    }
  };
  window.addEventListener("pointerdown", handler, true);
  window.addEventListener("touchstart", handler, true);
  window.addEventListener("keydown", handler, true);
  window.addEventListener("click", handler, true);
}
