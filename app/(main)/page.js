// app/(main)/page.js
import { getCurrentUser } from "@/lib/session";
import ClientPage from "./client/ClientPage";
import { getClientes } from "@/app/data/customer/customer.queries";
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import { getTagsForFilter } from "@/app/data/tag/tag.queries";
import { getZaloAccountsForFilter } from "@/app/data/zalo/zalo.queries";

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

  const [clientResponse, tags, zaloAccounts, carePrograms] = await Promise.all([
    getClientes(filters, currentUser),
    getTagsForFilter(),
    getZaloAccountsForFilter(currentUser),
    getCareProgramsForFilter(currentUser),
  ]);

  return (
    <ClientPage
      initialData={clientResponse.data}
      initialPagination={clientResponse.pagination}
      user={currentUser}
      allTags={tags}
      initialZaloAccounts={zaloAccounts}
      carePrograms={carePrograms}
    />
  );
}
