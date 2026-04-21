"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao criar usuário");
      }

      setNewEmail("");
      setNewPassword("");
      setFeedback({ type: "success", message: `Usuário ${data.email} criado!` });
      loadUsers();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao criar",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCopyProducts = async (toUserId: string, email: string) => {
    if (
      !confirm(
        `Copiar todos os seus produtos para ${email}?\n\nOs produtos terão slugs diferentes para evitar conflitos.`
      )
    )
      return;
    setCopying(toUserId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/copy-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: toUserId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao copiar produtos");
      }

      setFeedback({
        type: "success",
        message: `${data.copied} produto(s) copiado(s) para ${email}.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao copiar",
      });
    } finally {
      setCopying(null);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Excluir ${email}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(userId);

    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao excluir");
      }

      setFeedback({ type: "success", message: `${email} excluído.` });
      loadUsers();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Erro ao excluir",
      });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create user */}
      <Card>
        <h2 className="text-base font-semibold mb-4">Criar Novo Usuário</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="cliente@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? "Criando..." : "Criar Usuário"}
          </Button>
        </form>
      </Card>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Users list */}
      <Card>
        <h2 className="text-base font-semibold mb-4">Usuários Cadastrados</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhum usuário encontrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.email}</p>
                  <p className="text-xs text-gray-400">
                    Criado em{" "}
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    {u.last_sign_in_at &&
                      ` · Último acesso ${new Date(
                        u.last_sign_in_at
                      ).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={copying === u.id}
                    onClick={() => handleCopyProducts(u.id, u.email)}
                    title="Copiar meus produtos para este usuário"
                  >
                    {copying === u.id ? "Copiando..." : "Copiar Produtos"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deleting === u.id}
                    onClick={() => handleDelete(u.id, u.email)}
                  >
                    {deleting === u.id ? "..." : "Excluir"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
