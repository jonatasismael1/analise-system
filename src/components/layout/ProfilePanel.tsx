import { useEffect, useRef, useState } from "react";
import { Building2, KeyRound, Loader2, LogOut, Save, User, X } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { ImageUpload } from "../ui/ImageUpload";

interface ProfilePanelProps {
  readonly clinicaId: string;
  readonly clinicName: string;
  readonly userRole?: string;
  readonly onLogout: () => void | Promise<void>;
  readonly onClinicNameChange: (name: string) => void;
}

export function ProfilePanel({ clinicaId, clinicName, userRole, onLogout, onClinicNameChange }: ProfilePanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"perfil" | "senha">("perfil");
  const panelRef = useRef<HTMLDivElement>(null);

  // Clinic data
  const [nome, setNome] = useState(clinicName);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicMsg, setClinicMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // User info
  const [userEmail, setUserEmail] = useState("");
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNome(clinicName);
    setClinicMsg(null);
    setPwdMsg(null);
    // Load current clinic logo + user info
    void (async () => {
      const [{ data: clinic }, { data: auth }] = await Promise.all([
        supabase.from("clinicas").select("logo_url").eq("id", clinicaId).single(),
        supabase.auth.getUser(),
      ]);
      setLogoUrl((clinic as { logo_url: string | null } | null)?.logo_url ?? null);
      setUserEmail(auth.user?.email ?? "");
      setUserPhotoUrl((auth.user?.user_metadata as { avatar_url?: string })?.avatar_url ?? null);
    })();
  }, [open, clinicaId, clinicName]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function saveClinic() {
    if (!nome.trim()) return;
    setSavingClinic(true);
    setClinicMsg(null);
    try {
      const { error } = await supabase
        .from("clinicas")
        .update({ nome: nome.trim(), logo_url: logoUrl })
        .eq("id", clinicaId);
      if (error) throw error;
      onClinicNameChange(nome.trim());
      setClinicMsg({ ok: true, text: "Dados da clínica atualizados!" });
    } catch {
      setClinicMsg({ ok: false, text: "Erro ao salvar. Tente novamente." });
    } finally {
      setSavingClinic(false);
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
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmSenha("");
    } catch (e) {
      setPwdMsg({ ok: false, text: e instanceof Error ? e.message : "Erro ao alterar senha." });
    } finally {
      setSavingPwd(false);
    }
  }

  const avatarInitial = clinicName.charAt(0).toUpperCase();

  return (
    <div ref={panelRef} className="relative">
      {/* Avatar button */}
      <button
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/40"
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Perfil e configurações"
      >
        {userPhotoUrl ? (
          <img src={userPhotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          avatarInitial
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-white">
                {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : avatarInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{clinicName}</p>
                <p className="truncate text-[11px] capitalize text-ink-muted">{userRole ?? "admin"} · {userEmail}</p>
              </div>
            </div>
            <button
              className="shrink-0 rounded-lg p-1 text-ink-muted hover:bg-surface-low hover:text-ink"
              type="button"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {([["perfil", Building2, "Clínica"], ["senha", KeyRound, "Senha"]] as const).map(([t, Icon, label]) => (
              <button
                key={t}
                className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition ${
                  tab === t ? "border-b-2 border-primary text-primary" : "text-ink-secondary hover:text-ink"
                }`}
                type="button"
                onClick={() => setTab(t)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Perfil/Clínica */}
          {tab === "perfil" && (
            <div className="space-y-4 p-4">
              {/* Logo da clínica */}
              <div className="flex items-center gap-4">
                <ImageUpload
                  currentUrl={logoUrl}
                  bucket="clinic-photos"
                  path={`clinics/${clinicaId}/logo`}
                  onUpload={(url) => setLogoUrl(url)}
                  onRemove={() => setLogoUrl(null)}
                  shape="rounded"
                  size="md"
                  placeholder="Logo"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">Logo da clínica</p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">Aparece na sidebar e em documentos</p>
                </div>
              </div>

              {/* Nome da clínica */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-secondary">
                  Nome da clínica
                </label>
                <input
                  className="w-full rounded-xl border border-border bg-surface-low px-3 py-2 text-sm text-ink placeholder-ink-muted focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome da clínica"
                />
              </div>

              {clinicMsg && (
                <p className={`text-[11px] ${clinicMsg.ok ? "text-emerald-600" : "text-error"}`}>
                  {clinicMsg.text}
                </p>
              )}

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
                type="button"
                disabled={savingClinic}
                onClick={() => void saveClinic()}
              >
                {savingClinic ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingClinic ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          )}

          {/* Tab: Senha */}
          {tab === "senha" && (
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-low px-3 py-2">
                <User className="h-4 w-4 shrink-0 text-ink-muted" />
                <span className="truncate text-sm text-ink-secondary">{userEmail}</span>
              </div>

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

              {pwdMsg && (
                <p className={`text-[11px] ${pwdMsg.ok ? "text-emerald-600" : "text-error"}`}>
                  {pwdMsg.text}
                </p>
              )}

              <button
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
                type="button"
                disabled={savingPwd || !novaSenha || !confirmSenha}
                onClick={() => void changePassword()}
              >
                {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {savingPwd ? "Alterando..." : "Alterar senha"}
              </button>
            </div>
          )}

          {/* Footer logout */}
          <div className="border-t border-border px-4 py-3">
            <button
              className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-error transition hover:bg-red-50"
              type="button"
              onClick={() => void onLogout()}
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
