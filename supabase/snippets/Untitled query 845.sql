select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_name = 'conversations' and grantee = 'hootus_api'
order by privilege_type, column_name;