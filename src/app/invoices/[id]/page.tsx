import { InvoiceWorkspace } from "@/components/InvoiceWorkspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceWorkspace id={id} />;
}
