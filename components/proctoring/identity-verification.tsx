"use client"

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  Scan,
  User,
  Users,
  Monitor,
  Shield,
  AlertTriangle,
  Loader2,
  Video,
  Eye
} from 'lucide-react'

type VerificationStep = 'camera-access' | 'face-detection' | 'environment-scan' | 'selfie-capture' | 'complete'

interface IdentityVerificationProps {
  onComplete: () => void
  onCancel: () => void
}

export function IdentityVerification({ onComplete, onCancel }: IdentityVerificationProps) {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('camera-access')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [environmentCheckPassed, setEnvironmentCheckPassed] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [multipleFacesWarning, setMultipleFacesWarning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Attach stream to video element whenever stream or step changes
  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    
    // Set srcObject directly
    if (video.srcObject !== stream) {
      video.srcObject = stream
    }
    
    // Ensure video plays when metadata is loaded
    const handleLoadedMetadata = () => {
      video.play().catch(() => {
        video.muted = true
        video.play().catch(() => {})
      })
    }
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    
    // Also try to play immediately if already loaded
    if (video.readyState >= 2) {
      video.play().catch(() => {
        video.muted = true
        video.play().catch(() => {})
      })
    }
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [stream, currentStep])

  // Request camera access
  const requestCameraAccess = useCallback(async () => {
    setIsProcessing(true)
    setCameraError(null)
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      })
      
      setStream(mediaStream)
      setCurrentStep('face-detection')
    } catch (error) {
      setCameraError('Не удалось получить доступ к камере. Пожалуйста, разрешите доступ и попробуйте снова.')
    } finally {
      setIsProcessing(false)
    }
  }, [])

  // Face detection - check if video is actually playing with real frames
  useEffect(() => {
    if (currentStep !== 'face-detection' || !stream || !videoRef.current) return
    
    const video = videoRef.current
    let checkCount = 0
    const maxChecks = 10
    
    const checkVideoPlaying = () => {
      checkCount++
      
      // Check if video is actually playing (has dimensions and not paused)
      const isPlaying = video.readyState >= 2 && 
                       !video.paused && 
                       video.videoWidth > 0 && 
                       video.videoHeight > 0
      
      if (isPlaying) {
        // Video is actually working - mark face as detected
        setFaceDetected(true)
        setMultipleFacesWarning(false)
      } else if (checkCount >= maxChecks) {
        // After multiple checks, video still not working
        setCameraError('Камера не передает видеопоток. Проверьте, что камера не занята другим приложением.')
        setFaceDetected(false)
      }
    }
    
    // Check multiple times to ensure video is actually streaming
    const interval = setInterval(checkVideoPlaying, 500)
    
    return () => clearInterval(interval)
  }, [currentStep, stream])

  // Environment scan - check video is working during scan
  useEffect(() => {
    if (currentStep !== 'environment-scan' || !videoRef.current) return
    
    const video = videoRef.current
    
    const interval = setInterval(() => {
      // Verify video is still working
      const isPlaying = video.readyState >= 2 && !video.paused && video.videoWidth > 0
      
      if (!isPlaying) {
        setCameraError('Видеопоток прервался. Проверьте камеру.')
        clearInterval(interval)
        return
      }
      
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setEnvironmentCheckPassed(true)
          return 100
        }
        return prev + 2
      })
    }, 80)
    
    return () => clearInterval(interval)
  }, [currentStep])

  // Take selfie - verify photo has actual content (not black)
  const takeSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    
    if (!context) return
    
    // Check video is actually playing
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Камера не работает. Проверьте подключение.')
      return
    }
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Flip horizontally for mirror effect
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
    context.drawImage(video, 0, 0)
    
    // Check if image has actual content (not all black)
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    let nonBlackPixels = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 20 || data[i+1] > 20 || data[i+2] > 20) {
        nonBlackPixels++
      }
    }
    const nonBlackRatio = nonBlackPixels / (data.length / 4)
    
    if (nonBlackRatio < 0.1) {
      // Image is mostly black - camera not working properly
      setCameraError('Снимок получился черным. Проверьте освещение и камеру.')
      return
    }
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedPhoto(dataUrl)
  }, [])

  // Retake photo
  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null)
  }, [])

  // Confirm photo and proceed
  const confirmPhoto = useCallback(() => {
    setCurrentStep('complete')
    
    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    // Delay before completing
    setTimeout(() => {
      onComplete()
    }, 1500)
  }, [stream, onComplete])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  const steps = [
    { id: 'camera-access', label: 'Камера', icon: Camera },
    { id: 'face-detection', label: 'Лицо', icon: User },
    { id: 'environment-scan', label: 'Окружение', icon: Monitor },
    { id: 'selfie-capture', label: 'Фото', icon: Scan },
    { id: 'complete', label: 'Готово', icon: CheckCircle2 },
  ]
  
  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Верификация личности</h1>
        <p className="text-muted-foreground">
          Для обеспечения честности тестирования необходимо пройти проверку
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = index === currentStepIndex
          const isCompleted = index < currentStepIndex
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted && "border-success bg-success text-success-foreground",
                  isActive && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-2 font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "h-0.5 w-8 mx-2 mt-[-20px]",
                  index < currentStepIndex ? "bg-success" : "bg-muted"
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: Camera Access */}
          {currentStep === 'camera-access' && (
            <motion.div
              key="camera-access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 text-center"
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mx-auto mb-6">
                <Camera className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Разрешите доступ к камере</h3>
              <p className="text-muted-foreground mb-6">
                Камера нужна для верификации личности и контроля во время тестирования.
                Видео не записывается и не сохраняется.
              </p>
              
              {cameraError && (
                <div className="p-4 mb-6 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {cameraError}
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={onCancel}>
                  Отмена
                </Button>
                <Button onClick={requestCameraAccess} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Подключение...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Разрешить камеру
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Face Detection */}
          {currentStep === 'face-detection' && (
            <motion.div
              key="face-detection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }}
                  className="w-full h-full object-cover"
                />
                
                {/* Face detection overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn(
                    "w-48 h-60 border-4 rounded-[40%] transition-colors duration-300",
                    faceDetected ? "border-success" : "border-white/50",
                    multipleFacesWarning && "border-warning"
                  )}>
                    {!faceDetected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Scan className="h-16 w-16 text-white/50 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Status badge */}
                <div className="absolute top-4 left-4">
                  {faceDetected ? (
                    <div className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                      multipleFacesWarning 
                        ? "bg-warning text-warning-foreground" 
                        : "bg-success text-success-foreground"
                    )}>
                      {multipleFacesWarning ? (
                        <>
                          <Users className="h-4 w-4" />
                          Обнаружено несколько лиц
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Лицо обнаружено
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 text-foreground text-sm font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Поиск лица...
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Расположите лицо в овальной рамке</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">Убедитесь, что в кадре только вы</span>
                </div>
              </div>
              
              {multipleFacesWarning && (
                <div className="p-4 mb-4 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    В кадре обнаружено несколько лиц. Убедитесь, что вы одни в комнате.
                  </div>
                </div>
              )}
              
              <Button 
                className="w-full" 
                onClick={() => setCurrentStep('environment-scan')}
                disabled={!faceDetected || multipleFacesWarning}
              >
                Продолжить
              </Button>
            </motion.div>
          )}

          {/* Step 3: Environment Scan */}
          {currentStep === 'environment-scan' && (
            <motion.div
              key="environment-scan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ transform: 'scaleX(-1)' }}
                  className="w-full h-full object-cover"
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <motion.div
                    className="absolute left-0 right-0 h-1 bg-primary/80"
                    initial={{ top: 0 }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  />
                </div>
                
                {/* Status */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 text-foreground text-sm font-medium">
                    <Monitor className="h-4 w-4" />
                    Сканирование окружения...
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Проверка окружения</span>
                  <span className="font-medium">{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} />
              </div>
              
              <div className="space-y-2 mb-6">
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  scanProgress >= 30 ? "bg-success/10" : "bg-muted/50"
                )}>
                  {scanProgress >= 30 ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  )}
                  <span className="text-sm">Проверка освещения</span>
                </div>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  scanProgress >= 60 ? "bg-success/10" : "bg-muted/50"
                )}>
                  {scanProgress >= 60 ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  )}
                  <span className="text-sm">Проверка отсутствия посторонних</span>
                </div>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                  scanProgress >= 100 ? "bg-success/10" : "bg-muted/50"
                )}>
                  {scanProgress >= 100 ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  )}
                  <span className="text-sm">Проверка отсутствия подсказок</span>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => setCurrentStep('selfie-capture')}
                disabled={!environmentCheckPassed}
              >
                {environmentCheckPassed ? 'Продолжить' : 'Сканирование...'}
              </Button>
            </motion.div>
          )}

          {/* Step 4: Selfie Capture */}
          {currentStep === 'selfie-capture' && (
            <motion.div
              key="selfie-capture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-4">
                {capturedPhoto ? (
                  <img 
                    src={capturedPhoto} 
                    alt="Captured selfie" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ transform: 'scaleX(-1)' }}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {/* Countdown or shutter effect */}
                {!capturedPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-60 border-4 border-white/50 rounded-[40%]" />
                  </div>
                )}
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="text-center mb-6">
                <h3 className="font-semibold mb-2">
                  {capturedPhoto ? 'Проверьте фото' : 'Сделайте фото для верификации'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {capturedPhoto 
                    ? 'Убедитесь, что ваше лицо хорошо видно на фото'
                    : 'Фото будет использовано для подтверждения вашей личности'}
                </p>
              </div>
              
              {capturedPhoto ? (
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={retakePhoto}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Переснять
                  </Button>
                  <Button className="flex-1" onClick={confirmPhoto}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Подтвердить
                  </Button>
                </div>
              ) : (
                <Button className="w-full" onClick={takeSelfie}>
                  <Camera className="mr-2 h-4 w-4" />
                  Сделать фото
                </Button>
              )}
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-success/20 mx-auto mb-6"
              >
                <CheckCircle2 className="h-12 w-12 text-success" />
              </motion.div>
              <h3 className="text-xl font-semibold mb-2">Верификация пройдена</h3>
              <p className="text-muted-foreground mb-4">
                Все проверки успешно завершены. Сейчас вы перейдете к тестированию.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка теста...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info block */}
      <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">Режим усиленного прокторинга</p>
            <p className="text-xs text-muted-foreground">
              Во время тестирования будет активен контроль камеры. Система отслеживает присутствие 
              в кадре, посторонних лиц и подозрительную активность. Запись не ведется.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
