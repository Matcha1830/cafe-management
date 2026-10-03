/**
 * slip-gaji-sync.ts — Server-only Slip Gaji → Google Sheets sync service
 *
 * Handles:
 * - Creation and retrieval of "Slip Gaji - <Nama Cafe>" spreadsheet
 * - Per-employee worksheet tabs (one tab per employee with saved payroll)
 * - Template formatting matching reference payslip:
 *     - Header: "Slip Gaji Tim Barista" (B1:I1, yellow bg)
 *     - Employee info: Nama, Tgl Masuk, Rek Bank, Periode (B3:C6)
 *     - Salary summary: Gaji awal, Lembur, Tabungan, Keterlambatan (red), Denda Job Desk (red), Tunjangan (green), Total Gaji (bold) (B8:C14)
 *     - Working hours summary: Jam kerja normal, Jam lembur (B16:C17)
 *     - Detail attendance table (B20:G20+)
 *     - Job penalty list (H20:I20+)
 * - Idempotent re-sync (clears and rewrites tabs without creating duplicate spreadsheets or tabs)
 *
 * NEVER import this file in client components.
 */

import { google, sheets_v4 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getOAuth2ClientForCafe } from "./client";
import { formatRupiah, getEmployeeAttendancePeriod } from "@/lib/utils";
import {
  calculateLateMinutes,
  calculateDailyLatePenalty,
} from "@/lib/calculations/payroll";

// ============================================================
// COLOR CONSTANTS (RGB 0.0–1.0 for Google Sheets API)
// ============================================================

const COLOR_TITLE_BG = { red: 1.0, green: 0.945, blue: 0.463 }; // #FFF176 — header title yellow
const COLOR_LABEL_BG = { red: 1.0, green: 0.976, blue: 0.769 }; // #FFF9C4 — label warm yellow/cream
const COLOR_TABLE_HEADER_BG = { red: 0.647, green: 0.839, blue: 0.655 }; // #A5D6A7 — green table header
const COLOR_WHITE = { red: 1.0, green: 1.0, blue: 1.0 };
const COLOR_TEXT_RED = { red: 0.776, green: 0.157, blue: 0.157 }; // #C62828 — deduction red
const COLOR_TEXT_GREEN = { red: 0.18, green: 0.49, blue: 0.196 }; // #2E7D32 — allowance green
const COLOR_TEXT_BLACK = { red: 0.0, green: 0.0, blue: 0.0 };
const COLOR_BORDER_GRAY = { red: 0.6, green: 0.6, blue: 0.6 };

// ============================================================
// FORMAT HELPERS
// ============================================================

/** Format "YYYY-MM-DD" or Date → "DD/MM/YY" */
function formatDateShortYY(d: Date | string): string {
  const date = typeof d === "string" ? new Date(`${d}T00:00:00+07:00`) : d;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

/** Format "HH:MM" → "HH.mm" */
function formatTimeDot(time: string | null | undefined): string {
  if (!time) return "-";
  return time.replace(":", ".");
}

/** Sanitize employee name for Sheet tab title (max 100 chars, no illegal chars) */
function sanitizeSheetTitle(name: string): string {
  const sanitized = name.replace(/[:\\/?*[\]]/g, " ").trim();
  return sanitized.slice(0, 95) || "Karyawan";
}

/** Build solid border */
function solidBorder(): sheets_v4.Schema$Border {
  return {
    style: "SOLID",
    color: COLOR_BORDER_GRAY,
  };
}

/** Build 4-side solid borders */
function allSolidBorders(): sheets_v4.Schema$Borders {
  const b = solidBorder();
  return { top: b, bottom: b, left: b, right: b };
}

/**
 * Make a CellData object
 */
function makeCell(
  text: string,
  opts: {
    bold?: boolean;
    fontSize?: number;
    textColor?: { red: number; green: number; blue: number };
    bgColor?: { red: number; green: number; blue: number };
    align?: "LEFT" | "CENTER" | "RIGHT";
    verticalAlign?: "TOP" | "MIDDLE" | "BOTTOM";
  } = {}
): sheets_v4.Schema$CellData {
  return {
    userEnteredValue: { stringValue: text },
    userEnteredFormat: {
      textFormat: {
        bold: opts.bold ?? false,
        fontSize: opts.fontSize ?? 10,
        foregroundColor: opts.textColor ?? COLOR_TEXT_BLACK,
      },
      horizontalAlignment: opts.align ?? "LEFT",
      verticalAlignment: opts.verticalAlign ?? "MIDDLE",
      wrapStrategy: "WRAP",
      backgroundColor: opts.bgColor ?? COLOR_WHITE,
    },
  };
}

// ============================================================
// SPREADSHEET & TAB MANAGEMENT
// ============================================================

/**
 * Creates the "Slip Gaji - <cafeName>" spreadsheet in the authorized user's Drive.
 * Returns the spreadsheetId.
 */
async function createSlipGajiSpreadsheet(
  sheetsClient: sheets_v4.Sheets,
  cafeName: string
): Promise<string> {
  const response = await sheetsClient.spreadsheets.create({
    requestBody: {
      properties: {
        title: `Slip Gaji - ${cafeName}`,
      },
    },
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Failed to create Slip Gaji spreadsheet: no spreadsheetId returned.");
  }

  return spreadsheetId;
}

/**
 * Finds or creates a tab for an employee by name.
 * Returns the sheetId.
 */
async function getOrCreateEmployeeSheet(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  tabTitle: string
): Promise<number> {
  const meta = await sheetsClient.spreadsheets.get({ spreadsheetId });
  const sheets = meta.data.sheets || [];

  // Check if tab with this title already exists
  const existing = sheets.find((s) => s.properties?.title === tabTitle);
  if (existing?.properties?.sheetId != null) {
    return existing.properties.sheetId;
  }

  // If there is only one default sheet like "Sheet1" or "Sheet 1", rename it
  if (
    sheets.length === 1 &&
    sheets[0].properties?.sheetId != null &&
    (sheets[0].properties.title === "Sheet1" ||
      sheets[0].properties.title === "Sheet 1" ||
      sheets[0].properties.title?.startsWith("Sheet"))
  ) {
    const defaultSheetId = sheets[0].properties.sheetId;
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: defaultSheetId,
                title: tabTitle,
              },
              fields: "title",
            },
          },
        ],
      },
    });
    return defaultSheetId;
  }

  // Otherwise, add a new sheet
  const addRes = await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: tabTitle,
            },
          },
        },
      ],
    },
  });

  const newSheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId;
  if (newSheetId == null) {
    throw new Error(`Gagal membuat tab sheet untuk ${tabTitle}`);
  }

  return newSheetId;
}

// ============================================================
// SINGLE EMPLOYEE SLIP GAJI WRITER
// ============================================================

interface EmployeeSlipData {
  employee: {
    id: string;
    nama: string;
    tanggalMasuk: Date;
    jabatanKode: string;
    jabatanNama?: string;
  };
  payroll: {
    id: string;
    periode: string;
    jamRegular: number;
    jamLembur: number;
    gajiPokok: number;
    upahLembur: number;
    tunjangan: number;
    potonganStandar: number;
    dendaKeterlambatan: number;
    dendaBerulang: number;
    dendaPekerjaan: number;
    gajiKotor: number;
    gajiDiterima: number;
    status: string;
  };
  jobPenaltyRate: number;
  incompleteJobs: Array<{
    id: string;
    judul: string;
  }>;
  attendances: Array<{
    tanggal: Date;
    jadwalMulai: string;
    jadwalSelesai: string;
    aktualMulai: string | null;
    aktualSelesai: string | null;
    statusJadwal?: string;
  }>;
}

async function writeSlipGajiForEmployee(
  sheetsClient: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetId: number,
  data: EmployeeSlipData
): Promise<void> {
  const { employee, payroll, incompleteJobs, attendances } = data;

  const requests: sheets_v4.Schema$Request[] = [
    // 1. Unmerge all cells in the worksheet area
    {
      unmergeCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 200,
          startColumnIndex: 0,
          endColumnIndex: 20,
        },
      },
    },
    // 2. Clear previous values and formatting across template area
    {
      updateCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 200,
          startColumnIndex: 0,
          endColumnIndex: 20,
        },
        fields: "userEnteredValue,userEnteredFormat",
      },
    },
    // 3. Clear previous borders
    {
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 200,
          startColumnIndex: 0,
          endColumnIndex: 20,
        },
        top: { style: "NONE" },
        bottom: { style: "NONE" },
        left: { style: "NONE" },
        right: { style: "NONE" },
        innerHorizontal: { style: "NONE" },
        innerVertical: { style: "NONE" },
      },
    },
  ];

  // Set column widths (col A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8)
  const colWidths = [
    { start: 0, end: 1, width: 30 }, // A: margin
    { start: 1, end: 2, width: 160 }, // B: Nama Barista / Jadwal Masuk
    { start: 2, end: 3, width: 130 }, // C: Employee Value / Tanggal
    { start: 3, end: 4, width: 95 }, // D: Empty spacing in top / Jam Masuk in detail
    { start: 4, end: 5, width: 155 }, // E: Payroll Summary Label / Keterlambatan
    { start: 5, end: 6, width: 130 }, // F: Payroll Summary Value / Denda Keterlambatan
    { start: 6, end: 7, width: 180 }, // G: Work Hours Label / Lembur
    { start: 7, end: 8, width: 220 }, // H: Work Hours Regular / Denda list tugas
    { start: 8, end: 9, width: 85 }, // I: "jam" / jumlah
  ];

  for (const cw of colWidths) {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "COLUMNS",
          startIndex: cw.start,
          endIndex: cw.end,
        },
        properties: {
          pixelSize: cw.width,
        },
        fields: "pixelSize",
      },
    });
  }

  // ============================================================
  // 1. TITLE — EXACT POSITION B2 (Row index 1, Col index 1)
  // ============================================================
  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      rows: [
        {
          values: [
            makeCell("Slip Gaji Tim Barista", {
              bold: true,
              fontSize: 11,
              align: "LEFT",
            }),
          ],
        },
      ],
      fields: "userEnteredValue,userEnteredFormat",
    },
  });

  // ============================================================
  // 2. EMPLOYEE INFO — EXACT RANGE B4:C6 (Row index 3..6, Col index 1..3)
  // ============================================================
  const infoRows: sheets_v4.Schema$RowData[] = [
    {
      values: [
        makeCell("Nama Barista", {
          bold: true,
          bgColor: COLOR_TITLE_BG,
          align: "LEFT",
        }),
        makeCell(employee.nama, {
          bold: true,
          align: "LEFT",
        }),
      ],
    },
    {
      values: [
        makeCell("Tgl Masuk", { align: "LEFT" }),
        makeCell(formatDateShortYY(employee.tanggalMasuk), { align: "LEFT" }),
      ],
    },
    {
      values: [
        makeCell("Rek Bank", { align: "LEFT" }),
        makeCell("-", { align: "LEFT" }),
      ],
    },
  ];

  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 6,
        startColumnIndex: 1,
        endColumnIndex: 3,
      },
      rows: infoRows,
      fields: "userEnteredValue,userEnteredFormat",
    },
  });

  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 6,
        startColumnIndex: 1,
        endColumnIndex: 3,
      },
      ...allSolidBorders(),
    },
  });

  // ============================================================
  // 3. PAYROLL SUMMARY — EXACT RANGE E4:F10 (Row index 3..10, Col index 4..6)
  // ============================================================
  const totalLatePenalty = payroll.dendaKeterlambatan + payroll.dendaBerulang;
  const latePenaltyDisplay =
    totalLatePenalty > 0 ? `-${formatRupiah(totalLatePenalty)}` : formatRupiah(0);
  const jobPenaltyDisplay =
    payroll.dendaPekerjaan > 0 ? `-${formatRupiah(payroll.dendaPekerjaan)}` : formatRupiah(0);

  const salaryRows: sheets_v4.Schema$RowData[] = [
    {
      values: [
        makeCell("Gaji awal", {
          textColor: COLOR_TEXT_GREEN,
          align: "CENTER",
        }),
        makeCell(formatRupiah(payroll.gajiPokok), {
          textColor: COLOR_TEXT_GREEN,
          align: "RIGHT",
        }),
      ],
    },
    {
      values: [
        makeCell("Lembur", {
          textColor: COLOR_TEXT_GREEN,
          align: "CENTER",
        }),
        makeCell(formatRupiah(payroll.upahLembur), {
          textColor: COLOR_TEXT_GREEN,
          align: "RIGHT",
        }),
      ],
    },
    {
      values: [
        makeCell("Penyisihan Tabungan", {
          textColor: COLOR_TEXT_RED,
          align: "CENTER",
        }),
        makeCell("Rp 0", {
          textColor: COLOR_TEXT_RED,
          align: "RIGHT",
        }),
      ],
    },
    {
      values: [
        makeCell("Keterlambatan", {
          textColor: COLOR_TEXT_RED,
          align: "CENTER",
        }),
        makeCell(latePenaltyDisplay, {
          textColor: COLOR_TEXT_RED,
          align: "RIGHT",
        }),
      ],
    },
    {
      values: [
        makeCell("Denda Job Desk", {
          textColor: COLOR_TEXT_RED,
          align: "CENTER",
        }),
        makeCell(jobPenaltyDisplay, {
          textColor: COLOR_TEXT_RED,
          align: "RIGHT",
        }),
      ],
    },
    {
      values: [
        makeCell("Tunjangan Kapten", {
          textColor: COLOR_TEXT_GREEN,
          align: "CENTER",
        }),
        makeCell(formatRupiah(payroll.tunjangan), {
          textColor: COLOR_TEXT_GREEN,
          align: "RIGHT",
        }),
      ],
    },
    {
      values: [
        makeCell("Total Gaji", {
          bold: true,
          textColor: COLOR_TEXT_BLACK,
          align: "CENTER",
        }),
        makeCell(formatRupiah(payroll.gajiDiterima), {
          bold: true,
          textColor: COLOR_TEXT_BLACK,
          align: "RIGHT",
        }),
      ],
    },
  ];

  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 10,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      rows: salaryRows,
      fields: "userEnteredValue,userEnteredFormat",
    },
  });

  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 10,
        startColumnIndex: 4,
        endColumnIndex: 6,
      },
      ...allSolidBorders(),
    },
  });

  // ============================================================
  // 4. WORK HOURS SUMMARY — EXACT POSITION G4:I5 (Row index 3..5, Col index 6..9)
  // ============================================================
  const workHoursRows: sheets_v4.Schema$RowData[] = [
    {
      values: [
        makeCell("Total Jam Kerja Normal", { align: "LEFT" }),
        makeCell(String(payroll.jamRegular), { align: "RIGHT" }),
        makeCell("jam", { align: "LEFT" }),
      ],
    },
    {
      values: [
        makeCell("Jumlah penambahan jam kerja bulan ini", { align: "LEFT" }),
        makeCell(String(payroll.jamLembur), { align: "RIGHT" }),
        makeCell("jam", { align: "LEFT" }),
      ],
    },
  ];

  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 5,
        startColumnIndex: 6,
        endColumnIndex: 9,
      },
      rows: workHoursRows,
      fields: "userEnteredValue,userEnteredFormat",
    },
  });

  // ============================================================
  // 5. DETAIL TABLE HEADERS — EXACT START ROW 13 (Row index 12)
  // ============================================================
  const headerRow: sheets_v4.Schema$RowData = {
    values: [
      makeCell("Jadwal Masuk", {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
      makeCell("Tanggal", {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
      makeCell("Jam Masuk", {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
      makeCell("Keterlambatan", {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
      makeCell("Denda Keterlambatan", {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
      makeCell("Lembur", {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
      makeCell(`Denda list tugas ${data.jobPenaltyRate}/poin`, {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
      makeCell("jumlah", {
        bold: true,
        bgColor: COLOR_TABLE_HEADER_BG,
        align: "CENTER",
      }),
    ],
  };

  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 12,
        endRowIndex: 13,
        startColumnIndex: 1,
        endColumnIndex: 9,
      },
      rows: [headerRow],
      fields: "userEnteredValue,userEnteredFormat",
    },
  });

  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 12,
        endRowIndex: 13,
        startColumnIndex: 1,
        endColumnIndex: 9,
      },
      ...allSolidBorders(),
    },
  });

  // ============================================================
  // 6. DETAIL TABLE ROWS — STARTING AT ROW 14 (Row index 13+)
  // ============================================================
  const maxRows = Math.max(attendances.length, incompleteJobs.length, 1);
  const detailRows: sheets_v4.Schema$RowData[] = [];

  for (let i = 0; i < maxRows; i++) {
    const att = attendances[i];
    const job = incompleteJobs[i];

    // Left side — attendance calculations
    let jadwalMasukText = "-";
    let tanggalText = "-";
    let jamMasukText = "-";
    let keterlambatanText = "-";
    let dendaLateText = "-";
    let lemburText = "-";

    if (att) {
      jadwalMasukText = `${formatTimeDot(att.jadwalMulai)} sd ${formatTimeDot(att.jadwalSelesai)}`;
      tanggalText = formatDateShortYY(att.tanggal);
      jamMasukText = formatTimeDot(att.aktualMulai);

      const lateMins = calculateLateMinutes(att.jadwalMulai, att.aktualMulai);
      if (lateMins > 0) {
        keterlambatanText = `${lateMins} menit`;
        const penalty = calculateDailyLatePenalty(lateMins);
        dendaLateText = penalty > 0 ? formatRupiah(penalty) : "Rp 0";
      } else {
        keterlambatanText = "0 menit";
        dendaLateText = "Rp 0";
      }
      lemburText = "0 jam";
    }

    // Right side — incomplete job
    let jobText = "";
    let jobPenaltyText = "";
    if (job) {
      jobText = `TDK ${job.judul}`;
      jobPenaltyText = String(data.jobPenaltyRate);
    }

    detailRows.push({
      values: [
        makeCell(jadwalMasukText, { align: "CENTER" }), // B
        makeCell(tanggalText, { align: "CENTER" }), // C
        makeCell(jamMasukText, { align: "CENTER" }), // D
        makeCell(keterlambatanText, { align: "CENTER" }), // E
        makeCell(dendaLateText, { align: "CENTER" }), // F
        makeCell(lemburText, { align: "CENTER" }), // G
        makeCell(jobText, { align: "LEFT" }), // H
        makeCell(jobPenaltyText, { align: "RIGHT" }), // I
      ],
    });
  }

  const endDetailRow = 13 + maxRows;

  requests.push({
    updateCells: {
      range: {
        sheetId,
        startRowIndex: 13,
        endRowIndex: endDetailRow,
        startColumnIndex: 1,
        endColumnIndex: 9,
      },
      rows: detailRows,
      fields: "userEnteredValue,userEnteredFormat",
    },
  });

  // Borders for detail tables
  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 13,
        endRowIndex: endDetailRow,
        startColumnIndex: 1,
        endColumnIndex: 7, // B to G (attendance table)
      },
      ...allSolidBorders(),
    },
  });

  requests.push({
    updateBorders: {
      range: {
        sheetId,
        startRowIndex: 13,
        endRowIndex: endDetailRow,
        startColumnIndex: 7,
        endColumnIndex: 9, // H to I (job penalty table)
      },
      ...allSolidBorders(),
    },
  });

  // Execute all formatting and data write requests in a single batchUpdate
  await sheetsClient.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests,
    },
  });
}

// ============================================================
// MAIN ORCHESTRATOR: syncSlipGajiToSheets
// ============================================================

export interface SyncSlipGajiResult {
  success: boolean;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  synced?: number;
  skipped?: number;
  message?: string;
  error?: string;
}

export async function syncSlipGajiToSheets(
  cafeId: string,
  period?: string
): Promise<SyncSlipGajiResult> {
  // 1. Resolve OAuth2 client
  const auth = await getOAuth2ClientForCafe(cafeId);
  const sheetsClient = google.sheets({ version: "v4", auth });

  // 2. Resolve cafe & integration
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    include: {
      googleIntegration: true,
      jabatan: true,
    },
  });

  if (!cafe) {
    return { success: false, error: "Cafe tidak ditemukan." };
  }

  // 3. Get or create Slip Gaji spreadsheet
  let spreadsheetId = cafe.googleIntegration?.slipGajiSpreadsheetId ?? null;

  if (!spreadsheetId) {
    spreadsheetId = await createSlipGajiSpreadsheet(sheetsClient, cafe.nama);

    await prisma.cafeGoogleIntegration.update({
      where: { cafeId },
      data: { slipGajiSpreadsheetId: spreadsheetId },
    });
  }

  if (!spreadsheetId) {
    return { success: false, error: "Gagal membuat atau menemukan spreadsheet Slip Gaji." };
  }

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 4. Fetch active employees
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

  // 5. Default period to current month if omitted
  const currentMonthPeriod = period || "2026-08";

  // Position map for quick lookup
  const positionMap = new Map<string, string>();
  for (const j of cafe.jabatan) {
    positionMap.set(j.kode, j.nama);
  }

  let syncedCount = 0;
  let skippedCount = 0;

  for (const emp of employees) {
    // Determine dynamic attendance period dates
    const periodInfo = getEmployeeAttendancePeriod(
      emp.tanggalMasuk.toISOString().split("T")[0],
      0
    );
    const { startDateStr, endDateStr } = periodInfo;

    // Find saved Penggajian record
    const payrollRecord = await prisma.penggajian.findFirst({
      where: {
        karyawanId: emp.id,
        OR: [
          { periode: currentMonthPeriod },
          { periode: startDateStr },
          { periode: startDateStr.substring(0, 7) },
        ],
      },
      include: {
        detailPekerjaanSelesai: {
          include: {
            pekerjaan: true,
          },
        },
      },
    });

    if (!payrollRecord) {
      skippedCount++;
      continue;
    }

    // Fetch attendances in range
    const attendances = await prisma.kehadiran.findMany({
      where: {
        karyawanId: emp.id,
        tanggal: {
          gte: new Date(`${startDateStr}T00:00:00+07:00`),
          lte: new Date(`${endDateStr}T23:59:59+07:00`),
        },
      },
      orderBy: { tanggal: "asc" },
    });

    // Extract incomplete jobs
    const incompleteJobs: Array<{ id: string; judul: string }> = [];
    if (payrollRecord.detailPekerjaanSelesai) {
      for (const d of payrollRecord.detailPekerjaanSelesai) {
        if (!d.selesai && d.pekerjaan) {
          incompleteJobs.push({
            id: d.pekerjaan.id,
            judul: d.pekerjaan.judul,
          });
        }
      }
    }

    const tabTitle = sanitizeSheetTitle(emp.nama);
    const sheetId = await getOrCreateEmployeeSheet(
      sheetsClient,
      spreadsheetId,
      tabTitle
    );

    await writeSlipGajiForEmployee(sheetsClient, spreadsheetId, sheetId, {
      employee: {
        id: emp.id,
        nama: emp.nama,
        tanggalMasuk: emp.tanggalMasuk,
        jabatanKode: emp.jabatanKode,
        jabatanNama: positionMap.get(emp.jabatanKode) || emp.jabatanKode,
      },
      payroll: {
        id: payrollRecord.id,
        periode: payrollRecord.periode,
        jamRegular: payrollRecord.jamRegular,
        jamLembur: payrollRecord.jamLembur,
        gajiPokok: payrollRecord.gajiPokok,
        upahLembur: payrollRecord.upahLembur,
        tunjangan: payrollRecord.tunjangan,
        potonganStandar: payrollRecord.potonganStandar,
        dendaKeterlambatan: payrollRecord.dendaKeterlambatan,
        dendaBerulang: payrollRecord.dendaBerulang,
        dendaPekerjaan: payrollRecord.dendaPekerjaan,
        gajiKotor: payrollRecord.gajiKotor,
        gajiDiterima: payrollRecord.gajiDiterima,
        status: payrollRecord.status,
      },
      jobPenaltyRate: cafe.dendaPekerjaanPerJob ?? 5000,
      incompleteJobs,
      attendances: attendances.map((a) => ({
        tanggal: a.tanggal,
        jadwalMulai: a.jadwalMulai,
        jadwalSelesai: a.jadwalSelesai,
        aktualMulai: a.aktualMulai,
        aktualSelesai: a.aktualSelesai,
      })),
    });

    syncedCount++;
  }

  if (syncedCount === 0) {
    return {
      success: false,
      error:
        "Belum ada data snapshot payroll yang tersimpan untuk periode ini. Silakan klik 'Hitung Ulang & Simpan' terlebih dahulu.",
    };
  }

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl,
    synced: syncedCount,
    skipped: skippedCount,
    message: `Berhasil menyinkronkan slip gaji untuk ${syncedCount} karyawan ke Google Sheets.${
      skippedCount > 0 ? ` (${skippedCount} karyawan dilewati karena belum memiliki snapshot payroll)` : ""
    }`,
  };
}
