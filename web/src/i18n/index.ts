import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import hi from './hi.json'

export type Lang = 'en' | 'hi'

const KEY = 'oa-lang'

function saved(): Lang {
  try {
    return localStorage.getItem(KEY) === 'hi' ? 'hi' : 'en'
  } catch {
    return 'en'
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: saved(),
  fallbackLng: 'en', // anything not translated yet shows in English, never empty
  interpolation: { escapeValue: false },
})
document.documentElement.lang = i18n.language

export function setLanguage(lang: Lang) {
  i18n.changeLanguage(lang)
  document.documentElement.lang = lang
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    /* private mode: the choice will not be remembered */
  }
}

export default i18n