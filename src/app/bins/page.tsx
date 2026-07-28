import { BinDesk } from "@/components/BinDesk";
import { KimiOpsShell } from "@/components/KimiOpsDashboard";
export default function Page() {
  return (
    <KimiOpsShell title="Warehouse bins">
      <BinDesk />
    </KimiOpsShell>
  );
}
