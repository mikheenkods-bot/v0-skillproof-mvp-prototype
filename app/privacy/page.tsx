import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'

export const metadata = {
  title: 'Политика обработки персональных данных · SkillVerify',
  description:
    'Политика обработки персональных данных при прохождении тестирования SkillProof.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/candidate/skillproof"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Политика обработки персональных данных</h1>
            <p className="text-sm text-muted-foreground">
              работа.ру · SkillVerify · в соответствии с 152-ФЗ
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">1. Общие положения</h2>
            <p>
              Настоящая политика определяет порядок обработки персональных данных
              кандидатов, проходящих тестирование SkillProof, и меры по обеспечению их
              безопасности в соответствии с Федеральным законом № 152-ФЗ «О персональных
              данных».
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              2. Какие данные мы обрабатываем
            </h2>
            <p>
              Имя и адрес электронной почты, результаты тестирования (баллы, статус
              прохождения, профиль компетенций), а также метаданные прокторинга
              (события честности прохождения) — исключительно в объёме, необходимом для
              выдачи и проверки сертификата.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">3. Цели обработки</h2>
            <p>
              Проведение оценки профессиональных компетенций, формирование
              верифицированного сертификата и передача результата работодателю по
              запросу кандидата.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">4. Передача данных</h2>
            <p>
              Результат тестирования передаётся работодателю только с вашего согласия.
              Публичная страница проверки сертификата раскрывает минимальный набор
              данных и не содержит вашего адреса электронной почты или детального лога
              прокторинга.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">5. Ваши права</h2>
            <p>
              Вы вправе отозвать согласие на обработку персональных данных, запросить
              уточнение, блокирование или удаление своих данных, направив обращение в
              службу поддержки.
            </p>
          </section>

          <p className="pt-4 text-xs">
            Документ носит ознакомительный характер в рамках демонстрационного прототипа
            SkillVerify.
          </p>
        </div>
      </div>
    </main>
  )
}
