import re, os

files = [
    'src/components/touchline/screens/scouting.tsx',
    'src/components/touchline/screens/tactics.tsx',
    'src/components/touchline/screens/training.tsx',
    'src/components/touchline/screens/transfer.tsx',
    'src/components/touchline/screens/youth-academy.tsx',
    'src/components/touchline/player-profile-modal.tsx',
    'src/components/touchline/pre-match-screen.tsx',
    'src/components/touchline/team-detail-modal.tsx',
    'src/components/touchline/screens/friendly.tsx',
    'src/components/touchline/screens/dashboard.tsx',
    'src/components/touchline/screens/messages.tsx',
    'src/components/touchline/screens/cup.tsx',
]

# Pattern: initials={`${var.firstName[0]}${var.lastName[0]}`}
pattern = re.compile(r'initials=\{`\$\{(\w+)\.firstName\[0\]\}\$\{(\w+)\.lastName\[0\]\}`\}')
replacement = r'initials={\1.specificPosition}'

# Also handle nested: initials={`${obj.prop.firstName[0]}${obj.prop.lastName[0]}`}
pattern2 = re.compile(r'initials=\{`\$\{(\w+\.\w+)\.firstName\[0\]\}\$\{(\w+\.\w+)\.lastName\[0\]\}`\}')
replacement2 = r'initials={\1.specificPosition}'

# Handle outgoing offer
pattern3 = re.compile(r'initials=\{`\$\{o\.playerName\.split.*?\}`\}')

total_changes = 0
for f in files:
    if not os.path.exists(f):
        continue
    with open(f, 'r') as fh:
        content = fh.read()
    
    new_content = pattern.sub(replacement, content)
    new_content = pattern2.sub(replacement2, new_content)
    new_content = pattern3.sub('initials={o.playerPosition}', new_content)
    
    if new_content != content:
        count = len(pattern.findall(content)) + len(pattern2.findall(content)) + len(pattern3.findall(content))
        with open(f, 'w') as fh:
            fh.write(new_content)
        print(f'{f}: {count} replacements')
        total_changes += count

print(f'Total: {total_changes} replacements')
