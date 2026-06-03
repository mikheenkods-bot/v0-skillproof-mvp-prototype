export interface Candidate {
  id: string
  name: string
  email: string
  avatar: string
  specialization: string
  skillProofScore: number
  proctoringStatus: 'clean' | 'suspicious' | 'violations'
  challengeStatus: 'not_started' | 'in_progress' | 'completed' | 'pending_review'
  violations: number
  originality: number
  completedAt?: string
  skills: {
    name: string
    score: number
  }[]
  proctoringLog: {
    time: string
    event: string
    type: 'normal' | 'warning' | 'violation'
  }[]
}

export interface Challenge {
  id: string
  title: string
  description: string
  specialization: string
  deadline: string
  difficulty: 'easy' | 'medium' | 'hard'
  completedCount: number
  averageScore: number
}

export interface Question {
  id: string
  text: string
  type: 'multiple_choice' | 'open'
  options?: string[]
  correctAnswer?: number
  explanation?: string
  complexity: 'easy' | 'medium' | 'hard'
  category: string
}

export interface AIInterviewQuestion {
  id: string
  text: string
  specialization: string
}

export type SpecializationType = 'marketing' | 'accounting' | 'accountant' | 'account_manager'

export interface Specialization {
  id: SpecializationType
  name: string
  description: string
  icon: string
  color: string
  questions: Question[]
  aiInterviewQuestions: AIInterviewQuestion[]
  passingScore: number
}

export const candidates: Candidate[] = [
  {
    id: '1',
    name: 'Иванов Иван Иванович',
    email: 'ivanov@email.com',
    avatar: 'И',
    specialization: 'Маркетинг недвижимости',
    skillProofScore: 87,
    proctoringStatus: 'clean',
    challengeStatus: 'completed',
    violations: 0,
    originality: 95,
    completedAt: '2024-01-15',
    skills: [
      { name: 'ROI-анализ', score: 90 },
      { name: 'Лидогенерация', score: 85 },
      { name: 'CRM-системы', score: 88 },
      { name: 'Таргетинг', score: 82 },
      { name: 'Договоры', score: 92 }
    ],
    proctoringLog: [
      { time: '10:00:00', event: 'Начало теста', type: 'normal' },
      { time: '10:05:32', event: 'Ответ на вопрос 1', type: 'normal' },
      { time: '10:12:15', event: 'Ответ на вопрос 2', type: 'normal' },
      { time: '10:18:45', event: 'Ответ на вопрос 3', type: 'normal' },
      { time: '10:25:30', event: 'Ответ на вопрос 4', type: 'normal' },
      { time: '10:32:00', event: 'Завершение теста', type: 'normal' }
    ]
  },
  {
    id: '2',
    name: 'Петров Петр Петрович',
    email: 'petrov@email.com',
    avatar: 'П',
    specialization: 'Бухгалтер',
    skillProofScore: 80,
    proctoringStatus: 'clean',
    challengeStatus: 'completed',
    violations: 0,
    originality: 92,
    completedAt: '2024-01-14',
    skills: [
      { name: 'Проводки', score: 85 },
      { name: 'НДС', score: 78 },
      { name: 'ФСБУ', score: 82 },
      { name: 'Отчетность', score: 80 },
      { name: 'Баланс', score: 88 }
    ],
    proctoringLog: [
      { time: '14:00:00', event: 'Начало теста', type: 'normal' },
      { time: '14:08:22', event: 'Ответ на вопрос 1', type: 'normal' },
      { time: '14:15:45', event: 'Ответ на вопрос 2', type: 'normal' },
      { time: '14:22:30', event: 'Ответ на вопрос 3', type: 'normal' },
      { time: '14:30:15', event: 'Ответ на вопрос 4', type: 'normal' },
      { time: '14:38:00', event: 'Завершение теста', type: 'normal' }
    ]
  },
  {
    id: '3',
    name: 'Сидорова Анна Сергеевна',
    email: 'sidorova@email.com',
    avatar: 'С',
    specialization: 'Account Manager',
    skillProofScore: 100,
    proctoringStatus: 'clean',
    challengeStatus: 'completed',
    violations: 0,
    originality: 97,
    completedAt: '2024-01-16',
    skills: [
      { name: 'LTV/CAC', score: 95 },
      { name: 'Retention', score: 92 },
      { name: 'Ап-сейл', score: 98 },
      { name: 'Возражения', score: 90 },
      { name: 'QBR', score: 94 }
    ],
    proctoringLog: [
      { time: '09:00:00', event: 'Начало теста', type: 'normal' },
      { time: '09:06:15', event: 'Ответ на вопрос 1', type: 'normal' },
      { time: '09:12:30', event: 'Ответ на вопрос 2', type: 'normal' },
      { time: '09:18:45', event: 'Ответ на вопрос 3', type: 'normal' },
      { time: '09:25:30', event: 'Ответ на вопрос 4', type: 'normal' },
      { time: '09:32:00', event: 'Завершение теста', type: 'normal' }
    ]
  },
  {
    id: '4',
    name: 'Козлов Дмитрий Александрович',
    email: 'kozlov@email.com',
    avatar: 'К',
    specialization: 'Бухгалтер',
    skillProofScore: 60,
    proctoringStatus: 'suspicious',
    challengeStatus: 'in_progress',
    violations: 1,
    originality: 75,
    completedAt: '2024-01-16',
    skills: [
      { name: 'Проводки', score: 65 },
      { name: 'НДС', score: 58 },
      { name: 'ФСБУ', score: 62 },
      { name: 'Отчетность', score: 60 },
      { name: 'Баланс', score: 55 }
    ],
    proctoringLog: [
      { time: '11:00:00', event: 'Начало теста', type: 'normal' },
      { time: '11:08:22', event: 'Ответ на вопрос 1', type: 'normal' },
      { time: '11:12:45', event: 'Переключение вкладки', type: 'violation' },
      { time: '11:24:30', event: 'Ответ на вопрос 2', type: 'normal' },
      { time: '11:32:15', event: 'Ответ на вопрос 3', type: 'normal' },
      { time: '11:42:00', event: 'Завершение теста', type: 'normal' }
    ]
  }
]

export const challenges: Challenge[] = [
  {
    id: '1',
    title: 'Разработать стратегию продаж для ЖК',
    description: 'Создайте комплексную маркетинговую стратегию для нового жилого комплекса бизнес-класса в Москве. Включите анализ целевой аудитории, каналы продвижения, бюджет и KPI.',
    specialization: 'Маркетинг недвижимости',
    deadline: '48 часов',
    difficulty: 'hard',
    completedCount: 156,
    averageScore: 78
  },
  {
    id: '2',
    title: 'Закрытие месяца и реконсиляция расчётов',
    description: `Дана оборотно-сальдовая ведомость и выписка по расчётам с поставщиками за месяц. В данных намеренно допущены ошибки:
(1) аванс поставщику не зачтён при поступлении товара;
(2) не отражён входящий НДС по одной из накладных;
(3) расхождение сальдо по счёту 60 с актом сверки контрагента.

Задание:
1) Найдите и опишите все ошибки.
2) Предложите корректирующие проводки (Дт/Кт с суммами).
3) Рассчитайте сумму НДС к уплате за период (ставка 22%).
4) Рассчитайте страховые взносы за сотрудника с окладом ниже МРОТ: используйте МРОТ 2026 = 27 093 ₽ и единый тариф 30% (база ≤ предельной).
5) Сформулируйте, какие контрольные процедуры предотвратили бы эти ошибки на будущее.

Формат сдачи: документ (PDF/DOCX) с расчётами и пояснениями. Проверяется оригинальность.`,
    specialization: 'Бухгалтер',
    deadline: '48 часов',
    difficulty: 'hard',
    completedCount: 89,
    averageScore: 72
  },
  {
    id: '3',
    title: 'Спасение клиента и план развития аккаунта',
    description: `Вводные по клиенту: годовой контракт на 1,2 млн ₽, до продления 2 месяца. За последний квартал использование продукта упало на 40%, два ключевых пользователя со стороны клиента уволились, у клиента появилось предложение от конкурента дешевле на 15%.

Задание:
1) Диагностируйте риски оттока и их вероятные причины.
2) Составьте план удержания на горизонты 30 / 60 / 90 дней с конкретными действиями.
3) Рассчитайте LTV клиента при марже 35% и ожидаемом сроке жизни 3 года; обоснуйте, сколько разумно потратить на удержание (ориентир по LTV:CAC).
4) Предложите уместный ап-сейл или кросс-сейл и объясните, почему он сейчас своевременен.
5) Напишите скрипт/структуру ключевого звонка с лицом, принимающим решение.

Формат сдачи: документ или презентация. Проверяется оригинальность решения.`,
    specialization: 'Account Manager',
    deadline: '48 часов',
    difficulty: 'hard',
    completedCount: 67,
    averageScore: 81
  }
]

// ============================================================
// СПЕЦИАЛИЗАЦИЯ: МАРКЕТИНГ НЕДВИЖИМОСТИ (legacy)
// ============================================================

export const marketingQuestions: Question[] = [
  {
    id: 'm1',
    text: 'Какой показатель наиболее важен для оценки эффективности рекламной кампании по продаже недвижимости?',
    type: 'multiple_choice',
    options: ['CTR (Click-Through Rate)', 'CPL (Cost Per Lead)', 'Охват аудитории', 'Частота показов'],
    correctAnswer: 1,
    explanation: 'CPL (стоимость лида) — ключевой показатель для недвижимости, так как важен не клик, а реальный контакт потенциального покупателя.',
    complexity: 'medium',
    category: 'ROI-анализ'
  },
  {
    id: 'm2',
    text: 'При расчете ROI рекламной кампании в недвижимости, какие затраты следует учитывать?',
    type: 'multiple_choice',
    options: [
      'Только бюджет на рекламу',
      'Рекламный бюджет + зарплата маркетолога',
      'Все маркетинговые расходы, включая создание контента и комиссии',
      'Только стоимость кликов'
    ],
    correctAnswer: 2,
    explanation: 'Для корректного расчета ROI необходимо учитывать все затраты: рекламный бюджет, создание контента, зарплаты, комиссии агентствам.',
    complexity: 'hard',
    category: 'ROI-анализ'
  },
  {
    id: 'm3',
    text: 'Какой инструмент CRM наиболее эффективен для отслеживания долгого цикла сделки в недвижимости?',
    type: 'multiple_choice',
    options: ['AmoCRM', 'Битрикс24', 'Любая CRM с настройкой этапов воронки', 'Excel таблица'],
    correctAnswer: 2,
    explanation: 'Важна не конкретная CRM, а возможность настройки этапов воронки под длинный цикл сделки в недвижимости (3-6 месяцев).',
    complexity: 'easy',
    category: 'CRM-системы'
  },
  {
    id: 'm4',
    text: 'При настройке таргетированной рекламы для ЖК комфорт-класса, какие параметры аудитории наиболее важны?',
    type: 'multiple_choice',
    options: [
      'Только возраст и пол',
      'Геолокация, доход, интересы, поведенческие факторы',
      'Только интересы к недвижимости',
      'Подписчики конкурентов'
    ],
    correctAnswer: 1,
    explanation: 'Для недвижимости критически важен комплексный таргетинг: геолокация (работа/проживание), уровень дохода, интересы и поведение.',
    complexity: 'medium',
    category: 'Таргетинг'
  },
  {
    id: 'm5',
    text: 'Какой срок принятия решения о покупке квартиры в среднем по рынку?',
    type: 'multiple_choice',
    options: ['1-2 недели', '1-2 месяца', '3-6 месяцев', 'Более года'],
    correctAnswer: 2,
    explanation: 'Средний цикл сделки в недвижимости составляет 3-6 месяцев от первого контакта до покупки.',
    complexity: 'easy',
    category: 'Лидогенерация'
  }
]

// ============================================================
// СПЕЦИАЛИЗАЦИЯ: БУХГАЛТЕРИЯ (legacy)
// ============================================================

export const accountingQuestions: Question[] = [
  {
    id: 'a1',
    text: 'Какой срок подачи декларации по УСН для ООО?',
    type: 'multiple_choice',
    options: ['До 30 апреля', 'До 31 марта', 'До 25 числа следующего месяца', 'До 20 января'],
    correctAnswer: 1,
    explanation: 'ООО на УСН подают декларацию до 31 марта года, следующего за отчетным. ИП — до 30 апреля.',
    complexity: 'easy',
    category: 'Налогообложение'
  },
  {
    id: 'a2',
    text: 'При выборе между УСН 6% и УСН 15%, какой критерий является определяющим?',
    type: 'multiple_choice',
    options: [
      'Объем выручки',
      'Соотношение доходов и расходов',
      'Количество сотрудников',
      'Вид деятельности'
    ],
    correctAnswer: 1,
    explanation: 'Если расходы составляют более 60% от доходов, выгоднее УСН 15% (доходы минус расходы). Иначе — УСН 6%.',
    complexity: 'medium',
    category: 'Налогообложение'
  },
  {
    id: 'a3',
    text: 'Какой документ в 1С:Бухгалтерия используется для начисления заработной платы?',
    type: 'multiple_choice',
    options: ['Начисление зарплаты', 'Платежное поручение', 'Расходный кассовый ордер', 'Операция'],
    correctAnswer: 0,
    explanation: 'Документ "Начисление зарплаты" формирует проводки по счетам 70, 68, 69 и рассчитывает НДФЛ и взносы.',
    complexity: 'easy',
    category: '1С:Бухгалтерия'
  },
  {
    id: 'a4',
    text: 'Какие легальные способы оптимизации налогов доступны малому бизнесу на УСН?',
    type: 'multiple_choice',
    options: [
      'Дробление бизнеса',
      'Использование налоговых вычетов, правильный выбор объекта налогообложения, своевременное списание расходов',
      'Занижение выручки',
      'Работа без договоров'
    ],
    correctAnswer: 1,
    explanation: 'Легальная оптимизация включает: выбор выгодного объекта налогообложения, учет всех разрешенных расходов, применение вычетов.',
    complexity: 'hard',
    category: 'Оптимизация'
  },
  {
    id: 'a5',
    text: 'Какой стандартный срок хранения первичных бухгалтерских документов?',
    type: 'multiple_choice',
    options: ['3 года', '5 лет', '10 лет', 'Бессрочно'],
    correctAnswer: 1,
    explanation: 'Первичные документы хранятся минимум 5 лет после отчетного года. Документы по зарплате — 75 лет.',
    complexity: 'medium',
    category: 'Отчетность'
  }
]

// ============================================================
// СПЕЦИАЛИЗАЦИЯ: БУХГАЛТЕР (новая, полная)
// ============================================================

export const accountantQuestions: Question[] = [
  {
    id: 'acc1',
    text: 'Организация получила материалы от поставщика. НДС учитывается отдельно. Какой проводкой отражается оприходование самих материалов (без НДС)?',
    type: 'multiple_choice',
    options: [
      'Дт 10 «Материалы» Кт 60 «Расчёты с поставщиками»',
      'Дт 60 Кт 10',
      'Дт 41 «Товары» Кт 60',
      'Дт 10 Кт 19'
    ],
    correctAnswer: 0,
    explanation: 'Материалы приходуются на счёт 10 в корреспонденции с расчётами с поставщиком (60). НДС выделяется отдельной проводкой Дт 19 Кт 60. Счёт 41 — для товаров, а не материалов.',
    complexity: 'medium',
    category: 'Проводки'
  },
  {
    id: 'acc2',
    text: 'Базовая ставка НДС в РФ с 1 января 2026 года составляет:',
    type: 'multiple_choice',
    options: ['18%', '20%', '22%', '24%'],
    correctAnswer: 2,
    explanation: 'С 01.01.2026 базовая ставка НДС повышена с 20% до 22% (Федеральный закон №425-ФЗ от 28.11.2025). Льготные ставки 10% и 0% сохранены.',
    complexity: 'easy',
    category: 'НДС'
  },
  {
    id: 'acc3',
    text: 'Организация реализовала товар на сумму 122 000 ₽ с учётом НДС по ставке 22%. Какая сумма НДС входит в эту стоимость?',
    type: 'multiple_choice',
    options: ['22 000 ₽', '24 400 ₽', '20 000 ₽', '26 840 ₽'],
    correctAnswer: 0,
    explanation: 'Применяется расчётная ставка 22/122. 122 000 × 22 / 122 = 22 000 ₽; выручка без НДС = 100 000 ₽. Вариант 26 840 — ошибка: 22% начислено на сумму С НДС.',
    complexity: 'hard',
    category: 'НДС'
  },
  {
    id: 'acc4',
    text: 'На основании какого стандарта с 2022 года ведётся бухгалтерский учёт основных средств?',
    type: 'multiple_choice',
    options: [
      'ФСБУ 5/2019 «Запасы»',
      'ФСБУ 6/2020 «Основные средства»',
      'ФСБУ 25/2018 «Бухгалтерский учёт аренды»',
      'ПБУ 6/01'
    ],
    correctAnswer: 1,
    explanation: 'ФСБУ 6/2020 обязателен с отчётности за 2022 год и заменил ПБУ 6/01. ФСБУ 5/2019 — запасы, ФСБУ 25/2018 — аренда.',
    complexity: 'medium',
    category: 'ФСБУ'
  },
  {
    id: 'acc5',
    text: 'Какое равенство является основным (балансовым) уравнением бухгалтерского учёта?',
    type: 'multiple_choice',
    options: [
      'Активы = Капитал − Обязательства',
      'Активы = Капитал + Обязательства',
      'Капитал = Активы + Обязательства',
      'Активы + Капитал = Обязательства'
    ],
    correctAnswer: 1,
    explanation: 'Активы финансируются за счёт собственного капитала и обязательств: Активы = Собственный капитал + Обязательства. В балансе Актив всегда равен Пассиву.',
    complexity: 'easy',
    category: 'Основы'
  }
]

export const accountantAIQuestions: AIInterviewQuestion[] = [
  {
    id: 'acc_ai1',
    text: 'Расскажите, как вы действуете при расхождении данных бухгалтерского и налогового учёта по налогу на прибыль. Приведите пример из практики и упомяните роль ПБУ 18/02.',
    specialization: 'accountant'
  },
  {
    id: 'acc_ai2',
    text: 'Опишите ваш порядок подготовки к сдаче годовой бухгалтерской отчётности: что проверяете в первую очередь, как закрываете счета, как сверяете расчёты с контрагентами?',
    specialization: 'accountant'
  },
  {
    id: 'acc_ai3',
    text: 'Что изменилось в вашей работе после повышения ставки НДС до 22% с 2026 года? На что обращаете внимание в "переходных" договорах, заключённых до изменения ставки?',
    specialization: 'accountant'
  }
]

// ============================================================
// СПЕЦИАЛИЗАЦИЯ: ACCOUNT MANAGER (новая, полная)
// ============================================================

export const accountManagerQuestions: Question[] = [
  {
    id: 'am1',
    text: 'Клиент приносит 50 000 ₽ выручки в год, средний срок жизни клиента — 4 года, маржинальность 30%. Чему равен LTV клиента (по марже)?',
    type: 'multiple_choice',
    options: ['200 000 ₽', '60 000 ₽', '150 000 ₽', '20 000 ₽'],
    correctAnswer: 1,
    explanation: 'LTV = годовая выручка × срок жизни × маржа = 50 000 × 4 × 0,30 = 60 000 ₽. Вариант 200 000 — это выручка без учёта маржи.',
    complexity: 'medium',
    category: 'LTV/CAC'
  },
  {
    id: 'am2',
    text: 'Какое соотношение LTV к CAC принято считать минимально здоровым для устойчивой unit-экономики?',
    type: 'multiple_choice',
    options: ['1:1', '3:1', '1:3', '10:1'],
    correctAnswer: 1,
    explanation: 'Общепринятый бенчмарк — LTV:CAC ≥ 3:1. Ниже — привлечение не окупается; существенно выше (например, 10:1) часто означает недоинвестирование в рост.',
    complexity: 'easy',
    category: 'Unit-экономика'
  },
  {
    id: 'am3',
    text: 'Клиент пользуется тарифом "Базовый". Вы предлагаете перейти на "Премиум" с расширенной аналитикой того же продукта. Это:',
    type: 'multiple_choice',
    options: ['Кросс-сейл', 'Ап-сейл', 'Даунсейл', 'Реактивация'],
    correctAnswer: 1,
    explanation: 'Ап-сейл — продажа более дорогой/продвинутой версии того же продукта. Кросс-сейл — продажа дополнительного смежного продукта.',
    complexity: 'easy',
    category: 'Продажи'
  },
  {
    id: 'am4',
    text: 'Клиент говорит: "Это слишком дорого". Какая реакция наиболее корректна по технике работы с возражениями?',
    type: 'multiple_choice',
    options: [
      'Сразу предложить максимальную скидку',
      'Согласиться, что дорого, и закрыть тему',
      'Уточнить, с чем клиент сравнивает и какая ценность для него важна, прежде чем отвечать',
      'Перечислить все функции продукта'
    ],
    correctAnswer: 2,
    explanation: 'Сначала выясняется природа возражения (цена против ценности, база сравнения), затем отработка через ценность. Рефлекторная скидка обесценивает продукт и маржу.',
    complexity: 'medium',
    category: 'Возражения'
  },
  {
    id: 'am5',
    text: 'За год ушло 12 клиентов из 200, бывших на начало периода. Чему равен retention rate (упрощённо, без учёта новых клиентов)?',
    type: 'multiple_choice',
    options: ['88%', '94%', '12%', '6%'],
    correctAnswer: 1,
    explanation: 'Retention = (200 − 12) / 200 = 94%. Отток (churn) при этом равен 6%.',
    complexity: 'medium',
    category: 'Retention'
  }
]

export const accountManagerAIQuestions: AIInterviewQuestion[] = [
  {
    id: 'am_ai1',
    text: 'Опишите ситуацию, когда ключевой клиент был на грани ухода. Как вы её диагностировали, что предприняли для удержания и каков был результат? (Используйте формат: ситуация — действия — результат.)',
    specialization: 'account_manager'
  },
  {
    id: 'am_ai2',
    text: 'Как вы приоритизируете портфель из 40 клиентов с разным потенциалом и разной активностью? По каким признакам распределяете внимание и какие из них считаете рисковыми?',
    specialization: 'account_manager'
  },
  {
    id: 'am_ai3',
    text: 'Расскажите, как вы готовитесь к ежеквартальной встрече с крупным клиентом (QBR): какая структура встречи, какие метрики приносите, какие цели ставите?',
    specialization: 'account_manager'
  }
]

// ============================================================
// AI-интервью (legacy, общие)
// ============================================================

export const aiInterviewQuestions = [
  'Расскажите о самом сложном проекте в вашей практике. Какие решения вы принимали?',
  'Как вы справляетесь с ситуациями, когда клиент не согласен с вашими рекомендациями?',
  'Опишите случай, когда вам пришлось быстро адаптироваться к изменениям в работе.'
]

// ============================================================
// КОНФИГУРАЦИЯ СПЕЦИАЛИЗАЦИЙ
// ============================================================

export const specializations: Record<SpecializationType, Specialization> = {
  marketing: {
    id: 'marketing',
    name: 'Маркетинг недвижимости',
    description: 'Специалист по продвижению объектов недвижимости',
    icon: 'Building2',
    color: 'blue',
    questions: marketingQuestions,
    aiInterviewQuestions: aiInterviewQuestions.map((text, i) => ({
      id: `marketing_ai${i + 1}`,
      text,
      specialization: 'marketing'
    })),
    passingScore: 4
  },
  accounting: {
    id: 'accounting',
    name: 'Бухгалтерия малого бизнеса',
    description: 'Специалист по бухгалтерскому учёту малого бизнеса',
    icon: 'Calculator',
    color: 'green',
    questions: accountingQuestions,
    aiInterviewQuestions: aiInterviewQuestions.map((text, i) => ({
      id: `accounting_ai${i + 1}`,
      text,
      specialization: 'accounting'
    })),
    passingScore: 4
  },
  accountant: {
    id: 'accountant',
    name: 'Бухгалтер',
    description: 'Специалист по бухгалтерскому и налоговому учёту',
    icon: 'Calculator',
    color: 'emerald',
    questions: accountantQuestions,
    aiInterviewQuestions: accountantAIQuestions,
    passingScore: 4
  },
  account_manager: {
    id: 'account_manager',
    name: 'Account Manager',
    description: 'Менеджер по работе с ключевыми клиентами',
    icon: 'Users',
    color: 'violet',
    questions: accountManagerQuestions,
    aiInterviewQuestions: accountManagerAIQuestions,
    passingScore: 4
  }
}

// Хелпер для получения вопросов по специализации
export function getQuestionsForSpecialization(spec: SpecializationType): Question[] {
  return specializations[spec]?.questions || []
}

// Хелпер для получения AI-вопросов по специализации
export function getAIQuestionsForSpecialization(spec: SpecializationType): AIInterviewQuestion[] {
  return specializations[spec]?.aiInterviewQuestions || []
}

// Хелпер для проверки прохождения теста
export function checkTestPassed(spec: SpecializationType, correctAnswers: number): boolean {
  const passingScore = specializations[spec]?.passingScore || 4
  return correctAnswers >= passingScore
}
