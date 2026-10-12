import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'jem_sidebar_collapsed'
const EVENT_NAME = 'jem-sidebar-collapse-change'

/**
 * Shared hook to manage collapsible sidebar state across Admin and Staff views.
 * Persists state in localStorage and synchronizes in real time.
 */
export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [activeTooltip, setActiveTooltip] = useState(null)

  // Listen for storage events (e.g., role view switch or other tabs/components)
  useEffect(() => {
    const handleSync = () => {
      try {
        const val = localStorage.getItem(STORAGE_KEY) === 'true'
        setIsCollapsed((prev) => (prev !== val ? val : prev))
      } catch {}
    }

    window.addEventListener('storage', handleSync)
    window.addEventListener(EVENT_NAME, handleSync)
    return () => {
      window.removeEventListener('storage', handleSync)
      window.removeEventListener(EVENT_NAME, handleSync)
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setActiveTooltip(null)
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {}
      // Broadcast asynchronously to prevent re-entrant setState collisions in React
      setTimeout(() => {
        window.dispatchEvent(new Event(EVENT_NAME))
      }, 10)
      return next
    })
  }, [])

  const setCollapsed = useCallback((val) => {
    setActiveTooltip(null)
    const next = Boolean(val)
    setIsCollapsed(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {}
    setTimeout(() => {
      window.dispatchEvent(new Event(EVENT_NAME))
    }, 10)
  }, [])

  const handleMouseEnter = useCallback((label, e) => {
    if (!isCollapsed || !label) return
    const rect = e.currentTarget.getBoundingClientRect()
    setActiveTooltip({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right + 10
    })
  }, [isCollapsed])

  const handleMouseLeave = useCallback(() => {
    setActiveTooltip(null)
  }, [])

  const getTooltipProps = useCallback((label) => {
    return {
      'data-tooltip': label,
      onMouseEnter: (e) => handleMouseEnter(label, e),
      onMouseLeave: handleMouseLeave
    }
  }, [handleMouseEnter, handleMouseLeave])

  return {
    isCollapsed,
    toggleSidebar,
    setCollapsed,
    activeTooltip,
    getTooltipProps,
    handleMouseEnter,
    handleMouseLeave
  }
}

export default useSidebarCollapse
