/**
 * jadwal-sync.ts — Server-only Jadwal → Google Sheets sync service
 *
 * Handles:
 * - Spreadsheet creation (first sync)
 * - Weekly block writing (idempotent via JadwalSheetSync records)
 * - Employee ordering: LAKI_LAKI first, then PEREMPUAN, sorted by createdAt
 * - Cell content: "HH.mm sd HH.mm" for KERJA, status text for CUTI/IZIN/LIBUR
 * - Cell background by startTime:
 *     08:00–16:59 → gray  (#E0E0E0)
 *     17:00–23:59 → pink  (#FFCDD2)
 *     00:00–07:59 → blue  (#BBDEFB)
 * - Indonesian date/day headers
 * - Visible borders, bold headers, column widths
 *
 * NEVER import this file in client components.
 */

import { google, sheets_v4 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getOAuth2ClientForCafe } from "./client";

// ============================================================
// CONSTANTS
// ============================================================

const SHEET_NAME = "Jadwal";

const INDONESIAN_MONTHS = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
];

const DAY_NAMES_UPPER = [
  "SENIN",
  "SELASA",
  "RABU",
  "KAMIS",
  "JUMAT",
  "SABTU",
  "MINGGU",
];

// Color rules — determined by startTime hour
const COLOR_GRAY = { red: 0.878, green: 0.878, blue: 0.878 }; // #E0E0E0 — pagi/siang
const COLOR_PINK = { red: 1.0, green: 0.804, blue: 0.824 }; // #FFCDD2 — malam
const COLOR_BLUE = { red: 0.733, green: 0.871, blue: 0.984 }; // #BBDEFB — dini hari
const COLOR_WHITE = { red: 1.0, green: 1.0, blue: 1.0 };
const COLOR_HEADER_BG = { red: 0.965, green: 0.929, blue: 0.875 }; // warm cream for header

// Column widths in pixels (Sheets uses units of 1/100 pt — approximate)
const COL_NAME_WIDTH = 150; // Column B — employee name
const COL_DAY_WIDTH = 120; // Columns C–I — day cells

// Rows allocated for a weekly header block (date row + day-name row)
const HEADER_ROWS = 2; // rows 3–4 (relative: 1–2 within the block)
// Gap rows between weekly blocks
const GAP_ROWS = 5;
// First block starts at sheet row 3 (1-indexed)
const FIRST_BLOCK_START_ROW = 3;

// ============================================================
// HELPERS
// ============================================================

/** Returns Monday (YYYY-MM-DD) of the week containing the given date */
export function getWeekMonday(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Returns array of 7 dates [Mon..Sun] as YYYY-MM-DD for the week of mondayStr */
function getWeekDates(mondayStr: string): string[] {
  const dates: string[] = [];
  const base = new Date(`${mondayStr}T00:00:00+07:00`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${dd}`);
  }
  return dates;
}

/** Format "YYYY-MM-DD" → "7 juli" */
function formatIndonesianDate(dateStr: string): string {
  const [, monthStr, dayStr] = dateStr.split("-");
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  return `${day} ${INDONESIAN_MONTHS[month]}`;
}

/** Format "HH:MM" → "HH.mm" */
function formatTimeForSheet(time: string | null | undefined): string {
  if (!time) return "";
  return time.replace(":", ".");
}

/** Determine background color based on startTime hour */
function getShiftColor(
  startTime: string | null | undefined
): { red: number; green: number; blue: number } | null {
  if (!startTime) return null;
  const hour = parseInt(startTime.split(":")[0], 10);
  if (hour >= 8 && hour <= 16) return COLOR_GRAY;
  if (hour >= 17 && hour <= 23) return COLOR_PINK;
  // 00:00–07:59
  return COLOR_BLUE;
}

/** Determine cell text for a schedule entry */
function getScheduleCellText(schedule: {
  jamMulai: string | null;
  jamSelesai: string | null;
  status: string;
  catatan?: string | null;
}): string {
  const { status, jamMulai, jamSelesai, catatan } = schedule;
  if (status === "CUTI") return catatan ? `CUTI\n(${catatan})` : "CUTI";
  if (status === "IZIN") return catatan ? `IZIN\n(${catatan})` : "IZIN";
  if (status === "LIBUR") return catatan ? `LIBUR\n(${catatan})` : "LIBUR";
  if (jamMulai && jamSelesai) {
    return `${formatTimeForSheet(jamMulai)} sd ${formatTimeForSheet(jamSelesai)}`;
  }
  return "";
}

/** Calculate schedule duration in hours, correctly handling overnight shifts */
function getScheduleDurationHours(
  jamMulai: string | null | undefined,
  jamSelesai: string | null | undefined,
  isOvernightShift: boolean
): number {
  if (!jamMulai || !jamSelesai) return 0;
  const [startH, startM] = jamMulai.split(":").map(Number);
  const [endH, endM] = jamSelesai.split(":").map(Number);
  const startMins = startH * 60 + startM;
  let endMins = endH * 60 + endM;
  if (isOvernightShift || endMins <= startMins) {
    endMins += 24 * 60;
  }
  return (endMins - startMins) / 60;
}

/** Convert column index (0-based) to A1 letter, starting from B (index 1) */
function colLetter(colIndex: number): string {
  // colIndex 0 = A, 1 = B, 2 = C ...
  let result = "";
  let n = colIndex + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/**
 * Make a CellData object with text, optional bold, optional background color,
 * horizontal center alignment, and text wrap.
 */
function makeCell(
  text: string,
  opts: {
    bold?: boolean;
    bgColor?: { red: number; green: number; blue: number } | null;
    fontSize?: number;
  } = {}
): sheets_v4.Schema$CellData {
  return {
    userEnteredValue: { stringValue: text },
    userEnteredFormat: {
      textFormat: {
        bold: opts.bold ?? false,
        fontSize: opts.fontSize ?? 10,
      },
      horizontalAlignment: "CENTER",
      verticalAlignment: "MIDDLE",
      wrapStrategy: "WRAP",
      backgroundColor: opts.bgColor ?? COLOR_WHITE,
    },
  };
}

/** Build a solid border side */
function solidBorder(): sheets_v4.Schema$Border {
  return {
    style: "SOLID",
    color: { red: 0.6, green: 0.6, blue: 0.6 },
  };
}

/** Build a borders object with all four sides as solid */
function allSolidBorders(): sheets_v4.Schema$Borders {
  const b = solidBorder();
  return { top: b, bottom: b, left: b, right: b };
}

// ============================================================
// SPREADSHEET CREATION
// ============================================================

/**
 * Creates the "Jadwal" spreadsheet in the authorized user's Drive.
 * Renames the default sheet to "Jadwal".
 * Returns the spreadsheetId.
 */
async function createJadwalSpreadsheet(
  sheetsClient: sheets_v4.Sheets,
  cafeName: string
): Promise<string> {
  const response = await sheetsClient.spreadsheets.create({
    requestBody: {
      properties: {
        title: `Jadwal - ${cafeName}`,
      },
      sheets: [
        {
          properties: {
            title: SHEET_NAME,
            gridProperties: {
              frozenRowCount: 0,
            },
          },
        },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Failed to create spreadsheet: no spreadsheetId returned.");
  }

  return spreadsheetId;
}

// ============================================================
// SHEET ID LOOKUP
// ============================================================

async function getSheetId(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<number> {
  const res = await sheetsClient.spreadsheets.get({ spreadsheetId });
  const sheet = res.data.sheets?.find(
    (s) => s.properties?.title === SHEET_NAME
  );
  if (!sheet || sheet.properties?.sheetId == null) {
    throw new Error(`Sheet "${SHEET_NAME}" not found in spreadsheet.`);
  }
  return sheet.properties.sheetId;
}

// ============================================================
// MAIN SYNC FUNCTION
// ============================================================

export interface SyncJadwalResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  message?: string;
  error?: string;
}

export async function syncJadwalToSheets(
  cafeId: string,
  weekStartDate: string // "YYYY-MM-DD" (must be a Monday)
): Promise<SyncJadwalResult> {
  // 1. Resolve OAuth2 client (throws SHEETS_NOT_CONNECTED if no integration)
  const auth = await getOAuth2ClientForCafe(cafeId);
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 2. Resolve cafe + its current integration record
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: { googleIntegration: true },
  });
  if (!cafe) {
    return { success: false, error: "Cafe tidak ditemukan." };
  }

  // 3. Get or create the spreadsheet
  let spreadsheetId = cafe.googleIntegration?.jadwalSpreadsheetId ?? null;

  if (!spreadsheetId) {
    // First sync: create spreadsheet
    spreadsheetId = await createJadwalSpreadsheet(sheetsClient, cafe.nama);

    // Persist spreadsheetId
    await prisma.cafeGoogleIntegration.update({
      where: { cafeId },
      data: { jadwalSpreadsheetId: spreadsheetId },
    });
  }

  // 4. Confirm spreadsheetId is now set
  if (!spreadsheetId) {
    return { success: false, error: "Gagal membuat atau menemukan spreadsheet." };
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 5. Fetch employees ordered: LAKI_LAKI first, PEREMPUAN second, both by createdAt
  const employees = await prisma.karyawan.findMany({
    where: { cafeId, status: "ACTIVE" },
    orderBy: [{ jenisKelamin: "asc" }, { createdAt: "asc" }],
  });

  if (employees.length === 0) {
    return {
      success: false,
      error: "Tidak ada karyawan aktif untuk disinkronkan.",
    };
  }

  // 6. Fetch schedules for the week
  const weekDates = getWeekDates(weekStartDate);
  const weekEndDate = weekDates[6];

  const schedules = await prisma.jadwal.findMany({
    where: {
      tanggal: {
        gte: new Date(`${weekStartDate}T00:00:00+07:00`),
        lte: new Date(`${weekEndDate}T23:59:59+07:00`),
      },
      karyawan: { cafeId },
    },
  });

  // Build lookup: employeeId + date → schedule
  const scheduleMap = new Map<string, (typeof schedules)[0]>();
  for (const s of schedules) {
    const dateKey = s.tanggal.toISOString().split("T")[0];
    scheduleMap.set(`${s.karyawanId}:${dateKey}`, s);
  }

  // 7. Determine block placement via JadwalSheetSync
  const employeeCount = employees.length;
  const totalBlockRows = HEADER_ROWS + employeeCount; // 2 header rows + N employee rows

  let syncRecord = await prisma.jadwalSheetSync.findUnique({
    where: { cafeId_weekStart: { cafeId, weekStart: weekStartDate } },
  });

  let startRow: number;
  let isExistingBlock = false;

  if (syncRecord) {
    // Existing block — check if employee count changed and would overflow
    isExistingBlock = true;
    startRow = syncRecord.startRow;

    if (syncRecord.rowCount !== totalBlockRows) {
      // Find the next block's startRow to check for collision
      const nextSync = await prisma.jadwalSheetSync.findFirst({
        where: {
          cafeId,
          startRow: { gt: syncRecord.startRow },
        },
        orderBy: { startRow: "asc" },
      });

      if (nextSync) {
        const allocatedEnd = startRow + totalBlockRows - 1;
        const nextStart = nextSync.startRow;
        if (allocatedEnd + GAP_ROWS >= nextStart) {
          return {
            success: false,
            error:
              `Jumlah karyawan berubah (${syncRecord.rowCount - HEADER_ROWS} → ${employeeCount}). ` +
              `Blok baru akan bertabrakan dengan minggu berikutnya (row ${nextStart}). ` +
              `Harap hapus data minggu berikutnya di spreadsheet terlebih dahulu, lalu coba lagi.`,
          };
        }
      }
    }
  } else {
    // New block — find the next available row
    const lastSync = await prisma.jadwalSheetSync.findFirst({
      where: { cafeId },
      orderBy: { startRow: "desc" },
    });

    if (lastSync) {
      startRow = lastSync.startRow + lastSync.rowCount + GAP_ROWS;
    } else {
      startRow = FIRST_BLOCK_START_ROW;
    }
    isExistingBlock = false;
  }

  // 8. Get the sheetId (needed for formatting requests)
  const sheetId = await getSheetId(sheetsClient, spreadsheetId);

  // ============================================================
  // 9. Build data rows
  // ============================================================
  // startRow is 1-indexed. Sheets API uses 0-indexed in some places.
  // Row layout within the block (relative to startRow):
  //   +0 = date row     (row 3 in first block)
  //   +1 = day-name row (row 4 in first block)
  //   +2..+N = employee rows

  const dateRow0 = startRow - 1; // 0-indexed for batchUpdate
  const dayNameRow0 = startRow; // 0-indexed
  // employee rows: startRow+1 (0-indexed) = startRow+2 (1-indexed) through startRow+1+emp-1

  // Column layout: B=0 offset, but in A1 col B=index 1
  // colIndex for A1: A=0, B=1, C=2, ...
  // Our columns: B (col 1) = name, C-I (cols 2-8) = Mon-Sun
  const COL_B = 1; // name column

  // --- Date row ---
  const dateCells: sheets_v4.Schema$CellData[] = [
    makeCell("", { bgColor: COLOR_HEADER_BG }), // B — empty corner
    ...weekDates.map((d) =>
      makeCell(formatIndonesianDate(d), {
        bgColor: COLOR_HEADER_BG,
        fontSize: 9,
      })
    ),
  ];

  // --- Day name row ---
  const dayNameCells: sheets_v4.Schema$CellData[] = [
    makeCell("NAMA", { bold: true, bgColor: COLOR_HEADER_BG }),
    ...DAY_NAMES_UPPER.map((day) =>
      makeCell(day, { bold: true, bgColor: COLOR_HEADER_BG })
    ),
  ];

  // --- Employee rows ---
  const employeeRowData: sheets_v4.Schema$RowData[] = employees.map((emp) => {
    const cells: sheets_v4.Schema$CellData[] = [
      // Name cell — normal weight (not bold)
      makeCell(emp.nama, {}),
    ];

    for (const dateStr of weekDates) {
      const key = `${emp.id}:${dateStr}`;
      const sched = scheduleMap.get(key);

      if (!sched) {
        cells.push(makeCell("", { bgColor: COLOR_WHITE }));
      } else {
        const isKerja =
          sched.status === "KERJA" ||
          sched.status === "BEKERJA" ||
          sched.status === "TERJADWAL";

        let text = getScheduleCellText(sched);

        // Append "(Lembur)" when KERJA duration exceeds employee's standard hours
        if (isKerja && sched.jamMulai && sched.jamSelesai) {
          const durationHours = getScheduleDurationHours(
            sched.jamMulai,
            sched.jamSelesai,
            sched.isOvernightShift
          );
          if (durationHours > emp.jamKerjaHarian) {
            text += "\n(Lembur)";
          }
        }

        const bgColor = isKerja ? getShiftColor(sched.jamMulai) : null;

        cells.push(makeCell(text, { bgColor }));
      }
    }

    return { values: cells };
  });

  // ============================================================
  // 10. Build batchUpdate requests
  // ============================================================
  const requests: sheets_v4.Schema$Request[] = [];

  // Ensure enough rows exist
  requests.push({
    appendDimension: {
      sheetId,
      dimension: "ROWS",
      length: Math.max(0, startRow + totalBlockRows + GAP_ROWS - 1),
    },
  });

  // Ensure enough columns (B through I = 9 columns total = A through I)
  requests.push({
    appendDimension: {
      sheetId,
      dimension: "COLUMNS",
      length: 9, // A–I
    },
  });

  // Write date row (B, C-I = col indices 1-8)
  requests.push({
    updateCells: {
      rows: [{ values: dateCells }],
      fields:
        "userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,backgroundColor)",
      start: { sheetId, rowIndex: dateRow0, columnIndex: COL_B },
    },
  });

  // Write day-name row
  requests.push({
    updateCells: {
      rows: [{ values: dayNameCells }],
      fields:
        "userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,backgroundColor)",
      start: { sheetId, rowIndex: dayNameRow0, columnIndex: COL_B },
    },
  });

  // Write employee rows
  requests.push({
    updateCells: {
      rows: employeeRowData,
      fields:
        "userEnteredValue,userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy,backgroundColor)",
      start: { sheetId, rowIndex: dayNameRow0 + 1, columnIndex: COL_B },
    },
  });

  // ---- Borders for the entire block (B : I, date row through last employee row) ----
  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: dateRow0,
        endRowIndex: dateRow0 + totalBlockRows,
        startColumnIndex: COL_B,
        endColumnIndex: COL_B + 8, // B through I inclusive
      },
      top: solidBorder(),
      bottom: solidBorder(),
      left: solidBorder(),
      right: solidBorder(),
      innerHorizontal: solidBorder(),
      innerVertical: solidBorder(),
    },
  });

  // ---- Column widths ----
  // Column B (name)
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: COL_B,
        endIndex: COL_B + 1,
      },
      properties: { pixelSize: COL_NAME_WIDTH },
      fields: "pixelSize",
    },
  });

  // Columns C–I (Mon–Sun)
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "COLUMNS",
        startIndex: COL_B + 1,
        endIndex: COL_B + 8,
      },
      properties: { pixelSize: COL_DAY_WIDTH },
      fields: "pixelSize",
    },
  });

  // ---- Row heights ----
  // Date row height
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: dateRow0,
        endIndex: dateRow0 + 1,
      },
      properties: { pixelSize: 28 },
      fields: "pixelSize",
    },
  });

  // Day-name row height
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: dayNameRow0,
        endIndex: dayNameRow0 + 1,
      },
      properties: { pixelSize: 28 },
      fields: "pixelSize",
    },
  });

  // Employee rows height — 52px to accommodate two-line cells (Lembur / catatan)
  requests.push({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: dayNameRow0 + 1,
        endIndex: dayNameRow0 + 1 + employeeCount,
      },
      properties: { pixelSize: 52 },
      fields: "pixelSize",
    },
  });

  // ============================================================
  // 11. Execute batchUpdate
  // ============================================================
  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  // ============================================================
  // 12. Persist JadwalSheetSync record
  // ============================================================
  if (syncRecord) {
    await prisma.jadwalSheetSync.update({
      where: { id: syncRecord.id },
      data: { rowCount: totalBlockRows, updatedAt: new Date() },
    });
  } else {
    await prisma.jadwalSheetSync.create({
      data: {
        cafeId,
        spreadsheetId,
        weekStart: weekStartDate,
        startRow,
        rowCount: totalBlockRows,
      },
    });
  }

  const weekEnd = weekDates[6];
  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl,
    message: `Jadwal minggu ${weekStartDate} – ${weekEnd} berhasil disinkronkan.`,
  };
}
