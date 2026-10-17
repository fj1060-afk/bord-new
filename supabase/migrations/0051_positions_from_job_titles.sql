-- Positions typed as job titles become real seats (positions are now set only from the users page),
-- and those job titles are cleared. Data only; safe to re-run.

-- Board seats from the job titles: the chair and the members of the active board.
insert into board_members (board_id, person_id, position, category)
select b.id, p.id, case when p.full_name = 'خالد الخالد' then 'chair' else 'member' end, 'non_executive'
from people p
cross join (select id from boards where status = 'active' order by created_at limit 1) b
where p.full_name in ('خالد الخالد', 'علي محمد', 'ثامر علي', 'نواف نايف', 'صالح الصالح')
  and not exists (select 1 from board_members m where m.board_id = b.id and m.person_id = p.id and m.status = 'active');

-- The audit committee chair.
update committee_members cm set position = 'chair'
from people p, committees c
where cm.person_id = p.id and cm.committee_id = c.id and cm.status = 'active'
  and p.full_name = 'محمد المحمد' and c.code = 'AC';

insert into committee_members (committee_id, person_id, position)
select c.id, p.id, 'chair'
from people p, committees c
where p.full_name = 'محمد المحمد' and c.code = 'AC'
  and not exists (select 1 from committee_members m where m.committee_id = c.id and m.person_id = p.id and m.status = 'active');

-- A seat brings its access role.
insert into user_roles (user_id, role_id)
select p.user_id, r.id
from people p, roles r
where p.user_id is not null and r.key = 'board_member'
  and p.full_name in ('خالد الخالد', 'علي محمد', 'ثامر علي', 'نواف نايف', 'صالح الصالح')
on conflict do nothing;

insert into user_roles (user_id, role_id)
select p.user_id, r.id
from people p, roles r
where p.user_id is not null and r.key = 'committee_member' and p.full_name = 'محمد المحمد'
on conflict do nothing;

-- The job title is the company job only; clear the positions typed there.
update profiles set job_title = null
where job_title in ('رئيس مجلس الادارة', 'عضو مجلس الادارة', 'رئيس لجنة المراجعة')
  and id in (select user_id from people where full_name in ('خالد الخالد', 'علي محمد', 'ثامر علي', 'نواف نايف', 'صالح الصالح', 'محمد المحمد'));

update people set job_title = null
where job_title in ('رئيس مجلس الادارة', 'عضو مجلس الادارة', 'رئيس لجنة المراجعة')
  and full_name in ('خالد الخالد', 'علي محمد', 'ثامر علي', 'نواف نايف', 'صالح الصالح', 'محمد المحمد');
