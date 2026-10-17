# Requests portal: inspection and plan

Branch `portal-requests`. Rebuilds the portal for department users around three pages
(Home, Requests, Meetings) without changing board meeting logic or deleting data.

## 1. Inspection (2026-10-17)

### Why the CFO saw nothing
- The dashboard query embedded `meetings` from `agenda_items`. Since `meetings.current_item_id`
  (live meetings) links the two tables a second way, PostgREST answered **300 (ambiguous
  relationship)** and the dashboard showed no requests to anyone (47 failed calls in a day).
- Fixed on `main` (5fd414a): the embed names `agenda_items_meeting_id_fkey`. Requests addressed
  to a person now count as theirs too.
- Data and RLS were correct: as the CFO, the database returns the six requests of
  «الادارة المالية».

### How requests work today
| Piece | Today |
|---|---|
| Table | `document_requests`: `agenda_item_id`, `department_id` **or** `assignee_user_id`, `title`, `due_date`, `status`, `review_note` |
| Statuses | `requested` → `submitted` → `accepted`, or `returned` → `submitted` again |
| Submit | Automatic: uploading a file to the request (trigger `mark_request_submitted`) |
| Review | Secretary: `reviewDocumentRequest` → `accepted` / `returned` with a note |
| Who sees it | RLS `can_fulfil_request`: the department's delegates, or the named person; organizers see all |
| Files | `meeting_documents`; the department sees its own deliverables only (`can_view_document`) |
| History | `audit_logs` already records every change to requests and documents, with the actor; readable by admins only |
| Department users | `department_delegates (department_id, user_id)`: all equal, no manager/employee distinction |
| Pages | `/` (dashboard), `/my-tasks` (resolution tasks), `/meetings/requests` (agenda item requests + documents asked) |
| Role `department_rep` | `/`, `/documents`, `/meetings`, `/my-tasks` (view) |

### Gaps against the brief
1. No «قيد التنفيذ» state, no internal assignment to an employee, no reply note, no extension request.
2. Uploading submits immediately; the brief wants upload, then «إرسال الرد».
3. A person named on a request cannot open files others uploaded for it (only the department path is checked).
4. A contributor opening the meeting page can read the whole agenda (all items), not only theirs.
5. The activity log exists but users cannot read it.

## 2. Status mapping (one request, one row, shown to everyone allowed)
| Brief | Stored | Set by |
|---|---|---|
| جديد | `requested` | secretary creates / sends |
| قيد التنفيذ | `in_progress` (new) | department user assigns it or starts working |
| تم الرد | `submitted` | department user presses «إرسال الرد» |
| يحتاج استكمالاً | `returned` | secretary returns it with a note |
| مكتمل | `accepted` | secretary accepts |
| متأخر | computed: `due_date < today` and not `accepted` (separate badge, not a status) |

Resolution tasks (`resolution_tasks`: open / in_progress / done) show in the same list,
mapped to جديد / قيد التنفيذ / مكتمل. Their logic is unchanged.

## 3. Database changes (additive only; documented before running)
Migration `0053_request_workflow.sql`:
1. `document_requests.status`: allow `in_progress` (check constraint widened; existing rows unchanged).
2. `document_requests.handler_user_id uuid null` → `profiles`: the employee a department request
   is assigned to. `department_id` stays, so every delegate (including the manager) keeps it.
3. `document_requests.response_note text null`: the department's notes with its reply.
4. `document_requests.responded_at timestamptz null`, `responded_by uuid null`.
5. Table `request_extensions` (id, request_id, requested_due, reason, status pending/approved/declined,
   requested_by, decided_by, decided_at, created_at) with RLS: department users create for their
   requests; organizers decide; approval moves `due_date`.
6. `can_fulfil_request` also true for `handler_user_id`; `can_view_document` also true for the
   request's `assignee_user_id` / `handler_user_id` (gap 3).
7. RPC `submit_document_request(id, note)`: checks the caller may fulfil it and has at least one
   file, sets `submitted`, `response_note`, `responded_at/by`.
8. Trigger `mark_request_submitted`: an upload moves `requested`/`returned` to `in_progress`
   instead of `submitted` (needs approval: changes today's behaviour, see §5).
9. RPC `request_activity(id)`: the request's audit entries for anyone who may see the request
   (security definer; `audit_logs` itself stays admin-only).

Nothing is dropped or deleted. Audit triggers stay.

## 4. Pages
- Sidebar for department users: الرئيسية · الطلبات · الاجتماعات (if allowed) · حسابي (bottom).
- `/requests`: search; filters (status, department, meeting); tabs الكل / جديدة / قيد التنفيذ /
  تم الرد / تحتاج استكمالاً / مكتملة; overdue badge; list → `/requests/[id]` details
  (المطلوب، إسناد، رفع، ملاحظات، إرسال الرد، طلب تمديد، سجل النشاط).
- `/my-tasks` and `/meetings/requests` redirect to `/requests` (agenda item requests keep their own tab).
- Home: four tiles from real counts, top 3-5 requests needing action, nearest due date,
  upcoming meetings the user may see, recent activity.
- Meetings: only meetings the user may see; no secretary tools.

## 5. Decisions needed
- **A.** Manager vs employee: treat every delegate as able to assign (no new role), or add a
  `is_manager` flag on `department_delegates`?
- **B.** Upload no longer submits by itself (§3.8): secretary sees a request as «تم الرد» only
  after «إرسال الرد». Approve?
- **C.** Contributors see only their own items on the meeting page (gap 4): RLS on
  `agenda_items` limited for non-organizer, non-invitee users. Approve?
- **D.** Database is shared between `main` and this branch: additive changes go live at once
  (harmless to current code); §3.8 only when merging.

## 6. Test plan
End-to-end through SQL impersonation (each user's JWT, inside a rolled-back transaction) to prove
who sees what, plus the UI checks on the Vercel preview of this branch:
secretary creates → CFO sees it → assigns to an employee → employee uploads → sends reply →
secretary returns → resubmitted → accepted; plus no requests, multiple roles, department-only,
person-only, overdue, returned, and file access.
