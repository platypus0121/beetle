#!/usr/bin/env bash
# 執行資料庫規則測試；DB_URL 預設為本機 Supabase。
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
cd "$(dirname "$0")"
out=$(psql "$DB_URL" -v ON_ERROR_STOP=1 -qAt -f rules.sql 2>&1)
status=$?
echo "$out" | grep -E "NOTICE:  ok|^==|ERROR|FAIL|全部通過" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "通過 $(echo "$out" | grep -c 'NOTICE:  ok') 項"
exit $status
