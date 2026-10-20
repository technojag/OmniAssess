export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'oa-theme'

export function getPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' || v === 'system' ? v : 'light'
  } catch {
    return 'light'
  }
}

export function applyPref(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* private mode: the choice just will not be remembered */
  }
}