import io

path = '/vercel/share/v0-project/lib/demo-data.ts'
lines = io.open(path, encoding='utf-8').readlines()

# find array start (export const accountantQuestions: Question[] = [) and its closing ]
start = None
for i, l in enumerate(lines):
    if l.startswith('export const accountantQuestions'):
        start = i
        break
assert start is not None, 'start not found'

# the closing bracket is the first line that is exactly "]\n" after start
end = None
for j in range(start + 1, len(lines)):
    if lines[j].rstrip() == ']':
        end = j
        break
assert end is not None, 'end not found'
print('Array spans lines', start + 1, 'to', end + 1)

new_qs = io.open('/vercel/share/v0-project/scripts/all_questions.ts', encoding='utf-8').read()

new_block = 'export const accountantQuestions: Question[] = [\n' + new_qs + '\n]\n'

new_lines = lines[:start] + [new_block] + lines[end + 1:]
io.open(path, 'w', encoding='utf-8').write(''.join(new_lines))
print('Replaced. New file lines:', len(new_lines))
