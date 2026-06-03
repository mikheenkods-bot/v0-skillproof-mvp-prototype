"use client"

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, Mic, MicOff, Volume2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CameraPreviewProps {
  stream: MediaStream | null
  isEnabled: boolean
  isMicEnabled?: boolean
  volumeLevel?: number
  isSpeechDetected?: boolean
  lastSnapshotReason?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  showMicIndicator?: boolean
  className?: string
}

export function CameraPreview({
  stream,
  isEnabled,
  isMicEnabled = false,
  volumeLevel = 0,
  isSpeechDetected = false,
  lastSnapshotReason,
  position = 'bottom-right',
  showMicIndicator = true,
  className
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showSnapshotAlert, setShowSnapshotAlert] = useState(false)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    if (lastSnapshotReason) {
      setShowSnapshotAlert(true)
      const timer = setTimeout(() => setShowSnapshotAlert(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [lastSnapshotReason])

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  return (
    <div
      className={cn(
        "fixed z-40",
        positionClasses[position],
        className
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative"
      >
        {/* Camera Preview */}
        <div className={cn(
          "w-32 h-24 rounded-lg overflow-hidden border-2 shadow-lg",
          isEnabled ? "border-green-500/50 bg-black" : "border-muted bg-muted"
        )}>
          {isEnabled && stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CameraOff className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="absolute -top-2 -right-2 flex gap-1">
          {/* Camera Status */}
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border-2 border-background",
            isEnabled ? "bg-green-500" : "bg-muted"
          )}>
            {isEnabled ? (
              <Camera className="h-3 w-3 text-white" />
            ) : (
              <CameraOff className="h-3 w-3 text-muted-foreground" />
            )}
          </div>

          {/* Mic Status */}
          {showMicIndicator && (
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 border-background",
              isMicEnabled ? "bg-green-500" : "bg-muted"
            )}>
              {isMicEnabled ? (
                <Mic className="h-3 w-3 text-white" />
              ) : (
                <MicOff className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Volume Level Indicator */}
        {isMicEnabled && volumeLevel > 0 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-border text-xs">
            <Volume2 className={cn(
              "h-3 w-3",
              isSpeechDetected ? "text-orange-500" : "text-muted-foreground"
            )} />
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  volumeLevel > 60 ? "bg-orange-500" :
                  volumeLevel > 30 ? "bg-yellow-500" : "bg-green-500"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${volumeLevel}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>
        )}

        {/* Snapshot Alert */}
        <AnimatePresence>
          {showSnapshotAlert && lastSnapshotReason && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs flex items-center gap-1.5"
            >
              <AlertTriangle className="h-3 w-3" />
              Фото: {lastSnapshotReason}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recording Indicator */}
        {isEnabled && (
          <div className="absolute top-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            REC
          </div>
        )}
      </motion.div>
    </div>
  )
}

// Fullscreen camera snapshot flash effect
export function SnapshotFlash({ trigger }: { trigger: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (trigger > 0) {
      setShow(true)
      const timer = setTimeout(() => setShow(false), 150)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-white pointer-events-none"
        />
      )}
    </AnimatePresence>
  )
}
