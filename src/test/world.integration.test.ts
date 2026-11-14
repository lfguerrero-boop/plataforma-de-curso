// Comprueba la propia ayuda contra el proyecto Supabase enlazado (crea y borra usuarios @example.com).
// Requiere .env.local con SUPABASE_SERVICE_ROLE_KEY.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminClient, createTestWorld, type TestWorld } from "@/test/world";

describe("createTestWorld", () => {
  let world: TestWorld;
  beforeAll(async () => {
    world = await createTestWorld();
  });
  afterAll(async () => {
    await world?.cleanup();
  });

  it("cada persona tiene su propia sesión", async () => {
    for (const user of [world.instructor, world.enrolledStudent, world.otherStudent]) {
      const { data } = await user.client.auth.getUser();
      expect(data.user?.id).toBe(user.id);
    }
    const ids = new Set([world.instructor.id, world.enrolledStudent.id, world.otherStudent.id]);
    expect(ids.size).toBe(3);
  });

  it("los roles salen de profiles", async () => {
    const role = async (user: { id: string; client: TestWorld["instructor"]["client"] }) =>
      (await user.client.from("profiles").select("role").eq("id", user.id).single()).data?.role;
    expect(await role(world.instructor)).toBe("instructor");
    expect(await role(world.enrolledStudent)).toBe("student");
    expect(await role(world.otherStudent)).toBe("student");
  });

  it("el curso es del instructor y está publicado", async () => {
    const { data } = await world.instructor.client
      .from("courses")
      .select("instructor_id, status")
      .eq("id", world.course.id)
      .single();
    expect(data).toEqual({ instructor_id: world.instructor.id, status: "published" });
  });

  it("solo el estudiante inscrito ve su inscripción y el contenido de la lección", async () => {
    const enrollments = async (client: TestWorld["instructor"]["client"]) =>
      (await client.from("enrollments").select("course_id").eq("course_id", world.course.id)).data;
    const content = async (client: TestWorld["instructor"]["client"]) =>
      (await client.from("lesson_contents").select("body").eq("lesson_id", world.course.lessonId)).data;

    expect(await enrollments(world.enrolledStudent.client)).toHaveLength(1);
    expect(await content(world.enrolledStudent.client)).toEqual([{ body: world.course.lessonBody }]);

    expect(await enrollments(world.otherStudent.client)).toHaveLength(0);
    expect(await content(world.otherStudent.client)).toHaveLength(0);
  });
});

describe("cleanup", () => {
  it("borra usuarios, curso e inscripción, y se puede llamar dos veces", async () => {
    const world = await createTestWorld();
    const ids = [world.instructor.id, world.enrolledStudent.id, world.otherStudent.id];

    await world.cleanup();
    await world.cleanup();

    const admin = adminClient();
    const users = await admin.auth.admin.listUsers({ perPage: 200 });
    expect(users.data.users.filter((u) => ids.includes(u.id))).toHaveLength(0);
    const courses = await admin.from("courses").select("id", { count: "exact", head: true }).eq("id", world.course.id);
    expect(courses.count).toBe(0);
  });
});
