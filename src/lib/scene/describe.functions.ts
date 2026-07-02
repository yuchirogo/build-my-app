import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";

interface Input {
  imageBase64: string; // data URL hoặc base64 thuần
}

// Ứng dụng cho phép khách dùng (không đăng nhập). Endpoint AI vẫn được bảo vệ
// bằng LOVABLE_API_KEY phía server; kích thước ảnh bị giới hạn ở inputValidator.
export const describeScene = createServerFn({ method: "POST" })
  .inputValidator((data: Input) => {
    if (!data?.imageBase64 || typeof data.imageBase64 !== "string") {
      throw new Error("imageBase64 is required");
    }
    if (data.imageBase64.length > 6_000_000) {
      throw new Error("Ảnh quá lớn");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY chưa được cấu hình");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");

    // Chuẩn hoá thành data URL nếu cần
    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:image/jpeg;base64,${data.imageBase64}`;

    const { text } = await generateText({
      model,
      messages: [
        {
          role: "system",
          content:
            "Bạn là trợ lý cho người khiếm thị. Mô tả khung cảnh ngắn gọn bằng tiếng Việt, 2-3 câu, tập trung vào: vị trí vật thể (trái/giữa/phải, gần/xa), nguy hiểm tiềm ẩn (xe, bậc thang, hố), và lối đi gợi ý. Không dùng emoji, không bịa chi tiết.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Mô tả cảnh trước mặt tôi." },
            { type: "image", image: dataUrl },
          ],
        },
      ],
    });

    return { description: text.trim() };
  });
