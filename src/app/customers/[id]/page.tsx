import { CustomerEditor } from "@/components/CustomerEditor";
import { CustomerAddresses } from "@/components/CustomerAddresses";
import { OpsRecord } from "@/components/OpsRecord";
import { KimiOpsShell } from "@/components/KimiOpsDashboard";
export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  return (
    <KimiOpsShell title="Customer 360">
      <CustomerEditor id={id} />
      <OpsRecord kind="customer" id={id} />
      <CustomerAddresses id={id} />
    </KimiOpsShell>
  );
}
