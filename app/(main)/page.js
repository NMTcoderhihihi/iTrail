// [REFACTOR] app/(main)/page.js
import { getCurrentUser } from "@/lib/session";
import ClientPage from "./client/ClientPage";
import { getClientes } from "@/app/data/customer/customer.queries";
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { getZaloAccountsForFilter } from "@/app/data/zalo/zalo.queries";
// [MOD] Import hàm mới
import { getDashboardStats } from "@/app/data/report/report.queries";
import { getMessageTemplatesForFilter } from "@/app/data/messageTemplate/messageTemplate.js";
import { Types } from "mongoose";

export default async function Page({ searchParams }) {
  const currentUser = await getCurrentUser();

  // [FIX] Hàm trung gian để truy cập searchParams an toàn
  const getSafeParam = (param, defaultValue) =>
    searchParams?.[param] ?? defaultValue;

  const filters = {
    page: Number(getSafeParam("page", 1)),
    limit: Number(getSafeParam("limit", 50)),
    query: getSafeParam("query", ""),
    tags: getSafeParam("tags", [])
      ? Array.isArray(getSafeParam("tags", []))
        ? getSafeParam("tags", [])
        : [getSafeParam("tags", [])]
      : [],
    programId: getSafeParam("program", null),
    stageId: getSafeParam("stageId", null),
    statusId: getSafeParam("statusId", null),
    uidStatus: getSafeParam("uidStatus", null),
    uidFilterZaloId: getSafeParam("uidFilterZaloId", null),
  };

  const programId = getSafeParam("program", null);

  // [MOD] Gọi tất cả dữ liệu song song, bao gồm cả mẫu tin nhắn
  const [
    clientResponse,
    tags,
    zaloAccounts,
    carePrograms,
    dashboardStats, // [MOD] Thay thế dashboardResponse
    messageTemplates,
  ] = await Promise.all([
    getClientes(filters, currentUser),
    getTagsForFilter(),
    getZaloAccountsForFilter(currentUser),
    getCareProgramsForFilter(currentUser),
    // [MOD] Gọi hàm mới với tham số tương ứng
    getDashboardStats(programId, await getCareProgramsForFilter(currentUser)),
    getMessageTemplatesForFilter(),
  ]);

  return (
    <ClientPage
      initialData={clientResponse.data}
      initialPagination={clientResponse.pagination}
      user={currentUser}
      allTags={tags}
      allMessageTemplates={messageTemplates} // [ADD] Truyền prop mới
      initialZaloAccounts={zaloAccounts}
      carePrograms={carePrograms}
      initialStats={dashboardStats}
    />
  );
}
