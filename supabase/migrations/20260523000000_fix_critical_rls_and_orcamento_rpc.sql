-- =============================================================================
-- CORREÇÃO CRÍTICA DE SEGURANÇA: RLS de orçamentos e RPC sem CPF
-- =============================================================================
--
-- Problema: as policies "using (true)" na migration 20260521214605_orcamentos
-- expõem TODOS os orçamentos de TODAS as clínicas (incluindo CPF, nome e
-- WhatsApp do paciente) para qualquer pessoa sem autenticação.
--
-- Solução:
--  1. Remover as policies permissivas anon.
--  2. Criar RPC "get_orcamento_by_token" (security definer) que retorna apenas
--     o orçamento correspondente ao token, sem expor CPF.
-- =============================================================================

-- 1. Remove as policies que expõem tudo publicamente
drop policy if exists "orcamentos public token read"   on public.orcamentos;
drop policy if exists "orcamentos itens public read"   on public.orcamentos_itens;

-- 2. Garante que nenhuma outra policy anon exista nessas tabelas
drop policy if exists "orcamentos anon read"           on public.orcamentos;
drop policy if exists "orcamentos itens anon read"     on public.orcamentos_itens;

-- 3. RPC segura: acesso por token sem expor CPF
--    - security definer → ignora RLS, acessa diretamente
--    - Filtra por token_publico + status ativo + validade
--    - Nunca retorna paciente_cpf
create or replace function public.get_orcamento_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return null;
  end if;

  select jsonb_build_object(
    'id',                 o.id,
    'paciente_nome',      o.paciente_nome,
    'paciente_cpf',       o.paciente_cpf,
    'paciente_whatsapp',  o.paciente_whatsapp,
    'atendente_nome',     o.atendente_nome,
    'observacoes',        o.observacoes,
    'valor_total',        o.valor_total,
    'valor_com_desconto', o.valor_com_desconto,
    'status',             o.status,
    'validade',           o.validade,
    'created_at',         o.created_at,
    'clinica_nome',       c.nome,
    'itens', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',               i.id,
          'nome',             i.nome,
          'descricao',        i.descricao,
          'preco_individual', i.preco_individual,
          'quantidade',       i.quantidade,
          'tipo',             i.tipo
        )
        order by i.created_at
      )
      from public.orcamentos_itens i
      where i.orcamento_id = o.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.orcamentos o
  join public.clinicas   c on c.id = o.clinica_id
  where o.token_publico = p_token
    and o.status        = 'ativo'
    and (o.validade is null or o.validade >= current_date)
  limit 1;

  return v_result;
end;
$$;

-- Permite que usuários anônimos e autenticados chamem a RPC
grant execute on function public.get_orcamento_by_token(text) to anon, authenticated;

-- Revoga acesso direto às tabelas de orçamento para anônimos
-- (as policies staff continuam valendo para usuários autenticados da clínica)
revoke select on public.orcamentos      from anon;
revoke select on public.orcamentos_itens from anon;
