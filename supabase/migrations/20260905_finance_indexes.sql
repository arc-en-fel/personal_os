-- Keep category filters and date-based finance reports fast as history grows.
create index if not exists transactions_user_category_date_idx
  on public.transactions (user_id, category_id, transaction_date desc);

create index if not exists transaction_categories_user_name_idx
  on public.transaction_categories (user_id, name);
