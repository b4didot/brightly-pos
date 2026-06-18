alter table public.device_activation_tokens
  add column if not exists display_token text;

update public.device_activation_tokens
set display_token = 'Token unavailable'
where display_token is null;
