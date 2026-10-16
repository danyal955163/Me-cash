-- Apply this migration in Supabase before using repeatable tasks.
alter table tasks add column if not exists completion_type text not null default 'one_time';
alter table tasks drop constraint if exists tasks_completion_type_check;
alter table tasks add constraint tasks_completion_type_check check (completion_type in ('one_time','repeatable'));
alter table task_submissions drop constraint if exists task_submissions_task_id_user_id_key;
create index if not exists task_submissions_task_user_created_idx on task_submissions(task_id,user_id,created_at desc);