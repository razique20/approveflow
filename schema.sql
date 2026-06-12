-- Create tables
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'requester' check (role in ('requester', 'approver')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.requests (
  id uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  category text not null check (category in ('Hardware', 'Software License', 'Cloud Access', 'Other')),
  description text not null,
  priority text not null check (priority in ('Low', 'Medium', 'High')),
  cost numeric not null default 0 check (cost >= 0),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  approver_id uuid references public.profiles(id),
  approver_comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on both tables
alter table public.profiles enable row level security;
alter table public.requests enable row level security;

-- RLS Policies for Profiles
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- RLS Policies for Requests
create policy "Requesters can insert their own requests"
  on public.requests for insert
  with check (auth.uid() = requester_id);

create policy "Requesters can view their own requests"
  on public.requests for select
  using (auth.uid() = requester_id);

create policy "Approvers can view all requests"
  on public.requests for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'approver'
    )
  );

create policy "Approvers can update requests (approve/reject)"
  on public.requests for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'approver'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'approver'
    )
  );

-- Trigger to automatically insert user profiles on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'requester')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
