// Client-side PDF text extraction via pdf.js. Only works for text-based
// PDFs (not scanned images) - no OCR/backend involved.

import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// pdf.js text items carry a position transform but no explicit line breaks;
// the transcript parser is line-based, so reconstruct rows by inserting a
// newline whenever an item's y-position drops vs. the previous item.
function itemsToLines(items) {
  let lines = ''
  let lastY = null
  for (const item of items) {
    const y = item.transform?.[5]
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 1) lines += '\n'
    else if (lines.length > 0) lines += ' '
    lines += item.str
    lastY = y
  }
  return lines
}

export async function extractTextFromPdf(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    pageTexts.push(itemsToLines(content.items))
  }
  return pageTexts.join('\n')
}

export async function extractTextFromFile(file) {
  if (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
    return extractTextFromPdf(file)
  }
  return file.text()
}
