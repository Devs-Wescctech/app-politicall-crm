import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { Card, CardContent, CardHeader } from "../components/Card";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@politicall.local");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao logar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-primary">
              P
            </div>
            <div>
              <div className="text-lg font-semibold">Entrar</div>
              <div className="text-sm text-muted">PoliticAll CRM • dark mode</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onSubmit}>
            <div>
              <div className="text-sm mb-1 text-muted">Email</div>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />
            </div>
            <div>
              <div className="text-sm mb-1 text-muted">Senha</div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {err && <div className="text-sm text-danger">{err}</div>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="text-xs text-muted">
              Seed padrão: admin@politicall.local / admin123 (trocar em produção)
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
