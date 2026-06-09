"use client"

import { useCallback, useRef, useState, useEffect } from 'react'

export interface CameraState {
  isEnabled: boolean
  stream: MediaStream | null
  error: string | null
  lastSnapshot: string | null
  snapshotCount: number
}

export interface MicrophoneState {
  isEnabled: boolean
  stream: MediaStream | null
  error: string | null
  volumeLevel: number
  isSpeechDetected: boolean
}

export interface MediaPermissions {
  camera: 'granted' | 'denied' | 'prompt'
  microphone: 'granted' | 'denied' | 'prompt'
}

interface UseProctoringMediaOptions {
  onViolationSnapshot?: (imageData: string, reason: string) => void
  onSpeechDetected?: () => void
  onFaceNotDetected?: () => void
  snapshotQuality?: number
}

export function useProctoringMedia(options: UseProctoringMediaOptions = {}) {
  const {
    onViolationSnapshot,
    onSpeechDetected,
    snapshotQuality = 0.8
  } = options

  const [cameraState, setCameraState] = useState<CameraState>({
    isEnabled: false,
    stream: null,
    error: null,
    lastSnapshot: null,
    snapshotCount: 0
  })

  const [micState, setMicState] = useState<MicrophoneState>({
    isEnabled: false,
    stream: null,
    error: null,
    volumeLevel: 0,
    isSpeechDetected: false
  })

  const [permissions, setPermissions] = useState<MediaPermissions>({
    camera: 'prompt',
    microphone: 'prompt'
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check permissions on mount
  useEffect(() => {
    checkPermissions()
    return () => {
      cleanup()
    }
  }, [])

  const checkPermissions = async () => {
    try {
      if ('permissions' in navigator) {
        const [cameraPermission, micPermission] = await Promise.all([
          navigator.permissions.query({ name: 'camera' as PermissionName }),
          navigator.permissions.query({ name: 'microphone' as PermissionName })
        ])
        setPermissions({
          camera: cameraPermission.state,
          microphone: micPermission.state
        })
      }
    } catch {
      // Permissions API not supported
    }
  }

  const cleanup = useCallback(() => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop())
    }
    if (micState.stream) {
      micState.stream.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current)
    }
  }, [cameraState.stream, micState.stream])

  // === Camera Functions ===

  const enableCamera = useCallback(async (): Promise<boolean> => {
    // getUserMedia requires a secure context (https/localhost) and camera
    // permission via Permissions Policy. In a sandboxed iframe without
    // allow="camera", navigator.mediaDevices is undefined.
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraState(prev => ({
        ...prev,
        isEnabled: false,
        stream: null,
        error: 'Камера недоступна. Откройте тест в отдельной вкладке браузера по защищённому адресу (https).'
      }))
      setPermissions(prev => ({ ...prev, camera: 'denied' }))
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })

      setCameraState(prev => ({
        ...prev,
        isEnabled: true,
        stream,
        error: null
      }))

      setPermissions(prev => ({ ...prev, camera: 'granted' }))

      // Hidden video element used as the snapshot source. We position it
      // offscreen instead of display:none — some browsers won't decode frames
      // for a fully hidden <video>, which produced blank snapshots.
      if (!videoRef.current) {
        const video = document.createElement('video')
        video.autoplay = true
        video.playsInline = true
        video.muted = true
        video.setAttribute('aria-hidden', 'true')
        video.style.position = 'fixed'
        video.style.width = '1px'
        video.style.height = '1px'
        video.style.opacity = '0'
        video.style.pointerEvents = 'none'
        video.style.left = '-9999px'
        document.body.appendChild(video)
        videoRef.current = video
      }
      videoRef.current.srcObject = stream
      // Ensure the stream actually starts decoding frames.
      try {
        await videoRef.current.play()
      } catch {
        // Autoplay may reject silently; frames will still decode once visible.
      }

      // Create canvas for snapshots
      if (!canvasRef.current) {
        const canvas = document.createElement('canvas')
        canvas.width = 640
        canvas.height = 480
        canvas.style.display = 'none'
        document.body.appendChild(canvas)
        canvasRef.current = canvas
      }

      return true
    } catch (err) {
      const name = (err as DOMException)?.name
      let errorMessage = 'Не удалось получить доступ к камере.'
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        errorMessage = 'Доступ к камере заблокирован. Разрешите камеру в настройках браузера.'
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        errorMessage = 'Камера не найдена. Подключите веб-камеру и повторите.'
      } else if (name === 'NotReadableError') {
        errorMessage = 'Камера занята другим приложением. Закройте Zoom/Teams и повторите.'
      }
      setCameraState(prev => ({
        ...prev,
        isEnabled: false,
        stream: null,
        error: errorMessage
      }))
      setPermissions(prev => ({ ...prev, camera: 'denied' }))
      return false
    }
  }, [])

  const disableCamera = useCallback(() => {
    if (cameraState.stream) {
      cameraState.stream.getTracks().forEach(track => track.stop())
    }
    setCameraState(prev => ({
      ...prev,
      isEnabled: false,
      stream: null
    }))
  }, [cameraState.stream])

  const takeSnapshot = useCallback((reason?: string): string | null => {
    if (!videoRef.current || !canvasRef.current || !cameraState.isEnabled) {
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Add timestamp overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30)
    ctx.fillStyle = 'white'
    ctx.font = '14px monospace'
    ctx.fillText(
      `${new Date().toLocaleString('ru-RU')} | ${reason || 'Manual snapshot'}`,
      10,
      canvas.height - 10
    )

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', snapshotQuality)

    setCameraState(prev => ({
      ...prev,
      lastSnapshot: imageData,
      snapshotCount: prev.snapshotCount + 1
    }))

    // Callback for violation
    if (onViolationSnapshot && reason) {
      onViolationSnapshot(imageData, reason)
    }

    return imageData
  }, [cameraState.isEnabled, snapshotQuality, onViolationSnapshot])

  const takeViolationSnapshot = useCallback((reason: string) => {
    return takeSnapshot(reason)
  }, [takeSnapshot])

  // === Microphone Functions ===

  const enableMicrophone = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicState(prev => ({
        ...prev,
        isEnabled: false,
        stream: null,
        error: 'Микрофон недоступен. Откройте тест в отдельной вкладке браузера по защищённому адресу (https).'
      }))
      setPermissions(prev => ({ ...prev, microphone: 'denied' }))
      return false
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      setMicState(prev => ({
        ...prev,
        isEnabled: true,
        stream,
        error: null
      }))

      setPermissions(prev => ({ ...prev, microphone: 'granted' }))

      // Set up audio analysis
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256

      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      // Monitor volume level
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      
      volumeIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        const normalizedVolume = Math.min(100, average * 2)

        setMicState(prev => ({
          ...prev,
          volumeLevel: normalizedVolume
        }))

        // Speech detection (volume above threshold)
        if (normalizedVolume > 30) {
          setMicState(prev => ({ ...prev, isSpeechDetected: true }))
          
          // Reset speech detection after 2 seconds of silence
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current)
          }
          speechTimeoutRef.current = setTimeout(() => {
            setMicState(prev => ({ ...prev, isSpeechDetected: false }))
          }, 2000)

          // Callback
          if (onSpeechDetected) {
            onSpeechDetected()
          }
        }
      }, 100)

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Не удалось получить доступ к микрофону'
      setMicState(prev => ({
        ...prev,
        isEnabled: false,
        stream: null,
        error: errorMessage
      }))
      setPermissions(prev => ({ ...prev, microphone: 'denied' }))
      return false
    }
  }, [onSpeechDetected])

  const disableMicrophone = useCallback(() => {
    if (micState.stream) {
      micState.stream.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current)
      volumeIntervalRef.current = null
    }
    setMicState(prev => ({
      ...prev,
      isEnabled: false,
      stream: null,
      volumeLevel: 0,
      isSpeechDetected: false
    }))
  }, [micState.stream])

  // Get video element ref for preview
  const getVideoElement = useCallback(() => videoRef.current, [])

  return {
    // Camera
    cameraState,
    enableCamera,
    disableCamera,
    takeSnapshot,
    takeViolationSnapshot,
    getVideoElement,

    // Microphone
    micState,
    enableMicrophone,
    disableMicrophone,

    // Permissions
    permissions,
    checkPermissions,

    // Cleanup
    cleanup
  }
}

// Simple face presence detection using canvas analysis
export function detectFacePresence(imageData: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(false)
        return
      }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Get image data for analysis
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const pixels = data.data

      // Simple skin tone detection (not ML-based, just heuristic)
      let skinPixels = 0
      const totalPixels = pixels.length / 4

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]

        // Basic skin tone heuristic (works for various skin tones)
        const isSkinTone = 
          r > 60 && g > 40 && b > 20 &&
          r > g && r > b &&
          Math.abs(r - g) > 15 &&
          r - b > 15

        if (isSkinTone) {
          skinPixels++
        }
      }

      // If more than 5% of pixels look like skin, assume face is present
      const skinPercentage = (skinPixels / totalPixels) * 100
      resolve(skinPercentage > 5)
    }
    img.onerror = () => resolve(false)
    img.src = imageData
  })
}
