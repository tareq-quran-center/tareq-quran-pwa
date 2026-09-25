import {
  Database,
  LogTypeEnum,
  EvaluationGradeEnum,
  AttendanceStatusEnum,
} from "./database.types";

export type { Database, LogTypeEnum, EvaluationGradeEnum, AttendanceStatusEnum };

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type StudentSummaryRow = Database["public"]["Views"]["students_with_summary"]["Row"];

export type StudentRow = Database["public"]["Tables"]["students"]["Row"] & {
  total_pages_memorized?: number;
  total_recitations_count?: number;
  total_pages_count?: number;
};

export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

export type MemorizationLogRow = Database["public"]["Tables"]["memorization_logs"]["Row"];
export type MemorizationLogInsert = Database["public"]["Tables"]["memorization_logs"]["Insert"];
export type MemorizationLogUpdate = Database["public"]["Tables"]["memorization_logs"]["Update"];

export type AttendanceRow = Database["public"]["Tables"]["attendance"]["Row"];
export type AttendanceInsert = Database["public"]["Tables"]["attendance"]["Insert"];
export type AttendanceUpdate = Database["public"]["Tables"]["attendance"]["Update"];

export type AttendanceRecordRow = Database["public"]["Tables"]["attendance_records"]["Row"];
export type AttendanceRecordInsert = Database["public"]["Tables"]["attendance_records"]["Insert"];
export type AttendanceRecordUpdate = Database["public"]["Tables"]["attendance_records"]["Update"];

export type GroupRow = Database["public"]["Tables"]["groups"]["Row"];
export type GroupInsert = Database["public"]["Tables"]["groups"]["Insert"];
export type GroupUpdate = Database["public"]["Tables"]["groups"]["Update"];

export type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"];
export type GroupMemberInsert = Database["public"]["Tables"]["group_members"]["Insert"];
export type GroupMemberUpdate = Database["public"]["Tables"]["group_members"]["Update"];

export type SeasonRow = Database["public"]["Tables"]["seasons"]["Row"];
export type SeasonInsert = Database["public"]["Tables"]["seasons"]["Insert"];
export type SeasonUpdate = Database["public"]["Tables"]["seasons"]["Update"];

export type CircleRow = Database["public"]["Tables"]["circles"]["Row"];
export type CircleInsert = Database["public"]["Tables"]["circles"]["Insert"];
export type CircleUpdate = Database["public"]["Tables"]["circles"]["Update"];

export interface StudentWithProgress extends StudentRow {
  latest_log?: MemorizationLogRow | null;
  latest_attendance?: AttendanceRecordRow | null;
}

export interface ParentProgressPayload {
  success: boolean;
  error?: string;
  errorCode?: "NO_STUDENT_FOUND" | "DATABASE_QUERY_ERROR" | "INVALID_TOKEN";
  student?: {
    id: string;
    full_name: string;
    parent_phone?: string | null;
    academic_grade?: string | null;
    school_name?: string | null;
    address?: string | null;
    father_job?: string | null;
    avatar_url?: string | null;
    photo_url?: string | null;
    image_url?: string | null;
    avatar?: string | null;
    image?: string | null;
    created_at: string;
  };
  siblings?: Array<{
    id: string;
    full_name: string;
    parent_token: string;
    avatar_url?: string | null;
  }>;
  logs?: Array<{
    id: string;
    log_type: LogTypeEnum;
    surah_start: string;
    aya_start: number;
    surah_end: string;
    aya_end: number;
    grade: EvaluationGradeEnum;
    notes: string | null;
    assistant_name?: string | null;
    page_count?: number | null;
    surahs?: string[] | null;
    audio_url?: string | null;
    created_at: string;
  }>;
  attendance?: Array<{
    id: string;
    date: string;
    status: AttendanceStatusEnum;
    notes: string | null;
  }>;
  activities?: ActivityWithResponse[];
}

export interface ActivityRow {
  id: string;
  title: string;
  activity_type: string;
  cost: string;
  activity_date: string;
  location?: string | null;
  description?: string | null;
  target_type: "all" | "halaqa";
  target_group_id?: string | null;
  target_group_name?: string | null;
  is_active: boolean;
  created_at: string;
  created_by?: string | null;
}

export interface ActivityResponseRow {
  id: string;
  activity_id: string;
  student_id: string;
  status: "approved" | "rejected" | "pending";
  notes?: string | null;
  parent_phone?: string | null;
  created_at: string;
  updated_at?: string;
  student_name?: string;
  student_halaqa?: string;
}

export interface ActivityWithStats extends ActivityRow {
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  total_targeted_students?: number;
  responses?: ActivityResponseRow[];
}

export interface ActivityWithResponse extends ActivityRow {
  parent_response?: "approved" | "rejected" | null;
  parent_response_notes?: string | null;
  parent_response_date?: string | null;
}

export interface HalaqaWithDetails {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  teacher_id: string | null;
  teacher_name: string | null;
  teacher_phone: string | null;
  season_id?: string | null;
  season_name?: string | null;
  students_count: number;
  attendance_rate: number;
  total_pages: number;
}

export interface TeacherWithHalaqat {
  id: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "teacher" | string;
  is_active: boolean;
  created_at: string;
  halaqat: Array<{ id: string; name: string }>;
  students_count: number;
}

export interface AdminCenterOverview {
  totalStudents: number;
  totalHalaqat: number;
  totalTeachers: number;
  attendanceRate: number;
  totalPagesMemorized: number;
  totalRecitations: number;
  todayAttendanceCount: number;
}

export interface StudentTrackData {
  success: boolean;
  error?: string;
  student?: {
    id: string;
    full_name: string;
    parent_token: string;
    parent_phone?: string | null;
    academic_grade?: string | null;
    school_name?: string | null;
    join_date?: string | null;
    avatar_url?: string | null;
  };
  siblings?: Array<{
    id: string;
    full_name: string;
    parent_token: string;
    avatar_url?: string | null;
  }>;
  halaqa?: {
    id: string;
    name: string;
  } | null;
  season?: {
    id: string;
    name: string;
  } | null;
  teacher?: {
    id: string;
    full_name: string;
    phone?: string | null;
  } | null;
  attendanceRate: number;
  totalDays: number;
  presentDays: number;
  latestHifz?: {
    surah_start: string;
    aya_start: number;
    surah_end: string;
    aya_end: number;
    grade: string;
    date: string;
    page_count?: number | null;
    audio_url?: string | null;
  } | null;
  latestRevision?: {
    surah_start: string;
    aya_start: number;
    surah_end: string;
    aya_end: number;
    grade: string;
    date: string;
    page_count?: number | null;
    audio_url?: string | null;
  } | null;
  todayEvaluation?: {
    log_type: string;
    grade: string;
    notes?: string | null;
    date: string;
    audio_url?: string | null;
  } | null;
  teacherNotes?: string | null;
  recentLogs?: Array<{
    id: string;
    log_type: string;
    surah_start: string;
    aya_start: number;
    surah_end: string;
    aya_end: number;
    grade: string;
    notes?: string | null;
    date: string;
    page_count?: number | null;
    audio_url?: string | null;
  }>;
  recentAttendance?: Array<{
    id: string;
    date: string;
    status: string;
    notes?: string | null;
  }>;
}

export interface BulkImportStudentInput {
  name: string;
  parent_phone: string;
  phone?: string | null;
  notes?: string | null;
  academic_grade?: string | null;
}

export interface BulkImportPayload {
  circle_id: string;
  students: BulkImportStudentInput[];
}

export interface BulkImportResult {
  success: boolean;
  insertedCount: number;
  failedCount: number;
  insertedStudents: Array<{
    id: string;
    name: string;
    parent_phone: string | null;
    parent_token: string;
    track_url: string;
    group_id?: string | null;
    teacher_id?: string;
  }>;
  errors?: string[];
  error?: string;
}

