# Printed documents: approved design

`approved-invitation-2026-10-17.pdf` is the approved reference for the printed
meeting documents (invitation and agenda, attendance sheet, minutes). Any
change to `src/app/print/` must keep this look unless a new reference is
approved and replaces this file.

The approved design, top to bottom:

- **Letterhead**: seal and Arabic company name with the issuer on the right;
  English name, issuer and the classification («Confidential | سري», brass
  text, no box) on the left.
- **Title band**: green band split Arabic | English with a brass rule under it;
  a light row beneath with the body (Arabic), «رقم الاجتماع / Meeting No.» and
  the issued code (e.g. `BD-2026-001`), and the body in English.
- **Issue date line** (invitation only): «تاريخ إصدار الدعوة» on the right and
  «Invitation issued» on the left, under the title band; drafts read «مسودة —
  لم تُصدر بعد / Draft — not yet issued». The date is recorded when the
  meeting is approved (draft → scheduled).
- **Numbering**: a meeting gets its code when its invitation is issued
  (`BD-2026-001`: body code, year, sequence; the format and each body's code
  are set under Settings → «ترقيم الاجتماعات»). The sequence is per body and
  year, the code never changes after issue, drafts show «مسودة / Draft», and a
  cancelled meeting keeps its code with a «ملغى | Cancelled» mark. The same
  code is the document reference in the footer and the file name.
- **Meeting card**: green date block on the right, captioned «تاريخ الاجتماع /
  Meeting Date» (or «تاريخ الانعقاد / Held on» once held) (weekday in both languages
  split by a bar, large day, then month and year on one smaller row —
  «أكتوبر | October 2026» — and the Hijri date); cells with a brass
  icon (the invitation has four: «وقت الاجتماع / Meeting Time» as the start
  time, e.g. «10:00 صباحًا», «نوع الاجتماع / Meeting Type» (عادي/استثنائي),
  «طريقة الانعقاد / Meeting Format» and «مكان الاجتماع / Meeting Venue»), Arabic and English labels split by a brass bar, Arabic value bold on
  the right and English lighter on the left; a time range shows once, centred.
- **Section headings**: Arabic on the right, English on the left, brass rule
  beneath.
- **Agenda items**: one container in the title band's light colour
  (`--band-soft`, radius 12px, padding 12px) holding a white card per item
  (border 1px `#dce3df`, radius 8px, 10px apart). Each card: green number
  square on the right, Arabic title right-aligned beside the English one
  left-aligned with a light divider, then a very light strip with presenter,
  duration and attachments spread evenly (brass icons, light dividers). A
  card never splits across pages; the container continues on the next page.
  The purpose column is dropped when every item is for decision, with one
  line under the heading saying so.
- **Other sections, same pattern**: the attendance tables (members, guests)
  and the quorum box sit in the same soft container on white with a 1px
  `#dce3df` border and rounded corners; in the minutes each item is a white
  card (number square, Arabic | English titles, then discussion and
  resolutions under a light rule) inside one container, like the agenda.
- **Notes to members**: light box with a brass edge, Arabic and English side
  by side.
- **Signatures**: a plain line per signer with role, name, status when signed
  and one bilingual date line («التاريخ / Date»).
- **Pages**: tables and items continue across pages with repeated headers; a
  short running header from page two; page numbers in the footer.
