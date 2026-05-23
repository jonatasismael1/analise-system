import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, CheckCircle, Loader2, Monitor, Video } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface TeleconsultaInfo {
  id: string;
  appointment_id: string;
  whereby_room_url: string;
  status: string;
  consent_status: string;
  token_expires_at: string | null;
  patient_name: string;
  professional_name: string;
  date: string;
  time: string;
  clinic_name: string;
  service_name: string;
}

type PageStep = "loading" | "not_found" | "consent" | "room";

export function TeleconsultaPage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<TeleconsultaInfo | null>(null);
  const [step, setStep] = useState<PageStep>("loading");
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setStep("not_found"); return; }
    void (async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("get_teleconsulta_by_token", { p_token: token });
        if (rpcError || !data) { setStep("not_found"); return; }
        const result = data as TeleconsultaInfo;
        setInfo(result);
        if (result.consent_status === "aceito") {
          // Já aceitou — registra novo acesso e vai direto para a sala
          await supabase.rpc("record_patient_joined", { p_token: token });
          setStep("room");
        } else {
          setStep("consent");
        }
      } catch {
        setStep("not_found");
      }
    })();
  }, [token]);

  async function handleAcceptConsent() {
    if (!token || !info) return;
    setAccepting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("accept_teleconsulta_consent", { p_token: token });
      if (rpcError) throw rpcError;
      if (data) {
        const updated = data as { whereby_room_url: string; consent_status: string };
        setInfo((prev) => prev ? { ...prev, whereby_room_url: updated.whereby_room_url, consent_status: updated.consent_status } : prev);
      }
      await supabase.rpc("record_patient_joined", { p_token: token });
      setStep("room");
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Erro ao registrar consentimento. Tente novamente.";
      setError(msg);
    } finally {
      setAccepting(false);
    }
  }

  const dateFormatted = info?.date
    ? new Date(`${info.date}T12:00:00`).toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
      })
    : "";

  if (step === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (step === "not_found") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-50 to-indigo-50 px-6 text-center">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white px-8 py-10 shadow-md">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-xl font-bold text-gray-800">Link inválido ou expirado</p>
          <p className="mt-2 text-sm text-gray-500">
            Este link de teleconsulta não foi encontrado, já expirou ou foi cancelado.
            Entre em contato com a clínica para obter um novo link.
          </p>
        </div>
      </div>
    );
  }

  if (step === "consent") {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8">
        <div className="mx-auto max-w-lg space-y-4">

          {/* Header */}
          <div className="rounded-2xl border border-blue-100 bg-white px-6 py-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{info!.clinic_name}</p>
                <h1 className="text-lg font-bold text-gray-900">Teleconsulta</h1>
              </div>
            </div>
          </div>

          {/* Dados da consulta */}
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-600">Dados da sua consulta</p>
            <div className="space-y-2.5">
              <Row label="Paciente" value={info!.patient_name} />
              <Row label="Profissional" value={info!.professional_name} />
              <Row label="Data" value={dateFormatted} />
              <Row label="Horário" value={info!.time.slice(0, 5)} />
              {info!.service_name && <Row label="Serviço" value={info!.service_name} />}
            </div>
          </div>

          {/* Orientações técnicas */}
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Antes de entrar</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-amber-700">
                  <li>Use um local reservado, silencioso e bem iluminado</li>
                  <li>Verifique se câmera e microfone estão funcionando</li>
                  <li>Prefira conexão Wi-Fi estável</li>
                  <li>Entre 5 minutos antes do horário agendado</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Termo de consentimento */}
          <div className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-blue-600">Termo de consentimento</p>
            <p className="text-sm leading-relaxed text-gray-700">
              Ao clicar em <strong>Aceitar e entrar na teleconsulta</strong>, você confirma que:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>Consente com a realização da consulta por videochamada</li>
              <li>Entende que a consulta <strong>não será gravada ou armazenada</strong></li>
              <li>Seus dados são tratados de forma confidencial conforme a LGPD</li>
              <li>É maior de 18 anos ou conta com autorização de responsável legal</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            disabled={accepting}
            onClick={() => void handleAcceptConsent()}
          >
            {accepting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Registrando consentimento...</>
            ) : (
              <><CheckCircle className="h-4 w-4" /> Aceitar e entrar na teleconsulta</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            {info!.clinic_name} · Teleconsulta segura e privada
          </p>
        </div>
      </div>
    );
  }

  // step === "room"
  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-900">
      {/* Barra de status */}
      <div className="flex items-center gap-3 bg-gray-800 px-4 py-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600">
          <Video className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-white">{info!.clinic_name}</span>
          <span className="ml-2 text-xs text-gray-400">
            Teleconsulta com {info!.professional_name} · {info!.time.slice(0, 5)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          <span className="text-xs text-green-400">Ao vivo</span>
        </div>
      </div>

      {/* Sala Whereby (iframe) */}
      <div className="flex-1">
        <iframe
          src={info!.whereby_room_url}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          style={{ width: "100%", height: "100%", border: "none", minHeight: "calc(100dvh - 48px)" }}
          title="Teleconsulta"
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-xs font-medium text-gray-400">{label}</span>
      <span className="text-right text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}
