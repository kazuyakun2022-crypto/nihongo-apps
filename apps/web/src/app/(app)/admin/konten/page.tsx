import { BannerManager } from "@/features/admin/ui/content/BannerManager";
import adminStyles from "@/app/(app)/admin/admin.module.css";

export const metadata = {
  title: "Kelola Banner & Iklan | Admin NihonGo",
};

export default function AdminKontenPage() {
  return (
    <div className={adminStyles.container}>
      <BannerManager />
    </div>
  );
}
