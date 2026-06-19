// Client-side PDF text extraction via pdf.js (text-based PDFs only, no OCR).
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Reconstructs line breaks from glyph y-position (pdf.js gives no explicit ones).
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
