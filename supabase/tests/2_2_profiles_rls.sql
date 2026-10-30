-- Verifica RLS de profiles (tarea 2.2). Todo en una transacción con ROLLBACK.
begin;

do $$
declare
  ua uuid := gen_random_uuid();
  ub uuid := gen_random_uuid();
  n int;
  failed boolean;
  r public.user_role;
  nm text;
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (ua, 'a-' || ua || '@test.local', '{"role":"student","full_name":"Ana"}'),
         (ub, 'b-' || ub || '@test.local', '{"role":"instructor","full_name":"Beto"}');

  -- Visitante anónimo: no ve ningún perfil
  set local role anon;
  select count(*) into n from public.profiles;
  assert n = 0, 'un anónimo no debe ver perfiles';

  -- Usuario A: ve solo el suyo
  perform set_config('request.jwt.claims', json_build_object('sub', ua, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.profiles;
  assert n = 1, 'A debe ver exactamente 1 perfil (el suyo)';
  select count(*) into n from public.profiles where id = ub;
  assert n = 0, 'A no debe ver el perfil de B';

  -- A edita su nombre
  update public.profiles set full_name = 'Ana María' where id = ua;
  select full_name into nm from public.profiles where id = ua;
  assert nm = 'Ana María', 'A debe poder editar su nombre';

  -- A no puede editar el perfil de B (0 filas afectadas)
  update public.profiles set full_name = 'hack' where id = ub;
  get diagnostics n = row_count;
  assert n = 0, 'A no debe poder editar el perfil de B';

  -- A no puede elevar su rol
  failed := false;
  begin
    update public.profiles set role = 'instructor' where id = ua;
  exception when others then failed := true;
  end;
  assert failed, 'A no debe poder cambiar su rol';

  -- A no puede insertar perfiles ni borrar el suyo
  failed := false;
  begin
    insert into public.profiles (id, role) values (gen_random_uuid(), 'student');
  exception when others then failed := true;
  end;
  assert failed, 'A no debe poder insertar perfiles';

  delete from public.profiles where id = ua;
  get diagnostics n = row_count;
  assert n = 0, 'A no debe poder borrar su perfil';

  reset role;
  select role into r from public.profiles where id = ua;
  assert r = 'student', 'el rol de A sigue siendo student';
  select full_name into nm from public.profiles where id = ub;
  assert nm = 'Beto', 'el perfil de B no cambió';
end $$;

rollback;
