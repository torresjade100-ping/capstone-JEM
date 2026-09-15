import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('jem_theme_user_set')
      if (saved === 'dark' || saved === 'light') {
        return saved
      }
    } catch (e) {}
    return 'dark'
  })

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme)
      if (theme === 'dark') {
        document.documentElement.classList.add('dark-theme')
        document.body.classList.add('dark-theme')
      } else {
        document.documentElement.classList.remove('dark-theme')
        document.body.classList.remove('dark-theme')
      }
      localStorage.setItem('jem_theme', theme)
    } catch (e) {}
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('jem_theme_user_set', next)
      } catch (e) {}
      // Enable a brief smooth transition class on document
      if (typeof document !== 'undefined') {
        document.documentElement.classList.add('theme-transition')
        window.clearTimeout(window.__themeTransitionTimeout)
        window.__themeTransitionTimeout = window.setTimeout(() => {
          document.documentElement.classList.remove('theme-transition')
        }, 280)
      }
      return next
    })
  }

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      try {
        localStorage.setItem('jem_theme_user_set', newTheme)
      } catch (e) {}
      setThemeState(newTheme)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    return {
      theme: 'light',
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    }
  }
  return context
}
