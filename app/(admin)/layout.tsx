import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { PageLoader } from "@/components/ui";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
