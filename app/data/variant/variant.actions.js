// File: data/variant/variant.actions.js
"use server";

import connectDB from "@/config/connectDB";
import Variant from "@/models/variant";
import { revalidateAndBroadcast } from "@/lib/revalidation";

/**
 * Tạo mới hoặc cập nhật một biến thể.
 */
export async function createOrUpdateVariant(data) {
  try {
    await connectDB();
    const { id, name, description, wordsString } = data;

    if (!name) {
      throw new Error("Tên biến thể là bắt buộc.");
    }

    const staticContent = wordsString
      .split("\n")
      .map((word) => word.trim())
      .filter((word) => word);

    const variantData = {
      name: name.toLowerCase().trim().replace(/\s+/g, "_"),
      description,
      staticContent,
      type: "STATIC_LIST",
    };

    let savedVariant;
    if (id) {
      savedVariant = await Variant.findByIdAndUpdate(id, variantData, {
        new: true,
      }).lean();
    } else {
      savedVariant = await Variant.create(variantData);
    }

    revalidateAndBroadcast("variants");
    return { success: true, data: JSON.parse(JSON.stringify(savedVariant)) };
  } catch (error) {
    if (error.code === 11000) {
      return {
        success: false,
        error: `Tên biến thể "${data.name}" đã tồn tại.`,
      };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Xóa một biến thể.
 */
export async function deleteVariant(variantId) {
  try {
    if (!variantId) throw new Error("Cần cung cấp ID của biến thể.");
    await connectDB();

    const deleted = await Variant.findByIdAndDelete(variantId);
    if (!deleted) throw new Error("Không tìm thấy biến thể để xóa.");

    revalidateAndBroadcast("variants");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
