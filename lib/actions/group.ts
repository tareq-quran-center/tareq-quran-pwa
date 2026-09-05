"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { GroupRow } from "@/types";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export type GroupRole = "owner" | "assistant";

export interface GroupSummary {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  role: GroupRole;
}

export interface GetUserGroupsResult {
  success: boolean;
  data?: GroupSummary[];
  error?: string;
}

export type ActiveGroupIdResult = {
  status: "ok" | "no_group";
  groupId?: string;
  groups?: GroupSummary[];
};

export type ActiveGroupResult =
  | {
      status: "ok";
      group: GroupSummary;
      groups?: GroupSummary[];
    }
  | {
      status: "no_group";
      groups?: GroupSummary[];
    };

/**
 * 1. getUserGroups()
 * Comprehensive resolver:
 * - Groups where user is member in group_members
 * - Groups created by user (created_by)
 * - If user is Admin, all groups in the center
 */
export async function getUserGroups(): Promise<GetUserGroupsResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك للوصول، يرجى تسجيل الدخول أولاً",
      };
    }

    // 1. Fetch memberships from group_members
    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", user.id);

    // 2. Fetch groups created by user
    const { data: createdGroups } = await supabase
      .from("groups")
      .select("id, name, created_by, created_at")
      .eq("created_by", user.id);

    // 3. Check if user is Admin in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    let allCenterGroups: any[] = [];
    if (isAdmin) {
      const { data: allG } = await supabase
        .from("groups")
        .select("id, name, created_by, created_at");
      if (allG) allCenterGroups = allG;
    }

    // 4. Fetch details of member groups
    const groupIdsFromMembers = (memberships || []).map((m) => m.group_id);
    let memberGroups: any[] = [];
    if (groupIdsFromMembers.length > 0) {
      const { data: mg } = await supabase
        .from("groups")
        .select("id, name, created_by, created_at")
        .in("id", groupIdsFromMembers);
      if (mg) memberGroups = mg;
    }

    // Merge and deduplicate
    const groupMap = new Map<string, GroupSummary>();

    // Center groups (if admin)
    allCenterGroups.forEach((g) => {
      groupMap.set(g.id, {
        id: g.id,
        name: g.name,
        created_by: g.created_by || "",
        created_at: g.created_at,
        role: "owner",
      });
    });

    // Created groups
    (createdGroups || []).forEach((g) => {
      groupMap.set(g.id, {
        id: g.id,
        name: g.name,
        created_by: g.created_by || "",
        created_at: g.created_at,
        role: "owner",
      });
    });

    // Member groups
    const roleMap = new Map<string, GroupRole>(
      (memberships || []).map((m) => [m.group_id, (m.role as GroupRole) || "owner"])
    );
    memberGroups.forEach((g) => {
      groupMap.set(g.id, {
        id: g.id,
        name: g.name,
        created_by: g.created_by || "",
        created_at: g.created_at,
        role: roleMap.get(g.id) || "owner",
      });
    });

    const userGroups: GroupSummary[] = Array.from(groupMap.values());
    userGroups.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));

    return {
      success: true,
      data: userGroups,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
    };
  }
}

export const getUserGroupsCached = cache(getUserGroups);

/**
 * 2. getActiveGroupId()
 * Automatically resolves the active group:
 * - Checks active_group_id cookie
 * - Falls back to first available group
 * - Always returns status: "ok" if any group exists so actions are NEVER blocked
 */
export async function getActiveGroupId(): Promise<ActiveGroupIdResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { status: "no_group" };
    }

    const groupsRes = await getUserGroups();
    if (!groupsRes.success || !groupsRes.data || groupsRes.data.length === 0) {
      return { status: "no_group" };
    }

    const userGroups = groupsRes.data;

    // Check cookie
    let activeGroupId = userGroups[0].id;
    try {
      const cookieStore = cookies();
      const cookieVal = cookieStore.get("active_group_id")?.value;
      if (cookieVal && userGroups.some((g) => g.id === cookieVal)) {
        activeGroupId = cookieVal;
      }
    } catch {
      // ignore in environments where cookies cannot be read
    }

    return {
      status: "ok",
      groupId: activeGroupId,
      groups: userGroups,
    };
  } catch {
    return { status: "no_group" };
  }
}

export const getActiveGroupIdCached = cache(getActiveGroupId);

/**
 * 3. getActiveGroup()
 * Resolves active group details
 */
export async function getActiveGroup(): Promise<ActiveGroupResult> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { status: "no_group" };
    }

    const groupsRes = await getUserGroups();
    if (!groupsRes.success || !groupsRes.data || groupsRes.data.length === 0) {
      return { status: "no_group" };
    }

    const userGroups = groupsRes.data;
    let selected = userGroups[0];

    try {
      const cookieStore = cookies();
      const cookieVal = cookieStore.get("active_group_id")?.value;
      const found = userGroups.find((g) => g.id === cookieVal);
      if (found) selected = found;
    } catch {
      // ignore
    }

    return {
      status: "ok",
      group: selected,
      groups: userGroups,
    };
  } catch {
    return { status: "no_group" };
  }
}

export const getActiveGroupCached = cache(getActiveGroup);

/**
 * 4. setActiveGroupId()
 * Switches the active group for the user across the app
 */
export async function setActiveGroupId(groupId: string): Promise<ActionResult> {
  try {
    const cookieStore = cookies();
    cookieStore.set("active_group_id", groupId, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath("/admin");
    return { success: true };
  } catch {
    return { success: false, error: "تعذر تغيير الحلقة النشطة" };
  }
}

/**
 * 5. createDefaultGroup()
 * Explicit onboarding function to create default group with membership
 */
export async function createDefaultGroup(): Promise<ActionResult<GroupRow>> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك بإنشاء حلقة، يرجى تسجيل الدخول أولاً",
      };
    }

    // Check if user already belongs to any group
    const existingGroupsRes = await getUserGroups();
    if (existingGroupsRes.success && existingGroupsRes.data && existingGroupsRes.data.length > 0) {
      const firstGroup = existingGroupsRes.data[0];
      return {
        success: true,
        data: {
          id: firstGroup.id,
          name: firstGroup.name,
          created_by: firstGroup.created_by,
          created_at: firstGroup.created_at,
        },
      };
    }

    const newGroupId = crypto.randomUUID();
    const groupName = "حلقة القرآن الكريم الأولى";

    // Insert new group
    let newGroup: any = null;
    const { data: inserted, error: insertError } = await supabase
      .from("groups")
      .insert({
        id: newGroupId,
        name: groupName,
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (insertError) {
      const retry = await supabase
        .from("groups")
        .insert({
          id: newGroupId,
          name: groupName,
        })
        .select()
        .maybeSingle();

      if (retry.error) {
        return {
          success: false,
          error: "فشل إنشاء الحلقة: " + (retry.error.message || insertError.message),
        };
      }
      newGroup = retry.data || { id: newGroupId, name: groupName, created_by: user.id };
    } else {
      newGroup = inserted || { id: newGroupId, name: groupName, created_by: user.id };
    }

    // Add membership
    try {
      await supabase.from("group_members").insert({
        id: crypto.randomUUID(),
        group_id: newGroupId,
        user_id: user.id,
        role: "owner",
      });
    } catch (e) {
      console.warn("Could not insert group_member:", e);
    }

    // Set cookie
    try {
      const cookieStore = cookies();
      cookieStore.set("active_group_id", newGroupId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    } catch {}

    revalidatePath("/dashboard");
    revalidatePath("/students");
    return {
      success: true,
      data: newGroup,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إنشاء الحلقة",
    };
  }
}
