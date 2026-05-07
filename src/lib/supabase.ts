import { createClient } from "@supabase/supabase-js";
import type { GroupMember } from "@0xchat/app-sdk";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = url && key ? createClient(url, key) : null;

// ---------- Groups ----------

export async function publishGroup(group: { id: string; name: string; avatar: string; inviteCode: string }): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("groups").upsert(
      { id: group.id, name: group.name, avatar: group.avatar, invite_code: group.inviteCode },
      { onConflict: "id" }
    );
  } catch {}
}

export async function fetchGroups(walletAddress: string): Promise<{ id: string; name: string; avatar: string; inviteCode: string }[]> {
  if (!supabase) return [];
  try {
    const { data: memberships, error: memErr } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("wallet_address", walletAddress);
    console.log("[supabase] group_members rows:", memberships, "error:", memErr);
    if (!memberships?.length) return [];
    const groupIds = memberships.map((m: any) => m.group_id);
    const { data: groups, error: grpErr } = await supabase
      .from("groups")
      .select("id, name, avatar, invite_code")
      .in("id", groupIds);
    console.log("[supabase] groups rows:", groups, "error:", grpErr);
    return (groups ?? []).map((g: any) => ({
      id: g.id,
      name: g.name,
      avatar: g.avatar ?? "",
      inviteCode: g.invite_code ?? "",
    }));
  } catch (e) { console.error("[supabase] fetchGroups error:", e); return []; }
}

export async function fetchGroupById(groupId: string): Promise<{ id: string; name: string; avatar: string; inviteCode: string } | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("groups")
      .select("id, name, avatar, invite_code")
      .eq("id", groupId)
      .single();
    if (!data) return null;
    return { id: data.id, name: data.name, avatar: data.avatar ?? "", inviteCode: data.invite_code ?? "" };
  } catch { return null; }
}

// ---------- Members ----------

export async function publishMember(groupId: string, member: GroupMember): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("group_members").upsert(
      {
        group_id: groupId,
        wallet_address: member.walletAddress,
        display_name: member.displayName ?? "",
        avatar: member.avatar ?? "",
        roles: member.roles ?? [],
      },
      { onConflict: "group_id,wallet_address" }
    );
  } catch {}
}

export async function fetchMembers(groupId: string): Promise<GroupMember[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("group_members")
      .select("wallet_address, display_name, avatar, roles")
      .eq("group_id", groupId);
    return (data ?? []).map((r) => ({
      walletAddress: r.wallet_address,
      displayName: r.display_name,
      avatar: r.avatar,
      roles: r.roles,
    }));
  } catch { return []; }
}

// ---------- Expenses ----------

export async function publishExpense(expense: Record<string, any>): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("group_expenses").upsert({
      id: expense.id,
      group_id: expense.groupId,
      data: expense,
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function deleteExpenseRemote(expenseId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("group_expenses").delete().eq("id", expenseId);
  } catch {}
}

export async function fetchExpenses(groupId: string): Promise<Record<string, any>[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("group_expenses")
      .select("data")
      .eq("group_id", groupId);
    return (data ?? []).map((r) => r.data);
  } catch { return []; }
}
