drop policy if exists "pagamentos professional own read" on public.pagamentos;
create policy "pagamentos professional own read" on public.pagamentos
for select to authenticated
using (profissional_id = private.current_profissional_id(clinica_id));
