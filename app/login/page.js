"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState("/board");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const n = params.get("next");
      if (n && n.startsWith("/")) setNextPath(n);
    } catch {}
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(nextPath);
        router.refresh();
      } else if (res.status === 401) {
        setError("Senha incorreta. Tente de novo.");
      } else {
        setError("Não foi possível entrar agora. Tente novamente em instantes.");
      }
    } catch {
      setError("Sem conexão. Verifique sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="brand-mark">G</div>
        <h1>Projeto Glaz</h1>
        <p>Digite a senha compartilhada para acessar o quadro.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading || !password}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
