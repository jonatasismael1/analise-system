export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      clinicas: {
        Row: { id: string; nome: string; slug: string; email: string; user_id: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; nome: string; slug: string; email: string; user_id?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["clinicas"]["Insert"]>;
      };
      profissionais: {
        Row: { id: string; clinica_id: string; nome: string; especialidade: string; email: string | null; telefone: string | null; registro: string | null; conselho: string | null; foto_url: string | null; horarios: Json; ativo: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; nome: string; especialidade?: string; email?: string | null; telefone?: string | null; registro?: string | null; conselho?: string | null; foto_url?: string | null; horarios?: Json; ativo?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["profissionais"]["Insert"]>;
      };
      servicos: {
        Row: { id: string; clinica_id: string; profissional_id: string | null; nome: string; duracao_min: number; preco: number; ativo: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; profissional_id?: string | null; nome: string; duracao_min?: number; preco?: number; ativo?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["servicos"]["Insert"]>;
      };
      pacientes: {
        Row: { id: string; clinica_id: string; nome: string; whatsapp: string; email: string | null; cpf: string | null; data_nascimento: string | null; endereco: string | null; status: string; profissional_id: string | null; ultimo_atendimento: string | null; proximo_retorno: string | null; valor_total_gasto: number; observacoes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; nome: string; whatsapp: string; email?: string | null; cpf?: string | null; data_nascimento?: string | null; endereco?: string | null; status?: string; profissional_id?: string | null; ultimo_atendimento?: string | null; proximo_retorno?: string | null; valor_total_gasto?: number; observacoes?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["pacientes"]["Insert"]>;
      };
      agendamentos: {
        Row: { id: string; clinica_id: string; profissional_id: string; servico_id: string | null; paciente_id: string | null; paciente_nome: string; paciente_whatsapp: string; data: string; horario: string; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; profissional_id: string; servico_id?: string | null; paciente_id?: string | null; paciente_nome: string; paciente_whatsapp: string; data: string; horario: string; status?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["agendamentos"]["Insert"]>;
      };
      pacotes_sessoes: {
        Row: { id: string; clinica_id: string; paciente_id: string | null; servico_id: string | null; total_sessoes: number; sessoes_realizadas: number; validade: string | null; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; paciente_id?: string | null; servico_id?: string | null; total_sessoes?: number; sessoes_realizadas?: number; validade?: string | null; status?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["pacotes_sessoes"]["Insert"]>;
      };
      pagamentos: {
        Row: { id: string; clinica_id: string; paciente_id: string | null; servico_id: string | null; profissional_id: string | null; valor: number; data_vencimento: string | null; data_pagamento: string | null; status: string; forma_pagamento: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; paciente_id?: string | null; servico_id?: string | null; profissional_id?: string | null; valor?: number; data_vencimento?: string | null; data_pagamento?: string | null; status?: string; forma_pagamento?: string | null; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["pagamentos"]["Insert"]>;
      };
      despesas: {
        Row: { id: string; clinica_id: string; descricao: string; categoria: string | null; valor: number; data: string; status: string; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; descricao: string; categoria?: string | null; valor?: number; data?: string; status?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["despesas"]["Insert"]>;
      };
      usuarios: {
        Row: { id: string; clinica_id: string; user_id: string | null; profissional_id: string | null; nome: string; email: string; role: string; ativo: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; clinica_id: string; user_id?: string | null; profissional_id?: string | null; nome: string; email: string; role?: string; ativo?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>;
      };
    };
  };
}
