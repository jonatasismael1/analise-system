import { useEffect, useState } from "react";
import { Building2, KeyRound, Loader2, Save } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { ImageUpload } from "../../../components/ui/ImageUpload";

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function SettingsPanel({ clinicId }: { readonly clinicId: string }) {
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    void (async () => {
      const [{ data: clinic }, { data: auth }] = await Promise.all([
        supabase.from("clinicas").select("nome, logo_url, cnpj").eq("id", clinicId).single(),
        supabase.auth.getUser(),
      ]);
      setNome((clinic as { nome: string } | null)?.nome ?? "");
      setLogoUrl((clinic as { logo_url: string | null } | null)?.logo_url ?? null);
      setCnpj((clinic as { cnpj: string | null } | null)?.cnpj ?? "");
      setUserEmail(auth.user?.email ?? "");
    })();
  }, [clinicId]);

  async function saveClinic() {
    if (!nome.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("clinicas")
        .update({ nome: nome.trim(), logo_url: logoUrl, cnpj: cnpj.trim() || null })
        .eq("id", clinicId);
      if (error) throw error;
      setMsg({ ok: true, text: "Dados da clínica atualizados com sucesso!" });
    } catch {
      setMsg({ ok: false, text: "Erro ao salvar. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (!novaSenha || novaSenha !== confirmSenha) {
      setPwdMsg({ ok: false, text: "As senhas não coincidem." });
      return;
    }
    if (novaSenha.length < 8) {
      setPwdMsg({ ok: false, text: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }
    setSavingPwd(true);
    setPwdMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setPwdMsg({ ok: true, text: "Senha alterada com sucesso!" });
      setNovaSenha("");
      setConfirmSenha("");
    } catch (e) {
      setPwdMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao alterar senha." });
    } finally {
      setSavingPwd(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Dados da clínica */}
      <div className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-card">
        <div className="flex items-center gap-2 border-b border-border-divider pb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-ink">Dados da clínica</h2>
        </div>

        <div className="flex items-center gap-4">
          <ImageUpload
            currentUrl={logoUrl}
            bucket="clinic-photos"
            path={`clinics/${clinicId}/logo`}
            onUpload={(url) => setLogoUrl(url)}
            onRemove={() => setLogoUrl(null)}
            shape="rounded"
            size="md"
            placeholder="Logo"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Logo da clínica</p>
            <p className="mt-0.5 text-xs text-ink-muted">Aparece na sidebar e em documentos gerados</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary">Nome da clínica</label>
            <input
              className="w-full rounded-xl border border-border bg-surface-low px-3 py-2 text-sm text-ink placeholder-ink-muted focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome da clínica"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary">
              CNPJ{" "}
              <span className="font-normal text-ink-muted">(opcional)</span>
            </label>
            <input
              className="w-full rounded-xl border border-border bg-surface-low px-3 py-2 text-sm text-ink placeholder-ink-muted focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              type="text"
              placeholder="00.000.000/0000-00"
              maxLength={18}
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
            />
          </div>
        </div>

        {msg && (
          <p className={`text-xs ${msg.ok ? "text-emerald-600" : "text-error"}`}>{msg.text}</p>
        )}

        <button
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
          type="button"
          disabled={saving}
          onClick={() => void saveClinic()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      {/* Alterar senha */}
      <div className="space-y-4 rounded-3xl border border-border bg-white p-6 shadow-card">
        <div className="flex items-center gap-2 border-b border-border-divider pb-3">
          <KeyRound className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-ink">Alterar senha</h2>
        </div>

        {userEmail && (
          <p className="text-xs text-ink-muted">
            Conta: <span className="font-medium text-ink">{userEmail}</span>
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary">Nova senha</label>
            <input
              className="w-full rounded-xl border border-border bg-surface-low px-3 py-2 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-secondary">Confirmar nova senha</label>
            <input
              className="w-full rounded-xl border border-border bg-surface-low px-3 py-2 text-sm focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              type="password"
              placeholder="Repita a nova senha"
              value={confirmSenha}
              onChange={(e) => setConfirmSenha(e.target.value)}
            />
          </div>
        </div>

        {pwdMsg && (
          <p className={`text-xs ${pwdMsg.ok ? "text-emerald-600" : "text-error"}`}>{pwdMsg.text}</p>
        )}

        <button
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
          type="button"
          disabled={savingPwd || !novaSenha || !confirmSenha}
          onClick={() => void changePassword()}
        >
          {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {savingPwd ? "Alterando..." : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}
