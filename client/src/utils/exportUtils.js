import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Downloads tabular data as a CSV file. UTF-8 BOM is included so Arabic text
 * opens correctly in Excel (Excel otherwise guesses the wrong encoding).
 * columns: [{ key, label, format?: (value, row) => string }]
 */
export function exportRowsToCSV(rows, columns, filename) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const header = columns.map(c => esc(c.label)).join(',')
  const lines = rows.map(row =>
    columns.map(c => esc(c.format ? c.format(row[c.key], row) : row[c.key])).join(',')
  )
  const csv = '﻿' + [header, ...lines].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Builds an offscreen, print-styled HTML table. jsPDF cannot shape Arabic
// glyphs natively, so reports are rendered as real DOM (the browser shapes
// the Arabic correctly) and rasterized into the PDF via html2canvas.
function buildPrintableReport({ title, subtitle, meta, columns, rows, summary }) {
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed; top:-99999px; left:-99999px; width:860px; background:#fff; padding:32px; direction:rtl; font-family:Tajawal, Arial, sans-serif; color:#1d0a3f;'

  const titleEl = document.createElement('h1')
  titleEl.textContent = title
  titleEl.style.cssText = 'font-size:21px; font-weight:800; margin:0 0 4px; font-family:Cairo, Tajawal, Arial, sans-serif;'
  container.appendChild(titleEl)

  if (subtitle) {
    const subEl = document.createElement('p')
    subEl.textContent = subtitle
    subEl.style.cssText = 'font-size:13px; color:#6b5a8e; margin:0 0 10px;'
    container.appendChild(subEl)
  }

  if (meta) {
    const metaEl = document.createElement('p')
    metaEl.textContent = meta
    metaEl.style.cssText = 'font-size:11px; color:#9ca3af; margin:0 0 18px; padding-bottom:14px; border-bottom:1px solid #ede9fe;'
    container.appendChild(metaEl)
  }

  const table = document.createElement('table')
  table.style.cssText = 'width:100%; border-collapse:collapse; font-size:12px;'

  const thead = document.createElement('thead')
  const headRow = document.createElement('tr')
  columns.forEach(c => {
    const th = document.createElement('th')
    th.textContent = c.label
    th.style.cssText = 'background:#f5f3ff; color:#5b21b6; text-align:right; padding:9px 11px; border-bottom:2px solid #ddd6fe; font-weight:700; white-space:nowrap;'
    headRow.appendChild(th)
  })
  thead.appendChild(headRow)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  rows.forEach((row, i) => {
    const tr = document.createElement('tr')
    tr.style.background = i % 2 === 0 ? '#ffffff' : '#faf8ff'
    columns.forEach(c => {
      const td = document.createElement('td')
      td.textContent = c.format ? c.format(row[c.key], row) : (row[c.key] ?? '—')
      td.style.cssText = 'padding:8px 11px; border-bottom:1px solid #f0ecfa; text-align:right;'
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  })
  table.appendChild(tbody)
  container.appendChild(table)

  if (summary) {
    const summaryEl = document.createElement('div')
    summaryEl.textContent = summary
    summaryEl.style.cssText = 'margin-top:18px; padding-top:14px; border-top:2px solid #ddd6fe; font-size:14px; font-weight:800; color:#5b21b6;'
    container.appendChild(summaryEl)
  }

  return container
}

/**
 * Renders a data table as a proper Arabic PDF report and triggers a download.
 * columns: [{ key, label, format?: (value, row) => string }]
 */
export async function exportReportToPDF({ title, subtitle, meta, columns, rows, summary, filename }) {
  const container = buildPrintableReport({ title, subtitle, meta, columns, rows, summary })
  document.body.appendChild(container)
  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = margin
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
    heightLeft -= (pageHeight - margin * 2)

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - margin * 2)
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
