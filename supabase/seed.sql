insert into public.clinicas (nome, slug, email, user_id)
values (
  'Clinic Pro Matriz',
  'clinic-pro-matriz',
  'admin@clinicpro.com',
  '1ceeca6c-6574-444a-9ba6-fbaa0851c2ff'
)
on conflict (slug)
do update set
  nome = excluded.nome,
  email = excluded.email,
  user_id = excluded.user_id;
