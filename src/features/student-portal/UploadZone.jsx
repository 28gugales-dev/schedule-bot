import { useCallback, useRef, useState } from 'react';

export function UploadZone({ label, hint, docType, accept = '.pdf', multiple = false, files = [], onFilesChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const dedupeFiles = (newFiles, existingFiles) => {
    if (!multiple) return newFiles;
    const existing = new Set(existingFiles.map(f => `${f.name}|${f.size}`));
    return [
      ...existingFiles,
      ...newFiles.filter(f => !existing.has(`${f.name}|${f.size}`))
    ];
  };

  const handleFile = useCallback(
    (fileList) => {
      const nextFiles = Array.from(fileList || []);
      if (nextFiles.length === 0) return;

      const merged = dedupeFiles(nextFiles, files);
      onFilesChange(merged);
    },
    [files, multiple, onFilesChange]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFile(e.dataTransfer.files);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e) => {
      handleFile(e.target.files);
      e.target.value = '';
    },
    [handleFile]
  );

  const handleRemove = useCallback(
    (index) => {
      const next = files.filter((_, i) => i !== index);
      onFilesChange(next);
    },
    [files, onFilesChange]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    []
  );

  return (
    <div>
      {label && <p className="text-sm font-medium text-ink mb-1">{label}</p>}
      {hint && <p className="text-xs text-muted mb-3">{hint}</p>}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={label || 'Upload file'}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-150 ${
          isDragging
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-300 bg-white hover:border-brand-300'
        }`}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-3 text-muted"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="12" y2="12" />
          <line x1="15" y1="15" x2="12" y2="12" />
        </svg>
        <p className="text-sm font-medium text-ink">Drag & drop here</p>
        <p className="text-xs text-muted mt-1">or click to browse</p>
        <p className="text-xs text-muted mt-2">
          {accept === '.pdf' ? 'PDF' : accept.replace(/\./g, '').toUpperCase()}, up to 50 MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          aria-label={label || 'Choose file'}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, idx) => (
            <div
              key={`${file.name}|${idx}`}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{file.name}</p>
                <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="ml-2 flex-shrink-0 text-muted hover:text-ink transition-colors"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
