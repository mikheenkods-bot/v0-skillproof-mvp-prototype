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
  complexity: 'easy' | 'medium' | 'hard'
  category: string
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
    specialization: 'Бухгалтерия малого бизнеса',
    skillProofScore: 72,
    proctoringStatus: 'suspicious',
    challengeStatus: 'completed',
    violations: 2,
    originality: 78,
    completedAt: '2024-01-14',
    skills: [
      { name: 'Налогообложение', score: 75 },
      { name: 'Отчетность', score: 70 },
      { name: '1С:Бухгалтерия', score: 68 },
      { name: 'Оптимизация', score: 72 },
      { name: 'Зарплата', score: 78 }
    ],
    proctoringLog: [
      { time: '14:00:00', event: 'Начало теста', type: 'normal' },
      { time: '14:03:15', event: 'Переключение вкладки', type: 'violation' },
      { time: '14:08:22', event: 'Ответ на вопрос 1', type: 'normal' },
      { time: '14:12:45', event: 'Переключение вкладки', type: 'violation' },
      { time: '14:18:30', event: 'Ответ на вопрос 2', type: 'normal' },
      { time: '14:35:00', event: 'Завершение теста', type: 'warning' }
    ]
  },
  {
    id: '3',
    name: 'Сидорова Анна Сергеевна',
    email: 'sidorova@email.com',
    avatar: 'С',
    specialization: 'Маркетинг недвижимости',
    skillProofScore: 0,
    proctoringStatus: 'violations',
    challengeStatus: 'not_started',
    violations: 3,
    originality: 0,
    skills: [
      { name: 'ROI-анализ', score: 0 },
      { name: 'Лидогенерация', score: 0 },
      { name: 'CRM-системы', score: 0 },
      { name: 'Таргетинг', score: 0 },
      { name: 'Договоры', score: 0 }
    ],
    proctoringLog: [
      { time: '09:00:00', event: 'Начало теста', type: 'normal' },
      { time: '09:01:15', event: 'Попытка копирования', type: 'violation' },
      { time: '09:02:30', event: 'Переключение вкладки', type: 'violation' },
      { time: '09:03:45', event: 'Попытка вставки текста', type: 'violation' },
      { time: '09:03:46', event: 'Тест прерван - превышен лимит нарушений', type: 'violation' }
    ]
  },
  {
    id: '4',
    name: 'Козлов Дмитрий Александрович',
    email: 'kozlov@email.com',
    avatar: 'К',
    specialization: 'Бухгалтерия малого бизнеса',
    skillProofScore: 94,
    proctoringStatus: 'clean',
    challengeStatus: 'in_progress',
    violations: 0,
    originality: 0,
    completedAt: '2024-01-16',
    skills: [
      { name: 'Налогообложение', score: 96 },
      { name: 'Отчетность', score: 92 },
      { name: '1С:Бухгалтерия', score: 95 },
      { name: 'Оптимизация', score: 90 },
      { name: 'Зарплата', score: 97 }
    ],
    proctoringLog: [
      { time: '11:00:00', event: 'Начало теста', type: 'normal' },
      { time: '11:08:22', event: 'Ответ на вопрос 1', type: 'normal' },
      { time: '11:15:45', event: 'Ответ на вопрос 2', type: 'normal' },
      { time: '11:24:30', event: 'Ответ на вопрос 3', type: 'normal' },
      { time: '11:32:15', event: 'Ответ на вопрос 4', type: 'normal' },
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
    title: 'Оптимизировать налоговую нагрузку',
    description: 'Проанализируйте финансовую отчетность малого предприятия (ООО, УСН 15%) и предложите законные способы оптимизации налоговой нагрузки на следующий год.',
    specialization: 'Бухгалтерия малого бизнеса',
    deadline: '48 часов',
    difficulty: 'hard',
    completedCount: 89,
    averageScore: 72
  }
]

export const marketingQuestions: Question[] = [
  {
    id: 'm1',
    text: 'Какой показатель наиболее важен для оценки эффективности рекламной кампании по продаже недвижимости?',
    type: 'multiple_choice',
    options: ['CTR (Click-Through Rate)', 'CPL (Cost Per Lead)', 'Охват аудитории', 'Частота показов'],
    correctAnswer: 1,
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
    complexity: 'hard',
    category: 'ROI-анализ'
  },
  {
    id: 'm3',
    text: 'Опишите, как бы вы настроили воронку лидогенерации для продажи квартир в новостройке бизнес-класса.',
    type: 'open',
    complexity: 'hard',
    category: 'Лидогенерация'
  },
  {
    id: 'm4',
    text: 'Какой инструмент CRM наиболее эффективен для отслеживания долгого цикла сделки в недвижимости?',
    type: 'multiple_choice',
    options: ['AmoCRM', 'Битрикс24', 'Любая CRM с настройкой этапов воронки', 'Excel таблица'],
    correctAnswer: 2,
    complexity: 'easy',
    category: 'CRM-системы'
  },
  {
    id: 'm5',
    text: 'При настройке таргетированной рекламы для ЖК комфорт-класса, какие параметры аудитории наиболее важны?',
    type: 'multiple_choice',
    options: [
      'Только возраст и пол',
      'Геолокация, доход, интересы, поведенческие факторы',
      'Только интересы к недвижимости',
      'Подписчики конкурентов'
    ],
    correctAnswer: 1,
    complexity: 'medium',
    category: 'Таргетинг'
  }
]

export const accountingQuestions: Question[] = [
  {
    id: 'a1',
    text: 'Какой срок подачи декларации по УСН для ООО?',
    type: 'multiple_choice',
    options: ['До 30 апреля', 'До 31 марта', 'До 25 числа следующего месяца', 'До 20 января'],
    correctAnswer: 1,
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
    complexity: 'medium',
    category: 'Налогообложение'
  },
  {
    id: 'a3',
    text: 'Опишите порядок действий при обнаружении ошибки в уже сданной налоговой декларации.',
    type: 'open',
    complexity: 'hard',
    category: 'Отчетность'
  },
  {
    id: 'a4',
    text: 'Какой документ в 1С:Бухгалтерия используется для начисления заработной платы?',
    type: 'multiple_choice',
    options: ['Начисление зарплаты', 'Платежное поручение', 'Расходный кассовый ордер', 'Операция'],
    correctAnswer: 0,
    complexity: 'easy',
    category: '1С:Бухгалтерия'
  },
  {
    id: 'a5',
    text: 'Какие легальные способы оптимизации налогов доступны малому бизнесу на УСН?',
    type: 'multiple_choice',
    options: [
      'Дробление бизнеса',
      'Использование налоговых вычетов, правильный выбор объекта налогообложения, своевременное списание расходов',
      'Занижение выручки',
      'Работа без договоров'
    ],
    correctAnswer: 1,
    complexity: 'hard',
    category: 'Оптимизация'
  }
]

export const aiInterviewQuestions = [
  'Расскажите о самом сложном проекте в вашей практике. Какие решения вы принимали?',
  'Как вы справляетесь с ситуациями, когда клиент не согласен с вашими рекомендациями?',
  'Опишите случай, когда вам пришлось быстро адаптироваться к изменениям в работе.'
]
