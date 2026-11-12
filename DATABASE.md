# Database
The full schema (tables, security rules, invoice/purchase/payment functions, audit + login logs) is already applied to your Supabase project.
View it in Supabase: Database -> Migrations -> ar_shop_v2_full_system and ar_shop_v2_lock_function_access.
To move to a NEW Supabase project, copy the SQL from those two migrations and run it in SQL Editor (first the full_system one, then lock_function_access).
