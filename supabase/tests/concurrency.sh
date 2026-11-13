#!/usr/bin/env bash
# 並發出價測試：兩個連線同時對同一場拍賣連續出價，檢查結果一致。
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
P="psql $DB_URL -qAt -v ON_ERROR_STOP=1"
S='51000000-0000-0000-0000-000000000001'; B1='52000000-0000-0000-0000-000000000002'; B2='53000000-0000-0000-0000-000000000003'
cleanup() {
  $P -c "delete from public.orders where seller_id = '$S'; delete from public.listings where seller_id = '$S';
         delete from auth.users where id in ('$S','$B1','$B2');" >/dev/null
}
trap cleanup EXIT
cleanup
L=$($P <<SQL
insert into auth.users (id, email, aud, role) values ('$S','cs@test.local','authenticated','authenticated'),
  ('$B1','cb1@test.local','authenticated','authenticated'), ('$B2','cb2@test.local','authenticated','authenticated');
update public.profiles set created_at = now() - interval '60 days' where id in ('$S','$B1','$B2');
insert into public.listings (seller_id, sale_type, species_id, title, stage, price, shipping_methods)
  select '$S', 'auction', id, '並發測試', 'adult', 1, '{post}' from public.species where not is_protected limit 1 returning id \gset
insert into public.auctions (listing_id, start_price, min_increment, ends_at, current_price)
  values (:id, 100, 10, now() + interval '1 hour', 100);
select :id;
SQL
)
bidder() { # $1 = uid, $2 = offset
  for i in $(seq 1 40); do
    $P -c "begin; select set_config('request.jwt.claims', '{\"sub\":\"$1\"}', true); set local role authenticated;
           select public.place_bid($L, (select current_price from public.auctions where listing_id = $L) + 10 + $2); commit;" \
      >/dev/null 2>&1 || true
  done
}
bidder "$B1" 0 & bidder "$B2" 5 & wait
$P <<SQL
select '出價筆數 ' || count(*) || '，拍賣記錄的筆數 ' || (select bid_count from public.auctions where listing_id = $L) from public.bids where listing_id = $L;
do \$\$
declare a public.auctions; top public.bids; bad int;
begin
  select * into a from public.auctions where listing_id = $L;
  select * into top from public.bids where listing_id = $L order by amount desc, id desc limit 1;
  if a.bid_count <> (select count(*) from public.bids where listing_id = $L) then raise exception 'bid_count 不一致'; end if;
  if a.current_price <> top.amount then raise exception '目前價 % 與最高出價 % 不一致', a.current_price, top.amount; end if;
  if a.current_bidder_id <> top.bidder_id then raise exception '最高出價者不一致'; end if;
  select count(*) into bad from (select amount, lag(amount) over (order by id) prev from public.bids where listing_id = $L) x
   where prev is not null and amount < prev;
  if bad > 0 then raise exception '出價金額出現倒退 % 筆', bad; end if;
  if (select count(*) from (select amount from public.bids where listing_id = $L and not is_auto group by amount having count(*) > 1) d) > 0 then
    raise exception '出現兩筆相同金額的手動出價';
  end if;
  raise notice '並發出價測試通過：目前價 %，共 % 筆', a.current_price, a.bid_count;
end \$\$;
SQL
