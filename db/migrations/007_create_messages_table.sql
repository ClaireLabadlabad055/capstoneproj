create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  sender_id uuid not null,
  receiver_id uuid,
  sender_name text,
  receiver_name text,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

drop policy if exists "Users can view messages in their conversations" on public.messages;
drop policy if exists "Users can insert messages" on public.messages;
drop policy if exists "Users can update their own messages" on public.messages;

create policy "Users can view messages in their conversations"
  on public.messages for select
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or auth.uid()::text = split_part(conversation_id, ':', 2)
  );

create policy "Users can insert messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
  );

create policy "Users can update their own messages"
  on public.messages for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);
