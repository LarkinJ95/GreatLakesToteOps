import { OpsRecord } from "@/components/OpsRecord"; import { KimiOpsShell } from "@/components/KimiOpsDashboard";
export default async function CustomerPage({params}:{params:Promise<{id:string}>}){return <KimiOpsShell title="Customer 360"><OpsRecord kind="customer" id={(await params).id}/></KimiOpsShell>}
