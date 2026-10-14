import React, { useState, useEffect } from 'react'
import './HeaderDateTime.css'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function HeaderDateTime({
  className = '',
  style = {},
}) {
  const [now, setNow] = useState(() => new Date())

  // Independent 1-second live tick interval without parent component re-renders
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Format Date: e.g., Mon, Oct 12, 2026
  const day = DAY_NAMES[now.getDay()]
  const month = MONTH_NAMES[now.getMonth()]
  const dateNum = now.getDate()
  const year = now.getFullYear()
  const formattedDate = `${day}, ${month} ${dateNum}, ${year}`

  // Format 12-Hour Time with seconds and AM/PM: e.g., 07:38:36 PM
  let hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // Map 0 to 12
  const formattedHours = String(hours).padStart(2, '0')
  const formattedTime = `${formattedHours}:${minutes}:${seconds} ${ampm}`

  return (
    <div
      className={`header-datetime-display ${className}`}
      style={style}
      title="System Date & Time"
      aria-label={`${formattedDate} ${formattedTime}`}
    >
      <div className="header-datetime-date">{formattedDate}</div>
      <div className="header-datetime-time tabular-nums">{formattedTime}</div>
    </div>
  )
}

export { HeaderDateTime as RealtimeClock }
