import { useState } from 'react'
import { useTimeline } from '@/context/TimelineContext'

const PRESET_OPTIONS = [
  { value: 'this-week', label: 'This week' },
  { value: 'last-week', label: 'Last week' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-year', label: 'Last year' },
] as const

function msToDateString(ms: number): string {
  const d = new Date(ms)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateStringToStartMs(s: string): number {
  const d = new Date(s + 'T00:00:00')
  return d.getTime()
}

function dateStringToEndMs(s: string): number {
  const d = new Date(s + 'T23:59:59.999')
  return d.getTime()
}

function getMonday(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1)
  copy.setDate(diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function getPresetRange(
  preset: string,
  bounds: { min: number; max: number }
): { start: number; end: number } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  let start: Date
  let end: Date

  if (preset === 'this-week') {
    const mon = getMonday(now)
    start = mon
    end = new Date(mon)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  } else if (preset === 'last-week') {
    const mon = getMonday(now)
    mon.setDate(mon.getDate() - 7)
    start = mon
    end = new Date(mon)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
  } else if (preset === 'this-month') {
    start = new Date(year, month, 1, 0, 0, 0, 0)
    end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  } else if (preset === 'last-month') {
    start = new Date(year, month - 1, 1, 0, 0, 0, 0)
    end = new Date(year, month, 0, 23, 59, 59, 999)
  } else if (preset === 'this-year') {
    start = new Date(year, 0, 1, 0, 0, 0, 0)
    end = new Date(year, 11, 31, 23, 59, 59, 999)
  } else if (preset === 'last-year') {
    start = new Date(year - 1, 0, 1, 0, 0, 0, 0)
    end = new Date(year - 1, 11, 31, 23, 59, 59, 999)
  } else if (/^\d{4}$/.test(preset)) {
    const y = parseInt(preset, 10)
    start = new Date(y, 0, 1, 0, 0, 0, 0)
    end = new Date(y, 11, 31, 23, 59, 59, 999)
  } else {
    return { start: bounds.min, end: bounds.max }
  }

  return {
    start: Math.max(bounds.min, start.getTime()),
    end: Math.min(bounds.max, end.getTime()),
  }
}

export function TimelineSlider() {
  const { timeRange, timeRangeBounds, setTimeRange } = useTimeline()
  const [presetValue, setPresetValue] = useState<string>('')

  if (!timeRangeBounds || !timeRange) return null

  const { min, max } = timeRangeBounds
  const fromDate = msToDateString(timeRange.start)
  const toDate = msToDateString(timeRange.end)

  const minYear = new Date(min).getFullYear()
  const maxYear = new Date(max).getFullYear()
  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => maxYear - i
  )

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setPresetValue(value)
    if (!value) return
    const range = getPresetRange(value, { min, max })
    setTimeRange(range)
  }

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!value) return
    setPresetValue('')
    const start = Math.max(min, dateStringToStartMs(value))
    const end = Math.max(start, Math.min(max, timeRange.end))
    setTimeRange({ start, end })
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (!value) return
    setPresetValue('')
    const end = Math.min(max, dateStringToEndMs(value))
    const start = Math.min(end, Math.max(min, timeRange.start))
    setTimeRange({ start, end })
  }

  const minDate = msToDateString(min)
  const maxDate = msToDateString(max)

  const handleReset = () => {
    setPresetValue('')
    setTimeRange({ start: min, end: max })
  }

  return (
    <div className="timeline-slider">
      <div className="timeline-slider-row">
        <label className="timeline-slider-label">
          <span>Quick range</span>
          <select
            value={presetValue}
            onChange={handlePresetChange}
            className="timeline-slider-select"
            aria-label="Quick range"
          >
            <option value="">—</option>
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="timeline-slider-row">
        <label className="timeline-slider-label">
          <span>From date</span>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={fromDate}
            onChange={handleFromChange}
            className="timeline-slider-date"
            aria-label="From date"
          />
        </label>
      </div>
      <div className="timeline-slider-row">
        <label className="timeline-slider-label">
          <span>To date</span>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={toDate}
            onChange={handleToChange}
            className="timeline-slider-date"
            aria-label="To date"
          />
        </label>
      </div>
      <div className="timeline-slider-row">
        <button
          type="button"
          onClick={handleReset}
          className="timeline-slider-reset"
          aria-label="Reset timeline"
        >
          Reset (show all)
        </button>
      </div>
    </div>
  )
}
