import { useCallback, useEffect, useRef, useState } from 'react'

const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

/** Thin wrapper around the browser's Web Speech API. */
export function useSpeech(lang) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef(null)

  useEffect(() => () => recRef.current?.abort(), [])

  const start = useCallback(({ onResult, onError }) => {
    if (!Recognition) return onError('unsupported')
    recRef.current?.abort()
    const rec = new Recognition()
    rec.lang = lang
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    let finalText = ''
    let failed = false

    rec.onresult = (e) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else live += r[0].transcript
      }
      setInterim((finalText + ' ' + live).trim())
    }
    rec.onerror = (e) => {
      if (e.error === 'aborted') return
      failed = true
      onError(e.error)
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
      recRef.current = null
      if (!failed && finalText.trim()) onResult(finalText.trim())
      else if (!failed) onError('no-speech')
    }

    recRef.current = rec
    setInterim('')
    setListening(true)
    rec.start()
  }, [lang])

  const stop = useCallback(() => recRef.current?.stop(), [])
  const cancel = useCallback(() => {
    if (!recRef.current) return
    recRef.current.onend = null
    recRef.current.abort()
    recRef.current = null
    setListening(false)
    setInterim('')
  }, [])

  return { supported: !!Recognition, listening, interim, start, stop, cancel }
}
