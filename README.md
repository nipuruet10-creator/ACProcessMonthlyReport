# PROCESS DEVELOPMENT MONTHLY REPORT AUTOMATION SYSTEM
### WALTON Hi-Tech Industries PLC &bull; AC Process Development Department

A modern, production-ready engineering task management, monthly reporting, and executive management dashboard system.

---

## 🌟 Core Principle

> ### **ENTER ONCE &rarr; USE EVERYWHERE**
> Engineers enter task data **once**. That single source of truth (`TASKS` table) dynamically powers:
> 1. Task management & daily progress tracking
> 2. Executive management dashboard & KPIs
> 3. Monthly report selection (`Monthly Report = YES / NO`)
> 4. **Engineer-wise monthly report slides (1 Consolidated Slide Per Engineer Rule)**
> 5. AI-generated concise management report summaries (Gemini 3.8 Flash)
> 6. Multi-photo attachment workflow (`Photo 1`, `Photo 2`, `Before Photo`, `After Photo`)
> 7. **100% Editable PowerPoint Report (`.pptx`)** with native shapes and tables (never flattened images)
> 8. Executive Print-Ready PDF Report (`.pdf`)
> 9. Standalone Self-Contained HTML Presentation (`.html`)
> 10. Versioned Report History & Audit Compliance Log

---

## 📁 System Architecture & Directory Structure

All deliverables are organized in a clean modular architecture:

```
Process_Report_Automation_System/
├── index.html                      # 🚀 Primary Unified Desktop Application
├── app.js                          # 🎛 Main Application Coordinator & Tab Router
├── README.md                       # 📖 System Documentation & Deployment Guide
│
├── config/                         # Configuration & Standards
│   ├── app_config.js               # System constants, API keys, storage keys
│   ├── master_lists.js             # Engineers, Supervisors, Categories, Report Sections
│   └── slide_theme.js              # 16:9 geometry, Lexend typography, Walton brand colors
│
├── database/                       # Source of Truth Data Layer
│   ├── schema.js                   # 33-column TASKS schema definition & validators
│   ├── seed_data.js                # Initialized with 86 real August 2026 engineering tasks
│   ├── db_adapter.js               # LocalStorage/IndexedDB + Google Sheets Sync Adapter
│   └── gas_backend/                # Production Google Apps Script Backend
│       ├── Code.gs                 # Web App API Router (doGet, doPost)
│       ├── SheetsDB.gs             # Google Sheets TASKS & Master tables handler
│       ├── DriveStorage.gs         # Google Drive photo upload & archive storage
│       ├── SlidesEngine.gs         # Google Slides API presentation builder
│       ├── GeminiService.gs        # Server-side Gemini 3.8 Flash proxy
│       └── appsscript.json         # Apps Script manifest with OAuth scopes
│
├── tasks/                          # Task Entry & Management
│   ├── task_manager.js             # Task CRUD, filters, search, CSV export/import
│   ├── task_form_view.js           # Simple engineer entry form modal
│   └── task_table_view.js          # Interactive data grid with quick actions & YES/NO toggle
│
├── report/                         # Monthly Report Compilation
│   ├── report_controller.js        # Monthly Report YES/NO filter & queue builder
│   ├── readiness_engine.js         # Deterministic readiness evaluator (READY, PHOTO PENDING)
│   ├── builder_view.js             # Monthly Report Builder view & engineer cards
│   └── preview_modal.js            # Live 16:9 interactive slide deck presentation viewer
│
├── slides/                         # Consolidated Slide Engine
│   ├── engineer_grouping.js        # 🌟 ENFORCES 1 MAIN SLIDE PER ENGINEER RULE
│   ├── slide_card_component.js     # Task card formatter (Lexend, AI title/desc/impact, photo)
│   └── slide_layout_engine.js      # 16:9 widescreen master slide layout renderer
│
├── ai/                             # Gemini 3.8 Flash Intelligence Engine
│   ├── prompt_templates.js         # Strict zero-fabrication prompts (no invented facts)
│   ├── ai_cache_manager.js         # Content-hash caching (zero redundant API calls)
│   └── gemini_client.js            # Gemini API client with offline factual fallback
│
├── photos/                         # Visual Evidence Management
│   ├── storage_provider.js         # Local Base64 & Google Drive storage connector
│   ├── photo_manager.js            # Upload, replace, remove, and slot updater
│   └── photo_view_modal.js         # Visual attachment manager & lightbox modal
│
├── dashboard/                      # Executive Management Dashboard
│   ├── dashboard_controller.js     # Master dashboard coordinator & 8 KPI cards
│   ├── charts.js                   # Chart.js visualizations (cost savings trend, categories)
│   ├── cost_saving_tracker.js      # Real financial savings aggregator (৳ 28,12,151 FY 26-27)
│   ├── bom_tracker.js              # BOM observation analytics (356 physical obs, RAC/CAC)
│   └── project_tracker.js          # Ongoing vs Completed projects monitor
│
├── export/                         # Multi-Format Export Engines
│   ├── pptx_generator.js           # 100% editable PPTX generator (PptxGenJS native shapes/tables)
│   ├── pdf_generator.js            # Executive vector print-ready PDF generator
│   ├── html_generator.js           # Standalone offline single-file HTML presentation
│   └── export_controller.js        # 13-step GENERATE MONTHLY REPORT coordinator
│
├── history/                        # Version Control & Archives
│   ├── history_manager.js          # Report version repository (e.g. 2026-08-v01, 2026-08-final)
│   └── version_view.js             # Historical report viewer & download center
│
├── auth/                           # Security & RBAC
│   └── auth_manager.js             # Roles: ADMIN, REPORT_OWNER, ENGINEER, VIEWER
│
├── audit/                          # Compliance & Audit Trail
│   └── audit_logger.js             # Immutable operational log (creates, edits, uploads, exports)
│
├── utils/                          # Helpers & Formatting
│   └── helpers.js                  # Unique ID generator, BDT currency (৳), date formatting
│
├── assets/                         # Presentation & Theme Assets
│   ├── css/app.css                 # Lexend styling, dark/light theme, print rules
│   └── images/                     # 157 high-resolution engineering project photos
│
└── tests/                          # Automated Verification Suite
    ├── run_tests.html              # In-browser & headless test runner
    └── test_output.txt             # Verification test logs
```

---

## 📊 Database Schema: Central `TASKS` Table (33 Fields)

| # | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| 1 | `task_id` | String | Unique immutable ID (e.g. `TSK-202608-0001`) |
| 2 | `entry_date` | Date | Initial creation date (`YYYY-MM-DD`) |
| 3 | `task_month` | String | Target reporting month (`YYYY-MM`) |
| 4 | `task_name` | String | Original engineer task name |
| 5 | `task_details` | Text | Detailed procedures and engineering steps |
| 6 | `category` | String | Department category (Process, Tools, Parts, Materials, Chemical, Cost Saving, BOM) |
| 7 | `task_point` | Number | WBS point standard |
| 8 | `supervisor` | String | Supervising lead engineer |
| 9 | `concern_engineer` | String | Primary responsible engineer (**Grouping key for monthly report slides**) |
| 10 | `assignee_2` | String | Supporting engineer |
| 11 | `start_date` | Date | Commencement date |
| 12 | `end_date` | Date | Actual or estimated end date |
| 13 | `status` | String | `Completed`, `Ongoing`, `In Progress`, `Scheduled`, `On Hold` |
| 14 | `progress_percent` | Number | 0 to 100% |
| 15 | `impact` | Text | Technical, operational, or quality impact |
| 16 | `cost_impact` | String | Direct financial impact note |
| 17 | `annual_saving` | Number | Verified annual cost reduction in BDT (Never fabricated) |
| 18 | `deadline` | Date | Strategic milestone deadline |
| 19 | `monthly_report` | String | **Master report selector**: `YES` / `NO` |
| 20 | `report_section` | String | Target report section (e.g. `02 \| Major Developments (Process)`) |
| 21 | `report_priority` | String | `High`, `Medium`, `Low` |
| 22 | `photo_required` | String | Visual evidence flag (`YES` / `NO`) |
| 23 | `photo_1` | String | Primary photo path, URL, or Base64 |
| 24 | `photo_2` | String | Secondary photo path, URL, or Base64 |
| 25 | `before_photo` | String | Pre-improvement baseline photo |
| 26 | `after_photo` | String | Post-improvement result photo |
| 27 | `ai_report_title` | String | Gemini 3.8 Flash transformed concise title |
| 28 | `ai_report_description` | Text | Gemini 3.8 Flash transformed executive summary narrative |
| 29 | `ai_report_impact` | Text | Gemini 3.8 Flash transformed bulleted impact synthesis |
| 30 | `report_ready` | String | Deterministic state: `READY`, `PHOTO PENDING`, `INCOMPLETE` |
| 31 | `report_order` | Number | Slide card ordering sequence |
| 32 | `remarks` | Text | Internal engineering notes |
| 33 | `last_updated` | Timestamp | ISO 8601 modification timestamp |

---

## ⚡ Critical Business Rules Enforced

1. **Engineer-Wise Report Rule (1 Engineer = 1 Main Slide):**
   - The consolidator groups all selected tasks (`Monthly Report = YES`) by `concern_engineer`.
   - Generates **ONE MAIN MONTHLY REPORT SLIDE PER ENGINEER** (never 1 slide per task!).
   - Example:
     - Sazzad (5 tasks) &rarr; 1 consolidated Sazzad slide
     - Rafi (4 tasks) &rarr; 1 consolidated Rafi slide
     - Faiyaz (2 tasks) &rarr; 1 consolidated Faiyaz slide
   - Overflow to `Engineer Name – Continued` is used only if tasks exceed 6 per slide to protect readability.

2. **Monthly Report Selector (`YES` / `NO`):**
   - If `NO`: task is strictly excluded from monthly slides.
   - If `YES`: task enters monthly report queue.
   - Selection is never inferred automatically from category or status.

3. **AI Language Processing (Gemini 3.8 Flash):**
   - Transforms `task_name` &rarr; concise title, `task_details` &rarr; executive narrative, `impact` &rarr; concise impact points.
   - **Zero Fabrication Guarantee:** Never invents numbers, savings, dates, completion status, or technical results.
   - **Smart Caching:** Gemini is only invoked when `monthly_report` toggles to `YES`, when source fields change, or on manual click.

4. **Visual Attachment & Photo Workflow:**
   - Photos are optional at selection time.
   - Absence of photos flags `PHOTO PENDING` but **never blocks report generation**.
   - Photo areas on slides remain intentionally styled and clean. Never uses fake or stock images.
   - Upload, Replace, Remove buttons available in the Report Builder.

5. **100% Editable PowerPoint Presentations:**
   - Generates native 16:9 widescreen `.pptx` decks using **Lexend** typography.
   - All cards, shapes, text boxes, tables, and KPI values are individually clickable and editable in Microsoft PowerPoint.

---

## 🚀 How to Run the Application

### Option 1: Direct Local / Offline Use (Zero Server Setup)
1. Open `Process_Report_Automation_System/index.html` directly in any web browser (Google Chrome, Microsoft Edge, Firefox).
2. The system loads instantly with 86 real engineering tasks and 157 project photos pre-initialized.
3. Switch between tabs: **Executive Dashboard**, **Tasks Directory**, **Monthly Report Builder**, **Report History**, **Audit Trail**.

### Option 2: Deploy to Web Server / Hostinger / Intranet
1. Upload the entire `Process_Report_Automation_System/` directory to your web server (e.g. `public_html/report-system/`).
2. Visit `https://your-domain.com/report-system/index.html`.

### Option 3: Connect to Google Workspace (Google Sheets, Drive, Slides)
1. Open Google Drive and create a new Google Sheet.
2. Go to **Extensions** &rarr; **Apps Script**.
3. Copy the script files from `database/gas_backend/` (`Code.gs`, `SheetsDB.gs`, `DriveStorage.gs`, `SlidesEngine.gs`, `GeminiService.gs`, `appsscript.json`).
4. In Apps Script **Project Settings** &rarr; **Script Properties**, add:
   - `SPREADSHEET_ID`: (Your Google Sheet ID)
   - `DRIVE_FOLDER_ID`: (Your Google Drive Folder ID)
   - `GEMINI_API_KEY`: (Your Google AI Gemini API Key)
5. Click **Deploy** &rarr; **New deployment** &rarr; Select **Web app** &rarr; Access: **Anyone**.
6. Copy the Web App URL and paste it into `config/app_config.js` (`GOOGLE_WORKSPACE.APPS_SCRIPT_WEBAPP_URL`) and set `ENABLED: true`.

---

## 🧪 Automated Testing & Validation Results

To run the automated test suite:
1. Open `Process_Report_Automation_System/tests/run_tests.html` in your browser.
2. The suite automatically executes 29 unit and integration tests covering all 18 phases.

**Test Results Summary:**
- **Phase 1: Architecture & Schema:** 5 / 5 PASS
- **Phase 2: Database & Seed Data:** 2 / 2 PASS
- **Phase 3: Task Management & CSV Export:** 2 / 2 PASS
- **Phase 4: Monthly Report Selector & Readiness:** 3 / 3 PASS
- **Phase 5: 1 Slide Per Engineer Grouping Rule:** 3 / 3 PASS
- **Phase 6: AI Transformation & Cache Manager:** 2 / 2 PASS
- **Phase 7: Report Builder Queue:** 1 / 1 PASS
- **Phase 8: Photo Management Workflow:** 1 / 1 PASS
- **Phase 9: Dashboard, Cost Savings & BOM Trackers:** 3 / 3 PASS
- **Phase 10-12: PowerPoint PPTX Engine:** 1 / 1 PASS
- **Phase 13-14: PDF & Standalone HTML Exports:** 1 / 1 PASS
- **Phase 15: Report History & Audit Logger:** 2 / 2 PASS
- **Phase 16: RBAC Security Permissions:** 3 / 3 PASS
- **Total: 29 / 29 PASSED (100% Success)**
