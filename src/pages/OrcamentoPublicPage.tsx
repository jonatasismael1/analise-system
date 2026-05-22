import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { brl } from "../lib/formatters";

interface OrcamentoPublico {
  id: string;
  paciente_nome: string;
  paciente_cpf: string | null;
  paciente_whatsapp: string | null;
  atendente_nome: string;
  observacoes: string | null;
  valor_total: number;
  valor_com_desconto: number | null;
  status: string;
  validade: string | null;
  created_at: string;
  clinica_nome: string;
  itens: Array<{
    id: string;
    nome: string;
    descricao: string | null;
    preco_individual: number;
    quantidade: number;
    tipo: string;
  }> | null;
}

export function OrcamentoPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<OrcamentoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    void (async () => {
      try {
        const { data: result, error } = await supabase.rpc("get_orcamento_by_token", { p_token: token });
        if (error || !result) { setNotFound(true); } else { setData(result as OrcamentoPublico); }
      } catch { setNotFound(true); } finally { setLoading(false); }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f0fdf4]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#15a898] border-t-transparent" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f0fdf4] px-6 text-center">
        <div className="rounded-xl border border-red-200 bg-white px-8 py-10 shadow-md">
          <p className="text-4xl font-bold text-red-400">404</p>
          <p className="mt-2 text-lg font-semibold text-gray-700">Orçamento não encontrado</p>
          <p className="mt-1 text-sm text-gray-400">Este link pode ter expirado ou é inválido.</p>
        </div>
      </div>
    );
  }

  const valorFinal = data.valor_com_desconto ?? data.valor_total;
  const economia = data.valor_total - valorFinal;
  const dataEmissao = new Date(data.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const validade = data.validade ? new Date(`${data.validade}T12:00:00`).toLocaleDateString("pt-BR") : null;

  return (
    <div className="min-h-[100dvh] bg-[#f0fdf4] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 rounded-xl border border-[#bbf7d0] bg-white px-6 py-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#15a898]">{data.clinica_nome}</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900">Orçamento</h1>
              <p className="mt-0.5 text-sm text-gray-500">Emitido em {dataEmissao}</p>
            </div>
            {validade && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Válido até {validade}
              </span>
            )}
          </div>
        </div>

        {/* Dados do paciente */}
        <div className="mb-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#15a898]">Dados do paciente</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoItem label="Nome completo" value={data.paciente_nome} />
            {data.paciente_cpf && <InfoItem label="CPF" value={data.paciente_cpf} />}
            {data.paciente_whatsapp && <InfoItem label="WhatsApp" value={data.paciente_whatsapp} />}
            {data.atendente_nome && <InfoItem label="Atendente responsável" value={data.atendente_nome} />}
          </div>
        </div>

        {/* Itens */}
        {data.itens && data.itens.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 pt-4 pb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#15a898]">Serviços incluídos</p>
            </div>
            <div className="divide-y divide-gray-50">
              {data.itens.map((item) => (
                <div className="flex items-start justify-between gap-4 px-6 py-3" key={item.id}>
                  <div>
                    <p className="font-semibold text-gray-800">{item.nome}</p>
                    {item.descricao && <p className="mt-0.5 text-sm text-gray-400">{item.descricao}</p>}
                    {item.quantidade > 1 && <p className="mt-0.5 text-xs text-gray-400">Qtd: {item.quantidade}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-gray-900">{brl.format(item.preco_individual * item.quantidade)}</p>
                    {item.quantidade > 1 && <p className="text-xs text-gray-400">{brl.format(item.preco_individual)} / un.</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totais */}
        <div className="mb-4 rounded-xl border border-[#bbf7d0] bg-white px-6 py-5 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal (sem desconto)</span>
              <span className={data.valor_com_desconto ? "font-medium text-gray-400 line-through" : "font-bold text-gray-900"}>
                {brl.format(data.valor_total)}
              </span>
            </div>
            {data.valor_com_desconto !== null && (
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-700">Total com desconto</span>
                <span className="text-2xl font-bold text-[#15a898]">{brl.format(data.valor_com_desconto)}</span>
              </div>
            )}
            {economia > 0 && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                <span className="text-sm font-semibold text-emerald-700">Sua economia</span>
                <span className="text-lg font-bold text-emerald-600">{brl.format(economia)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Observações */}
        {data.observacoes && (
          <div className="mb-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#15a898]">Observações</p>
            <p className="text-sm text-gray-600">{data.observacoes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-400">
          <p>{data.clinica_nome} · {validade ? `Válido até ${validade}` : "Entre em contato para informações sobre validade"}</p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
