// [MOD] app/(main)/layout.js
import { getCurrentUser } from "@/lib/session";
import Nav from "@/components/(layout)/nav";
import styles from "./layout.module.css";
import PanelManager from "@/components/(features)/panel/PanelManager";
import { PanelProvider } from "@/contexts/PanelContext";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
// [ADD] Import hàm query mới
import { getCareProgramsForFilter } from "@/app/data/careProgram/careProgram.queries";
import MainLayoutClient from "./MainLayoutClient";

export default async function MainLayout({ children }) {
  // [MOD] Gọi `getCurrentUser()` một lần và lưu vào biến
  const userData = await getCurrentUser();

  // [MOD] Truyền `userData` vào hàm `getCareProgramsForFilter`
  const carePrograms = await getCareProgramsForFilter(userData);

  // [ADD] Gom dữ liệu cho Nav vào một object
  const navData = {
    carePrograms: carePrograms || [],
  };

  return (
    <RealtimeProvider>
      <PanelProvider>
        <MainLayoutClient user={userData} navData={navData}>
          {children}
          <PanelManager />
        </MainLayoutClient>
      </PanelProvider>
    </RealtimeProvider>
  );
}
