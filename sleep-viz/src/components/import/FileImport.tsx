import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { Card } from '../layout/Card'

interface FileImportProps {
  onFileDrop: (file: File) => void
  disabled?: boolean
}

export function FileImport({ onFileDrop, disabled }: FileImportProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) onFileDrop(file)
  }, [onFileDrop, disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFileDrop(file)
  }, [onFileDrop])

  return (
    <Card className={`transition-all ${isDragging ? 'ring-2 ring-violet-500 bg-violet-500/10' : ''}`}>
      <div
        className="flex flex-col items-center justify-center py-8 cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
      >
        <Upload className={`h-10 w-10 mb-3 ${isDragging ? 'text-violet-400' : 'text-slate-600'}`} />
        <p className="text-sm font-medium text-slate-300 mb-1">
          Drop your Apple Health export here
        </p>
        <p className="text-xs text-slate-500">
          Supports .xml and .zip files
        </p>
        <input
          id="file-input"
          type="file"
          accept=".xml,.zip"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </div>
    </Card>
  )
}
