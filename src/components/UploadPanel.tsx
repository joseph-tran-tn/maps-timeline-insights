import { useCallback, useRef } from 'react'
import { useTimeline } from '@/context/TimelineContext'
import { loadRecordsFromFile } from '@/lib/uploadTakeout'

export function UploadPanel() {
  const { addDataset } = useTimeline()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      const { points, error } = await loadRecordsFromFile(file)
      if (error || points.length === 0) {
        alert(error ?? 'Could not load file')
        return
      }
      const name = file.name.replace(/\.json$/i, '') || 'Timeline'
      addDataset(name, points)
    },
    [addDataset]
  )

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])

  return (
    <div
      className="upload-panel"
      onDrop={onDrop}
      onDragOver={onDragOver}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json"
        onChange={onInputChange}
        className="sr-only"
        aria-hidden
      />
      <span className="upload-label">Upload Timeline.json</span>
      <span className="upload-hint">Exported from Google Maps Timeline app</span>
    </div>
  )
}
