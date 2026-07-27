"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter(); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); const data = new FormData(event.currentTarget); const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) }); if (response.ok) { router.replace("/"); router.refresh(); } else { const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null; setError(payload?.error?.message ?? "Could not sign in"); setLoading(false); } }
  return <form className="login-form" onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form>;
}
