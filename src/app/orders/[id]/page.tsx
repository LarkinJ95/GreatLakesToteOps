import { OpsRecord } from "@/components/OpsRecord"; import { KimiOpsShell } from "@/components/KimiOpsDashboard";
export default async function OrderPage({params}:{params:Promise<{id:string}>}){return <KimiOpsShell title="Order workspace"><OpsRecord kind="order" id={(await params).id}/></KimiOpsShell>}
