// [REFACTOR] app/(main)/page.js
import { getCurrentUser } from "@/lib/session";
import ClientPage from "./client/ClientPage";
import { getClientes } from "@/app/data/customer/customer.queries";
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { getZaloAccountsForFilter } from "@/app/data/zalo/zalo.queries";
import { executeReport } from "@/app/data/report/report.actions";
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

  // Log để debug
  console.log("searchParams:", searchParams);
  console.log("filters:", filters);

  const CLIENT_DASHBOARD_LAYOUT_ID = "69a3e3ebe986b54217cf1001";

  // [MOD] Gọi tất cả dữ liệu song song, truyền object `filters` đã được xử lý
  const [clientResponse, tags, zaloAccounts, carePrograms, dashboardResponse] =
    await Promise.all([
      getClientes(filters, currentUser),
      getTagsForFilter(),
      getZaloAccountsForFilter(currentUser),
      getCareProgramsForFilter(currentUser),
      executeReport({
        layoutId: new Types.ObjectId(CLIENT_DASHBOARD_LAYOUT_ID),
      }),
    ]);

  // [ADD] Xử lý và định dạng lại dữ liệu dashboard cho component
  let dashboardStats = {};
  if (dashboardResponse.success) {
    const data = dashboardResponse.data;
    dashboardStats = {
      totalCustomers: data.totalCustomers,
      customersPerProgram: (data.customersPerProgram || []).map(
        (p) => `${p.programName}: ${p.count}`,
      ),
      // Các số liệu khác sẽ được thêm vào sau
      totalPrograms: carePrograms.length,
      totalCampaigns: 15,
    };
  }

  return (
    <ClientPage
      initialData={clientResponse.data}
      initialPagination={clientResponse.pagination}
      user={currentUser}
      allTags={tags}
      initialZaloAccounts={zaloAccounts}
      carePrograms={carePrograms}
      initialStats={dashboardStats}
    />
  );
}
