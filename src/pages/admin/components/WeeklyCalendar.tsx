import type { Appointment } from "../../../types/clinic";

export function WeeklyCalendar({ appointments }: { readonly appointments: Appointment[] }) {
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date.toISOString().slice(0, 10);
  });

  const statusCardClass: Record<string, string> = {
    confirmado: "bg-teal-50 border border-teal-200 text-primary",
    concluido: "bg-blue-50 border border-blue-200 text-blue-700",
    pendente: "bg-amber-50 border border-amber-200 text-amber-700",
    faltou: "bg-red-50 border border-red-200 text-error",
    cancelado: "bg-slate-100 border border-slate-200 text-secondary line-through",
  };

  return (
    <div className="mb-5 rounded-xl border border-surface-variant bg-white p-4 shadow-clinical">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-on-surface">Calendário Semanal</h3>
        <div className="flex items-center gap-3 text-[10px] font-medium">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" />Confirmado</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Pendente</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error" />Faltou</span>
          <span className="text-secondary">Próximos 7 dias</span>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-7">
        {week.map((date) => {
          const dayAppointments = appointments.filter((item) => item.data === date).sort((a, b) => a.horario.localeCompare(b.horario));
          const isToday = date === new Date().toISOString().slice(0, 10);
          return (
            <div
              className={`min-h-[160px] rounded-lg border p-2 transition ${
                isToday ? "border-primary bg-teal-50/30" : "border-surface-variant bg-surface-container-lowest"
              }`}
              key={date}
            >
              <p className={`mb-2 text-[10px] font-bold uppercase tracking-wide ${
                isToday ? "text-primary" : "text-secondary"
              }`}>
                {new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                {isToday && <span className="ml-1 rounded-full bg-primary px-1 py-0.5 text-[9px] text-white">Hoje</span>}
              </p>
              <div className="space-y-1.5">
                {dayAppointments.length === 0 ? (
                  <p className="text-[10px] italic text-secondary/70">Livre</p>
                ) : (
                  dayAppointments.map((item) => (
                    <div
                      className={`rounded-md p-1.5 text-[10px] leading-tight ${
                        statusCardClass[item.status] ?? "bg-slate-50 border border-slate-200 text-secondary"
                      }`}
                      key={item.id}
                    >
                      <p className="font-bold">{item.horario} • {item.pacienteNome}</p>
                      <p className="mt-0.5 opacity-80">{item.profissional}</p>
                      <p className="opacity-70">{item.servico}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
