import { useEffect, useMemo } from 'react'
import { calculatePayslipTotals, formatMaybeDate, formatMoney, monthLabel } from './payrollMath'
import { calculateCatalogTotals, resolveCatalogDisplayValue, splitCatalogByType } from './payrollCatalog'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function companyName(settings = {}) {
  return String(settings.companyName || 'سازمان').trim()
}

function companyId(settings = {}) {
  return String(settings.companyId || '-').trim()
}

function signatory(settings = {}) {
  const name = String(settings.signatoryName || '').trim()
  const title = String(settings.signatoryTitle || '').trim()
  return { name: name || '....................', title: title || '....................' }
}

function resolveNotes(payslip, settings = {}) {
  const rawNote = String(payslip.notes || settings.footerNote || '').trim()
  if (!rawNote) return ''
  const normalized = rawNote.replace(/\s+/g, ' ').trim()
  const hidden = new Set(['بدون توضیح', 'فیش به صورت سیستمی تولید شده', 'این فیش به صورت سیستمی تولید شده'])
  return hidden.has(normalized) ? '' : rawNote
}

function renderRows(rows, payslip, catalog, total = null) {
  if (!rows.length) return ''
  const body = rows.map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td class="num">${escapeHtml(formatMoney(resolveCatalogDisplayValue(payslip, catalog, item)))}</td>
      </tr>
    `).join('')
  const totalRow = total === null ? '' : `
      <tr class="total-row">
        <td>جمع</td>
        <td class="num">${escapeHtml(formatMoney(total))}</td>
      </tr>
    `
  return `${body}${totalRow}`
}

function buildSheetHtml({ catalog, groupedCatalog, payslip, run, settings, totals }) {
  const noteText = resolveNotes(payslip, settings)
  const noteSection = noteText
    ? `<section class="notes"><div class="notes-title">توضیحات</div><div class="notes-body">${escapeHtml(noteText)}</div></section>`
    : ''
  const signer = signatory(settings)
  const issueDate = formatMaybeDate(run?.issuedAt || payslip.issuedAt)
  return `
  <main class="sheet">
    <section class="header">
      <div class="company">${escapeHtml(companyName(settings))}</div>
      <div class="sub">شناسه / کد کارگاهی: ${escapeHtml(companyId(settings))}</div>
      <div class="sub">فیش حقوقی ماه ${escapeHtml(monthLabel(run?.periodKey))}</div>
      <div class="chips">
        <div class="chip"><div class="chip-label">نام پرسنل</div><div class="chip-value">${escapeHtml(payslip.employeeName || '-')}</div></div>
        <div class="chip"><div class="chip-label">کد پرسنلی</div><div class="chip-value">${escapeHtml(payslip.employeeCode || '-')}</div></div>
        <div class="chip"><div class="chip-label">واحد</div><div class="chip-value">${escapeHtml(payslip.department || '-')}</div></div>
        <div class="chip"><div class="chip-label">تاریخ صدور</div><div class="chip-value">${escapeHtml(issueDate)}</div></div>
      </div>
    </section>
    <section class="tables">
      <div class="table-wrap"><div class="table-title">کارکرد و اطلاعات</div><table><tbody>${renderRows([...groupedCatalog.info, ...groupedCatalog.work], payslip, catalog)}</tbody></table></div>
      <div class="table-wrap"><div class="table-title">دریافتی ها</div><table><tbody>${renderRows(groupedCatalog.earning, payslip, catalog, totals.gross)}</tbody></table></div>
    </section>
    <section class="tables">
      <div class="table-wrap"><div class="table-title">کسورات</div><table><tbody>${renderRows(groupedCatalog.deduction, payslip, catalog, totals.deductions)}</tbody></table></div>
      <div class="table-wrap">
        <div class="table-title">خلاصه مالی</div>
        <table>
          <tbody>
            <tr><td>جمع دریافتی</td><td class="num">${escapeHtml(formatMoney(totals.gross))}</td></tr>
            <tr><td>جمع کسورات</td><td class="num">${escapeHtml(formatMoney(totals.deductions))}</td></tr>
            <tr class="total-row"><td>خالص پرداختی</td><td class="num">${escapeHtml(formatMoney(totals.net))}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
    ${noteSection}
    <section class="signatures">
      <div class="sign"><div class="sign-title">امضای کارمند</div><div class="sign-line"></div><div class="sign-name">${escapeHtml(payslip.employeeName || '....................')}</div></div>
      <div class="sign"><div class="sign-title">${escapeHtml(settings.signatureLabel || 'امضا و تایید')}</div><div class="sign-line"></div><div class="sign-name">${escapeHtml(signer.name)}</div><div class="sign-sub">${escapeHtml(signer.title)}</div></div>
      <div class="sign"><div class="sign-title">مهر و امضای واحد مالی</div><div class="sign-line"></div><div class="sign-name">${escapeHtml(companyName(settings))}</div><div class="sign-sub">${escapeHtml(companyId(settings))}</div></div>
    </section>
  </main>`
}

function buildPrintHtml({ assetBase, catalog, groupedCatalog, paperSize = 'a4', payslips = [], run, settings }) {
  const paper = String(paperSize || 'a4').toLowerCase() === 'a5' ? 'a5' : 'a4'
  const pageSize = paper === 'a5' ? 'A5' : 'A4'
  const sheets = payslips.map((payslip) => {
    const fallback = calculatePayslipTotals(payslip)
    const catalogTotals = calculateCatalogTotals(payslip, catalog)
    const totals = catalogTotals.gross || catalogTotals.deductions ? catalogTotals : fallback
    return buildSheetHtml({ catalog, groupedCatalog, payslip, run, settings, totals })
  }).join('')

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(assetBase)}/" />
  <title>فیش حقوقی</title>
  <style>
    @page { size: ${pageSize} portrait; margin: ${paper === 'a5' ? '7mm' : '10mm'}; }
    @font-face { font-family: 'Vazirmatn'; src: url('${escapeHtml(assetBase)}/fonts/Vazirmatn-Regular.woff2') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'Vazirmatn'; src: url('${escapeHtml(assetBase)}/fonts/Vazirmatn-Bold.woff2') format('woff2'); font-weight: 700; font-style: normal; font-display: swap; }
    @font-face { font-family: 'Vazirmatn'; src: url('${escapeHtml(assetBase)}/fonts/Vazirmatn-Black.woff2') format('woff2'); font-weight: 900; font-style: normal; font-display: swap; }
    :root { --ink:#0f172a; --muted:#475569; --line:#dbe4f0; --surface:#f7fafc; --surface-strong:#eef4fb; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: var(--ink); font-family: 'Vazirmatn', Tahoma, Arial, sans-serif; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: 188mm; margin: 0 auto; padding: 3mm 2mm 1mm; }
    .sheet + .sheet { break-before: page; page-break-before: always; }
    .header { position: relative; padding: 3.2mm 3mm 2.2mm; background: linear-gradient(180deg, var(--surface-strong), #fff 75%); border: 1px solid var(--line); border-radius: 5mm; break-inside: avoid; page-break-inside: avoid; }
    .header::before { content: ''; position: absolute; inset: 0 0 auto; height: 2.2mm; background: var(--ink); border-radius: 5mm 5mm 0 0; }
    .company { font-size: 17px; font-weight: 900; margin-top: 1.2mm; }
    .sub { font-size: 10px; color: var(--muted); margin-top: 0.8mm; }
    .chips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5mm; margin-top: 2.4mm; }
    .chip { background: #fff; border: 1px solid var(--line); border-radius: 3.6mm; padding: 1.7mm 2mm; box-shadow: 0 .6mm 1.8mm rgba(15,23,42,.03); }
    .chip-label { font-size: 8.5px; color: #64748b; font-weight: 700; }
    .chip-value { margin-top: 0.9mm; font-size: 10px; font-weight: 800; }
    .tables { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5mm; margin-top: 1.8mm; }
    .table-wrap { border: 1px solid var(--line); border-radius: 4mm; overflow: hidden; background: #fff; break-inside: avoid; page-break-inside: avoid; }
    .table-title { background: linear-gradient(180deg, var(--surface), #fdfefe); padding: 1.6mm 2.2mm; border-bottom: 1px solid var(--line); font-size: 10.5px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1.15mm 2.1mm; border-bottom: 1px solid #edf2f7; font-size: 9px; font-weight: 700; }
    td.num { text-align: left; font-weight: 800; }
    .total-row td { background: var(--surface); font-weight: 800; }
    .notes { margin-top: 1.5mm; background: var(--surface); border: 1px solid var(--line); border-radius: 4mm; padding: 1.5mm 2mm; break-inside: avoid; page-break-inside: avoid; }
    .notes-title { font-size: 10px; font-weight: 800; }
    .notes-body { margin-top: 0.8mm; font-size: 8.8px; line-height: 1.45; color: var(--muted); }
    .signatures { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.5mm; margin-top: 1.6mm; break-inside: avoid; page-break-inside: avoid; }
    .sign { background: #fff; border: 1px solid var(--line); border-radius: 4mm; padding: 1.6mm 2mm; min-height: 15mm; break-inside: avoid; page-break-inside: avoid; }
    .sign-title { font-size: 9.5px; font-weight: 800; }
    .sign-line { margin-top: 3.2mm; min-height: 4.5mm; border-bottom: 1px dashed #9fb0c5; }
    .sign-name { margin-top: 1.1mm; font-size: 8.8px; font-weight: 800; text-align: center; }
    .sign-sub { margin-top: 0.5mm; font-size: 7.9px; color: #64748b; font-weight: 700; text-align: center; }
    body[data-paper-size='a5'] .sheet { width: 134mm; padding: 1.5mm 0.8mm 0.4mm; }
    body[data-paper-size='a5'] .header { padding: 2mm 2mm 1.4mm; border-radius: 3.4mm; }
    body[data-paper-size='a5'] .company { font-size: 13px; margin-top: 0.6mm; }
    body[data-paper-size='a5'] .sub { font-size: 8px; margin-top: 0.4mm; }
    body[data-paper-size='a5'] .chips { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8mm; margin-top: 1.4mm; }
    body[data-paper-size='a5'] .chip { padding: 1mm 1.2mm; border-radius: 2.8mm; }
    body[data-paper-size='a5'] .chip-label { font-size: 7.3px; }
    body[data-paper-size='a5'] .chip-value { margin-top: 0.45mm; font-size: 8.3px; }
    body[data-paper-size='a5'] .tables { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8mm; margin-top: 1mm; }
    body[data-paper-size='a5'] .table-wrap { border-radius: 3mm; }
    body[data-paper-size='a5'] .table-title { font-size: 8.8px; padding: 0.95mm 1.3mm; }
    body[data-paper-size='a5'] td { padding: 0.85mm 1.1mm; font-size: 7.3px; line-height: 1.25; }
    body[data-paper-size='a5'] td:first-child { overflow-wrap: anywhere; }
    body[data-paper-size='a5'] td.num { text-align: start; white-space: nowrap; }
    body[data-paper-size='a5'] .notes { margin-top: 0.8mm; padding: 1mm 1.2mm; border-radius: 3mm; }
    body[data-paper-size='a5'] .notes-title { font-size: 8px; }
    body[data-paper-size='a5'] .notes-body { font-size: 7px; margin-top: 0.35mm; line-height: 1.28; }
    body[data-paper-size='a5'] .signatures { gap: 0.7mm; margin-top: 0.8mm; }
    body[data-paper-size='a5'] .sign { padding: 0.9mm 1mm; border-radius: 2.8mm; min-height: 0; }
    body[data-paper-size='a5'] .sign-title { font-size: 7.7px; }
    body[data-paper-size='a5'] .sign-line { margin-top: 1.2mm; min-height: 2.2mm; }
    body[data-paper-size='a5'] .sign-name { font-size: 7.1px; margin-top: 0.6mm; }
    body[data-paper-size='a5'] .sign-sub { font-size: 6.5px; }
  </style>
</head>
<body data-paper-size="${paper}">
  ${sheets}
</body>
</html>`
}

export function PayslipPrintView({ catalog = [], onClose, paperSize = 'a4', payslip, payslips = [], run, settings = {} }) {
  const groupedCatalog = useMemo(() => splitCatalogByType(catalog), [catalog])

  useEffect(() => {
    const printItems = Array.isArray(payslips) && payslips.length > 0 ? payslips : (payslip ? [payslip] : [])
    if (printItems.length === 0 || typeof document === 'undefined') return undefined
    const normalizedPaperSize = String(paperSize || 'a4').toLowerCase() === 'a5' ? 'a5' : 'a4'
    const html = buildPrintHtml({
      assetBase: window.location.origin,
      catalog,
      groupedCatalog,
      paperSize: normalizedPaperSize,
      payslips: printItems,
      run,
      settings,
    })
    const frame = document.createElement('iframe')
    frame.setAttribute('title', 'payslip-print-frame')
    frame.style.position = 'fixed'
    frame.style.left = '-10000px'
    frame.style.top = '0'
    frame.style.width = '1px'
    frame.style.height = '1px'
    frame.style.opacity = '0'
    frame.style.pointerEvents = 'none'
    document.body.appendChild(frame)
    const win = frame.contentWindow
    const doc = frame.contentDocument || win?.document
    if (!win || !doc) {
      frame.remove()
      onClose?.()
      return undefined
    }
    let finished = false
    let loadTimer = 0
    let fallbackCloseTimer = 0
    const teardown = () => {
      win.removeEventListener('afterprint', handleAfterPrint)
      window.clearTimeout(fallbackCloseTimer)
      window.clearTimeout(loadTimer)
      if (frame.parentNode) frame.parentNode.removeChild(frame)
    }
    const finalize = () => {
      if (finished) return
      finished = true
      teardown()
      onClose?.()
    }
    const handleAfterPrint = () => finalize()
    const triggerPrint = async () => {
      if (doc.fonts?.ready) {
        try {
          await doc.fonts.ready
        } catch {
          // Ignore font loading errors and continue printing.
        }
      }
      win.focus()
      win.print()
    }
    doc.open()
    doc.write(html)
    doc.close()
    win.addEventListener('afterprint', handleAfterPrint)
    fallbackCloseTimer = window.setTimeout(finalize, 1500)
    loadTimer = window.setTimeout(triggerPrint, 150)
    return () => teardown()
  }, [catalog, groupedCatalog, onClose, paperSize, payslip, payslips, run, settings])

  return null
}
