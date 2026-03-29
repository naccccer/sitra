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

function formatCompanyLabel(settings = {}) {
  return String(settings.companyName || 'سازمان').trim()
}

function formatCompanyId(settings = {}) {
  return String(settings.companyId || '-').trim()
}

function formatSignatory(settings = {}) {
  const name = String(settings.signatoryName || '').trim()
  const title = String(settings.signatoryTitle || '').trim()
  return { name: name || '....................', title: title || '....................' }
}

function resolvePrintNotes(payslip, settings = {}) {
  const rawNote = String(payslip.notes || settings.footerNote || '').trim()
  if (!rawNote) return ''
  const normalized = rawNote.replace(/\s+/g, ' ').trim()
  const hiddenNotes = new Set(['بدون توضیح', 'فیش به صورت سیستمی تولید شده', 'این فیش به صورت سیستمی تولید شده'])
  return hiddenNotes.has(normalized) ? '' : rawNote
}

function renderRows(rows, payslip, catalog, total = null) {
  if (!rows.length) return ''
  const body = rows
    .map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td class="num">${escapeHtml(formatMoney(resolveCatalogDisplayValue(payslip, catalog, item)))}</td>
      </tr>
    `)
    .join('')

  const totalRow = total === null
    ? ''
    : `
      <tr class="total-row">
        <td>جمع</td>
        <td class="num">${escapeHtml(formatMoney(total))}</td>
      </tr>
    `

  return `${body}${totalRow}`
}

function buildPrintHtml({ assetBase, catalog, groupedCatalog, payslip, run, settings, totals }) {
  const companyLabel = formatCompanyLabel(settings)
  const companyId = formatCompanyId(settings)
  const signatory = formatSignatory(settings)
  const issueDate = formatMaybeDate(run?.issuedAt || payslip.issuedAt)
  const notes = resolvePrintNotes(payslip, settings)
  const notesSection = notes ? `<section class="notes"><div class="notes-title">توضیحات</div><div class="notes-body">${escapeHtml(notes)}</div></section>` : ''

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <base href="${escapeHtml(assetBase)}/" />
  <title>فیش حقوقی</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    @font-face {
      font-family: 'Vazirmatn';
      src: url('${escapeHtml(assetBase)}/fonts/Vazirmatn-Regular.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Vazirmatn';
      src: url('${escapeHtml(assetBase)}/fonts/Vazirmatn-Bold.woff2') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Vazirmatn';
      src: url('${escapeHtml(assetBase)}/fonts/Vazirmatn-Black.woff2') format('woff2');
      font-weight: 900;
      font-style: normal;
      font-display: swap;
    }
    :root {
      --ink: #0f172a;
      --muted: #475569;
      --line: #dbe4f0;
      --line-strong: #c3d2e6;
      --surface: #f7fafc;
      --surface-strong: #eef4fb;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: var(--ink); font-family: 'Vazirmatn', Tahoma, Arial, sans-serif; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: 188mm; margin: 0 auto; padding: 3mm 2mm 1mm; }
    .header { position: relative; padding: 3.2mm 3mm 2.2mm; background: linear-gradient(180deg, var(--surface-strong), #fff 75%); border-radius: 5mm; border: 1px solid var(--line); }
    .header::before { content: ''; position: absolute; inset: 0 0 auto; height: 2.2mm; background: var(--ink); border-radius: 5mm 5mm 0 0; }
    .header-top { display: block; width: 100%; }
    .company { font-size: 17px; font-weight: 900; margin-top: 1.2mm; }
    .sub { font-size: 10px; color: var(--muted); margin-top: 0.8mm; }
    .chips { margin-top: 2.4mm; display: table; width: 100%; border-spacing: 1.5mm 0; }
    .chip { display: table-cell; width: 25%; background: #fff; border: 1px solid var(--line); border-radius: 3.6mm; padding: 1.7mm 2mm; box-shadow: 0 .6mm 1.8mm rgba(15,23,42,.03); }
    .chip-label { font-size: 8.5px; color: #64748b; font-weight: 700; }
    .chip-value { margin-top: 0.9mm; font-size: 10px; font-weight: 800; }
    .tables { margin-top: 1.8mm; display: table; width: 100%; border-spacing: 1.5mm 1.5mm; }
    .table-wrap { display: table-cell; width: 50%; vertical-align: top; border: 1px solid var(--line); border-radius: 4mm; overflow: hidden; background: #fff; }
    .table-title { background: linear-gradient(180deg, var(--surface), #fdfefe); padding: 1.6mm 2.2mm; border-bottom: 1px solid var(--line); font-size: 10.5px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1.15mm 2.1mm; border-bottom: 1px solid #edf2f7; font-size: 9px; font-weight: 700; }
    td.num { text-align: left; font-weight: 800; }
    .total-row td { background: var(--surface); font-weight: 800; }
    .notes { margin-top: 1.6mm; background: var(--surface); border: 1px solid var(--line); border-radius: 4mm; padding: 1.7mm 2.1mm; }
    .notes-title { font-size: 10px; font-weight: 800; }
    .notes-body { margin-top: 0.9mm; font-size: 8.8px; line-height: 1.55; color: var(--muted); min-height: 0; }
    .signatures { margin-top: 1.6mm; display: table; width: 100%; border-spacing: 1.5mm 0; }
    .sign { display: table-cell; width: 33.33%; vertical-align: top; background: #fff; border: 1px solid var(--line); border-radius: 4mm; padding: 1.6mm 2mm; min-height: 15mm; }
    .sign-title { font-size: 9.5px; font-weight: 800; }
    .sign-line { margin-top: 3.2mm; min-height: 4.5mm; border-bottom: 1px dashed #9fb0c5; }
    .sign-name { margin-top: 1.1mm; font-size: 8.8px; font-weight: 800; text-align: center; }
    .sign-sub { margin-top: 0.5mm; font-size: 7.9px; color: #64748b; font-weight: 700; text-align: center; }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="header">
      <div class="header-top">
          <div class="company">${escapeHtml(companyLabel)}</div>
          <div class="sub">شناسه / کد کارگاهی: ${escapeHtml(companyId)}</div>
          <div class="sub">فیش حقوقی ماه ${escapeHtml(monthLabel(run?.periodKey))}</div>
      </div>

      <div class="chips">
        <div class="chip"><div class="chip-label">نام پرسنل</div><div class="chip-value">${escapeHtml(payslip.employeeName || '-')}</div></div>
        <div class="chip"><div class="chip-label">کد پرسنلی</div><div class="chip-value">${escapeHtml(payslip.employeeCode || '-')}</div></div>
        <div class="chip"><div class="chip-label">واحد</div><div class="chip-value">${escapeHtml(payslip.department || '-')}</div></div>
        <div class="chip"><div class="chip-label">تاریخ صدور</div><div class="chip-value">${escapeHtml(issueDate)}</div></div>
      </div>
    </section>

    <section class="tables">
      <div class="table-wrap">
        <div class="table-title">کارکرد و اطلاعات</div>
        <table><tbody>${renderRows([...groupedCatalog.info, ...groupedCatalog.work], payslip, catalog)}</tbody></table>
      </div>
      <div class="table-wrap">
        <div class="table-title">دریافتی ها</div>
        <table><tbody>${renderRows(groupedCatalog.earning, payslip, catalog, totals.gross)}</tbody></table>
      </div>
    </section>

    <section class="tables">
      <div class="table-wrap">
        <div class="table-title">کسورات</div>
        <table><tbody>${renderRows(groupedCatalog.deduction, payslip, catalog, totals.deductions)}</tbody></table>
      </div>
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

    ${notesSection}

    <section class="signatures">
      <div class="sign">
        <div class="sign-title">امضای کارمند</div>
        <div class="sign-line"></div>
        <div class="sign-name">${escapeHtml(payslip.employeeName || '....................')}</div>
      </div>
      <div class="sign">
        <div class="sign-title">${escapeHtml(settings.signatureLabel || 'امضا و تایید')}</div>
        <div class="sign-line"></div>
        <div class="sign-name">${escapeHtml(signatory.name)}</div>
        <div class="sign-sub">${escapeHtml(signatory.title)}</div>
      </div>
      <div class="sign">
        <div class="sign-title">مهر و امضای واحد مالی</div>
        <div class="sign-line"></div>
        <div class="sign-name">${escapeHtml(companyLabel)}</div>
        <div class="sign-sub">${escapeHtml(companyId)}</div>
      </div>
    </section>
  </main>
</body>
</html>`
}

export function PayslipPrintView({ catalog = [], onClose, payslip, run, settings = {} }) {
  const groupedCatalog = useMemo(() => splitCatalogByType(catalog), [catalog])

  useEffect(() => {
    if (!payslip || typeof document === 'undefined') return undefined

    const fallback = calculatePayslipTotals(payslip)
    const catalogTotals = calculateCatalogTotals(payslip, catalog)
    const totals = catalogTotals.gross || catalogTotals.deductions ? catalogTotals : fallback
    const assetBase = window.location.origin
    const html = buildPrintHtml({ assetBase, catalog, groupedCatalog, payslip, run, settings, totals })

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
      if (frame.parentNode) {
        frame.parentNode.removeChild(frame)
      }
    }
    const finalizePrintFlow = () => {
      if (finished) return
      finished = true
      teardown()
      onClose?.()
    }
    const handleAfterPrint = () => finalizePrintFlow()
    const triggerPrint = async () => {
      if (doc.fonts?.ready) {
        try {
          await doc.fonts.ready
        } catch {
          // Keep printing even if the browser rejects the font-ready promise.
        }
      }
      win.focus()
      win.print()
    }

    doc.open()
    doc.write(html)
    doc.close()

    win.addEventListener('afterprint', handleAfterPrint)
    fallbackCloseTimer = window.setTimeout(finalizePrintFlow, 1500)
    loadTimer = window.setTimeout(triggerPrint, 150)

    return () => {
      teardown()
    }
  }, [catalog, groupedCatalog, onClose, payslip, run, settings])

  return null
}
