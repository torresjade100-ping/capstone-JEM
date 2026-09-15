import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle({
  className = '',
  size = 18,
  showLabel = false,
  variant = 'icon', // 'icon' | 'pill' | 'button'
  style = {},
}) {
  const { theme, isDark, toggleTheme } = useTheme()

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`theme-toggle-pill ${isDark ? 'dark' : 'light'} ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '6px 12px',
          borderRadius: '9999px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          ...style,
        }}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      >
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: isDark ? '#2C3442' : '#fef3c7',
            color: isDark ? '#fbbf24' : '#d97706',
          }}
        >
          {isDark ? <Moon size={13} /> : <Sun size={13} />}
        </span>
        <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${isDark ? 'dark' : 'light'} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: '9px',
        border: isDark ? '1px solid var(--border-color)' : '1px solid #fed7aa',
        background: 'var(--bg-surface)',
        color: isDark ? '#f97316' : '#64748b',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
        ...style,
      }}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
    >
      {isDark ? (
        <Sun size={size} color="#f97316" />
      ) : (
        <Moon size={size} color="#64748b" />
      )}
      {showLabel && (
        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  )
}
