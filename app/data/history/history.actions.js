// File: data/history/history.actions.js
"use server";

import connectDB from "@/config/connectDB";
import ActionHistory from "@/models/history";
import ActionTypeDefinition from "@/models/actionTypeDefinition";

// Cache để lưu trữ các định nghĩa hành động, tránh truy vấn DB liên tục
let actionTypesCache = null;

async function getActionTypeDefinitions() {
  if (actionTypesCache) {
    return actionTypesCache;
  }
  await connectDB();
  const definitions = await ActionTypeDefinition.find({}).lean();
  actionTypesCache = new Map(definitions.map((def) => [def.actionType, def]));
  return actionTypesCache;
}

/**
 * Hàm ghi log thông minh và an toàn.
 * Tự động xác thực và định dạng dữ liệu dựa trên ActionTypeDefinition.
 */
export async function logAction({
  actionType,
  actorId,
  context = {},
  detail = {},
}) {
  try {
    const definitions = await getActionTypeDefinitions();
    const definition = definitions.get(actionType);

    if (!definition) {
      throw new Error(`Hành động "${actionType}" chưa được định nghĩa.`);
    }

    // Xác thực các keys bắt buộc
    for (const keyDef of definition.requiredContextKeys) {
      if (!(keyDef.name in context)) {
        throw new Error(
          `Thiếu context key bắt buộc "${keyDef.name}" cho hành động "${actionType}".`,
        );
      }
    }
    for (const keyDef of definition.requiredDetailKeys) {
      if (!(keyDef.name in detail)) {
        throw new Error(
          `Thiếu detail key bắt buộc "${keyDef.name}" cho hành động "${actionType}".`,
        );
      }
    }

    const formatEntries = (obj) =>
      Object.entries(obj).map(([key, value]) => ({ key, value }));

    const newLog = {
      actionTypeId: definition._id,
      actorId: actorId,
      context: formatEntries(context),
      detail: formatEntries(detail),
      time: new Date(),
    };

    await ActionHistory.create(newLog);
    return { success: true };
  } catch (error) {
    console.error(`Loi khi ghi log cho hanh dong "${actionType}":`, error);
    return { success: false, error: error.message };
  }
}
