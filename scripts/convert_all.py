import json, re, io

data = json.load(open('/tmp/sp_files/buhgalter_assessment_questions.json'))
qs = data['questions']
diffmap = {'легкий': 'easy', 'средний': 'medium', 'сложный': 'hard'}

RU_STOP = set('''и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это том этом так'''.split())

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ').strip()

def keywords_from(answer):
    # извлекаем номера счетов (50, 51, 68 ...) и значимые слова длиной >=5
    toks = re.findall(r'[А-Яа-яЁёA-Za-z0-9]+', answer.lower())
    kws = []
    seen = set()
    for t in toks:
        if t.isdigit():
            if len(t) == 2:  # счёт
                if t not in seen:
                    seen.add(t); kws.append(t)
        elif len(t) >= 6 and t not in RU_STOP:
            stem = t[:6]
            if stem not in seen:
                seen.add(stem); kws.append(t)
    return kws[:8]

out = []
for q in qs:
    t = q['type']
    diff = diffmap.get(q['difficulty'], 'medium')
    cat = q['category']
    qid = q['id']
    L = ['  {', f"    id: 'acc_kb{qid}',", f"    text: '{esc(q['question'])}',"]
    if t == 'single':
        opts = q['options']
        idx = opts.index(q['answer'])
        L.append("    type: 'multiple_choice',")
        L.append('    options: [')
        for o in opts: L.append(f"      '{esc(o)}',")
        L.append('    ],')
        L.append(f'    correctAnswer: {idx},')
    elif t == 'multiple':
        opts = q['options']
        idxs = [opts.index(a) for a in q['answer']]
        L.append("    type: 'multiple_select',")
        L.append('    options: [')
        for o in opts: L.append(f"      '{esc(o)}',")
        L.append('    ],')
        L.append(f"    correctAnswers: [{', '.join(str(i) for i in sorted(idxs))}],")
    elif t == 'numeric':
        num = int(re.sub(r'[^0-9-]', '', str(q['answer'])))
        L.append("    type: 'numeric',")
        L.append(f'    numericAnswer: {num},')
    elif t == 'open':
        kws = keywords_from(q['answer'])
        L.append("    type: 'open',")
        L.append('    keywords: [')
        for k in kws: L.append(f"      '{esc(k)}',")
        L.append('    ],')
        L.append(f"    sampleAnswer: '{esc(q['answer'])}',")
    L.append(f"    explanation: '{esc(q.get('explanation',''))}',")
    L.append(f"    complexity: '{diff}',")
    L.append(f"    category: '{esc(cat)}'")
    L.append('  },')
    out.append('\n'.join(L))

with io.open('/vercel/share/v0-project/scripts/all_questions.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out))
print('TOTAL converted:', len(out))
from collections import Counter
print(Counter(q['type'] for q in qs))
