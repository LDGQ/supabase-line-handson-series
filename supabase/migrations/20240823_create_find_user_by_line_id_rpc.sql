-- RPC関数: LINE User IDでユーザーを検索
CREATE OR REPLACE FUNCTION find_user_by_line_id(line_user_id TEXT)
RETURNS SETOF auth.users
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM auth.users
  WHERE raw_user_meta_data ->> 'liff_user_id' = line_user_id
  LIMIT 1;
$$;
