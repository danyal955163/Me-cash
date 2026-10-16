alter table tasks add column if not exists task_type text default 'open_link';
alter table tasks add column if not exists share_message_en text;
alter table tasks add column if not exists share_message_ur text;
alter table tasks drop constraint if exists tasks_task_type_check;
alter table tasks add constraint tasks_task_type_check check (task_type in ('open_link','share_message'));
alter table tasks alter column example_images set default '[]'::jsonb;
-- Keep legacy slots/completed_count columns for compatibility; application logic no longer uses them.
