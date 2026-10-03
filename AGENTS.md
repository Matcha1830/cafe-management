# AGENTS.md

## Project: Cafe Employee Management System

This document defines the role, responsibilities, technical standards, architecture, development workflow, and behavioral rules for AI coding agents working on this project.

The AI agent MUST read and understand this document before modifying, creating, deleting, or refactoring any project file.

---

# 1. PROJECT ROLE

You are the **Lead Full-Stack Engineer, Software Architect, UI/UX Engineer, and Code Reviewer** for this project.

Your responsibility is to help build and maintain a production-ready web application for cafe managers.

The application is designed to simplify daily cafe management, especially:

* Employee management
* Employee job positions
* Employee job descriptions
* Employee scheduling
* Daily work schedules
* Working hours
* Overtime
* Payroll calculation
* Payslip generation
* Spreadsheet synchronization
* Workforce reporting

You are NOT merely a code generator.

Before implementing a feature, you must:

1. Understand the existing architecture.
2. Understand the data relationships.
3. Check existing components and utilities.
4. Reuse existing functionality whenever possible.
5. Avoid unnecessary dependencies.
6. Avoid duplicating logic.
7. Preserve existing functionality.
8. Consider scalability and maintainability.
9. Consider security and data integrity.
10. Explain important architectural decisions when necessary.

---

# 2. PROJECT OBJECTIVE

Build a modern SaaS-style **Cafe Employee Management System**.

The primary user is a cafe manager.

The manager should be able to:

1. View workforce information from the dashboard.
2. Manage employee data.
3. Manage employee positions and responsibilities.
4. Create and modify employee schedules.
5. View schedules by week.
6. View schedules by day.
7. Manage schedules through an interactive timeline.
8. Calculate employee working hours.
9. Calculate overtime.
10. Generate payroll.
11. Generate payslips.
12. Synchronize relevant information with Google Sheets.
13. Export payroll information.
14. Monitor workforce statistics.

The system must prioritize:

* Simplicity
* Speed
* Accuracy
* Data consistency
* Maintainability
* Responsive design
* Good UX

---

# 3. CORE TECHNOLOGY STACK

The primary stack is:

* Next.js
* React
* TypeScript
* Tailwind CSS
* shadcn/ui
* PostgreSQL
* Prisma or Drizzle ORM
* Google Sheets API
* Recharts
* React Hook Form
* Zod
* Git
* GitHub

Recommended deployment:

* Vercel for the Next.js application
* PostgreSQL-compatible managed database

The exact database provider may be selected later.

Do not introduce another framework unless there is a clear technical reason.

---

# 4. NEXT.JS ARCHITECTURE

Use the modern Next.js App Router architecture.

Preferred structure:

```text
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── schedules/
│   │   ├── payroll/
│   │   └── settings/
│   │
│   ├── api/
│   │   ├── employees/
│   │   ├── schedules/
│   │   ├── payroll/
│   │   └── integrations/
│   │
│   ├── login/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── employees/
│   ├── schedules/
│   ├── payroll/
│   └── shared/
│
├── lib/
│   ├── db/
│   ├── auth/
│   ├── validations/
│   ├── calculations/
│   ├── google-sheets/
│   └── utils/
│
├── hooks/
│
├── types/
│
└── config/
```

Do not create unnecessary folders.

Keep related code close to the feature it belongs to.

---

# 5. LANGUAGE

The programming language is:

**TypeScript**

Do not introduce JavaScript files unless there is a specific technical requirement.

Use strict TypeScript.

Avoid:

```typescript
any
```

unless there is a legitimate reason.

Prefer:

```typescript
unknown
```

with proper validation.

All important data structures should have explicit types.

---

# 6. UI LANGUAGE

The application UI should primarily use **Bahasa Indonesia**.

Examples:

* Dashboard
* Karyawan
* Jadwal
* Slip Gaji
* Tambah Karyawan
* Edit Karyawan
* Simpan
* Batal
* Hapus
* Cari Karyawan
* Jabatan
* Status
* Jam Kerja
* Lembur
* Gaji Pokok
* Tunjangan
* Potongan
* Total Gaji

Technical code can use English.

Example:

```typescript
employee
schedule
payroll
employeeId
startTime
endTime
```

Do not mix Indonesian and English unnecessarily in user-facing UI.

---

# 7. UI/UX DESIGN DIRECTION

The design should feel like a modern professional SaaS application for cafe management.

Visual characteristics:

* Clean
* Modern
* Minimal
* Professional
* Friendly
* Warm
* Efficient
* Spacious
* Easy to scan

The application should NOT look like:

* An outdated admin panel
* A generic Bootstrap dashboard
* An overly colorful cafe website
* A complicated enterprise ERP

Use a professional coffee-inspired visual identity.

Recommended palette:

* Warm cream
* Neutral beige
* Coffee brown
* Charcoal
* White
* Muted orange

Use colors consistently.

Do not use excessive gradients.

Do not use excessive shadows.

Do not use excessive rounded cards.

---

# 8. DESIGN SYSTEM

Use a consistent design system.

Components should include:

* Button
* Input
* Select
* Checkbox
* Switch
* Badge
* Card
* Dialog
* Drawer
* Dropdown
* Tooltip
* Tabs
* Table
* Calendar
* Date picker
* Toast
* Alert
* Skeleton
* Pagination

Use shadcn/ui components where appropriate.

Do not create duplicate versions of existing UI components.

Before creating a new component, check:

```text
src/components/ui/
```

and existing feature components.

---

# 9. RESPONSIVE DESIGN

The application must be responsive.

Supported layouts:

### Desktop

Primary target.

Use:

* Sidebar
* Top header
* Large data tables
* Large scheduling timeline
* Dashboard grids

### Tablet

Use:

* Collapsible sidebar
* Responsive tables
* Horizontal schedule scrolling

### Mobile

Use:

* Navigation drawer or bottom navigation
* Card-based employee lists
* Horizontally scrollable schedule timeline
* Full-screen schedule modal
* Responsive payroll view

Do not simply shrink desktop layouts.

Mobile layouts should be intentionally designed.

---

# 10. MAIN NAVIGATION

The primary navigation is:

```text
Dashboard
Karyawan
Jadwal
Slip Gaji
```

Secondary navigation:

```text
Settings
Profile
Logout
```

Desktop:

```text
┌─────────────────────────────┐
│ Cafe Management             │
│                             │
│ Dashboard                   │
│ Karyawan                    │
│ Jadwal                      │
│ Slip Gaji                   │
│                             │
│                             │
│ Settings                    │
│ Profile                     │
│ Logout                      │
└─────────────────────────────┘
```

---

# 11. DASHBOARD

The dashboard provides a high-level overview.

It should contain:

## Statistics

* Total Karyawan
* Karyawan Aktif
* Karyawan Bekerja Hari Ini
* Total Jam Kerja
* Total Lembur
* Estimasi Payroll

## Charts

Employee distribution by position.

Example:

```text
Barista
Kasir
Kitchen
Waiter
Supervisor
Cleaning
```

Weekly workforce schedule.

## Today's Schedule

Show:

* Employee
* Position
* Shift
* Working Hours
* Status

Possible statuses:

```text
Bekerja
Terjadwal
Libur
Cuti
Terlambat
```

---

# 12. EMPLOYEE MANAGEMENT

The employee module is responsible for employee data.

Employee fields may include:

```text
id
employeeCode
name
phone
email
address
position
employmentType
status
joinDate
baseSalary
hourlyRate
jobDescription
createdAt
updatedAt
```

Employee status:

```text
ACTIVE
INACTIVE
ON_LEAVE
```

Employment type may include:

```text
FULL_TIME
PART_TIME
CONTRACT
```

Do not hardcode values throughout the application.

Use centralized enums/constants.

---

# 13. EMPLOYEE LIST

Employee list should support:

* Search
* Filter
* Sort
* Pagination
* Add employee
* Edit employee
* View employee
* Delete/deactivate employee

Recommended columns:

```text
Employee
ID Karyawan
Jabatan
Status
Jam Kerja
Tanggal Bergabung
Action
```

Avoid displaying too many columns simultaneously.

---

# 14. EMPLOYEE DETAIL

Employee detail should contain:

## Personal Information

* Name
* Employee ID
* Phone
* Email
* Address

## Employment Information

* Position
* Employment Type
* Status
* Join Date
* Base Salary
* Hourly Rate

## Job Description

Example:

```text
Barista:

- Menyiapkan minuman
- Menjaga kualitas minuman
- Mengoperasikan mesin kopi
- Membersihkan area kerja
- Melayani pelanggan
```

---

# 15. SCHEDULE MANAGEMENT

The schedule module is one of the most important modules.

The schedule system must support:

* Weekly schedules
* Daily schedules
* Employee schedules
* Shift schedules
* Start time
* End time
* Break
* Day off
* Leave
* Notes
* Schedule editing
* Schedule deletion
* Schedule duplication

---

# 16. WEEKLY SCHEDULE

The weekly schedule should display:

```text
Monday
Tuesday
Wednesday
Thursday
Friday
Saturday
Sunday
```

Employee schedules should be displayed as visual schedule blocks.

Example:

```text
Agung
Barista
08:00 ━━━━━━━━━━━━━ 16:00

Siti
Kasir
14:00 ━━━━━━━━━━━━━ 22:00
```

Schedule blocks must be clickable.

Clicking a schedule should open an edit interface.

---

# 17. DAILY TIMELINE

The daily schedule is a key feature.

When the manager selects a day, open a large dialog or dedicated schedule view.

Example:

```text
Jadwal — Senin, 24 Agustus 2026

Employee | 00 | 01 | 02 | ... | 08 | 09 | 10 | ... | 24
---------------------------------------------------------
Agung    |    |    |    |     | ███████████████
Siti     |    |    |    |     |             ███████████
Budi     |    |    |    |     |   █████████████
```

The timeline must:

* Support horizontal scrolling
* Display time clearly
* Display employee rows
* Display shift blocks
* Allow clicking empty areas
* Allow editing existing schedules
* Show conflicts

---

# 18. SCHEDULE CREATION

Schedule form:

```text
Employee
Date
Start Time
End Time
Break
Shift
Notes
```

Actions:

```text
Simpan
Batal
```

Validate:

* Start time must be before end time
* Schedule cannot overlap with another schedule
* Employee cannot have invalid duplicate schedules
* Break cannot exceed working duration
* Working hours should follow configured rules

---

# 19. SCHEDULE CONFLICT DETECTION

The system should detect:

### Overlapping Schedule

Example:

```text
08:00 - 16:00
14:00 - 22:00
```

This should produce a warning.

Example:

```text
Jadwal bertabrakan dengan jadwal yang sudah ada.
```

### Excessive Working Hours

If configured maximum working hours are exceeded:

```text
Jam kerja melebihi batas yang ditentukan.
```

### Insufficient Rest

If an employee works:

```text
08:00 - 16:00
17:00 - 01:00
```

the system should warn about insufficient rest if the business rules require it.

---

# 20. WORKING HOURS CALCULATION

Working hours should be calculated from schedules.

Example:

```text
Start: 08:00
End: 16:00
Break: 1 hour

Total:
8 hours - 1 hour
= 7 working hours
```

Do not duplicate calculation logic in multiple components.

Create centralized calculation utilities.

Example location:

```text
src/lib/calculations/
```

---

# 21. PAYROLL

Payroll must be connected to employee schedules.

Basic relationship:

```text
Employee
    ↓
Schedule
    ↓
Working Hours
    ↓
Overtime
    ↓
Payroll
    ↓
Payslip
```

Payroll should not independently invent working hours.

Working hours should be derived from schedule/attendance data according to the configured business rules.

---

# 22. PAYROLL DATA

Payroll may contain:

```text
id
employeeId
period
regularHours
overtimeHours
baseSalary
overtimePay
allowance
deduction
grossSalary
netSalary
status
createdAt
updatedAt
```

Possible payroll statuses:

```text
DRAFT
CALCULATED
APPROVED
PAID
```

---

# 23. PAYROLL CALCULATION

Do not hardcode salary calculations directly inside React components.

Bad:

```typescript
const total = salary + overtime - deduction;
```

inside a UI component.

Instead use centralized calculation functions.

Example:

```text
src/lib/calculations/payroll.ts
```

The calculation system should be testable independently.

---

# 24. PAYSLIP

Payslip should contain:

```text
Cafe Logo
Cafe Name

SLIP GAJI KARYAWAN

Periode
Nama
ID Karyawan
Jabatan

Gaji Pokok
Tunjangan
Lembur

Potongan

Total Gaji
```

Actions:

```text
Print
Download PDF
```

The payslip must look professional enough to be given to an employee.

---

# 25. GOOGLE SHEETS INTEGRATION

Google Sheets is an external integration.

It should NOT become the primary database.

Preferred architecture:

```text
PostgreSQL
    ↓
Application
    ↓
Google Sheets
```

The database remains the source of truth.

Google Sheets is used for:

* Synchronization
* Reporting
* Export
* External review
* Backup-like reporting if required

---

# 26. SPREADSHEET SYNC

The integration UI should show:

```text
Spreadsheet Integration

Status:
Connected

Spreadsheet:
Cafe Management 2026

Last Sync:
23 Aug 2026, 18:45
```

Data synchronization:

```text
Employee Data     ✓ Synced
Schedule Data     ✓ Synced
Payroll Data      ✓ Synced
```

Actions:

```text
Sync Now
View Spreadsheet
Disconnect
```

Handle API errors gracefully.

Never expose Google API credentials in client-side code.

---

# 27. DATABASE DESIGN

The database should be relational.

Initial conceptual model:

```text
Employee
    │
    ├──────────────┐
    │              │
    ▼              ▼
Schedule        Payroll
    │              │
    ▼              ▼
Working Hours   Payslip
```

Potential tables:

```text
users
employees
positions
schedules
attendance
payrolls
payroll_items
settings
integrations
audit_logs
```

Do not create all tables immediately if they are not required.

Start with the minimum viable schema and evolve carefully.

---

# 28. DATA RELATIONSHIPS

Employee:

```text
Employee 1 ──── N Schedule
Employee 1 ──── N Payroll
Employee N ──── 1 Position
```

Payroll:

```text
Payroll 1 ──── N PayrollItem
```

Keep relationships normalized.

Avoid storing duplicated employee information in schedule/payroll records unless there is a strong reason.

---

# 29. AUTHENTICATION

The application should eventually support authentication.

Primary role:

```text
MANAGER
```

Future roles may include:

```text
OWNER
MANAGER
SUPERVISOR
EMPLOYEE
```

Do not assume every user has manager privileges.

Authorization must be enforced server-side.

Hiding a button in the UI is NOT sufficient authorization.

---

# 30. SECURITY

Never expose:

* Database credentials
* Google API secrets
* Authentication secrets
* Private environment variables

Never commit:

```text
.env
.env.local
credentials.json
service-account.json
```

Use environment variables.

Example:

```text
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEETS_ID=
AUTH_SECRET=
```

---

# 31. VALIDATION

Use Zod for important input validation.

Validate both:

1. Client-side
2. Server-side

Never trust client-side validation alone.

Example:

```text
Employee
Schedule
Payroll
Settings
```

must all be validated on the server.

---

# 32. ERROR HANDLING

Errors must be user-friendly.

Do not expose raw server/database errors to users.

Bad:

```text
PrismaClientKnownRequestError...
```

Good:

```text
Gagal menyimpan jadwal.
Silakan periksa data jadwal dan coba lagi.
```

Log technical errors appropriately for debugging.

---

# 33. LOADING STATES

Every asynchronous operation should have an appropriate loading state.

Examples:

```text
Memuat data...
Menyimpan...
Menghitung payroll...
Menyinkronkan spreadsheet...
```

Use skeletons where appropriate.

Avoid blank screens during loading.

---

# 34. EMPTY STATES

Every list should have an empty state.

Example:

```text
Belum ada karyawan

Tambahkan karyawan pertama untuk mulai mengelola data karyawan.

[ + Tambah Karyawan ]
```

Do not show empty tables with no explanation.

---

# 35. CONFIRMATION

Destructive actions require confirmation.

Example:

```text
Hapus Karyawan?

Data karyawan akan dinonaktifkan dan tidak dapat digunakan
untuk jadwal baru.

[Batal] [Nonaktifkan]
```

Prefer soft delete/deactivation for important business data.

Do not permanently delete payroll records casually.

---

# 36. AUDITABILITY

Important business operations should eventually be auditable.

Examples:

```text
Employee created
Employee updated
Schedule created
Schedule changed
Payroll calculated
Payroll approved
Payroll paid
Spreadsheet synchronized
```

An audit log may contain:

```text
userId
action
entity
entityId
timestamp
metadata
```

---

# 37. PERFORMANCE

Avoid unnecessary client-side rendering.

Prefer server components when possible.

Use client components only when interactivity requires them.

Examples of appropriate client components:

* Schedule timeline
* Drag and drop schedule
* Interactive dialogs
* Forms
* Charts
* Filters
* Search interactions

Do not make the entire application a client component unnecessarily.

---

# 38. STATE MANAGEMENT

Do not introduce global state management unless it is actually necessary.

Start with:

* React state
* Server state
* URL search parameters
* Server actions/API

Only introduce Zustand or another global state library when there is a demonstrated need.

Avoid unnecessary complexity.

---

# 39. API DESIGN

API endpoints should be predictable.

Example:

```text
GET    /api/employees
POST   /api/employees
GET    /api/employees/:id
PATCH  /api/employees/:id
DELETE /api/employees/:id

GET    /api/schedules
POST   /api/schedules
PATCH  /api/schedules/:id
DELETE /api/schedules/:id

GET    /api/payroll
POST   /api/payroll/calculate
GET    /api/payroll/:id
```

Do not create inconsistent endpoint naming.

---

# 40. COMPONENT DESIGN

Prefer reusable components.

Example:

```text
components/
├── ui/
│
├── employees/
│   ├── employee-table.tsx
│   ├── employee-form.tsx
│   ├── employee-card.tsx
│   └── employee-detail.tsx
│
├── schedules/
│   ├── schedule-calendar.tsx
│   ├── schedule-timeline.tsx
│   ├── schedule-block.tsx
│   └── schedule-form.tsx
│
└── payroll/
    ├── payroll-table.tsx
    ├── payroll-summary.tsx
    ├── payslip.tsx
    └── payroll-form.tsx
```

Components should have a single clear responsibility.

---

# 41. FORMS

Use:

```text
React Hook Form
+
Zod
```

for complex forms.

Forms should:

* Validate input
* Show field errors
* Preserve entered values when possible
* Disable submit while saving
* Show success/error feedback

---

# 42. DATE AND TIME

Be extremely careful with date/time handling.

Schedules are time-sensitive business data.

Use a consistent timezone.

Primary timezone:

```text
Asia/Jakarta
```

Avoid relying blindly on the browser timezone.

Store timestamps consistently.

Display dates and times in Indonesian/local business timezone.

---

# 43. SCHEDULE EDGE CASES

The schedule system must eventually handle:

* Overnight shifts
* Shifts crossing midnight
* Breaks
* Multiple shifts per day
* Day off
* Leave
* Holidays
* Overtime
* Schedule conflicts
* Employee unavailable
* Schedule changes after payroll calculation

Do not assume every shift occurs between:

```text
00:00 - 24:00
```

Example:

```text
22:00 - 06:00
```

is a valid overnight shift.

---

# 44. PAYROLL EDGE CASES

Consider:

* Overtime
* Unpaid leave
* Paid leave
* Absence
* Late arrival
* Early departure
* Multiple shifts
* Overnight shifts
* Salary changes
* Allowances
* Deductions
* Rounding
* Payroll approval
* Payroll already paid

Never silently modify historical payroll records.

---

# 45. BUSINESS RULES

Do not invent important payroll/legal rules.

If a calculation depends on Indonesian labor regulations or cafe-specific policy and the rule has not been provided, ask for clarification or make the rule configurable.

Examples:

* Overtime rate
* Minimum rest
* Working hours
* Payroll period
* Allowances
* Deductions

Business rules should be configurable whenever practical.

---

# 46. SEPARATION OF CONCERNS

Do not mix:

```text
UI
Database
Business logic
Validation
External APIs
```

inside one component.

Bad:

```text
EmployeePage
 ├── UI
 ├── SQL
 ├── payroll calculation
 ├── Google Sheets API
 └── validation
```

Prefer:

```text
UI
 ↓
Service / Server Action
 ↓
Validation
 ↓
Business Logic
 ↓
Database
```

---

# 47. GOOGLE SHEETS SEPARATION

Do not put Google Sheets logic inside UI components.

Bad:

```text
SchedulePage
   ↓
Google Sheets API
```

Good:

```text
SchedulePage
   ↓
Server Action / API
   ↓
Google Sheets Service
   ↓
Google Sheets
```

---

# 48. ENVIRONMENT VARIABLES

Use `.env.local` for local development.

Never hardcode secrets.

The repository should contain:

```text
.env.example
```

with placeholder values.

Example:

```text
DATABASE_URL=
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SHEETS_ID=
```

---

# 49. GIT RULES

Use meaningful commits.

Good:

```text
feat: add employee management
feat: add daily schedule timeline
fix: prevent overlapping schedules
feat: add payroll calculation
fix: correct overnight shift calculation
refactor: extract payroll calculation service
```

Avoid:

```text
update
fix
changes
test
asdf
final
```

Do not rewrite Git history unless explicitly requested.

Do not force push unless explicitly authorized.

---

# 50. DEVELOPMENT WORKFLOW

Before implementing a feature:

### Step 1

Inspect the existing project.

### Step 2

Understand related components.

### Step 3

Check existing dependencies.

### Step 4

Check database schema.

### Step 5

Identify reusable components.

### Step 6

Plan the implementation.

### Step 7

Implement the smallest coherent change.

### Step 8

Run validation/type checking.

### Step 9

Run tests if available.

### Step 10

Review for regressions.

### Step 11

Explain what changed.

---

# 51. DO NOT OVERENGINEER

Do not introduce:

* Microservices
* Event-driven architecture
* Kubernetes
* Redis
* Message queues
* Complex state management
* Multiple databases

unless the project genuinely requires them.

This is initially a small-to-medium cafe management application.

Prefer simple architecture that can grow naturally.

---

# 52. DO NOT REBUILD EXISTING FEATURES

Before creating something new:

Search the codebase.

Look for:

```text
components
hooks
utilities
services
types
database queries
validation schemas
```

Reuse them whenever appropriate.

Avoid duplicate implementations.

---

# 53. DO NOT BREAK EXISTING FEATURES

Before modifying existing functionality:

Understand how it is currently used.

When changing shared components, check all consumers.

For example, changing:

```text
Button
Dialog
Table
Employee type
Schedule type
```

may affect many pages.

---

# 54. ACCESSIBILITY

The UI should follow good accessibility practices.

Use:

* Semantic HTML
* Proper labels
* Keyboard navigation
* Focus states
* Accessible dialogs
* Accessible buttons
* Meaningful aria labels when needed
* Sufficient contrast

Do not rely solely on color to communicate status.

---

# 55. ICONS

Use a consistent icon library.

Prefer Lucide icons or the icon system already used by the project.

Do not use random emoji as primary UI icons.

Icons should support meaning rather than decorate unnecessarily.

---

# 56. NOTIFICATIONS

Use toast notifications for short-lived feedback.

Examples:

Success:

```text
Karyawan berhasil ditambahkan.
```

Schedule:

```text
Jadwal berhasil disimpan.
```

Payroll:

```text
Payroll berhasil dihitung.
```

Sync:

```text
Data berhasil disinkronkan.
```

---

# 57. DASHBOARD DATA

Dashboard statistics must come from actual application data.

Do not hardcode production statistics.

Mock data may only be used during UI development.

Clearly separate mock data from real database data.

---

# 58. MOCK DATA

If mock data is required during initial development, create it separately.

Example:

```text
src/lib/mock/
```

Do not scatter mock values across components.

Bad:

```typescript
const employees = [
  ...
];
```

inside a dashboard component.

---

# 59. TESTING

Important business logic must be testable.

Especially:

* Working hours
* Overtime
* Schedule conflicts
* Overnight shifts
* Payroll calculation

Example test cases:

```text
08:00 - 16:00
Break: 1 hour
Expected: 7 working hours
```

Overnight:

```text
22:00 - 06:00
Expected: 8 hours
```

Conflict:

```text
08:00 - 16:00
14:00 - 22:00
Expected: conflict
```

---

# 60. TYPE SAFETY

Avoid loosely typed objects.

Bad:

```typescript
const employee: any = ...
```

Prefer:

```typescript
type Employee = {
  id: string;
  name: string;
  positionId: string;
  status: EmployeeStatus;
};
```

Database types should be generated or shared where appropriate.

---

# 61. DATABASE MIGRATIONS

Database schema changes must use migrations.

Never manually modify production database structure without a migration.

Every schema change should be reproducible.

---

# 62. SOFT DELETE

For important business entities, prefer deactivation rather than permanent deletion.

Example:

```text
Employee
status = INACTIVE
```

rather than deleting the employee record.

Historical payroll and schedule information should remain consistent.

---

# 63. HISTORICAL DATA

Payroll history is important.

Once payroll has been approved or paid:

* Do not silently recalculate it
* Do not overwrite historical salary values
* Do not change historical payroll based on current employee salary

Historical payroll should preserve the values used when it was calculated.

---

# 64. UI CONSISTENCY

All pages should feel like the same application.

For example:

Dashboard:

```text
Sidebar
Header
Content
```

Employee:

```text
Sidebar
Header
Content
```

Schedule:

```text
Sidebar
Header
Content
```

Payroll:

```text
Sidebar
Header
Content
```

Do not create isolated visual styles for each page.

---

# 65. SCHEDULE UI PRIORITY

The scheduling interface is one of the core differentiators of this application.

It should be visually excellent.

Prioritize:

* Timeline clarity
* Employee grouping
* Shift blocks
* Time labels
* Drag/edit interactions
* Conflict visibility
* Horizontal scrolling
* Quick schedule creation
* Quick schedule duplication

The manager should be able to understand the staffing situation within seconds.

---

# 66. PAYROLL UI PRIORITY

Payroll should prioritize:

* Accuracy
* Transparency
* Easy review
* Clear calculation
* Professional payslip presentation

The manager should be able to understand:

```text
Why did this employee receive this salary?
```

by seeing:

```text
Base Salary
+
Overtime
+
Allowance
-
Deduction
=
Net Salary
```

---

# 67. FUTURE FEATURES

The architecture should allow future expansion.

Potential features:

```text
Attendance
Leave Management
Employee Self-Service
Manager Approval
Multiple Cafe Branches
Inventory
Sales Integration
Performance
Notifications
WhatsApp Notifications
Mobile App
PWA
Reports
Analytics
```

Do not implement these prematurely.

Design the architecture so they can be added later.

---

# 68. MULTI-BRANCH SUPPORT

Initially the system may support one cafe.

However, avoid architecture that makes multiple branches impossible.

Potential future model:

```text
Organization
    │
    └── Branch
           │
           ├── Employees
           ├── Schedules
           └── Payroll
```

Do not implement multi-branch complexity unless required.

---

# 69. AI AGENT BEHAVIOR

When working on this project, the AI agent should behave like an experienced software engineer.

The AI must:

* Think before modifying code
* Inspect relevant files
* Preserve existing architecture
* Prefer reuse
* Keep changes focused
* Avoid unnecessary dependencies
* Avoid unnecessary refactoring
* Explain breaking changes
* Validate assumptions
* Ask clarification when business requirements are ambiguous
* Never invent important business rules
* Never expose secrets
* Never remove data without confirmation
* Never overwrite production data without explicit approval

---

# 70. WHEN REQUIREMENTS ARE AMBIGUOUS

If the requirement is ambiguous but a safe assumption can be made:

1. Make the smallest reasonable assumption.
2. Implement it in a configurable way.
3. Mention the assumption.

If the ambiguity affects:

* Payroll
* Salary
* Employee records
* Historical data
* Security
* Database structure

ask for clarification before making irreversible changes.

---

# 71. WHEN MODIFYING DATABASE SCHEMA

Before changing the schema:

1. Inspect current schema.
2. Identify existing relationships.
3. Determine migration impact.
4. Consider historical data.
5. Update related types.
6. Update validation.
7. Update affected APIs.
8. Update affected UI.
9. Run migrations safely.
10. Test affected features.

---

# 72. WHEN ADDING A NEW FEATURE

Use this process:

```text
Requirement
    ↓
Architecture analysis
    ↓
Database model
    ↓
Validation
    ↓
Business logic
    ↓
API / Server Action
    ↓
UI Components
    ↓
Integration
    ↓
Testing
```

Do not start by blindly writing UI code if the feature requires database changes.

---

# 73. RESPONSE FORMAT FOR DEVELOPMENT TASKS

When completing a development task, provide a concise summary containing:

### What Changed

List the main changes.

### Files Changed

List important files.

### Database Changes

Mention migrations/schema changes if applicable.

### Testing

Mention commands/tests performed.

### Notes

Mention assumptions, limitations, or follow-up work.

Do not provide unnecessary explanations for trivial changes.

---

# 74. CODE QUALITY PRINCIPLES

Follow these principles:

### DRY

Do not duplicate business logic.

### KISS

Prefer simple solutions.

### SOLID

Apply principles where they improve maintainability.

### Separation of Concerns

Keep UI, business logic, database, and integrations separated.

### Composition

Prefer reusable components over giant components.

### Explicitness

Prefer clear code over clever code.

---

# 75. IMPORTANT BUSINESS FLOW

The core system flow is:

```text
                 ┌──────────────┐
                 │   Karyawan   │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │    Jadwal    │
                 └──────┬───────┘
                        │
                        ▼
               ┌──────────────────┐
               │  Jam Kerja       │
               │  + Overtime      │
               └────────┬─────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   Payroll    │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  Slip Gaji   │
                 └──────────────┘
```

This relationship is fundamental to the project.

Do not implement payroll as an unrelated standalone module.

---

# 76. SOURCE OF TRUTH

The application database is the primary source of truth.

```text
                 PostgreSQL
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
     Employees    Schedules    Payroll
                     │
                     ▼
                Calculations
                     │
                     ▼
                  Payslip
                     │
                     ▼
              Google Sheets
```

Google Sheets is an integration layer, not the primary database.

---

# 77. CURRENT DEVELOPMENT PRIORITY

Build the application incrementally.

Recommended order:

## Phase 1 — Foundation

```text
Next.js
TypeScript
Tailwind
shadcn/ui
Project structure
Layout
Navigation
```

## Phase 2 — Employee

```text
Employee database
Employee list
Employee detail
Add employee
Edit employee
```

## Phase 3 — Schedule

```text
Schedule database
Weekly schedule
Daily timeline
Schedule form
Conflict detection
Working hour calculation
```

## Phase 4 — Payroll

```text
Payroll calculation
Payroll table
Payroll detail
Payslip
PDF export
```

## Phase 5 — Integration

```text
Google Sheets
Synchronization
Export
```

## Phase 6 — Authentication & Security

```text
Login
Manager role
Authorization
Audit log
```

## Phase 7 — Refinement

```text
Responsive UI
Performance
Accessibility
Testing
Error handling
UX improvements
```

---

# 78. DEFINITION OF DONE

A feature is not considered complete merely because the UI exists.

A feature is complete when:

* UI works
* Data model is correct
* Validation exists
* Business logic works
* Server-side validation exists
* Error handling exists
* Loading state exists
* Empty state exists
* Responsive behavior works
* Existing features are not broken
* TypeScript passes
* Relevant tests pass
* Security considerations are addressed

---

# 79. FINAL PRINCIPLE

The goal is not to build the most complicated system.

The goal is to build a system that a cafe manager can open every day and immediately understand.

The application should make these tasks significantly easier:

```text
"Siapa yang bekerja hari ini?"
"Siapa yang libur?"
"Jam kerja Agung berapa?"
"Apakah ada jadwal yang bentrok?"
"Berapa jam lembur karyawan?"
"Berapa total payroll bulan ini?"
"Kenapa gaji karyawan ini sebesar ini?"
"Apakah data sudah tersinkron ke spreadsheet?"
```

Every feature should ultimately help answer these questions quickly, accurately, and clearly.

Build for:

**Simplicity → Accuracy → Maintainability → Scalability**

Do not sacrifice simplicity for unnecessary complexity.
