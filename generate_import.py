#!/usr/bin/env python3
"""
Genereaza daily-history-import.sql din backup-ul original.
- Sare peste CREATE TABLE (tabele deja create de Flyway)
- Renumeste totalxp -> total_xp in user_gamification
- Adauga TRUNCATE inainte de import
- Pastreaza \restrict token-ul Railway
- Importa in ordinea corecta (respectand FK-uri)
"""

SKIP_TABLES = {'flyway_schema_history', 'roles'}

IMPORT_ORDER = [
    'daily_content',
    'translations',
    'events',
    'users',
    'event_gallery',
    'user_gamification',
    'user_roles',
    'support_messages',
]

with open('daily-history-backup.sql', 'r', encoding='utf-8') as f:
    all_lines = f.readlines()

# Extrage \restrict token
restrict_line = None
for line in all_lines:
    if line.startswith('\\restrict '):
        restrict_line = line.rstrip()
        break

# Parseaza toate blocurile COPY din fisier
copy_blocks = {}  # table_name -> (header, [data_lines])

i = 0
in_copy = False
current_table = None
current_header = None
current_data = []

while i < len(all_lines):
    line = all_lines[i]

    if not in_copy:
        stripped = line.strip()
        if stripped.startswith('COPY public.') and 'FROM stdin' in stripped:
            import re
            m = re.match(r'COPY public\.(\w+) \(([^)]+)\) FROM stdin;', stripped)
            if m:
                table_name = m.group(1)
                columns = m.group(2)

                if table_name == 'user_gamification':
                    columns = columns.replace('totalxp', 'total_xp')

                current_table = table_name
                current_header = f'COPY public.{table_name} ({columns}) FROM stdin;'
                current_data = []
                in_copy = True
    else:
        if line.rstrip() == '\\.':
            in_copy = False
            if current_table not in copy_blocks:
                copy_blocks[current_table] = (current_header, list(current_data))
            current_table = None
            current_header = None
            current_data = []
        else:
            current_data.append(line.rstrip())

    i += 1

# Extrage setval-urile
import re
setval_lines = []
for line in all_lines:
    if re.match(r"SELECT pg_catalog\.setval\(", line.strip()):
        setval_lines.append(line.strip())

# Genereaza SQL-ul de import
out = []

if restrict_line:
    out.append(restrict_line)
    out.append('')

out += [
    'SET statement_timeout = 0;',
    'SET lock_timeout = 0;',
    "SET client_encoding = 'UTF8';",
    'SET standard_conforming_strings = on;',
    "SELECT pg_catalog.set_config('search_path', '', false);",
    'SET check_function_bodies = false;',
    'SET row_security = off;',
    '',
    '-- Stergere date existente (pastrare admin id=1 si roluri)',
    'TRUNCATE public.user_saved_events, public.user_roles, public.event_gallery, public.support_messages, public.user_gamification, public.events, public.daily_content, public.translations CASCADE;',
    'DELETE FROM public.users WHERE id != 1;',
    '',
]

for table in IMPORT_ORDER:
    if table in SKIP_TABLES:
        continue
    if table not in copy_blocks:
        print(f'  ATENTIE: nu am gasit COPY block pentru {table}')
        continue
    header, data_lines = copy_blocks[table]
    if not data_lines:
        print(f'  SKIP {table}: bloc COPY gol')
        continue
    out.append(f'-- Import {table} ({len(data_lines)} randuri)')
    out.append(header)
    out.extend(data_lines)
    out.append('\\.')
    out.append('')

out.append('-- Resetare secvente')
out.extend(setval_lines)
out.append('')

with open('daily-history-import.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out) + '\n')

print(f'\nFisier generat: daily-history-import.sql')
for table in IMPORT_ORDER:
    if table in copy_blocks:
        _, data = copy_blocks[table]
        status = f'{len(data)} randuri' if data else 'GOL'
        print(f'  {table}: {status}')
    else:
        print(f'  {table}: LIPSA')
