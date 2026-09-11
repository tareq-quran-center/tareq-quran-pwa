import { SeasonRow } from "@/types";

export const FALLBACK_SEASONS: SeasonRow[] = [
  {
    id: "1cf3bae5-b259-4f96-babe-4dcd80598ed8",
    name: "النادي الدائم",
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "bc3c7462-3567-40ea-bb19-ebfd32b15c71",
    name: "النادي الصيفي",
    is_active: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "0701bbdb-5a34-426f-afee-4f8dd296cc4e",
    name: "النادي الشتوي",
    is_active: false,
    created_at: new Date().toISOString(),
  },
];
