# Kids Expense Tracker

A modern Next.js + Supabase application for tracking children's education and aftercare expenses, supporting multi-parent sharing, multi-document verification (invoices, receipts, proofs of payment), split expenses, missing document auditing, and Excel report generation.

---

## Key Features

- **Multi-Child & Co-Parent Sharing**:
  - Add and manage multiple children.
  - Share child profiles across parents/caregivers using a unique **Child Code** (UUID) without sharing accounts.
- **Multi-Document Verification**:
  - Attach up to three distinct proof documents per expense: **Invoice**, **Receipt**, and **Proof of Payment** (e.g., bank statement/transfer confirmation).
  - Documents are stored securely in private Supabase Storage and accessed via short-lived signed URLs.
- **Smart Expense Splitting**:
  - Log an expense once and split it across multiple children with automatic per-child division.
  - Sibling expense updates automatically sync shared documents.
- **Dashboard & Audit Statuses**:
  - Instant visibility into expenses with **Missing Documents** (missing invoice, receipt, or proof of payment).
  - List of expenses **Ready for Report**.
  - Overview of **Pending Reports**.
- **Excel Report Generation (`.xlsx`)**:
  - Select expenses to generate comprehensive, styled Excel spreadsheets using `exceljs`.
  - Groups items by child with subtotals, grand totals, and 30-day signed download links for all attached documents.
  - Tracks report status lifecycle (`draft`, `submitted`, `paid`, `rejected`).
- **Flexible Authentication**:
  - Email & Password sign-in or Google OAuth.
  - Automatic parent profile creation on signup.
- **Responsive Organic UI**:
  - Tailored warm semantic palette, drawer navigation, and mobile-friendly design.

---

## Tech Stack

- **Frontend & Routing:** Next.js 14 (App Router), React 18
- **Styling:** Tailwind CSS (custom semantic color system)
- **Database & Auth:** Supabase (PostgreSQL with Row Level Security & Enums)
- **Storage:** Supabase Storage (private `receipts` bucket)
- **Reporting:** ExcelJS (custom styled `.xlsx` generation)
- **Hosting:** Vercel (free tier compatible)

---

## 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** and run the entire script in `supabase/schema.sql`. This:
   - Creates enums: `expense_category`, `expense_status`, and `report_status`.
   - Creates tables: `parent`, `child`, `parent_child`, `expense`, `expense_report`, `expense_to_expense_report`.
   - Enables Row Level Security (RLS) and adds all access policies.
   - Sets up the `on_auth_user_created` trigger for automatic parent profile creation.
   - Configures storage RLS policies for the `receipts` bucket.
3. Go to **Storage** and ensure a bucket named `receipts` exists (mark it **private**).
4. *(Optional)* Go to **Authentication -> Providers -> Google** if you want to enable Google Sign-In.
5. Go to **Project Settings -> API** and copy:
   - **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`)
   - **`anon` public key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

---

## 2. Local Setup & Running

1. Clone the repository and install dependencies:
   ```bash
   git clone <your-repo-url>
   cd kids-expense-tracker
   npm install
   ```

2. Create a `.env.local` file in the project root:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Deployment (Vercel)

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and import your repository.
3. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.
5. *(Optional mobile tip)* On your mobile phone (iOS Safari or Android Chrome), open the deployed URL and select **"Add to Home Screen"** to use it as a standalone web app.

---

## Data Model & Schema

```
parent (id [auth.users], first_name, last_name)
   └── parent_child (parent_id, child_id)
            └── child (id, first_name, last_name)
                     └── expense (id, child_id, created_at, category, amount, description, status,
                                  invoice_url, receipt_url, proof_of_payment_url)
                              └── expense_to_expense_report (report_id, expense_id)
                                       └── expense_report (id, parent_id, name, status, created_at)
```

### Enums
- **`expense_category`**: `'education'`, `'aftercare'`
- **`expense_status`**: `'unsubmitted'`, `'requested'`, `'reimbursed'`, `'rejected'`
- **`report_status`**: `'draft'`, `'submitted'`, `'paid'`, `'rejected'`

### Tables Overview

| Table | Description |
|---|---|
| `parent` | Parent/caregiver profile linked 1:1 with `auth.users(id)`. |
| `child` | Child records with UUID and names. |
| `parent_child` | Many-to-many junction allowing multiple parents to access the same child. |
| `expense` | Individual expense entries, linked to a specific child, categorized with status and file references. |
| `expense_report` | Reports created by parents to group expenses for reimbursement. |
| `expense_to_expense_report` | Junction table mapping expenses into reports. |

### Storage Structure

Files are uploaded to the private `receipts` bucket under user-isolated paths:
- Expenses: `{user_id}/{expense_id}_{docType}_{filename}`
- Generated Reports: `{user_id}/reports/{report_id}.xlsx`

Access is granted via signed URLs generated on-demand by the application.

---

## Typical Workflow

1. **Profile & Kids Setup**:
   - Update your parent profile under the **Profile** menu.
   - Add your children. To share access with a partner/co-parent, copy the child's **Child Code** (UUID) and have them link it on their Profile.
2. **Recording Expenses**:
   - Under **Expenses -> New Expense**, enter date, category, total amount, and description.
   - Select one or more children (total amount is split equally).
   - Attach your **Invoice**, **Receipt**, and/or **Proof of Payment**.
3. **Checking Status (Home / Dashboard)**:
   - Check the **Missing Documents** card to see which expenses are still waiting on required attachments.
4. **Generating Expense Reports**:
   - Under **Expenses -> Expense Reports**, filter and select expenses ready for reimbursement.
   - Name your report and click **Generate Expense Report**.
   - Download the formatted `.xlsx` workbook with grouped child subtotals and embedded document links.
   - Manage report statuses (`draft`, `submitted`, `paid`, `rejected`) as reimbursements are processed.
