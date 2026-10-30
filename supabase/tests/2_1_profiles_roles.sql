-- Verifica user-roles (tarea 2.1). Todo corre en una transacción que termina en ROLLBACK.
begin;

do $$
declare
  u_student uuid := gen_random_uuid();
  u_instructor uuid := gen_random_uuid();
  u_bad uuid := gen_random_uuid();
  r public.user_role;
  failed boolean;
begin
  -- Registro como estudiante e instructor crea el perfil con el rol pedido
  insert into auth.users (id, email, raw_user_meta_data)
  values (u_student, 'est-' || u_student || '@test.local', '{"role":"student"}');
  insert into auth.users (id, email, raw_user_meta_data)
  values (u_instructor, 'ins-' || u_instructor || '@test.local', '{"role":"instructor"}');

  select role into r from public.profiles where id = u_student;
  assert r = 'student', 'el estudiante debe tener rol student';
  select role into r from public.profiles where id = u_instructor;
  assert r = 'instructor', 'el instructor debe tener rol instructor';

  -- Rol inválido o ausente: el registro falla
  failed := false;
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (u_bad, 'bad-' || u_bad || '@test.local', '{"role":"admin"}');
  exception when others then failed := true;
  end;
  assert failed, 'un rol inválido debe rechazar el registro';

  failed := false;
  begin
    insert into auth.users (id, email, raw_user_meta_data)
    values (u_bad, 'none-' || u_bad || '@test.local', '{}');
  exception when others then failed := true;
  end;
  assert failed, 'un registro sin rol debe fallar';

  -- Un usuario autenticado no puede elevar su rol
  perform set_config('request.jwt.claims', json_build_object('sub', u_student, 'role', 'authenticated')::text, true);
  failed := false;
  begin
    update public.profiles set role = 'instructor' where id = u_student;
  exception when others then failed := true;
  end;
  assert failed, 'el UPDATE del rol debe ser rechazado';

  select role into r from public.profiles where id = u_student;
  assert r = 'student', 'el rol debe seguir siendo student';

  raise notice 'OK 2.1: user-roles (alta, rol inválido, rol inmutable)';
end $$;

rollback;
