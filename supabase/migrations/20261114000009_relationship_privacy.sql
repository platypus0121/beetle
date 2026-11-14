-- 0009 好友／封鎖關係只能查詢「與自己有關」的配對。
-- 原本任何人（含未登入）都能拿兩個任意會員的 id 查他們是否為好友、是否互相封鎖。
create or replace function public.is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select ((select auth.uid()) in (a, b) or public.is_mod())
     and exists (select 1 from public.blocks
                 where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select ((select auth.uid()) in (a, b) or public.is_mod())
     and exists (select 1 from public.friendships
                 where status = 'accepted'
                   and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a)));
$$;

revoke execute on function public.is_blocked_between(uuid, uuid), public.are_friends(uuid, uuid) from anon;
