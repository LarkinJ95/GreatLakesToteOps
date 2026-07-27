const navigation = [["Operations", "/"], ["Orders", "/orders"], ["Dispatch", "#dispatch"], ["Inventory", "#inventory"], ["Customers", "#customers"], ["Billing", "#billing"], ["Reports", "#reports"]] as const;

const tasks = [
  ["08:00–10:00", "Deliver · GLMT-ORD-2026-000184", "Midland · 40 totes", "Ready"],
  ["10:30–12:00", "Pickup · GLMT-ORD-2026-000172", "Saginaw · 20 totes", "Assigned"],
  ["13:00–15:00", "Deliver · GLMT-ORD-2026-000188", "Bay City · 12 totes", "Needs review"],
];

export default function Home() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-hidden="true">GL</div>
        <div className="brand"><strong>Great Lakes</strong><span>ToteOps</span></div>
        <nav aria-label="Primary navigation">{navigation.map(([item, href], index) => <a className={index === 0 ? "active" : ""} href={href} key={item}>{item}</a>)}</nav>
        <div className="sidebar-footer"><span className="status-dot" />Field sync ready<br /><small>Midland HQ · EST</small></div>
      </aside>
      <section className="workspace" id="workspace">
        <header className="topbar"><div><p className="eyebrow">Monday, July 27</p><h1>Good morning, Operations</h1></div><div className="header-actions"><button className="quiet">⌕ <span>Search ToteOps</span></button><button className="avatar" aria-label="Open user menu">JL</button></div></header>
        <section className="hero"><div><p className="eyebrow">TODAY AT A GLANCE</p><h2>Keep every tote moving.</h2><p>See what needs attention before the first truck leaves the yard.</p></div><div className="hero-actions"><button className="secondary">Open field app</button><button className="primary">+ Create order</button></div></section>
        <section className="metrics" aria-label="Operations summary">
          <Metric label="Today’s stops" value="12" detail="7 delivery · 5 pickup" />
          <Metric label="Totes in the field" value="248" detail="94% accounted for" tone="mint" />
          <Metric label="Needs attention" value="3" detail="2 agreements · 1 exception" tone="amber" />
          <Metric label="Open balance" value="$4,820" detail="Across 11 invoices" />
        </section>
        <section className="grid">
          <article className="panel schedule"><div className="panel-heading"><div><p className="eyebrow">DISPATCH</p><h2>Today’s route board</h2></div><a href="#dispatch">View dispatch →</a></div><div className="route-head"><span>WINDOW</span><span>STOP</span><span>STATUS</span></div>{tasks.map(([time, title, details, status]) => <div className="route-row" key={title}><time>{time}</time><div><strong>{title}</strong><span>{details}</span></div><span className={`badge ${status === "Needs review" ? "warning" : ""}`}>{status}</span></div>)}</article>
          <article className="panel attention"><div className="panel-heading"><div><p className="eyebrow">PRIORITY QUEUE</p><h2>Needs attention</h2></div><span className="count">3</span></div><div className="attention-item"><b>Agreement awaiting signature</b><span>Order 000188 · expires tomorrow</span><button>Review</button></div><div className="attention-item"><b>Pickup exception reported</b><span>Order 000172 · 2 totes not scanned</span><button>Resolve</button></div><div className="attention-item"><b>Invoice past due</b><span>GLMT-INV-2026-000091 · $349.00</span><button>Collect</button></div></article>
        </section>
        <section className="grid bottom-grid"><article className="panel inventory"><div className="panel-heading"><div><p className="eyebrow">INVENTORY</p><h2>Warehouse readiness</h2></div><a href="#inventory">Inventory →</a></div><div className="inventory-bar"><span style={{ width: "68%" }} /><i style={{ width: "16%" }} /><em style={{ width: "8%" }} /></div><div className="legend"><span><i className="clean" />Clean &amp; available <b>682</b></span><span><i className="field" />In field <b>248</b></span><span><i className="cleaning" />Cleaning <b>64</b></span></div></article><article className="panel quick"><p className="eyebrow">FIELD OPERATIONS</p><h2>Start a scan</h2><p>Use the mobile PWA to stage, load, deliver, pick up, or inspect equipment — even when reception drops.</p><button className="primary">Open scanner</button></article></section>
      </section>
      <script dangerouslySetInnerHTML={{ __html: "if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => undefined);" }} />
    </main>
  );
}

function Metric({ label, value, detail, tone = "blue" }: { label: string; value: string; detail: string; tone?: string }) {
  return <article className={`metric ${tone}`}><p>{label}</p><strong>{value}</strong><span>{detail}</span></article>;
}
