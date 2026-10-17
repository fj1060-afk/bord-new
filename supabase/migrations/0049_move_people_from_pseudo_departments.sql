-- Data fix for this installation: people placed in departments named after the
-- board, the audit committee and the CEO get their real places instead, and
-- those four departments are archived (kept for the audit trail).
insert into public.board_members (board_id, person_id, position, category)
select '3a493800-5c40-46a4-9fdd-b49b8c2dba58', p.id, 'member', 'non_executive'
from public.people p
where p.id in ('3893c8af-f1a9-4120-9ded-df2bc13f2111', '09590426-bfb2-4d39-aaec-7df140ce8862', '2875d983-949d-4479-b3f5-28b082b32a00', '7a52464b-2023-4043-9727-602a0ee72727', 'a471f4c8-aca4-4a41-8640-f9d0946ea4f4')
  and not exists (select 1 from public.board_members b where b.person_id = p.id and b.board_id = '3a493800-5c40-46a4-9fdd-b49b8c2dba58' and b.status = 'active');

insert into public.committee_members (committee_id, person_id, position)
select '5a2eaf8d-abb6-423c-98cb-d4591dc5e946', '1218b601-18c4-46ae-990c-92aa3016131f', 'member'
where not exists (select 1 from public.committee_members c where c.committee_id = '5a2eaf8d-abb6-423c-98cb-d4591dc5e946' and c.person_id = '1218b601-18c4-46ae-990c-92aa3016131f' and c.status = 'active');

update public.people set executive_title = 'الرئيس التنفيذي' where id = '7c8d6228-d7c9-4764-a66e-536216a9dd75';

update public.departments set status = 'archived'
where id in ('2a908fcd-7225-46d6-bbdc-33021b408337', '13671e9c-55f8-4d74-bbf0-23543d98c0f4', '6fbfaf06-d90f-4d65-a807-ff737824669d', 'a4bfed6e-6d5b-4f00-b601-e8fbeae84f5f');
