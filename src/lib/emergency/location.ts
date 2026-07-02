// Lấy vị trí GPS hiện tại (nếu người dùng cho phép) để đính kèm vào SMS/Share khẩn cấp.
export interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
}

export function getCurrentLocation(timeoutMs = 8000): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const done = (v: Coords | null) => resolve(v);
    const timer = setTimeout(() => done(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        done({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timer);
        done(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}

export function mapsLink(c: Coords): string {
  return `https://www.google.com/maps?q=${c.lat},${c.lng}`;
}

export function buildEmergencyMessage(name: string | undefined, c: Coords | null): string {
  const who = name?.trim() ? name.trim() : "Tôi";
  if (!c) {
    return `${who} cần trợ giúp khẩn cấp. Không lấy được vị trí GPS. Vui lòng gọi lại ngay.`;
  }
  return `${who} cần trợ giúp khẩn cấp. Vị trí hiện tại (±${Math.round(c.accuracy)}m): ${mapsLink(c)}`;
}
