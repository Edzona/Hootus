select conrelid::regclass as table_name,
       conname as constraint_name,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where contype in ('p', 'f')
  and connamespace = 'public'::regnamespace;