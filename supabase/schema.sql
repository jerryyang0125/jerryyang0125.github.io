-- Public catalogue only. Personal measurements stay in the browser.
begin;
create table if not exists public.drinks (
  id text primary key,
  name text not null check (length(name) between 1 and 120),
  volume_ml numeric not null check (volume_ml > 0 and volume_ml <= 100000),
  abv_percent numeric not null check (abv_percent between 0 and 100),
  price_twd numeric not null check (price_twd between 0 and 1000000),
  sugar_g_100ml numeric check (sugar_g_100ml between 0 and 100),
  sort_order integer not null default 0
);
alter table public.drinks enable row level security;
revoke all on table public.drinks from anon, authenticated;
grant select on table public.drinks to anon, authenticated;
drop policy if exists "Public catalogue read" on public.drinks;
create policy "Public catalogue read" on public.drinks for select to anon, authenticated using (true);
-- First import only: rerunning does not overwrite edited catalogue records.
insert into public.drinks (id,name,volume_ml,abv_percent,price_twd,sugar_g_100ml,sort_order) values
('sheet-01','臺虎',500,9.9,66,null,0),
('sheet-02','生命',500,96,589,null,1),
('sheet-03','福',1500,40,439,null,2),
('sheet-04','高',1000,58,379,null,3),
('sheet-05','米酒頭',600,34,134,null,4),
('sheet-06','美廉啤酒',500,12,49.5,null,5),
('sheet-07','經典台啤 4.5%（整箱 24 罐）',12000,4.5,888,null,6),
('sheet-08','經典台啤 5%（整箱 24 罐）',12000,5,960,null,7),
('sheet-09','白鹿清酒',2000,13,419,null,8),
('sheet-10','燒酒',360,20,100,null,9),
('sheet-11','生命之水',500,96,589,null,10),
('sheet-12','Red lion',700,40,229,null,11),
('sheet-13','米酒純',600,19.5,42,null,12),
('sheet-14','米酒',6000,20,239,null,13),
('sheet-15','四喜燒酎',4000,25,890,null,14)
on conflict (id) do nothing;
commit;
