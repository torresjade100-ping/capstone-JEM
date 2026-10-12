import React from 'react'

/**
 * High-performance floating tooltip for collapsed icon-only sidebar mode.
 * Rendered with position: fixed at root level to prevent clipping from parent overflow.
 */
export default function SidebarFloatingTooltip({ tooltip }) {
  if (!tooltip || !tooltip.label) return null

  return (
    <div
      className="sidebar-floating-tooltip"
      style={{
        position: 'fixed',
        top: `${tooltip.top}px`,
        left: `${tooltip.left}px`,
        transform: 'translateY(-50%)',
        zIndex: 99999,
        pointerEvents: 'none'
      }}
    >
      <div className="sidebar-tooltip-content">
        {tooltip.label}
      </div>
    </div>
  )
}
