select email_status, event_count, read_at, created_at
from public.notifications
order by id desc
limit 10;