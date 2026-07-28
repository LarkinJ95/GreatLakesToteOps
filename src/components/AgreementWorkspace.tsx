"use client";
import { useEffect, useState } from "react";
type Row = Record<string, unknown>;
export function AgreementWorkspace({ id }: { id: string }) {
  const [a, setA] = useState<Row | null>(null), [error, setError] = useState("");
  useEffect(() => {
    void fetch(`/api/agreements/${id}`).then(async (r) => {
      if (!r.ok) {
        const body = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
        setError(body?.error?.message ?? "This agreement could not be loaded.");
        return;
      }
      setA(((await r.json()) as { agreement: Row }).agreement);
    }).catch(() => setError("This agreement could not be loaded."));
  }, [id]);
  if (!a)
    return (
      <main className="record">
        <p>{error || "Loading agreement…"}</p>
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
        <div className="record-actions">
          <button className="secondary" onClick={() => window.print()}>
            Print agreement
          </button>
          <a className="primary" href={`/orders/${String(a.order_id)}`}>
            Open order
          </a>
        </div>
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
        <section>
          <h2>Agreement preview</h2>
          {a.rendered_html ? (
            <iframe
              title="Agreement preview"
              sandbox=""
              className="agreement-preview"
              srcDoc={String(a.rendered_html)}
            />
          ) : (
            <p className="empty">
              The agreement document has not been rendered yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
