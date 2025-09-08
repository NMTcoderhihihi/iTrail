// app/(main)/page.js
import { getCurrentUser } from "@/lib/session";
import ClientPage from "./client/ClientPage";
import { getClientes } from "@/app/data/customer/customer.queries";
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { getZaloAccountsForFilter } from "@/app/data/zalo/zalo.queries";
// [ADD] Import action mới
import { executeReport } from "@/app/data/report/report.actions";
import { Types } from "mongoose";

export default async function Page({ searchParams }) {
  const currentUser = await getCurrentUser();

  // Await searchParams để lấy giá trị
  const params = await searchParams;

  // Gán giá trị từ params vào filters
  const filters = {
    page: params.page,
    limit: params.limit,
    query: params.query,
    tags: params.tags,
    programId: params.program,
    stageId: params.stageId,
    statusId: params.statusId,
    uidStatus: params.uidStatus,
    uidFilterZaloId: params.uidFilterZaloId,
  };

  const CLIENT_DASHBOARD_LAYOUT_ID = "69a3e3ebe986b54217cf1001";

  // [MOD] Gọi tất cả dữ liệu song song
  const [
    clientResponse,
    tags,
    zaloAccounts,
    carePrograms,
    dashboardResponse, // [ADD]
  ] = await Promise.all([
    getClientes(filters, currentUser),
    getTagsForFilter(),
    getZaloAccountsForFilter(currentUser),
    getCareProgramsForFilter(currentUser),
    // [ADD] Thực thi report để lấy dữ liệu dashboard
    executeReport({ layoutId: new Types.ObjectId(CLIENT_DASHBOARD_LAYOUT_ID) }),
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
      totalCampaigns: 15, // Giữ lại dữ liệu giả cho các mục chưa có datasource
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
      // [ADD] Truyền dữ liệu thật vào initialStats
      initialStats={dashboardStats}
    />
  );
}
