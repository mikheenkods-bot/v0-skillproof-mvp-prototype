"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ConsentModal } from '@/components/proctoring/consent-modal'
import { FullscreenPauseModal } from '@/components/proctoring/fullscreen-pause-modal'
import { useProctoringV2 } from '@/hooks/use-proctoring-v2'
import { useProctoringMedia } from '@/hooks/use-proctoring-media'
import { 
  specializations, 
  getRandomQuestions,
  isAnswerCorrect,
  checkTestPassed,
  TEST_CONFIG,
  type SpecializationType,
  type Question
} from '@/lib/demo-data'
import { cn } from '@/lib/utils'
import { E2E_TEST_MODE } from '@/lib/e2e'
import { saveTestResult, getCompletionByEmail, type ExistingCompletion } from '@/app/actions/test-results'
import { sendResultEmail } from '@/app/actions/send-result-email'
import { trackEvent } from '@/app/actions/analytics'
import { downloadCertificatePdf } from '@/lib/certificate-pdf'
import { FeedbackDialog } from '@/components/feedback-dialog'
import { RabotaUploadInstruction } from '@/components/rabota-upload-instruction'
import {
  Shield,
  Building2,
  Calculator,
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Loader2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  Camera,
  ShieldCheck,
  Mail,
  Award,
  Download
} from 'lucide-react'

type Stage = 'disclaimer' | 'already-completed' | 'consent' | 'preparation' | 'specialization' | 'testing' | 'analyzing' | 'result'

// --- Стабильный идентификатор попытки и устойчивый таймер ---------------------
// attemptId хранится в sessionStorage: переживает F5 в той же вкладке (лог
// прокторинга и счётчик нарушений НЕ дробятся), но новая вкладка = новая попытка.
const ATTEMPT_ID_KEY = 'skillproof_attempt_id'
// Дедлайн таймера привязан к attemptId. Дублируем в sessionStorage, чтобы очистка
// одного только localStorage не позволяла «выпросить» свежие 30 минут.
const TIMER_KEY = 'skillproof_deadline'
const TIMER_BACKUP_KEY = 'skillproof_deadline_bak'

function newAttemptId(): string {
  return `skillproof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getOrCreateAttemptId(): string {
  if (typeof window === 'undefined') return ''
  try {
    let id = sessionStorage.getItem(ATTEMPT_ID_KEY)
    if (!id) {
      id = newAttemptId()
      sessionStorage.setItem(ATTEMPT_ID_KEY, id)
    }
    return id
  } catch {
    return newAttemptId()
  }
}

function rotateAttemptId(): string {
  const id = newAttemptId()
  try {
    sessionStorage.setItem(ATTEMPT_ID_KEY, id)
  } catch {
    /* ignore */
  }
  return id
}

function parseAnchoredDeadline(raw: string | null, attemptId: string): number {
  if (!raw) return 0
  try {
    const obj = JSON.parse(raw)
    return obj?.attemptId === attemptId ? Number(obj.deadline) || 0 : 0
  } catch {
    return 0
  }
}

// Возвращает дедлайн ТЕКУЩЕЙ попытки. Проверяет и localStorage, и sessionStorage,
// чтобы очистка одного хранилища не сбрасывала отсчёт.
function readAnchoredDeadline(attemptId: string): number {
  if (typeof window === 'undefined' || !attemptId) return 0
  const local = parseAnchoredDeadline(localStorage.getItem(TIMER_KEY), attemptId)
  if (local) return local
  return parseAnchoredDeadline(sessionStorage.getItem(TIMER_BACKUP_KEY), attemptId)
}

function writeAnchoredDeadline(attemptId: string, deadline: number): void {
  if (typeof window === 'undefined') return
  const value = JSON.stringify({ attemptId, deadline })
  try {
    localStorage.setItem(TIMER_KEY, value)
    sessionStorage.setItem(TIMER_BACKUP_KEY, value)
  } catch {
    /* ignore */
  }
}

function clearAnchoredDeadline(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(TIMER_KEY)
    sessionStorage.removeItem(TIMER_BACKUP_KEY)
  } catch {
    /* ignore */
  }
}

// --- Персистентность прогресса теста (баг: F5 во время теста возвращал на
// стартовый экран и терял ответы). Снимок привязан к attemptId, поэтому
// относится строго к текущей попытке; пересдача (новый attemptId) его игнорирует.
const PROGRESS_KEY = 'skillproof_progress'

interface TestProgressSnapshot {
  attemptId: string
  specialization: SpecializationType
  questionIds: string[]
  currentQuestion: number
  answers: Record<string, number | string | number[]>
  candidateName: string
  candidateEmail: string
  attemptNumber: number
}

function writeProgressSnapshot(snapshot: TestProgressSnapshot): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(snapshot))
  } catch {
    /* ignore */
  }
}

function readProgressSnapshot(attemptId: string): TestProgressSnapshot | null {
  if (typeof window === 'undefined' || !attemptId) return null
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    const obj = JSON.parse(raw) as TestProgressSnapshot
    return obj?.attemptId === attemptId ? obj : null
  } catch {
    return null
  }
}

function clearProgressSnapshot(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(PROGRESS_KEY)
  } catch {
    /* ignore */
  }
}

const preparationChecklist = [
  { id: 'programs', label: 'Закройте все сторонние программы', description: 'Мессенджеры, браузерные расширения AI' },
  { id: 'tabs', label: 'Закройте лишние вкладки браузера', description: 'Оставьте только эту вкладку' },
  { id: 'alone', label: 'Убедитесь, что вы одни в комнате', description: 'Для честного прохождения теста' }
]

export default function SkillProofPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('disclaimer')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [specialization, setSpecialization] = useState<SpecializationType | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string | number[]>>({})
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [preparationChecks, setPreparationChecks] = useState<Record<string, boolean>>({})
  // PDn consent (152-ФЗ) — обязательно перед началом тестирования.
  const [pdnConsent, setPdnConsent] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(TEST_CONFIG.DURATION_MINUTES * 60)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0)
  const [certificateId, setCertificateId] = useState('')
  const [attemptNumber, setAttemptNumber] = useState(1)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [shake, setShake] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isAnswerLocked, setIsAnswerLocked] = useState(false)
  const [mediaEnabled, setMediaEnabled] = useState({ camera: false, mic: false })
  const [lastSnapshotReason, setLastSnapshotReason] = useState<string | undefined>()
  // Server-side repeat-attempt gate (by email — VPN-proof, unlike an IP check).
  const [checkingCompletion, setCheckingCompletion] = useState(false)
  const [existingCompletion, setExistingCompletion] = useState<ExistingCompletion | null>(null)
  // Подтверждение выхода из теста до его завершения.
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  // Статус генерации PDF-сертификата.
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'generating'>('idle')
  // Стабильный идентификатор попытки (переживает F5; ротируется при пересдаче).
  const [attemptId, setAttemptId] = useState<string>(() => getOrCreateAttemptId())
  // Видимое кандидату предупреждение о нарушении прокторинга (раньше нарушения
  // фиксировались молча — кандидат не получал никакой обратной связи).
  const [proctoringWarning, setProctoringWarning] = useState<{
    message: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    count: number
  } | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Questions are randomized per attempt (set in handleStartTest), so each
  // candidate and each retry gets a different set and order of questions.
  const [questions, setQuestions] = useState<Question[]>([])
  const specConfig = specialization ? specializations[specialization] : null

  // New proctoring v2 system
  const proctoring = useProctoringV2({
    attemptId,
    userId: 'current-user',
    specializationId: specialization || 'general',
    maxViolations: 3,
    onViolation: (event) => {
      // Показываем кандидату видимое предупреждение в реальном времени.
      // Человекочитаемый текст по типу события.
      const labels: Record<string, string> = {
        tab_hidden: 'Вы переключились на другую вкладку или окно',
        focus_lost: 'Окно теста потеряло фокус',
        fullscreen_exit: 'Вы вышли из полноэкранного режима',
        window_resize: 'Изменён размер окна',
        copy_attempt: 'Попытка копирования запрещена',
        paste_attempt: 'Вставка текста запрещена',
        paste_detected: 'Обнаружена вставка текста',
        cut_attempt: 'Вырезание текста запрещено',
        context_menu: 'Контекстное меню отключено',
        devtools_detected: 'Обнаружены инструменты разработчика',
        multi_monitor_detected: 'Обнаружено несколько мониторов',
        headless_detected: 'Обнаружен автоматизированный браузер',
        suspicious_input: 'Подозрительный ввод',
        suspicious_timing: 'Подозрительно быстрый ответ',
      }
      const message = labels[event.eventType] || event.description || 'Зафиксировано нарушение'
      const severity = (['low', 'medium', 'high', 'critical'].includes(event.severity)
        ? event.severity
        : 'medium') as 'low' | 'medium' | 'high' | 'critical'

      setProctoringWarning(prev => ({
        message,
        severity,
        count: (prev?.count ?? 0) + 1,
      }))
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      warningTimerRef.current = setTimeout(() => setProctoringWarning(null), 6000)
    },
    onTerminate: () => {
      // Take snapshot on termination
      if (mediaEnabled.camera) {
        media.takeViolationSnapshot('Тест прерван из-за нарушений')
      }
      setStage('result')
      setFinalScore(0)
    }
  })

  // Media (camera & microphone) for proctoring
  const media = useProctoringMedia({
    onViolationSnapshot: (imageData, reason) => {
      setLastSnapshotReason(reason)
      // Clear after 3 seconds
      setTimeout(() => setLastSnapshotReason(undefined), 3000)
      // Log the snapshot event
      proctoring.logEvent('session_start', { hasSnapshot: true, reason }, `Фото при нарушении: ${reason}`)
    },
    onSpeechDetected: () => {
      // Optional: log speech detection as suspicious
      // proctoring.logEvent('suspicious_input', { type: 'speech' }, 'Обнаружена речь')
    }
  })

  // Гарантируем наличие attemptId на клиенте (SSR-инициализатор отдаёт '').
  useEffect(() => {
    if (!attemptId) setAttemptId(getOrCreateAttemptId())
  }, [attemptId])

  // Чистим таймер предупреждения прокторинга при размонтировании.
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [])

  // Восстановление прогресса после F5/случайной перезагрузки. Раньше reload во
  // время теста возвращал кандидата на стартовый экран и терял ответы. Снимок
  // привязан к attemptId и считается валидным только пока жив дедлайн этой
  // попытки (иначе время уже вышло — восстанавливать нечего). Запускается один раз.
  const restoreDoneRef = useRef(false)
  useEffect(() => {
    if (restoreDoneRef.current) return
    if (!attemptId) return
    restoreDoneRef.current = true

    const snapshot = readProgressSnapshot(attemptId)
    if (!snapshot) return
    const deadline = readAnchoredDeadline(attemptId)
    if (!deadline || deadline <= Date.now()) {
      // Время попытки истекло — снимок неактуален.
      clearProgressSnapshot()
      return
    }

    // Реконструируем вопросы по сохранённым id из банка специализации
    // (порядок важен — он совпадает с тем, что видел кандидат).
    const bank = specializations[snapshot.specialization]?.questions ?? []
    const byId = new Map(bank.map((q) => [q.id, q]))
    const restoredQuestions = snapshot.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q))
    if (restoredQuestions.length !== snapshot.questionIds.length) {
      // Банк изменился — безопаснее не восстанавливать частичный набор.
      clearProgressSnapshot()
      return
    }

    setSpecialization(snapshot.specialization)
    setQuestions(restoredQuestions)
    setAnswers(snapshot.answers)
    setCurrentQuestion(snapshot.currentQuestion)
    setCandidateName(snapshot.candidateName)
    setCandidateEmail(snapshot.candidateEmail)
    setAttemptNumber(snapshot.attemptNumber)
    setStage('testing')
    // Прокторинг нужно поднять заново — слушатели не переживают перезагрузку.
    proctoring.startSession()
    proctoring.startQuestionTimer()
  }, [attemptId, proctoring])

  // Сохраняем снимок прогресса при каждом изменении ответов/номера вопроса
  // во время теста. Дёшево (один localStorage.setItem) и переживает reload.
  useEffect(() => {
    if (stage !== 'testing' || !attemptId || !specialization || questions.length === 0) return
    writeProgressSnapshot({
      attemptId,
      specialization,
      questionIds: questions.map((q) => q.id),
      currentQuestion,
      answers,
      candidateName,
      candidateEmail,
      attemptNumber,
    })
  }, [stage, attemptId, specialization, questions, currentQuestion, answers, candidateName, candidateEmail, attemptNumber])

  // Синхронизация таймера со стадией: на стартовом экране сохранённого дедлайна
  // быть не должно. Это устраняет рассинхрон «таймер жив, а стадия сброшена»
  // после F5 и не даёт устаревшему дедлайну влиять на новую попытку.
  useEffect(() => {
    if (stage === 'disclaimer') {
      clearAnchoredDeadline()
      clearProgressSnapshot()
    }
  }, [stage])

  // Durable timer: дедлайн привязан к attemptId и хранится в local+session storage.
  // F5 не сбрасывает отсчёт; очистка одного хранилища не выдаёт свежие 30 минут.
  useEffect(() => {
    if (stage !== 'testing') return
    if (proctoring.isTerminated) return

    // Дедлайн уже выставлен в handleStartTest. Если его нет (прямой вход) —
    // создаём один раз для ЭТОЙ попытки.
    let deadline = readAnchoredDeadline(attemptId)
    if (!deadline) {
      deadline = Date.now() + TEST_CONFIG.DURATION_MINUTES * 60 * 1000
      writeAnchoredDeadline(attemptId, deadline)
    }

    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000))
      setTimeRemaining(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        clearAnchoredDeadline()
        setStage('analyzing')
      }
    }
    tick() // мгновенно показать актуальное время после перезагрузки
    const timer = setInterval(tick, 1000)

    return () => clearInterval(timer)
  }, [stage, proctoring.isTerminated, attemptId])

  // Analysis effect - calculate real score and persist results.
  // Runs exactly once per "analyzing" stage. The heavy work (scoring, DB save,
  // email) lives in a dedicated function — NOT inside a setState updater — and
  // the progress bar is purely visual. A ref guard prevents the duplicate runs
  // that previously made this stage hang and re-save on every render.
  const analysisDoneRef = useRef(false)
  useEffect(() => {
    if (stage !== 'analyzing') {
      analysisDoneRef.current = false
      return
    }
    if (analysisDoneRef.current) return
    analysisDoneRef.current = true

    // Snapshot violations once so later proctoring events can't restart this.
    const violationsList = proctoring.violations
    const violationCount = violationsList.length

    // Visual-only progress animation.
    setAnalysisProgress(0)
    const interval = setInterval(() => {
      setAnalysisProgress(prev => (prev >= 100 ? 100 : prev + 4))
    }, 80)

    const finalize = async () => {
      clearInterval(interval)
      setAnalysisProgress(100)
      // Таймер больше не нужен — очищаем сохранённый дедлайн.
      clearAnchoredDeadline()
      // Тест завершён — снимок прогресса больше не нужен.
      clearProgressSnapshot()

      // ДЕТЕРМИНИРОВАННЫЙ ЛОКАЛЬНЫЙ СКОРИНГ — без внешних/платных вызовов.
      // В тесте только multiple_choice и numeric (см. getRandomQuestions),
      // каждый вопрос строго верно/неверно (isAnswerCorrect).
      const itemScores = questions.map((q) =>
        isAnswerCorrect(q, answers[q.id]) ? 100 : 0
      )
      const correct = itemScores.filter((s) => s === 100).length
      setCorrectAnswersCount(correct)

      // Итоговый балл = доля правильных из общего числа вопросов.
      const score = questions.length
        ? Math.round((correct / questions.length) * 100)
        : 0
      setFinalScore(score)

      // Прохождение по канону: нужно PASS_THRESHOLD правильных из QUESTIONS_PER_TEST.
      const passed = correct >= TEST_CONFIG.PASS_THRESHOLD
      const isClean = violationCount === 0

      const now = new Date()
      const dateStr = now.toLocaleDateString('ru-RU')
      const certId = `SKILL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      // Навыки по категориям — точная локальная проверка каждого вопроса.
      const skillCategories = [...new Set(questions.map((q) => q.category))]
      const skills = skillCategories
        .map((cat) => {
          const catQuestions = questions.filter((q) => q.category === cat)
          if (catQuestions.length === 0) return null
          const total = catQuestions.reduce(
            (sum, q) => sum + (isAnswerCorrect(q, answers[q.id]) ? 100 : 0),
            0
          )
          return { name: cat, score: Math.round(total / catQuestions.length) }
        })
        .filter((s): s is { name: string; score: number } => s !== null)

      // Save certificate to localStorage if passed
      if (passed) {
        const certificate = {
          id: certId,
          specialization: specConfig?.name || 'Общий тест',
          score,
          isClean,
          date: dateStr,
          skills,
          violations: violationCount,
        }
        const existingCerts = JSON.parse(localStorage.getItem('skillverify_certificates') || '[]')
        existingCerts.push(certificate)
        localStorage.setItem('skillverify_certificates', JSON.stringify(existingCerts))
      }

      // Save proctoring history
      const proctoringSession = {
        id: `proc-${Date.now()}`,
        date: dateStr,
        type: 'SkillProof',
        specialization: specConfig?.name || 'Общий тест',
        status: isClean ? 'clean' : 'violations',
        violations: violationCount,
      }
      const existingProctoring = JSON.parse(localStorage.getItem('skillverify_proctoring_history') || '[]')
      existingProctoring.push(proctoringSession)
      localStorage.setItem('skillverify_proctoring_history', JSON.stringify(existingProctoring))

      setCertificateId(certId)

      const proctoringLog = violationsList.map((v) => ({
        type: (v as { eventType?: string; type?: string }).eventType ?? (v as { type?: string }).type ?? 'violation',
        message: (v as { description?: string; message?: string }).description ?? (v as { message?: string }).message ?? '',
        timestamp: (v as { timestamp?: number }).timestamp ?? Date.now(),
      }))

      // Persist result to the database (every attempt, pass or fail).
      // ВАЖНО: ждём завершения записи ДО показа экрана результата. Раньше это был
      // fire-and-forget (void), и если кандидат быстро закрывал вкладку, сертификат
      // не успевал сохраниться — затем /verify выдавал «Сертификат не найден».
      // Прокторинг-лог и integrity-score сохраняются в БД вместе с результатом.
      try {
        const saveRes = await saveTestResult({
          certificateId: certId,
          candidateName: candidateName.trim() || null,
          candidateEmail: candidateEmail.trim() || null,
          specialization: specConfig?.name || 'Бухгалтер',
          score,
          correctAnswers: correct,
          totalQuestions: questions.length,
          passed,
          isClean,
          violations: violationCount,
          integrityScore: proctoring.integrityScore ?? 0,
          skills,
          proctoringLog,
        })
        if (!saveRes?.success) {
          console.error('[v0] saveTestResult returned failure:', saveRes)
        }
      } catch (err) {
        console.error('[v0] saveTestResult threw:', err)
      }

      // Воронка: тест завершён (с признаком прохождения и нарушений).
      void trackEvent('test_completed', {
        email: candidateEmail,
        specialization: specConfig?.name || 'skillproof',
        payload: { score, passed, violations: violationCount },
      })

      // Email the candidate a copy of their result (fire-and-forget).
      if (candidateEmail.trim()) {
        setEmailStatus('sending')
        sendResultEmail({
          certificateId: certId,
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim(),
          specialization: specConfig?.name || 'Бухгалтер',
          score,
        })
          .then((res) => setEmailStatus(res?.ok ? 'sent' : 'error'))
          .catch(() => setEmailStatus('error'))
      }

      setStage('result')
      if (isClean && passed) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
    }

    // Запускаем оценку после короткой задержки (для визуала прогресса).
    const timeout = setTimeout(() => {
      void finalize()
    }, 600)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  // Shake effect on violation + take snapshot (with debounce)
  const lastViolationCountRef = useRef(0)
  useEffect(() => {
    const currentCount = proctoring.violations.length
    // Only trigger shake if violation count actually increased
    if (currentCount > lastViolationCountRef.current) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      
      // Take snapshot on violation if camera is enabled
      if (mediaEnabled.camera && media.cameraState.isEnabled) {
        const lastViolation = proctoring.violations[proctoring.violations.length - 1]
        media.takeViolationSnapshot(lastViolation?.description || 'Нарушение')
      }
    }
    lastViolationCountRef.current = currentCount
  }, [proctoring.violations.length, proctoring.violations, mediaEnabled.camera, media])

  // Воронка: фиксируем заход на страницу тестирования один раз за загрузку.
  // Это даёт администратору метрику «сколько человек заходило на сайт».
  useEffect(() => {
    void trackEvent('visit', { specialization: 'skillproof' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle consent acceptance with camera/mic options
  const handleConsentAccept = async (withCamera: boolean, withMic: boolean) => {
    setMediaEnabled({ camera: withCamera, mic: withMic })
    
    // Enable camera if user agreed
    if (withCamera) {
      await media.enableCamera()
    }
    
    // Enable microphone if user agreed
    if (withMic) {
      await media.enableMicrophone()
    }
    
    proctoring.giveConsent()
    proctoring.startSession()
    setShowConsentModal(false)
    setStage('preparation')
  }

  // Disclaimer "Начать тестирование" handler: first check the server whether
  // this email has already completed the test. This is the authoritative gate
  // against repeat attempts and can't be bypassed with a VPN.
  const handleBeginAssessment = async () => {
    if (checkingCompletion) return
    setCheckingCompletion(true)
    try {
      const completion = await getCompletionByEmail(candidateEmail)
      // Кандидату доступно TEST_CONFIG.MAX_ATTEMPTS попыток (идентификация по email).
      // Блокируем ТОЛЬКО когда попытки исчерпаны. Если осталась хотя бы одна —
      // пропускаем к тесту и продолжаем нумерацию с учётом уже сделанных попыток.
      if (completion.completed && completion.attempts >= TEST_CONFIG.MAX_ATTEMPTS) {
        setExistingCompletion(completion)
        setStage('already-completed')
        return
      }
      // Следующая попытка = число уже сделанных + 1 (для корректной логики пересдачи).
      setAttemptNumber(completion.attempts + 1)
      setStage('consent')
      setShowConsentModal(true)
    } catch (error) {
      console.error('[v0] completion check failed:', error)
      // Fail open: never block a candidate because of a transient error.
      setStage('consent')
      setShowConsentModal(true)
    } finally {
      setCheckingCompletion(false)
    }
  }

  const handleStartTest = (spec?: SpecializationType) => {
    // Use the explicitly passed specialization to avoid relying on the
    // async state update from setSpecialization (which would still be null here).
    const activeSpec = spec ?? specialization
    // Generate a fresh randomized set of questions for this attempt (канон 7+3).
    if (activeSpec) {
      setQuestions(getRandomQuestions(activeSpec))
    }
    // Новый дедлайн таймера для этой попытки (привязан к attemptId, переживает F5).
    writeAnchoredDeadline(attemptId, Date.now() + TEST_CONFIG.DURATION_MINUTES * 60 * 1000)
    // Активируем прокторинг для КАЖДОЙ попытки. На пересдаче consent-модалка не
    // показывается повторно, а handleRetake ротирует attemptId → хук пересоздаёт
    // сессию с isActive:false. Без этого вызова на 2-й попытке слушатели нарушений
    // не навешивались. startSession идемпотентен — на 1-й попытке (где он уже был
    // вызван в handleConsentAccept) повторный вызов ничего не дублирует.
    proctoring.startSession()
    // Request fullscreen when starting test
    proctoring.enterFullscreen()
    proctoring.startQuestionTimer() // Start timing for first question
    setStage('testing')
    setQuestionStartTime(Date.now())
    // Воронка: кандидат приступил к тесту.
    void trackEvent('test_started', {
      email: candidateEmail,
      specialization: activeSpec || 'skillproof',
    })
  }

  // One-time retake: resets the attempt state and returns to specialization
  // selection. handleStartTest will draw a fresh randomized question set.
  const handleRetake = () => {
    setAttemptNumber((n) => n + 1)
    setStage('specialization')
    setSpecialization(null)
    setQuestions([])
    setCurrentQuestion(0)
    setAnswers({})
    setCorrectAnswersCount(0)
    setFinalScore(0)
    setCertificateId('')
    setEmailStatus('idle')
    setShowExplanation(false)
    setIsAnswerLocked(false)
    setTimeRemaining(TEST_CONFIG.DURATION_MINUTES * 60)
    clearAnchoredDeadline()
    clearProgressSnapshot()
    // Пересдача — это НОВАЯ попытка: ротируем attemptId, чтобы лог прокторинга и
    // счётчик нарушений начались с чистого листа (хук пересоздаёт сессию).
    setAttemptId(rotateAttemptId())
    setAnalysisProgress(0)
  }

  const handleAnswer = (questionId: string, answer: number | string) => {
    if (isAnswerLocked) return // Prevent changing answer after submission
    
    const question = questions[currentQuestion]
    
    if (question.type === 'multiple_choice') {
      // Check answer timing using proctoring's typing analytics
      proctoring.checkAnswerTiming(question.complexity, question.text.length)
      setAnswers(prev => ({ ...prev, [questionId]: answer }))
      // Lock answer and show explanation
      setIsAnswerLocked(true)
      setShowExplanation(true)
    } else {
      // numeric: записываем ответ без блокировки,
      // кандидат подтверждает кнопкой «Следующий вопрос»
      setAnswers(prev => ({ ...prev, [questionId]: answer }))
    }
  }

  const handleNextQuestion = () => {
    setShowExplanation(false)
    setIsAnswerLocked(false)
    proctoring.startQuestionTimer() // Reset timer for next question
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setQuestionStartTime(Date.now())
    } else {
      // Открытых вопросов и AI-интервью больше нет — сразу к анализу.
      proctoring.stopSession()
      setStage('analyzing')
    }
  }

  // Выход из теста до завершения: попытка НЕ засчитывается (результат не
  // сохраняется), таймер и прокторинг останавливаются, кандидат уходит на главную.
  const handleConfirmExit = () => {
    setShowExitConfirm(false)
    proctoring.stopSession()
    proctoring.exitFullscreen()
    clearAnchoredDeadline()
    clearProgressSnapshot()
    // Выход = отказ от текущей попытки: ротируем attemptId на случай нового захода.
    setAttemptId(rotateAttemptId())
    // Воронка: кандидат вышел из теста до завершения (не завершил).
    void trackEvent('test_abandoned', {
      email: candidateEmail,
      specialization: specialization || 'skillproof',
      payload: { question: currentQuestion + 1, total: questions.length },
    })
    router.push('/')
  }

  // Генерация и скачивание PDF-сертификата (только для сдавших).
  const handleDownloadCertificate = async () => {
    if (pdfStatus === 'generating') return
    setPdfStatus('generating')
    try {
      await downloadCertificatePdf({
        certificateId,
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        specialization: specConfig?.name || 'Бухгалтер',
        score: finalScore,
        correctAnswers: correctAnswersCount,
        totalQuestions: TEST_CONFIG.QUESTIONS_PER_TEST,
        attemptNumber,
        maxAttempts: TEST_CONFIG.MAX_ATTEMPTS,
        date: new Date(),
      })
    } catch (error) {
      console.error('[v0] PDF generation failed:', error)
    } finally {
      setPdfStatus('idle')
    }
  }

  const allChecked = preparationChecklist.every(item => preparationChecks[item.id])

  return (
    <div className={cn("min-h-screen bg-background", shake && "shake")}>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center px-4">
          <div className="flex items-center gap-3">
            {/* Rabota.ru brand */}
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#4A7DFF' }}
            >
              работа.ру
            </span>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold tracking-tight">SkillProof</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal && stage === 'consent'}
        onAccept={handleConsentAccept}
        onClose={() => {
          // «Не сейчас» — возвращаем кандидата на стартовый экран ввода
          // данных (ФИО и почта), а не на главную страницу сайта.
          setShowConsentModal(false)
          setStage('disclaimer')
        }}
        systemCheck={proctoring.systemCheck}
        onRunSystemCheck={proctoring.runSystemCheck}
      />

      {/* Fullscreen Pause Modal */}
      <FullscreenPauseModal
        isOpen={proctoring.fullscreenPaused && !proctoring.state.isFullscreen}
        exitCount={proctoring.state.fullscreenExitCount}
        maxExits={3}
        onReturnToFullscreen={proctoring.enterFullscreen}
      />

      {/* Exit confirmation modal — попытка не будет засчитана */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="exit-confirm-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 id="exit-confirm-title" className="text-lg font-semibold">
                    Выйти из теста?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1 text-pretty">
                    Вы не завершили тест до конца. Если вы подтверждаете выход, то
                    ваша попытка не будет засчитана.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowExitConfirm(false)}
                >
                  Продолжить тест
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleConfirmExit}
                >
                  Подтвердить выход
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Disclaimer Stage */}
          {stage === 'disclaimer' && (
            <motion.div
              key="disclaimer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">SkillProof</h1>
                <p className="text-muted-foreground">
                  Подтверждение навыков для вашего резюме
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-6 md:p-8 mb-6">
                <h2 className="text-lg font-semibold mb-4">Перед началом</h2>
                <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    В данном разделе будут представлены тесты, которые помогут
                    вашему резюме получить более высокий балл при отборе.
                  </p>
                  <p>
                    Тесты составлены с применением искусственного интеллекта и
                    направлены на тестирование конкретного навыка.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">
                      Тестирование проходит под наблюдением системы прокторинга
                      для честной оценки результата.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">
                      Результат сохраняется и может быть передан работодателю при
                      отборе кандидатов.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm">
                      При неуспешном прохождении тест можно пройти повторно.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-6 md:p-8 mb-6">
                <h2 className="text-lg font-semibold mb-1">Ваши данные</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Результат теста будет привязан к этим данным и передан
                  работодателю.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-name">Имя и фамилия</Label>
                    <Input
                      id="candidate-name"
                      data-testid="name-input"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Иван Иванов"
                      autoComplete="name"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="candidate-email">Email</Label>
                    <Input
                      id="candidate-email"
                      data-testid="email-input"
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      placeholder="ivan@example.com"
                      autoComplete="email"
                      maxLength={254}
                    />
                  </div>

                  {/* Согласие на обработку ПДн (152-ФЗ) — обязательно */}
                  <label
                    htmlFor="pdn-consent"
                    className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input
                      id="pdn-consent"
                      data-testid="pdn-consent"
                      type="checkbox"
                      checked={pdnConsent}
                      onChange={(e) => setPdnConsent(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                    />
                    <span className="text-sm text-muted-foreground leading-relaxed">
                      Я даю согласие на обработку моих персональных данных и передачу
                      результата тестирования работодателю в соответствии с{' '}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Политикой обработки персональных данных
                      </a>{' '}
                      (152-ФЗ).
                    </span>
                  </label>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                data-testid="begin-button"
                disabled={checkingCompletion || !pdnConsent || !candidateName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateEmail.trim())}
                onClick={handleBeginAssessment}
              >
                {checkingCompletion ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  <>
                    Начать тестирование
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {stage === 'already-completed' && (
            <motion.div
              key="already-completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="rounded-2xl border bg-card p-8 md:p-10 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-5">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold mb-3 text-balance">
                  Вы уже завершили тестирование
                </h1>
                <p className="text-muted-foreground leading-relaxed mb-6 text-pretty">
                  Результаты по адресу{' '}
                  <span className="font-medium text-foreground">{candidateEmail}</span>{' '}
                  зафиксированы и переданы работодателю. Повторное прохождение
                  недоступно.
                </p>

                <div className="rounded-xl border bg-muted/30 p-5 text-left space-y-3 mb-6">
                  {existingCompletion?.completedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Дата прохождения</span>
                      <span className="font-medium">
                        {new Date(existingCompletion.completedAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {existingCompletion?.score != null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Результат</span>
                      <span className="font-medium">{existingCompletion.score}%</span>
                    </div>
                  )}
                  {existingCompletion?.certificateId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">ID сертификата</span>
                      <span className="font-mono text-xs">{existingCompletion.certificateId}</span>
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => router.push('/')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  На главную
                </Button>
              </div>
            </motion.div>
          )}


          {stage === 'preparation' && (
            <motion.div
              key="preparation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <Button 
                variant="ghost" 
                className="mb-6"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                На главную
              </Button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Подготовка к тестированию</h1>
                <p className="text-muted-foreground">
                  Пожалуйста, выполните все пункты перед началом
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {preparationChecklist.map((item, index) => (
                  <motion.label
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                      preparationChecks[item.id]
                        ? "border-success bg-success/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      preparationChecks[item.id]
                        ? "border-success bg-success text-success-foreground"
                        : "border-muted-foreground"
                    )}>
                      {preparationChecks[item.id] && (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="checkbox"
                        data-testid={`prep-checkbox-${item.id}`}
                        className="sr-only"
                        checked={preparationChecks[item.id] || false}
                        onChange={(e) => setPreparationChecks(prev => ({
                          ...prev,
                          [item.id]: e.target.checked
                        }))}
                      />
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.label>
                ))}
              </div>

              <Button
                size="lg"
                className="w-full"
                data-testid="prep-start"
                disabled={!allChecked}
                onClick={() => setStage('specialization')}
              >
                Начать тест
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Specialization Selection */}
          {stage === 'specialization' && (
            <motion.div
              key="specialization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Тестирование навыка</h1>
                <p className="text-muted-foreground">
                  Для прохождения необходимо ответить правильно на {TEST_CONFIG.PASS_THRESHOLD} из {TEST_CONFIG.QUESTIONS_PER_TEST} вопросов.
                </p>
              </div>

              <div className="grid gap-6">
                {/* Бухгалтер */}
                <motion.button
                  data-testid="spec-accountant"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSpecialization('accountant')
                    handleStartTest('accountant')
                  }}
                  className={cn(
                    "p-6 rounded-2xl border-2 text-left transition-all",
                    specialization === 'accountant'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 mb-4">
                    <Calculator className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Бухгалтер</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Проводки, НДС, ФСБУ, отчётность, балансовое уравнение
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {TEST_CONFIG.DURATION_MINUTES} минут
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      {TEST_CONFIG.QUESTIONS_PER_TEST} вопросов
                    </span>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Testing Stage */}
          {stage === 'testing' && !proctoring.isTerminated && questions.length > 0 && questions[currentQuestion] && (
            <motion.div
              key="testing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Shield className="h-4 w-4 proctoring-pulse" />
                    Режим прокторинга активен
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
                    timeRemaining <= 300 ? "bg-destructive/10 text-destructive" : "bg-muted"
                  )}>
                    <Clock className="h-5 w-5" />
                    {formatTime(timeRemaining)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExitConfirm(true)}
                    className="text-muted-foreground"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Выйти из теста
                  </Button>
                </div>
              </div>

              {/* Real-time proctoring warning. Раньше нарушения фиксировались молча;
                  теперь кандидат сразу видит предупреждение и счётчик. */}
              <AnimatePresence>
                {proctoringWarning && (
                  <motion.div
                    role="alert"
                    aria-live="assertive"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      'mb-6 flex items-start gap-3 rounded-lg border px-4 py-3',
                      proctoringWarning.severity === 'critical' || proctoringWarning.severity === 'high'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    )}
                  >
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold">
                        Предупреждение прокторинга
                      </p>
                      <p className="text-sm">
                        {proctoringWarning.message}. Это нарушение зафиксировано и влияет на индекс честности.
                      </p>
                      <p className="text-xs mt-1 opacity-80">
                        {`Всего нарушений: ${proctoringWarning.count} из 3 до автоматического завершения теста.`}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Вопрос {currentQuestion + 1} из {questions.length}
                  </span>
                  <span className="text-muted-foreground">
                    {questions[currentQuestion].category}
                  </span>
                </div>
                <Progress value={((currentQuestion + 1) / questions.length) * 100} />
              </div>

              {/* Question Card */}
              <div className="rounded-2xl border border-border bg-card p-8 no-select">
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    questions[currentQuestion].complexity === 'easy' && "bg-success/20 text-success",
                    questions[currentQuestion].complexity === 'medium' && "bg-warning/20 text-warning",
                    questions[currentQuestion].complexity === 'hard' && "bg-destructive/20 text-destructive"
                  )}>
                    {questions[currentQuestion].complexity === 'easy' && 'Легкий'}
                    {questions[currentQuestion].complexity === 'medium' && 'Средний'}
                    {questions[currentQuestion].complexity === 'hard' && 'Сложный'}
                  </span>
                </div>

                <h2 className="text-xl font-semibold mb-6">
                  {questions[currentQuestion].text}
                </h2>

                {/*
                  Детерминированный «ключ» для E2E-автотеста. Рендерится ТОЛЬКО
                  при активном тестовом флаге (вне продакшена). В обычном режиме
                  элемента нет — ответы не раскрываются.
                  - multiple_choice: индекс правильного варианта
                  - numeric: правильное число
                */}
                {E2E_TEST_MODE && (
                  <span
                    data-testid="answer-key"
                    hidden
                    aria-hidden="true"
                    style={{ display: 'none' }}
                  >
                    {questions[currentQuestion].type === 'multiple_choice'
                      ? String(questions[currentQuestion].correctAnswer ?? '')
                      : String(questions[currentQuestion].numericAnswer ?? '')}
                  </span>
                )}

                {questions[currentQuestion].type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    {questions[currentQuestion].options?.map((option, index) => {
                      const isSelected = answers[questions[currentQuestion].id] === index
                      const isCorrect = questions[currentQuestion].correctAnswer === index
                      const showResult = showExplanation && isAnswerLocked
                      
                      return (
                        <button
                          key={index}
                          data-testid={`question-option-${index}`}
                          onClick={() => handleAnswer(questions[currentQuestion].id, index)}
                          disabled={isAnswerLocked}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all",
                            !showResult && isSelected && "border-primary bg-primary/5",
                            !showResult && !isSelected && "border-border hover:border-primary/50",
                            showResult && isCorrect && "border-success bg-success/10",
                            showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                            isAnswerLocked && "cursor-default"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium",
                              !showResult && isSelected && "border-primary bg-primary text-primary-foreground",
                              !showResult && !isSelected && "border-muted-foreground",
                              showResult && isCorrect && "border-success bg-success text-success-foreground",
                              showResult && isSelected && !isCorrect && "border-destructive bg-destructive text-destructive-foreground"
                            )}>
                              {showResult && isCorrect ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : showResult && isSelected && !isCorrect ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                String.fromCharCode(65 + index)
                              )}
                            </div>
                            <span>{option}</span>
                          </div>
                        </button>
                      )
                    })}
                    
                    {/* Explanation after answer */}
                    {showExplanation && questions[currentQuestion].explanation && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm mb-1">Пояснение:</p>
                            <p className="text-sm text-muted-foreground">
                              {questions[currentQuestion].explanation}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Введите числовой ответ (только цифры, без пробелов)
                    </p>
                    <Input
                      type="text"
                      data-testid="numeric-input"
                      inputMode="numeric"
                      placeholder="Введите число"
                      className="max-w-xs text-lg"
                      value={(answers[questions[currentQuestion].id] as string) ?? ''}
                      onChange={(e) => {
                        // Принимаем только цифры (числовой ответ).
                        const digitsOnly = e.target.value.replace(/[^0-9]/g, '')
                        handleAnswer(questions[currentQuestion].id, digitsOnly)
                      }}
                    />
                  </div>
                )}

                <div className="mt-8 flex justify-end">
                  <Button
                    size="lg"
                    data-testid={currentQuestion < questions.length - 1 ? 'next-question' : 'finish-test'}
                    onClick={handleNextQuestion}
                    disabled={(() => {
                      const a = answers[questions[currentQuestion].id]
                      if (a === undefined || a === null) return true
                      if (Array.isArray(a)) return a.length === 0
                      if (typeof a === 'string') return a.trim() === ''
                      return false
                    })()}
                  >
                    {currentQuestion < questions.length - 1 ? 'Следующий вопрос' : 'Завершить тест'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analyzing Stage */}
          {stage === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto text-center py-20"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Анализируем ваши ответы</h2>
              <p className="text-muted-foreground mb-8">
                AI проверяет качество ответов и выявляет признаки автоматизации
              </p>
              
              <div className="space-y-4">
                <Progress value={analysisProgress} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Проверка на автоматизацию...</span>
                  <span>{analysisProgress}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result Stage */}
          {stage === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              {proctoring.isTerminated ? (
                <div className="text-center py-12">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-6">
                    <XCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Тест прерван</h2>
                  <p className="text-muted-foreground mb-6">
                    Превышен лимит нарушений ({proctoring.violationCount}/3).
                    Сессия завершена системой прокторинга.
                  </p>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-8 text-left">
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Зафиксированные нарушения:</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {proctoring.violations.map((v, i) => (
                        <li key={i} className="text-muted-foreground">
                          {new Date(v.timestamp).toLocaleTimeString()}: {v.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Тестирование завершено</h2>
                  <p className="text-muted-foreground mb-8 text-pretty">
                    {attemptNumber < TEST_CONFIG.MAX_ATTEMPTS
                      ? 'Тест завершён. Вы можете пройти его заново (осталась 1 попытка) или завершить, закрыв вкладку браузера. Ваши результаты сохранены и отправлены на платформу «Работа.ру».'
                      : 'Тест завершён. Вы можете завершить, закрыв вкладку браузера. Ваши результаты сохранены и отправлены на платформу «Работа.ру».'}
                  </p>

                  {/* Score out of 100 */}
                  <div className="rounded-2xl border bg-card p-8 mb-6">
                    <div className="text-sm text-muted-foreground mb-2">
                      Ваш балл по 100-балльной шкале
                    </div>
                    <div className="flex items-end justify-center gap-1 mb-4">
                      <span
                        data-testid="result-score"
                        className="text-6xl font-bold text-primary tabular-nums"
                      >
                        {finalScore}
                      </span>
                      <span className="text-2xl text-muted-foreground mb-1">/100</span>
                    </div>
                    <Progress value={finalScore} className="h-2 mb-4" />
                    <div className="text-sm text-muted-foreground">
                      Правильных ответов: {correctAnswersCount} из {TEST_CONFIG.QUESTIONS_PER_TEST}
                      {' · '}
                      Специализация: {specConfig?.name || 'Бухгалтер'}
                    </div>
                  </div>

                  {/* Certificate CTA — shown when the candidate passed cleanly */}
                  {correctAnswersCount >= TEST_CONFIG.PASS_THRESHOLD && certificateId && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4 text-left flex items-start gap-3">
                      <Award className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">Сертификат готов</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          Поздравляем! Вы получили верифицированный сертификат SkillProof.
                          Скачайте PDF, чтобы загрузить его в профиль на «Работа.ру»,
                          или проверьте подлинность.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={handleDownloadCertificate}
                            disabled={pdfStatus === 'generating'}
                          >
                            {pdfStatus === 'generating' ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-2 h-4 w-4" />
                            )}
                            Скачать сертификат (PDF)
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/verify/${certificateId}`} target="_blank">
                              Проверить подлинность
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result fixed / DB confirmation */}
                  <div className="rounded-xl bg-muted p-4 mb-4 text-left flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">Результат зафиксирован</p>
                      <p className="text-muted-foreground">
                        Идентификатор:{' '}
                        <span data-testid="result-certificate-id">{certificateId || '—'}</span>.
                        Результат тестирования будет передан на платформу «Работа.ру».
                      </p>
                    </div>
                  </div>

                  {/* Email status */}
                  {candidateEmail.trim() && (
                    <div className="rounded-xl bg-muted p-4 mb-6 text-left flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium">Копия на email</p>
                        <p className="text-muted-foreground">
                          {emailStatus === 'sending' && `Отправляем сообщение на ${candidateEmail}...`}
                          {emailStatus === 'sent' && `Сообщение о прохождении отправлено на ${candidateEmail}.`}
                          {emailStatus === 'error' && `Не удалось отправить письмо на ${candidateEmail}. Результат всё равно сохранён.`}
                          {emailStatus === 'idle' && `Сообщение будет отправлено на ${candidateEmail}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Инструкция по загрузке сертификата на «Работа.ру» — рядом с кнопкой скачивания PDF */}
                  {correctAnswersCount >= TEST_CONFIG.PASS_THRESHOLD && certificateId && (
                    <div className="mb-4">
                      <RabotaUploadInstruction />
                    </div>
                  )}

                  {/* Обратная связь о тестировании — доступна всем завершившим */}
                  <div className="mb-6">
                    <FeedbackDialog
                      certificateId={certificateId || null}
                      candidateEmail={candidateEmail.trim() || null}
                      candidateName={candidateName.trim() || null}
                      specialization={specConfig?.name || null}
                    />
                  </div>

                  {/* One-time retake option */}
                  {attemptNumber < TEST_CONFIG.MAX_ATTEMPTS ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        Если вы не довольны результатом, доступна одна пересдача.
                        Вопросы в новой попытке будут другими.
                      </p>
                      <Button onClick={handleRetake} className="w-full">
                        Пройти пересдачу (1 попытка)
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Пересдача уже использована. Это ваш итоговый результат.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
