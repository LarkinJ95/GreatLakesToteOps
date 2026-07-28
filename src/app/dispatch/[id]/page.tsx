import { AssignmentWorkspace } from "@/components/AssignmentWorkspace";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssignmentWorkspace id={id} />;
}
