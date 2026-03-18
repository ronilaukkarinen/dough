import { AppShell } from "@/components/layout/app-shell";
import { LocaleProvider } from "@/lib/locale-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AppShell>{children}</AppShell>
    </LocaleProvider>
  );
}
