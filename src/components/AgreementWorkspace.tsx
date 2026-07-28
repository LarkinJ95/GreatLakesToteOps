"use client";
import { useEffect, useState } from "react";
type Row = Record<string, unknown>;
export function AgreementWorkspace({ id }: { id: string }) {
  const [a, setA] = useState<Row | null>(null);
  useEffect(() => {
    fetch(`/api/agreements/${id}`).then(
      async (r) =>
        r.ok && setA(((await r.json()) as { agreement: Row }).agreement),
    );
  }, [id]);
  if (!a)
    return (
      <main className="record">
        <p>Loading agreement…</p>
      </main>
    );
  return (
    <main className="record">
      <a className="back" href={`/orders/${String(a.order_id)}`}>
        ← Order workspace
      </a>
      <header>
        <div>
          <p className="eyebrow">AGREEMENT AUDIT</p>
          <h1>{String(a.agreement_number)}</h1>
          <span>
            {String(a.customer_name)} · {String(a.status)} · Verification{" "}
            {String(a.verification_code)}
          </span>
        </div>
        <a className="primary" href={`/orders/${String(a.order_id)}`}>
          Open order
        </a>
      </header>
      <div className="record-grid">
        <section>
          <h2>Signature audit</h2>
          <div className="record-row">
            <strong>Sent</strong>
            <span>{String(a.sent_at ?? "Not sent")}</span>
          </div>
          <div className="record-row">
            <strong>Accepted</strong>
            <span>{String(a.accepted_at ?? "Not accepted")}</span>
          </div>
          <div className="record-row">
            <strong>Signed document</strong>
            <span>
              {a.signed_pdf_document_id ? "Attached" : "Not available"}
            </span>
          </div>
        </section>
        <section>
          <h2>Agreement record</h2>
          <p className="desk-hint">
            The immutable agreement snapshot and checksum are retained on this
            record. Signed documents are available when a document storage
            connection is configured.
          </p>
        </section>
      </div>
    </main>
  );
}
