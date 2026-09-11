export interface RawImportRow {
  [key: string]: string;
}

export interface NormalizedStudentRow {
  id: string;
  name: string;
  parent_phone: string;
  notes?: string;
  isValid: boolean;
  phoneStatus: "valid" | "warning" | "empty";
  errorMsg?: string;
}

export interface ColumnMapping {
  nameCol: string;
  parentPhoneCol: string;
  notesCol?: string;
}

/**
 * Dynamically parses an Excel file (.xlsx, .xls, .csv) client-side.
 * Uses dynamic import so that 'xlsx' is NEVER included in the initial page load bundle.
 */
export async function parseExcelFile(file: File): Promise<{
  rows: RawImportRow[];
  headers: string[];
}> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error("ملف الإكسل فارغ أو لا يحتوي على أوراق عمل");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Read as raw 2D array of strings
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!data || data.length === 0) {
    throw new Error("ورقة العمل المحددة فارغة");
  }

  // Find header row (the first row that has at least 1 non-empty cell)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (row && row.some((c) => String(c).trim().length > 0)) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("لم يتم العثور على عناوين أعمدة صالحة في الملف");
  }

  const rawHeaders = data[headerIndex].map((h, idx) =>
    String(h).trim() || `عمود_${idx + 1}`
  );

  const rows: RawImportRow[] = [];
  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row.some((c) => String(c).trim().length > 0)) continue;

    const rowObj: RawImportRow = {};
    rawHeaders.forEach((header, colIdx) => {
      rowObj[header] = String(row[colIdx] || "").trim();
    });
    rows.push(rowObj);
  }

  return { rows, headers: rawHeaders };
}

/**
 * Parses copied-and-pasted tabular text (from Excel, Google Sheets, Word, or WhatsApp).
 * Runs completely in client memory with 0 dependencies.
 */
export function parsePastedTable(text: string): {
  rows: RawImportRow[];
  headers: string[];
} {
  const clean = text.trim();
  if (!clean) return { rows: [], headers: [] };

  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { rows: [], headers: [] };

  // Detect delimiter: tab (\t) or comma (,) or semicolon (;)
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;

  let delimiter = "\t";
  if (commaCount > tabCount && commaCount > semiCount) delimiter = ",";
  else if (semiCount > tabCount && semiCount > commaCount) delimiter = ";";

  const matrix = lines.map((line) =>
    line.split(delimiter).map((cell) => cell.trim().replace(/^["']|["']$/g, ""))
  );

  if (matrix.length === 0) return { rows: [], headers: [] };

  // Check if first row contains column headers
  const firstRowStr = matrix[0].join(" ");
  const isHeaderRow =
    /اسم|طالب|هاتف|ولي|جوال|phone|name|student|ملاحظ/i.test(firstRowStr);

  let rawHeaders: string[] = [];
  let dataRows: string[][] = [];

  if (isHeaderRow && matrix.length > 1) {
    rawHeaders = matrix[0].map((h, idx) => h || `عمود_${idx + 1}`);
    dataRows = matrix.slice(1);
  } else {
    // Auto-generate header names
    const maxCols = Math.max(...matrix.map((r) => r.length));
    rawHeaders = Array.from({ length: maxCols }, (_, idx) => {
      if (idx === 0) return "اسم الطالب";
      if (idx === 1) return "رقم الهاتف";
      return `عمود_${idx + 1}`;
    });
    dataRows = matrix;
  }

  const rows: RawImportRow[] = dataRows
    .filter((r) => r.some((c) => c.length > 0))
    .map((r) => {
      const rowObj: RawImportRow = {};
      rawHeaders.forEach((h, idx) => {
        rowObj[h] = r[idx] || "";
      });
      return rowObj;
    });

  return { rows, headers: rawHeaders };
}

/**
 * Automatically detects and recommends column mapping for Student Name and Parent Phone.
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  let nameCol = "";
  let parentPhoneCol = "";
  let notesCol = "";

  // 1. Detect Name
  for (const h of headers) {
    const clean = h.toLowerCase();
    if (/اسم.*(طالب|كامل|ابن)|^(طالب|الاسم|اسم)$|full_?name|student_?name/i.test(clean)) {
      nameCol = h;
      break;
    }
  }
  if (!nameCol && headers.length > 0) {
    nameCol = headers.find((h) => /اسم|name|طالب/i.test(h)) || headers[0];
  }

  // 2. Detect Parent Phone
  for (const h of headers) {
    if (h === nameCol) continue;
    const clean = h.toLowerCase();
    if (/ولي.*(أمر|امر|هاتف|جوال)|هاتف.*ولي|parent.*phone|mobile|phone/i.test(clean)) {
      parentPhoneCol = h;
      break;
    }
  }
  if (!parentPhoneCol) {
    parentPhoneCol =
      headers.find((h) => h !== nameCol && /هاتف|جوال|تلفون|phone/i.test(h)) ||
      (headers.length > 1 ? headers[1] : "");
  }

  // 3. Detect Notes
  for (const h of headers) {
    if (h === nameCol || h === parentPhoneCol) continue;
    if (/ملاحظ|notes?|remark/i.test(h)) {
      notesCol = h;
      break;
    }
  }

  return { nameCol, parentPhoneCol, notesCol };
}

/**
 * Normalizes raw rows into strongly-typed preview items with Jordanian phone format validation.
 */
export function normalizeRawRows(
  rows: RawImportRow[],
  mapping: ColumnMapping
): NormalizedStudentRow[] {
  return rows.map((row, idx) => {
    const rawName = (row[mapping.nameCol] || "").trim();
    const rawPhone = mapping.parentPhoneCol ? (row[mapping.parentPhoneCol] || "").trim() : "";
    const rawNotes = mapping.notesCol ? (row[mapping.notesCol] || "").trim() : "";

    let phoneStatus: "valid" | "warning" | "empty" = "empty";
    let formattedPhone = rawPhone;
    let errorMsg: string | undefined = undefined;

    if (!rawName) {
      errorMsg = "اسم الطالب فارغ";
    }

    if (rawPhone) {
      // Clean non-digit characters except leading plus
      const digits = rawPhone.replace(/[^\d+]/g, "");
      const cleanDigits = digits.replace(/\D/g, "");

      // Check Jordanian mobile pattern (starts with 077, 078, 079, or 96277, etc.)
      const isJordanian =
        /^07[789]\d{7}$/.test(cleanDigits) ||
        /^9627[789]\d{7}$/.test(cleanDigits) ||
        /^7[789]\d{7}$/.test(cleanDigits);

      if (isJordanian) {
        phoneStatus = "valid";
        // Standardize to 07xxxxxxxx
        const core = cleanDigits.replace(/^962/, "").replace(/^0/, "");
        formattedPhone = `0${core}`;
      } else if (cleanDigits.length >= 7 && cleanDigits.length <= 15) {
        phoneStatus = "warning";
        formattedPhone = digits;
      } else {
        phoneStatus = "warning";
        formattedPhone = rawPhone;
      }
    } else {
      phoneStatus = "empty";
    }

    const isValid = Boolean(rawName && rawName.length >= 2);

    return {
      id: `row-${idx}-${Date.now()}`,
      name: rawName,
      parent_phone: formattedPhone,
      notes: rawNotes,
      isValid,
      phoneStatus,
      errorMsg,
    };
  });
}

/**
 * Generates and downloads a clean, ready-to-use Excel template for student enrollment.
 */
export async function downloadStudentImportTemplate(): Promise<void> {
  const XLSX = await import("xlsx");

  const templateData = [
    {
      "اسم الطالب الثلاثي": "محمد أحمد عبد الله",
      "رقم هاتف ولي الأمر": "0781234567",
      "ملاحظات إضافية": "حفظ سورة البقرة مسبقاً",
    },
    {
      "اسم الطالب الثلاثي": "عمر خالد المحمود",
      "رقم هاتف ولي الأمر": "0799876543",
      "ملاحظات إضافية": "طالب مستجد",
    },
    {
      "اسم الطالب الثلاثي": "يوسف إبراهيم خليل",
      "رقم هاتف ولي الأمر": "0775551122",
      "ملاحظات إضافية": "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 30 }, // اسم الطالب
    { wch: 20 }, // رقم الهاتف
    { wch: 35 }, // ملاحظات
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الطلاب");
  XLSX.writeFile(workbook, "نموذج_استيراد_طلاب_مركز_طارق.xlsx");
}

/**
 * Exports newly imported students with their personalized Parent Portal links to Excel.
 */
export async function exportImportedLinksToExcel(
  students: Array<{
    name: string;
    parent_phone: string | null;
    parent_token: string;
    track_url: string;
  }>,
  circleName: string
): Promise<void> {
  const XLSX = await import("xlsx");
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const exportData = students.map((s, idx) => ({
    "م": idx + 1,
    "اسم الطالب": s.name,
    "رقم هاتف ولي الأمر": s.parent_phone || "غير مسجل",
    "رابط متابعة ولي الأمر": `${origin}${s.track_url}`,
    "كود المتابعة (Token)": s.parent_token,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  worksheet["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 20 },
    { wch: 55 },
    { wch: 40 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "روابط المتابعة");
  const fileName = `روابط_متابعة_طلاب_${circleName.replace(/[^\w\u0621-\u064A]/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
