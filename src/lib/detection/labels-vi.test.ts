import { describe, expect, it } from "vitest";
import { COCO_VI, HIGH_PRIORITY, toVietnamese } from "@/lib/detection/labels-vi";

describe("Vietnamese label mapping", () => {
  it("dịch các nhãn COCO phổ biến", () => {
    expect(toVietnamese("person")).toBe("người");
    expect(toVietnamese("motorcycle")).toBe("xe máy");
    expect(toVietnamese("car")).toBe("ô tô");
  });

  it("fallback về nhãn gốc khi không có bản dịch", () => {
    expect(toVietnamese("alien-ufo")).toBe("alien-ufo");
  });

  it("có đủ 80 lớp COCO", () => {
    expect(Object.keys(COCO_VI).length).toBeGreaterThanOrEqual(80);
  });

  it("vật thể nguy hiểm cho người khiếm thị nằm trong HIGH_PRIORITY", () => {
    for (const c of ["person", "motorcycle", "car", "bus", "truck"]) {
      expect(HIGH_PRIORITY.has(c)).toBe(true);
    }
  });
});
