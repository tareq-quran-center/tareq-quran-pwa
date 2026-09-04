"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type RealtimePayload<T extends { [key: string]: any } = Record<string, any>> = RealtimePostgresChangesPayload<T>;

interface RealtimeSyncOptions {
  tables?: Array<"students" | "memorization_logs" | "attendance_records">;
  onPayload?: (payload: RealtimePayload<any>) => void;
  enableToast?: boolean;
}

const DEFAULT_TABLES: Array<"students" | "memorization_logs" | "attendance_records"> = [
  "students",
  "memorization_logs",
  "attendance_records",
];

/**
 * Pure inbound Supabase Realtime synchronization hook.
 * Strictly listens to postgres_changes and refreshes client view.
 * Guarantees proper channel cleanup on unmount.
 */
export function useRealtimeSync(options: RealtimeSyncOptions = {}) {
  const { tables = DEFAULT_TABLES, onPayload, enableToast = true } = options;

  const router = useRouter();
  const [notification, setNotification] = useState<string | null>(null);
  const onPayloadRef = useRef(onPayload);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tablesKey = tables.slice().sort().join(",");

  useEffect(() => {
    onPayloadRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    const supabase = createClient();
    const channels: RealtimeChannel[] = [];
    const activeTables = tablesKey.split(",") as Array<"students" | "memorization_logs" | "attendance_records">;

    activeTables.forEach((table) => {
      const channelName = `realtime_${table}_${Math.random().toString(36).substring(2, 9)}`;

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: table,
          },
          (payload: RealtimePayload) => {
            if (enableToast) {
              setNotification("🔔 تم تحديث البيانات فوريًا دون الحاجة لإعادة التحميل");
              setTimeout(() => setNotification(null), 3500);
            }

            // 1. Instant client-side state callback if provided (0ms responsive UI)
            if (onPayloadRef.current) {
              onPayloadRef.current(payload);
            }

            // 2. Debounced Server Component tree refresh to batch rapid updates and avoid duplicate invocations
            if (refreshTimeoutRef.current) {
              clearTimeout(refreshTimeoutRef.current);
            }
            refreshTimeoutRef.current = setTimeout(() => {
              router.refresh();
            }, 600);
          }
        )
        .subscribe();

      channels.push(channel);
    });

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      channels.forEach((ch) => {
        try {
          supabase.removeChannel(ch);
        } catch {
          // Cleanup ignore
        }
      });
    };
  }, [tablesKey, enableToast, router]);

  return { notification };
}
