import { createContext, useContext, useState, type ReactNode } from 'react'
import type { ContentLocale } from '../types/database'

const LOCALE_STORAGE_KEY = 'wave-preferred-locale-v1'

interface LocaleContextType {
  locale: ContentLocale
  setLocale: (locale: ContentLocale) => void
  toggleLocale: () => void
  t: (krText: string, enText: string) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<ContentLocale>(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
      if (saved === 'en' || saved === 'ko') return saved
    } catch {
      // ignore
    }
    return 'ko' // default to Korean
  })

  const setLocale = (newLocale: ContentLocale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale)
    } catch {
      // ignore
    }
  }

  const toggleLocale = () => {
    setLocale(locale === 'ko' ? 'en' : 'ko')
  }

  const t = (krText: string, enText: string) => {
    return locale === 'ko' ? krText : enText
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider')
  }
  return context
}

export function LanguageSwitcherButton({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useLocale()

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-sand bg-white/85 p-0.5 text-xs font-semibold shadow-xs ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => setLocale('ko')}
        className={[
          'rounded-lg px-2.5 py-1 transition-all',
          locale === 'ko'
            ? 'bg-sea text-white shadow-xs'
            : 'text-ink-soft hover:text-sea-deep hover:bg-mist/50',
        ].join(' ')}
      >
        한국어
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={[
          'rounded-lg px-2.5 py-1 transition-all',
          locale === 'en'
            ? 'bg-sea text-white shadow-xs'
            : 'text-ink-soft hover:text-sea-deep hover:bg-mist/50',
        ].join(' ')}
      >
        English
      </button>
    </div>
  )
}
