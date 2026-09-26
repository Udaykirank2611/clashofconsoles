import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Ctx = { supabase: any; userId: string };

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function anonClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function assertOwner(ctx: Ctx) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Only the Super Admin can do this.");
}

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72)
  .regex(/[A-Za-z]/, "Password needs a letter.")
  .regex(/[0-9]/, "Password needs a number.");

const clientInfo = z.object({ browser: z.string().max(60).optional(), device: z.string().max(60).optional() });

async function roleInfo(admin: any, userId: string) {
  const [{ data: roles }, { data: branches }] = await Promise.all([
    admin.from("user_roles").select("role, branch_id").eq("user_id", userId),
    admin.from("branches").select("id, name"),
  ]);
  const owner = (roles ?? []).some((r: any) => r.role === "owner");
  const branchId = (roles ?? []).find((r: any) => r.branch_id)?.branch_id ?? null;
  const branch = owner ? "All Branches" : (branches ?? []).find((b: any) => b.id === branchId)?.name ?? "—";
  return { role: owner ? "Super Admin" : roles?.length ? "Branch Manager" : null, branch, branchId };
}

/* ------------------------------ Sign in ------------------------------ */

export const adminSignIn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ username: z.string().trim().min(1).max(120), password: z.string().min(1).max(72) }).merge(clientInfo).parse(i),
  )
  .handler(async ({ data }) => {
    const admin = await loadAdmin();
    const uname = data.username.toLowerCase();
    const log = (row: Record<string, unknown>) =>
      admin.from("admin_login_events").insert({ username: data.username, browser: data.browser, device: data.device, ...row });

    const { data: profile } = await admin.from("admin_profiles").select("*").eq("username", uname).maybeSingle();
    if (!profile) {
      await log({ success: false, reason: "User not found" });
      return { ok: false as const, message: "Incorrect username or password." };
    }
    const info = await roleInfo(admin, profile.user_id);
    const base = { user_id: profile.user_id, full_name: profile.full_name, role: info.role, branch: info.branch };
    if (profile.is_disabled) {
      await log({ ...base, success: false, reason: "Account disabled" });
      return { ok: false as const, message: "This account has been disabled." };
    }
    const { data: u } = await admin.auth.admin.getUserById(profile.user_id);
    const email = u?.user?.email;
    const anon = await anonClient();
    const { data: signed, error } = email
      ? await anon.auth.signInWithPassword({ email, password: data.password })
      : { data: null, error: new Error("no email") };
    if (error || !signed?.session) {
      await log({ ...base, success: false, reason: "Wrong password" });
      return { ok: false as const, message: "Incorrect username or password." };
    }
    const { data: sess } = await admin
      .from("admin_sessions")
      .insert({ user_id: profile.user_id, browser: data.browser, device: data.device })
      .select("id")
      .single();
    await Promise.all([
      log({ ...base, success: true }),
      admin.from("admin_profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", profile.user_id),
    ]);
    return {
      ok: true as const,
      accessToken: signed.session.access_token,
      refreshToken: signed.session.refresh_token,
      sessionId: sess?.id as string,
    };
  });

/* --------------------------- Session tracking --------------------------- */

export const registerSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => clientInfo.parse(i))
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    const { data: row } = await admin
      .from("admin_sessions")
      .insert({ user_id: context.userId, browser: data.browser, device: data.device })
      .select("id")
      .single();
    return { sessionId: row?.id as string };
  });

export const pingSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    const [{ data: s }, { data: p }] = await Promise.all([
      admin.from("admin_sessions").select("revoked_at, user_id").eq("id", data.sessionId).maybeSingle(),
      admin.from("admin_profiles").select("is_disabled").eq("user_id", context.userId).maybeSingle(),
    ]);
    if (!s || s.user_id !== context.userId || s.revoked_at || p?.is_disabled) return { valid: false };
    await admin.from("admin_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", data.sessionId);
    return { valid: true };
  });

export const endSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const admin = await loadAdmin();
    await admin
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/* --------------------------- Change password --------------------------- */

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ current: z.string().min(1).max(72), next: passwordSchema, sessionId: z.string().uuid().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    const admin = await loadAdmin();
    const { data: u } = await admin.auth.admin.getUserById(context.userId);
    const email = u?.user?.email;
    const anon = await anonClient();
    const { error } = email
      ? await anon.auth.signInWithPassword({ email, password: data.current })
      : { error: new Error("x") };
    if (error) return { ok: false, message: "Current password is incorrect." };
    const { error: upd } = await admin.auth.admin.updateUserById(context.userId, { password: data.next });
    if (upd) return { ok: false, message: upd.message };
    let q = admin
      .from("admin_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("revoked_at", null);
    if (data.sessionId) q = q.neq("id", data.sessionId);
    await q;
    return { ok: true };
  });

/* --------------------------- Login accounts --------------------------- */

export type LoginAccount = {
  userId: string;
  username: string;
  fullName: string;
  role: "Super Admin" | "Branch Manager";
  branchId: string | null;
  branch: string;
  disabled: boolean;
  lastLogin: string | null;
};

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LoginAccount[]> => {
    await assertOwner(context as Ctx);
    const admin = await loadAdmin();
    const [{ data: profiles }, { data: roles }, { data: branches }] = await Promise.all([
      admin.from("admin_profiles").select("*").order("created_at"),
      admin.from("user_roles").select("user_id, role, branch_id"),
      admin.from("branches").select("id, name"),
    ]);
    return (profiles ?? []).map((p: any) => {
      const mine = (roles ?? []).filter((r: any) => r.user_id === p.user_id);
      const owner = mine.some((r: any) => r.role === "owner");
      const branchId = mine.find((r: any) => r.branch_id)?.branch_id ?? null;
      return {
        userId: p.user_id,
        username: p.username,
        fullName: p.full_name,
        role: owner ? "Super Admin" : "Branch Manager",
        branchId: owner ? null : branchId,
        branch: owner ? "All Branches" : (branches ?? []).find((b: any) => b.id === branchId)?.name ?? "—",
        disabled: p.is_disabled,
        lastLogin: p.last_login_at,
      };
    });
  });

const accountFields = z.object({
  fullName: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9._@+-]+$/, "Username can use letters, numbers, dots, dashes and @."),
  role: z.enum(["owner", "branch_admin"]),
  branchId: z.string().uuid().nullable(),
});

async function setRole(admin: any, userId: string, role: "owner" | "branch_admin", branchId: string | null) {
  await admin.from("user_roles").delete().eq("user_id", userId);
  const { error } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role, branch_id: role === "owner" ? null : branchId });
  if (error) throw new Error(error.message);
}

async function usernameTaken(admin: any, username: string, exceptId?: string) {
  let q = admin.from("admin_profiles").select("user_id").eq("username", username);
  if (exceptId) q = q.neq("user_id", exceptId);
  const { data } = await q.maybeSingle();
  return !!data;
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => accountFields.extend({ password: passwordSchema }).parse(i))
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    if (data.role === "branch_admin" && !data.branchId) return { ok: false, message: "Choose a branch." };
    const admin = await loadAdmin();
    if (await usernameTaken(admin, data.username)) return { ok: false, message: "That username is already taken." };
    const email = data.username.includes("@") ? data.username : `${data.username}@staff.clashofconsoles.com`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false, message: error?.message ?? "Could not create account." };
    await admin
      .from("admin_profiles")
      .insert({ user_id: created.user.id, username: data.username, full_name: data.fullName });
    await setRole(admin, created.user.id, data.role, data.branchId);
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    accountFields.extend({ userId: z.string().uuid(), disabled: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    if (data.role === "branch_admin" && !data.branchId) return { ok: false, message: "Choose a branch." };
    if (data.userId === context.userId && (data.disabled || data.role !== "owner"))
      return { ok: false, message: "You cannot disable or demote your own account." };
    const admin = await loadAdmin();
    if (await usernameTaken(admin, data.username, data.userId))
      return { ok: false, message: "That username is already taken." };
    await admin
      .from("admin_profiles")
      .update({ username: data.username, full_name: data.fullName, is_disabled: data.disabled, updated_at: new Date().toISOString() })
      .eq("user_id", data.userId);
    await setRole(admin, data.userId, data.role, data.branchId);
    await applyDisabled(admin, data.userId, data.disabled);
    return { ok: true };
  });

async function revokeAll(admin: any, userId: string) {
  await admin
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
}

async function applyDisabled(admin: any, userId: string, disabled: boolean) {
  await admin.auth.admin.updateUserById(userId, { ban_duration: disabled ? "876000h" : "none" });
  if (disabled) await revokeAll(admin, userId);
}

export const setAccountDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), disabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    if (data.userId === context.userId) return { ok: false, message: "You cannot disable your own account." };
    const admin = await loadAdmin();
    await admin.from("admin_profiles").update({ is_disabled: data.disabled }).eq("user_id", data.userId);
    await applyDisabled(admin, data.userId, data.disabled);
    return { ok: true };
  });

export const resetAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), password: passwordSchema }).parse(i))
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    const admin = await loadAdmin();
    const { error } = await admin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) return { ok: false, message: error.message };
    await revokeAll(admin, data.userId);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    if (data.userId === context.userId) return { ok: false, message: "You cannot delete the account you're using." };
    const admin = await loadAdmin();
    await admin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

/* --------------------------- Activity & sessions --------------------------- */

export const listLoginEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ success: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    const admin = await loadAdmin();
    const { data: rows } = await admin
      .from("admin_login_events")
      .select("*")
      .eq("success", data.success)
      .order("created_at", { ascending: false })
      .limit(data.success ? 100 : 500);
    return (rows ?? []) as {
      id: string;
      username: string;
      full_name: string | null;
      role: string | null;
      branch: string | null;
      browser: string | null;
      device: string | null;
      reason: string | null;
      created_at: string;
    }[];
  });

export const listActiveSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sessionId: z.string().uuid().nullable() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    const admin = await loadAdmin();
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [{ data: rows }, { data: profiles }, { data: roles }, { data: branches }] = await Promise.all([
      admin
        .from("admin_sessions")
        .select("*")
        .is("revoked_at", null)
        .gte("last_seen_at", since)
        .order("login_at", { ascending: false }),
      admin.from("admin_profiles").select("user_id, username, full_name"),
      admin.from("user_roles").select("user_id, role, branch_id"),
      admin.from("branches").select("id, name"),
    ]);
    return (rows ?? []).map((s: any) => {
      const p = (profiles ?? []).find((x: any) => x.user_id === s.user_id);
      const mine = (roles ?? []).filter((r: any) => r.user_id === s.user_id);
      const owner = mine.some((r: any) => r.role === "owner");
      const bid = mine.find((r: any) => r.branch_id)?.branch_id;
      const online = Date.now() - new Date(s.last_seen_at).getTime() < 2 * 60 * 1000;
      return {
        id: s.id as string,
        username: p?.username ?? "—",
        fullName: p?.full_name ?? "",
        branch: owner ? "All Branches" : (branches ?? []).find((b: any) => b.id === bid)?.name ?? "—",
        browser: s.browser as string | null,
        device: s.device as string | null,
        loginAt: s.login_at as string,
        status: online ? "Online" : "Idle",
        isCurrent: s.id === data.sessionId,
      };
    });
  });

export const forceLogout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ targetId: z.string().uuid(), sessionId: z.string().uuid().nullable() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context as Ctx);
    if (data.targetId === data.sessionId) return { ok: false, message: "You cannot log out your own session." };
    const admin = await loadAdmin();
    await admin.from("admin_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", data.targetId);
    return { ok: true };
  });
