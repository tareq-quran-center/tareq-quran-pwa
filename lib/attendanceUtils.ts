import { AttendanceRecordRow, AttendanceStatusEnum } from "@/types";

export const STATUS_ARABIC_TO_ENGLISH: Record<string, string> = {
  "حاضر": "present",
  "غائب": "absent",
  "متأخر": "late",
  "مستأذن": "excused",
  "لم يرصد": "unrecorded",
};

export const STATUS_ENGLISH_TO_ARABIC: Record<string, string> = {
  "present": "حاضر",
  "absent": "غائب",
  "late": "متأخر",
  "excused": "مستأذن",
  "unrecorded": "لم يرصد",
};

export function normalizeAttendanceStatus(status: any): AttendanceStatusEnum {
  if (!status) return "حاضر";
  return (STATUS_ENGLISH_TO_ARABIC[status] || status) as AttendanceStatusEnum;
}

export function normalizeAttendanceRecord(record: any): AttendanceRecordRow {
  if (!record) return record;
  return {
    ...record,
    status: normalizeAttendanceStatus(record.status),
  };
}
