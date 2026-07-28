"use client";
import { useEffect, useState } from "react";
type Result = { type: string; label: string; detail: string; href: string };
export function CommandSearch() {
  const [q, setQ] = useState(""),
    [results, setResults] = useState<Result[]>([]),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(
      () =>
        fetch(`/api/search?q=${encodeURIComponent(q)}`).then(
          async (r) =>
            r.ok &&
            setResults(((await r.json()) as { results: Result[] }).results),
        ),
      180,
    );
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="command-search">
      <input
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search customers, orders, invoices, assets…"
        aria-label="Search ToteOps"
      />
      {open && q.length >= 2 && (
        <div className="command-results">
          {results.map((r) => (
            <a href={r.href} key={`${r.type}:${r.href}`}>
              <b>{r.type}</b>
              <strong>{r.label}</strong>
              <span>{r.detail.replaceAll("_", " ")}</span>
            </a>
          ))}
          {!results.length && <p>No matching records.</p>}
        </div>
      )}
    </div>
  );
}
