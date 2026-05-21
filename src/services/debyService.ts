import { supabase } from "../lib/supabaseClient";

export type DebyAction =
  | "clinical_summary"
  | "clinical_structure"
  | "whatsapp_summary"
  | "whatsapp_reply"
  | "lead_analysis"
  | "finance_insights"
  | "agenda_insights";

export async function askDeby(input: {
  clinicId: string;
  action: DebyAction;
  module: string;
  text: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke("deby-ai", {
    body: {
      clinicId: input.clinicId,
      action: input.action,
      module: input.module,
      input: input.text,
      metadata: input.metadata ?? {}
    }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return String(data?.output ?? "");
}

