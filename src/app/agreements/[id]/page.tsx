import { AgreementWorkspace } from "@/components/AgreementWorkspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgreementWorkspace id={id} />;
}
