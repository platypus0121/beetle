-- 0007 刪除帳號時，版主操作紀錄保留但把操作者欄位清空（原本會擋住刪除）。
-- 有交易紀錄的帳號仍然不能刪除：交易單、時間軸與評價必須保留作為證據。
alter table public.reports drop constraint reports_handled_by_fkey,
  add constraint reports_handled_by_fkey foreign key (handled_by) references public.profiles on delete set null;
alter table public.moderation_log drop constraint moderation_log_mod_id_fkey,
  add constraint moderation_log_mod_id_fkey foreign key (mod_id) references public.profiles on delete set null;
alter table public.disputes drop constraint disputes_resolved_by_fkey,
  add constraint disputes_resolved_by_fkey foreign key (resolved_by) references public.profiles on delete set null;
