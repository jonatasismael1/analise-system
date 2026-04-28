-- Permite que usuários autenticados criem sua própria clínica
drop policy if exists "clinicas authenticated insert" on public.clinicas;
create policy "clinicas authenticated insert" on public.clinicas
for insert to authenticated
with check (user_id = auth.uid());
