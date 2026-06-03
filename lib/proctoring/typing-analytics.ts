/**
 * Typing Analytics Module
 * Analyzes typing patterns to detect suspicious behavior like copy-paste, 
 * AI-generated text, or abnormal typing speeds
 */

export interface KeystrokeEvent {
  timestamp: number
  key: string
  isSpecial: boolean // backspace, delete, arrows, etc.
}

export interface TypingSession {
  startTime: number
  endTime: number | null
  keystrokes: KeystrokeEvent[]
  textSnapshots: TextSnapshot[]
  pauses: PauseEvent[]
  bursts: BurstEvent[]
}

export interface TextSnapshot {
  timestamp: number
  text: string
  length: number
  wordCount: number
}

export interface PauseEvent {
  startTime: number
  duration: number
  textLengthBefore: number
  textLengthAfter: number
}

export interface BurstEvent {
  startTime: number
  endTime: number
  keystrokeCount: number
  averageInterval: number
  charactersTyped: number
}

export interface TypingMetrics {
  // Speed metrics
  currentWPM: number
  averageWPM: number
  peakWPM: number
  
  // Pattern metrics
  averageKeystrokeInterval: number
  keystrokeVariance: number
  
  // Pause analysis
  totalPauses: number
  averagePauseDuration: number
  longestPause: number
  
  // Burst analysis
  totalBursts: number
  averageBurstLength: number
  
  // Suspicious indicators
  suspiciousPatterns: SuspiciousPattern[]
  copyPasteDetected: boolean
  abnormalSpeedDetected: boolean
  
  // Overall score (0-100, lower = more suspicious)
  authenticityScore: number
}

export interface SuspiciousPattern {
  type: 'instant_text_jump' | 'impossible_speed' | 'no_corrections' | 'uniform_intervals' | 'bulk_paste'
  timestamp: number
  description: string
  severity: 'low' | 'medium' | 'high'
  evidence: Record<string, unknown>
}

// Constants for detection thresholds
const THRESHOLDS = {
  // WPM thresholds
  MIN_REALISTIC_WPM: 10,
  MAX_REALISTIC_WPM: 150, // Professional typists rarely exceed this
  SUSPICIOUS_WPM: 120,
  
  // Pause thresholds (ms)
  MIN_PAUSE_DURATION: 2000, // 2 seconds counts as a pause
  THINKING_PAUSE: 5000, // 5 seconds = thinking pause
  SUSPICIOUS_NO_PAUSE_CHARS: 200, // Typing 200+ chars without pause is suspicious
  
  // Burst thresholds
  BURST_MAX_INTERVAL: 200, // ms between keystrokes in a burst
  MIN_BURST_LENGTH: 5, // minimum keystrokes in a burst
  
  // Copy-paste detection
  INSTANT_TEXT_THRESHOLD: 50, // chars appearing in <100ms
  TEXT_JUMP_THRESHOLD: 20, // characters added without corresponding keystrokes
  
  // Interval analysis
  SUSPICIOUS_INTERVAL_VARIANCE: 0.1, // Too uniform typing is suspicious (bots)
  MIN_KEYSTROKE_INTERVAL: 30, // ms - faster than this is physically impossible
}

export class TypingAnalyzer {
  private session: TypingSession
  private lastKeystrokeTime: number = 0
  private lastTextLength: number = 0
  private lastText: string = ''
  private keystrokesSinceLastPause: number = 0
  private currentBurst: KeystrokeEvent[] = []
  
  constructor() {
    this.session = {
      startTime: Date.now(),
      endTime: null,
      keystrokes: [],
      textSnapshots: [],
      pauses: [],
      bursts: [],
    }
  }
  
  /**
   * Record a keystroke event
   */
  recordKeystroke(key: string): void {
    const now = Date.now()
    const isSpecial = this.isSpecialKey(key)
    
    const event: KeystrokeEvent = {
      timestamp: now,
      key: isSpecial ? key : '*', // Don't store actual characters for privacy
      isSpecial,
    }
    
    this.session.keystrokes.push(event)
    
    // Check for pause
    if (this.lastKeystrokeTime > 0) {
      const interval = now - this.lastKeystrokeTime
      
      if (interval >= THRESHOLDS.MIN_PAUSE_DURATION) {
        // End current burst if exists
        this.finalizeBurst()
        
        // Record pause
        this.session.pauses.push({
          startTime: this.lastKeystrokeTime,
          duration: interval,
          textLengthBefore: this.lastTextLength,
          textLengthAfter: this.lastTextLength, // Will be updated on next text change
        })
        
        this.keystrokesSinceLastPause = 0
      } else if (interval <= THRESHOLDS.BURST_MAX_INTERVAL) {
        // Add to current burst
        this.currentBurst.push(event)
      } else {
        // Gap too long for burst, finalize and start new
        this.finalizeBurst()
        this.currentBurst = [event]
      }
    } else {
      this.currentBurst = [event]
    }
    
    this.keystrokesSinceLastPause++
    this.lastKeystrokeTime = now
  }
  
  /**
   * Record a text change (for detecting copy-paste)
   */
  recordTextChange(newText: string): SuspiciousPattern[] {
    const now = Date.now()
    const patterns: SuspiciousPattern[] = []
    
    const oldLength = this.lastTextLength
    const newLength = newText.length
    const lengthDiff = newLength - oldLength
    
    // Calculate expected keystrokes since last text change
    const recentKeystrokes = this.session.keystrokes.filter(
      k => k.timestamp > (this.session.textSnapshots[this.session.textSnapshots.length - 1]?.timestamp || 0)
    )
    
    // Detect instant text jump (copy-paste)
    if (lengthDiff > THRESHOLDS.TEXT_JUMP_THRESHOLD) {
      const expectedKeystrokes = Math.abs(lengthDiff)
      const actualKeystrokes = recentKeystrokes.filter(k => !k.isSpecial).length
      
      if (actualKeystrokes < expectedKeystrokes * 0.5) {
        // Less than 50% of expected keystrokes = likely paste
        patterns.push({
          type: 'bulk_paste',
          timestamp: now,
          description: `Обнаружена вставка текста: +${lengthDiff} символов без соответствующего набора`,
          severity: lengthDiff > 100 ? 'high' : 'medium',
          evidence: {
            charactersAdded: lengthDiff,
            expectedKeystrokes,
            actualKeystrokes,
          }
        })
      }
    }
    
    // Check for instant text appearance
    const lastSnapshot = this.session.textSnapshots[this.session.textSnapshots.length - 1]
    if (lastSnapshot && lengthDiff > THRESHOLDS.INSTANT_TEXT_THRESHOLD) {
      const timeDiff = now - lastSnapshot.timestamp
      if (timeDiff < 100) {
        patterns.push({
          type: 'instant_text_jump',
          timestamp: now,
          description: `Мгновенное появление ${lengthDiff} символов за ${timeDiff}мс`,
          severity: 'high',
          evidence: {
            charactersAdded: lengthDiff,
            timeElapsed: timeDiff,
          }
        })
      }
    }
    
    // Record snapshot
    this.session.textSnapshots.push({
      timestamp: now,
      text: newText.substring(0, 50) + (newText.length > 50 ? '...' : ''), // Privacy: truncate
      length: newLength,
      wordCount: this.countWords(newText),
    })
    
    this.lastTextLength = newLength
    this.lastText = newText
    
    return patterns
  }
  
  /**
   * Get current typing metrics
   */
  getMetrics(): TypingMetrics {
    this.finalizeBurst() // Ensure current burst is counted
    
    const suspiciousPatterns: SuspiciousPattern[] = []
    
    // Calculate WPM
    const { currentWPM, averageWPM, peakWPM } = this.calculateWPM()
    
    // Check for impossible speed
    if (averageWPM > THRESHOLDS.MAX_REALISTIC_WPM) {
      suspiciousPatterns.push({
        type: 'impossible_speed',
        timestamp: Date.now(),
        description: `Нереалистичная скорость печати: ${averageWPM} WPM`,
        severity: 'high',
        evidence: { wpm: averageWPM, threshold: THRESHOLDS.MAX_REALISTIC_WPM }
      })
    }
    
    // Calculate keystroke intervals
    const intervals = this.calculateKeystrokeIntervals()
    const avgInterval = intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : 0
    const variance = this.calculateVariance(intervals)
    
    // Check for too-uniform typing (bot-like)
    if (intervals.length > 20 && variance < THRESHOLDS.SUSPICIOUS_INTERVAL_VARIANCE * avgInterval) {
      suspiciousPatterns.push({
        type: 'uniform_intervals',
        timestamp: Date.now(),
        description: 'Подозрительно равномерные интервалы между нажатиями (автоматизация?)',
        severity: 'medium',
        evidence: { variance, avgInterval }
      })
    }
    
    // Check for no corrections
    const corrections = this.session.keystrokes.filter(k => 
      k.key === 'Backspace' || k.key === 'Delete'
    ).length
    const totalKeystrokes = this.session.keystrokes.length
    
    if (totalKeystrokes > 100 && corrections < totalKeystrokes * 0.02) {
      suspiciousPatterns.push({
        type: 'no_corrections',
        timestamp: Date.now(),
        description: `Отсутствие исправлений при ${totalKeystrokes} нажатиях`,
        severity: 'low',
        evidence: { corrections, totalKeystrokes, ratio: corrections / totalKeystrokes }
      })
    }
    
    // Pause analysis
    const totalPauses = this.session.pauses.length
    const avgPauseDuration = totalPauses > 0
      ? this.session.pauses.reduce((a, p) => a + p.duration, 0) / totalPauses
      : 0
    const longestPause = totalPauses > 0
      ? Math.max(...this.session.pauses.map(p => p.duration))
      : 0
    
    // Burst analysis
    const totalBursts = this.session.bursts.length
    const avgBurstLength = totalBursts > 0
      ? this.session.bursts.reduce((a, b) => a + b.keystrokeCount, 0) / totalBursts
      : 0
    
    // Copy-paste detection from snapshots
    const copyPasteDetected = suspiciousPatterns.some(
      p => p.type === 'bulk_paste' || p.type === 'instant_text_jump'
    )
    
    // Abnormal speed detection
    const abnormalSpeedDetected = averageWPM > THRESHOLDS.SUSPICIOUS_WPM
    
    // Calculate authenticity score
    const authenticityScore = this.calculateAuthenticityScore(
      suspiciousPatterns,
      averageWPM,
      variance,
      corrections / Math.max(totalKeystrokes, 1)
    )
    
    return {
      currentWPM,
      averageWPM,
      peakWPM,
      averageKeystrokeInterval: avgInterval,
      keystrokeVariance: variance,
      totalPauses,
      averagePauseDuration: avgPauseDuration,
      longestPause,
      totalBursts,
      averageBurstLength: avgBurstLength,
      suspiciousPatterns,
      copyPasteDetected,
      abnormalSpeedDetected,
      authenticityScore,
    }
  }
  
  /**
   * Reset the analyzer for a new question/section
   */
  reset(): void {
    this.session = {
      startTime: Date.now(),
      endTime: null,
      keystrokes: [],
      textSnapshots: [],
      pauses: [],
      bursts: [],
    }
    this.lastKeystrokeTime = 0
    this.lastTextLength = 0
    this.lastText = ''
    this.keystrokesSinceLastPause = 0
    this.currentBurst = []
  }
  
  /**
   * End the session
   */
  endSession(): TypingSession {
    this.session.endTime = Date.now()
    this.finalizeBurst()
    return this.session
  }
  
  // Private helper methods
  
  private isSpecialKey(key: string): boolean {
    const specialKeys = [
      'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Enter', 'Tab', 'Escape', 'Home', 'End', 'PageUp', 'PageDown',
      'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'
    ]
    return specialKeys.includes(key) || key.length > 1
  }
  
  private finalizeBurst(): void {
    if (this.currentBurst.length >= THRESHOLDS.MIN_BURST_LENGTH) {
      const intervals = []
      for (let i = 1; i < this.currentBurst.length; i++) {
        intervals.push(this.currentBurst[i].timestamp - this.currentBurst[i-1].timestamp)
      }
      
      this.session.bursts.push({
        startTime: this.currentBurst[0].timestamp,
        endTime: this.currentBurst[this.currentBurst.length - 1].timestamp,
        keystrokeCount: this.currentBurst.length,
        averageInterval: intervals.length > 0 
          ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
          : 0,
        charactersTyped: this.currentBurst.filter(k => !k.isSpecial).length,
      })
    }
    this.currentBurst = []
  }
  
  private calculateWPM(): { currentWPM: number; averageWPM: number; peakWPM: number } {
    const snapshots = this.session.textSnapshots
    if (snapshots.length < 2) {
      return { currentWPM: 0, averageWPM: 0, peakWPM: 0 }
    }
    
    // Current WPM (last 30 seconds)
    const now = Date.now()
    const recentSnapshots = snapshots.filter(s => s.timestamp > now - 30000)
    let currentWPM = 0
    if (recentSnapshots.length >= 2) {
      const first = recentSnapshots[0]
      const last = recentSnapshots[recentSnapshots.length - 1]
      const wordsDiff = last.wordCount - first.wordCount
      const minutesDiff = (last.timestamp - first.timestamp) / 60000
      currentWPM = minutesDiff > 0 ? Math.round(wordsDiff / minutesDiff) : 0
    }
    
    // Average WPM (entire session)
    const firstSnapshot = snapshots[0]
    const lastSnapshot = snapshots[snapshots.length - 1]
    const totalWords = lastSnapshot.wordCount - firstSnapshot.wordCount
    const totalMinutes = (lastSnapshot.timestamp - firstSnapshot.timestamp) / 60000
    const averageWPM = totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : 0
    
    // Peak WPM (sliding window of 10 seconds)
    let peakWPM = 0
    for (let i = 1; i < snapshots.length; i++) {
      const windowStart = snapshots[i].timestamp - 10000
      const startIdx = snapshots.findIndex(s => s.timestamp >= windowStart)
      if (startIdx >= 0 && startIdx < i) {
        const words = snapshots[i].wordCount - snapshots[startIdx].wordCount
        const minutes = (snapshots[i].timestamp - snapshots[startIdx].timestamp) / 60000
        const wpm = minutes > 0 ? Math.round(words / minutes) : 0
        peakWPM = Math.max(peakWPM, wpm)
      }
    }
    
    return { currentWPM: Math.max(0, currentWPM), averageWPM: Math.max(0, averageWPM), peakWPM }
  }
  
  private calculateKeystrokeIntervals(): number[] {
    const intervals: number[] = []
    const keystrokes = this.session.keystrokes
    
    for (let i = 1; i < keystrokes.length; i++) {
      const interval = keystrokes[i].timestamp - keystrokes[i-1].timestamp
      // Only count intervals within reasonable range
      if (interval >= THRESHOLDS.MIN_KEYSTROKE_INTERVAL && interval < THRESHOLDS.MIN_PAUSE_DURATION) {
        intervals.push(interval)
      }
    }
    
    return intervals
  }
  
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
  }
  
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length
  }
  
  private calculateAuthenticityScore(
    patterns: SuspiciousPattern[],
    avgWPM: number,
    variance: number,
    correctionRatio: number
  ): number {
    let score = 100
    
    // Deduct for suspicious patterns
    for (const pattern of patterns) {
      switch (pattern.severity) {
        case 'high': score -= 25; break
        case 'medium': score -= 15; break
        case 'low': score -= 5; break
      }
    }
    
    // Deduct for unrealistic WPM
    if (avgWPM > THRESHOLDS.MAX_REALISTIC_WPM) {
      score -= 30
    } else if (avgWPM > THRESHOLDS.SUSPICIOUS_WPM) {
      score -= 15
    }
    
    // Bonus for realistic correction ratio (humans make mistakes)
    if (correctionRatio >= 0.02 && correctionRatio <= 0.15) {
      score += 5
    }
    
    // Bonus for natural variance in typing
    if (variance > 50 && variance < 200) {
      score += 5
    }
    
    return Math.max(0, Math.min(100, score))
  }
}

/**
 * Answer timing analyzer for detecting suspiciously fast responses
 */
export interface AnswerTimingResult {
  isSuspicious: boolean
  reason?: string
  expectedMinTime: number
  actualTime: number
}

// Expected minimum reading + thinking time by complexity (in ms)
const COMPLEXITY_TIMES: Record<string, number> = {
  easy: 5000,      // 5 seconds minimum for easy questions
  medium: 10000,   // 10 seconds for medium
  hard: 20000,     // 20 seconds for hard
  complex: 30000,  // 30 seconds for complex
}

export function analyzeAnswerTiming(
  complexity: string,
  answerTimeMs: number,
  questionTextLength: number
): AnswerTimingResult {
  // Estimate reading time (average reading speed ~250 words/min = ~1000 chars/min)
  const readingTimeMs = (questionTextLength / 1000) * 60000
  
  // Get minimum thinking time based on complexity
  const thinkingTimeMs = COMPLEXITY_TIMES[complexity] || COMPLEXITY_TIMES.medium
  
  const expectedMinTime = readingTimeMs + thinkingTimeMs
  
  if (answerTimeMs < expectedMinTime * 0.3) {
    return {
      isSuspicious: true,
      reason: `Слишком быстрый ответ: ${(answerTimeMs / 1000).toFixed(1)}с при ожидаемых минимум ${(expectedMinTime / 1000).toFixed(0)}с`,
      expectedMinTime,
      actualTime: answerTimeMs,
    }
  }
  
  return {
    isSuspicious: false,
    expectedMinTime,
    actualTime: answerTimeMs,
  }
}
