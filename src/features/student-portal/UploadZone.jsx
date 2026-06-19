import { useCallback, useMemo, useRef, useState } from 'react';

export function UploadZone({
  label,
  hint,
  docType,
  accept = '.pdf',
  multiple = false,
  maxSizeMb = 50,
  files = [],
  onFilesChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [rejected, setRejected] = useState([]); // [{name, reason}]
  const inputRef = useRef(null);

  const maxBytes = maxSizeMb * 1024 * 1024;

  // Parse the accept string once into a list of lowercased extensions used to
  // validate *dropped* files too — the `accept` attribute only governs the
  // native picker, so drops would otherwise bypass it entirely.
  const acceptExts = useMemo(
    () =>
      accept
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    [accept]
  );

  const acceptLabel = useMemo(
    () => acceptExts.map((e) => e.replace('.', '').toUpperCase()).join(', '),
    [acceptExts]
  );

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isTypeAllowed = useCallback(
    (file) => {
      if (acceptExts.length === 0) return true;
      const name = file.name.toLowerCase();
      return acceptExts.some((ext) => name.endsWith(ext));
    },
    [acceptExts]
  );

  const handleFile = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (incoming.length === 0) return;

      const accepted = [];
      const errors = [];
      for (const file of incoming) {
        if (!isTypeAllowed(file)) {
          errors.push({ name: file.name, reason: `unsupported type — needs ${acceptLabel}` });
        } else if (file.size > maxBytes) {
          errors.push({ name: file.name, reason: `too large — max ${maxSizeMb} MB` });
        } else {
          accepted.push(file);
        }
      }

      setRejected(errors);
      if (accepted.length === 0) return;

      if (!multiple) {
        // Single-file zone: keep only the first accepted file (a drop of many
        // must not silently submit several where one is expected).
        onFilesChange([accepted[0]]);
        return;
      }

      // Multiple: append, de-duping on name+size against what's already there.
      const existing = new Set(files.map((f) => `${f.name}|${f.size}`));
      const merged = [...files, ...accepted.filter((f) => !existing.has(`${f.name}|${f.size}`))];
      onFilesChange(merged);
    },
    [files, multiple, onFilesChange, isTypeAllowed, acceptLabel, maxBytes, maxSizeMb]
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

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  return (
    <div>
      {label && <p className="mb-1 text-sm font-medium text-ink">{label}</p>}
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={label || 'Upload file'}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 backdrop-blur-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
          isDragging
            ? 'border-brand-500 bg-brand-500/15'
            : 'border-hairline-strong bg-glass-weak hover:border-brand-300 hover:bg-brand-500/10'
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
          className={`mb-3 transition-colors ${isDragging ? 'text-brand-500' : 'text-muted'}`}
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="12" y2="12" />
          <line x1="15" y1="15" x2="12" y2="12" />
        </svg>
        <p className="text-sm font-medium text-ink">
          <span className="text-brand-600">Drag &amp; drop</span> or click to browse
        </p>
        <p className="mt-2 text-xs text-muted">
          {acceptLabel || 'Any file'} · up to {maxSizeMb} MB
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

      {/* Rejected-file feedback */}
      {rejected.length > 0 && (
        <ul className="mt-2 space-y-1" role="alert">
          {rejected.map((r, i) => (
            <li key={`${r.name}|${i}`} className="flex items-start gap-1.5 text-xs text-danger-700 dark:text-danger-300">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>
                <span className="font-medium">{r.name}</span> — {r.reason}
              </span>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, idx) => (
            <div
              key={`${file.name}|${idx}`}
              className="flex items-center justify-between rounded-lg bg-scrim px-3 py-2 ring-1 ring-hairline"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-brand-600"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-xs text-muted">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:text-danger-400"
                aria-label={`Remove ${file.name}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
