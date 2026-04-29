import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { buildSlots } from "../lib/bookingSlots";
import { brl, onlyDigits, todayISO } from "../lib/formatters";
import { supabase } from "../lib/supabaseClient";
import { mockProfessionals, mockServices } from "../data/mockData";
import type { Professional, Service } from "../types/clinic";
import type { Database, Json } from "../types/database";

type Clinic = Pick<Database["public"]["Tables"]["clinicas"]["Row"], "id" | "nome" | "slug">;

interface PublicBookingData {
  clinic: Clinic;
  professionals: Array<{
    id: string;
    clinica_id: string;
    nome: string;
    especialidade: string;
    foto_url: string | null;
    horarios: Json;
    ativo: boolean;
  }>;
  services: Array<{
    id: string;
    clinica_id: string;
    profissional_id: string | null;
    nome: string;
    duracao_min: number;
    preco: number;
    ativo: boolean;
  }>;
}

export function BookingPage() {
  const { slug } = useParams();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>(mockProfessionals);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [selectedProfessional, setSelectedProfessional] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [occupied, setOccupied] = useState<string[]>([]);
  const [patient, setPatient] = useState({ nome: "", whatsapp: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPublicData() {
      if (!slug) return;
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_booking_data", { p_slug: slug });
      const bookingData = data as PublicBookingData | null;

      if (!error && bookingData?.clinic) {
        setClinic(bookingData.clinic);
        const mappedProfessionals = (bookingData.professionals ?? []).map((row) => ({
          id: row.id,
          clinicaId: row.clinica_id,
          nome: row.nome,
          especialidade: row.especialidade,
          fotoUrl: row.foto_url ?? undefined,
          horarios: row.horarios,
          ativo: row.ativo
        }));
        const mappedServices = (bookingData.services ?? []).map((row) => ({
          id: row.id,
          clinicaId: row.clinica_id,
          nome: row.nome,
          duracaoMin: row.duracao_min,
          preco: Number(row.preco),
          profissionalId: row.profissional_id,
          ativo: row.ativo
        }));

        setProfessionals(mappedProfessionals);
        setServices(mappedServices);
        setSelectedProfessional(mappedProfessionals[0]?.id ?? "");
        setSelectedService(mappedServices[0]?.id ?? "");
      } else {
        setMessage("Nao foi possivel carregar a clinica no Supabase. Exibindo fallback visual.");
        setSelectedProfessional(mockProfessionals[0]?.id ?? "");
        setSelectedService(mockServices[0]?.id ?? "");
      }
      setLoading(false);
    }
    void loadPublicData();
  }, [slug]);

  useEffect(() => {
    async function loadOccupied() {
      if (!slug || !selectedProfessional || !date) return;
      const { data } = await supabase.rpc("get_public_occupied_slots", {
        p_slug: slug,
        p_profissional_id: selectedProfessional,
        p_data: date
      });
      setOccupied(((data ?? []) as Array<{ horario: string }>).map((row) => row.horario));
    }
    void loadOccupied();
  }, [date, selectedProfessional, slug]);

  const professional = professionals.find((item) => item.id === selectedProfessional);
  const filteredServices = useMemo(() => services.filter((service) => !service.profissionalId || service.profissionalId === selectedProfessional), [selectedProfessional, services]);
  const service = filteredServices.find((item) => item.id === selectedService) ?? filteredServices[0];
  const slots = buildSlots((professional?.horarios as Json | undefined) ?? null, date, occupied);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!clinic || !professional || !service || !time) {
      setMessage("Selecione profissional, servico, data e horario.");
      return;
    }
    const whatsapp = onlyDigits(patient.whatsapp);
    if (patient.nome.trim().length < 3 || whatsapp.length < 10) {
      setMessage("Informe nome e WhatsApp validos.");
      return;
    }

    setLoading(true);
    const bookingInsert = await supabase.rpc("create_public_booking", {
      p_slug: clinic.slug,
      p_profissional_id: professional.id,
      p_servico_id: service.id,
      p_paciente_nome: patient.nome,
      p_paciente_whatsapp: whatsapp,
      p_paciente_email: patient.email || null,
      p_data: date,
      p_horario: time
    });

    setLoading(false);
    if (bookingInsert.error) {
      setMessage(bookingInsert.error.message.includes("slot_unavailable") ? "Este horario acabou de ser ocupado. Escolha outro horario." : bookingInsert.error.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface">
      <header className="sticky top-0 z-50 w-full border-b border-surface-variant bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[800px] items-center justify-center">
          <img src="/logo-clinic-pro.png" alt="Clinic Pro" className="h-10 w-auto mr-3" />
          <h1 className="text-2xl font-semibold">{clinic?.nome ?? "Clinic Pro - Matriz"}</h1>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-5 py-8">
        <form className="w-full max-w-[800px] space-y-6" onSubmit={handleSubmit}>
          {message ? <div className="rounded border border-primary/30 bg-primary-soft p-3 text-sm text-primary-dark">{message}</div> : null}
          {success ? (
            <section className="rounded-xl border border-surface-variant bg-white p-8 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-4 text-2xl font-semibold">Agendamento solicitado</h2>
              <p className="mt-2 text-sm text-secondary">Seu horario entrou como pendente. A clinica confirmara pelo WhatsApp.</p>
            </section>
          ) : (
            <>
              <Step title="Selecionar Profissional" number={1}>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {professionals.map((item) => (
                    <button className={`relative flex items-center rounded-lg border p-4 text-left transition ${selectedProfessional === item.id ? "border-2 border-primary bg-primary/5" : "border-surface-variant hover:bg-surface-container-low"}`} key={item.id} onClick={() => { setSelectedProfessional(item.id); setSelectedService(""); setTime(""); }} type="button">
                      {selectedProfessional === item.id ? <CheckCircle className="absolute right-3 top-3 h-5 w-5 text-primary" /> : null}
                      <div className="mr-4 flex h-16 w-16 items-center justify-center rounded-full border border-surface-variant bg-primary-soft text-primary">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <div><p className="text-lg font-semibold">{item.nome}</p><p className="text-sm text-secondary">{item.especialidade}</p></div>
                    </button>
                  ))}
                </div>
              </Step>
              <Step title="Selecionar Servico" number={2} disabled={!selectedProfessional}>
                <div className="grid gap-3 md:grid-cols-2">
                  {filteredServices.map((item) => (
                    <button className={`rounded-lg border p-4 text-left ${selectedService === item.id ? "border-2 border-primary bg-primary/5" : "border-surface-variant"}`} key={item.id} onClick={() => setSelectedService(item.id)} type="button">
                      <p className="font-semibold">{item.nome}</p>
                      <p className="text-sm text-secondary">{item.duracaoMin} min · {brl.format(item.preco)}</p>
                    </button>
                  ))}
                </div>
              </Step>
              <Step title="Selecionar Data e Hora" number={3} disabled={!service}>
                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                  <input className="rounded border border-outline-variant px-3 py-2" min={todayISO()} onChange={(event) => { setDate(event.target.value); setTime(""); }} type="date" value={date} />
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {slots.length === 0 ? <p className="col-span-full text-sm text-secondary">Nenhum horario disponivel para esta data.</p> : slots.map((slot) => (
                      <button className={`rounded border px-3 py-2 text-sm ${time === slot.time ? "border-primary bg-primary text-white" : slot.available ? "border-outline-variant bg-white" : "cursor-not-allowed border-surface-variant bg-surface-container text-secondary"}`} disabled={!slot.available} key={slot.time} onClick={() => setTime(slot.time)} type="button">{slot.time}</button>
                    ))}
                  </div>
                </div>
              </Step>
              <Step title="Detalhes do Paciente" number={4} disabled={!time}>
                <div className="grid gap-4 md:grid-cols-3">
                  <input className="rounded border border-outline-variant px-3 py-2" onChange={(event) => setPatient({ ...patient, nome: event.target.value })} placeholder="Nome completo" value={patient.nome} />
                  <input className="rounded border border-outline-variant px-3 py-2" onChange={(event) => setPatient({ ...patient, whatsapp: event.target.value })} placeholder="WhatsApp" value={patient.whatsapp} />
                  <input className="rounded border border-outline-variant px-3 py-2" onChange={(event) => setPatient({ ...patient, email: event.target.value })} placeholder="Email opcional" type="email" value={patient.email} />
                </div>
              </Step>
              <div className="flex justify-end pt-2">
                <button className="h-10 w-full rounded bg-primary px-8 text-sm font-medium text-white hover:bg-primary-dark md:w-auto" disabled={loading} type="submit">{loading ? "Enviando..." : "Solicitar agendamento"}</button>
              </div>
            </>
          )}
        </form>
      </main>
      <footer className="flex flex-col items-center justify-between gap-4 border-t border-surface-variant bg-surface-container-low px-6 py-8 text-sm text-secondary md:flex-row">
        <div className="text-lg font-bold text-on-surface">Clinic Pro</div>
        <div>© 2026 Clinic Pro SaaS. Sistemas de Precisao Clinica.</div>
      </footer>
    </div>
  );
}

function Step({ title, number, disabled = false, children }: { readonly title: string; readonly number: number; readonly disabled?: boolean; readonly children: React.ReactNode }) {
  return (
    <section className={`rounded-xl border border-surface-variant bg-white p-6 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
      <div className="mb-4 flex items-center border-b border-surface-variant pb-3">
        <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">{number}</div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
