-- 0006 排程：每分鐘結標到期的拍賣、自動完成交易、換瓶提醒。
create extension if not exists pg_cron;
select cron.schedule('beetle-maintenance', '* * * * *', $$select private.run_maintenance()$$);
