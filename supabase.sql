-- Run once in Supabase > SQL Editor
create table profiles(id uuid primary key references auth.users on delete cascade,name text,role text not null default 'pending' check(role in('pending','admin','super','off')));
create table products(id uuid primary key default gen_random_uuid(),name text unique not null,stock numeric not null default 0,sell numeric not null default 0);
create table product_costs(product_id uuid primary key references products on delete cascade,buy numeric not null default 0);
create table sales(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),day date not null,by uuid default auth.uid(),by_name text,product_id uuid references products on delete set null,pname text not null,qty numeric not null check(qty>0),price numeric not null,total numeric not null,paid numeric not null,cust text default '');
create table sale_costs(sale_id uuid primary key references sales on delete cascade,cost numeric not null);
create table payments(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),day date not null,cust text not null,amt numeric not null check(amt>0),by uuid default auth.uid(),by_name text);
create table expenses(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),day date not null,title text not null,amt numeric not null check(amt>0),by uuid default auth.uid(),by_name text);

create function is_role(r text[]) returns boolean language sql security definer stable set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role=any(r))$$;

-- first account becomes super admin, everyone after waits as 'pending'
create function new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,name,role) values(new.id,coalesce(new.raw_user_meta_data->>'name',new.email),case when exists(select 1 from profiles) then 'pending' else 'super' end);return new;end$$;
create trigger on_signup after insert on auth.users for each row execute function new_user();

-- selling: lock cost at sale time, reduce stock, refuse if stock is short
create function on_sale() returns trigger language plpgsql security definer set search_path=public as $$
begin update products set stock=stock-new.qty where id=new.product_id and stock>=new.qty;
if not found then raise exception 'স্টকে এত মাল নাই';end if;
insert into sale_costs select new.id,buy from product_costs where product_id=new.product_id;return new;end$$;
create trigger t_sale after insert on sales for each row execute function on_sale();
create function on_sale_del() returns trigger language plpgsql security definer set search_path=public as $$
begin update products set stock=stock+old.qty where id=old.product_id;return old;end$$;
create trigger t_sale_del before delete on sales for each row execute function on_sale_del();
create function restock(pid uuid,q numeric) returns void language plpgsql security definer set search_path=public as $$
begin if not is_role(array['admin','super']) or q<=0 then raise exception 'not allowed';end if;update products set stock=stock+q where id=pid;end$$;

alter table profiles enable row level security;alter table products enable row level security;alter table product_costs enable row level security;
alter table sales enable row level security;alter table sale_costs enable row level security;alter table payments enable row level security;alter table expenses enable row level security;
create policy p1 on profiles for select using(id=auth.uid() or is_role('{super}'));
create policy p2 on profiles for update using(is_role('{super}'));
create policy p3 on products for select using(is_role('{admin,super}'));
create policy p4 on products for all using(is_role('{super}')) with check(is_role('{super}'));
create policy c1 on product_costs for all using(is_role('{super}')) with check(is_role('{super}'));
create policy s1 on sales for select using(is_role('{admin,super}'));
create policy s2 on sales for insert with check(is_role('{admin,super}'));
create policy s3 on sales for delete using(is_role('{super}'));
create policy sc on sale_costs for select using(is_role('{super}'));
create policy y1 on payments for select using(is_role('{admin,super}'));
create policy y2 on payments for insert with check(is_role('{admin,super}'));
create policy y3 on payments for delete using(is_role('{super}'));
create policy e1 on expenses for select using(is_role('{admin,super}'));
create policy e2 on expenses for insert with check(is_role('{admin,super}'));
create policy e3 on expenses for delete using(is_role('{super}'));
alter publication supabase_realtime add table products,sales,payments,expenses;
