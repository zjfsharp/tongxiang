// Unified file preview dialog (image / PDF / docx / other)

const DIALOG_ID = 'filePreviewDialog'

function getOrCreateDialog() {
  let d = document.getElementById(DIALOG_ID)
  if (!d) {
    d = document.createElement('dialog')
    d.id = DIALOG_ID
    d.innerHTML = `
      <div class="fp-header">
        <span class="fp-title" id="fpTitle"></span>
        <button class="fp-close" id="fpClose" type="button">✕</button>
      </div>
      <div class="fp-body" id="fpBody"></div>
    `
    d.style.cssText = `
      max-width:90vw; max-height:90vh; width:800px; padding:0;
      border:none; border-radius:12px; overflow:hidden;
      box-shadow:0 8px 40px rgba(0,0,0,.35);
    `
    document.body.appendChild(d)

    d.addEventListener('click', e => { if (e.target === d) d.close() })
    d.querySelector('#fpClose').addEventListener('click', () => d.close())
  }
  return d
}

export async function openPreview(url, type, filename) {
  const dlg   = getOrCreateDialog()
  const title = document.getElementById('fpTitle')
  const body  = document.getElementById('fpBody')

  title.textContent = filename || '文件预览'
  body.innerHTML = '<div class="fp-loading">加载中…</div>'
  dlg.showModal()

  if (type?.startsWith('image/')) {
    body.innerHTML = `<img src="${_e(url)}" alt="${_e(filename)}" style="max-width:100%;max-height:75vh;display:block;margin:auto"/>`
  } else if (type === 'application/pdf') {
    body.innerHTML = `<iframe src="${_e(url)}" style="width:100%;height:75vh;border:none"></iframe>`
  } else if (filename?.endsWith('.docx') || filename?.endsWith('.doc')) {
    body.innerHTML = '<div class="fp-loading">正在转换文档…</div>'
    try {
      const mammoth = await import('mammoth')
      const resp = await fetch(url)
      const buf  = await resp.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer: buf })
      body.innerHTML = `<div class="fp-docx-content">${result.value}</div>`
    } catch (err) {
      body.innerHTML = `<div class="fp-error">文档预览失败，请直接下载查看。<br/><a href="${_e(url)}" download="${_e(filename)}">下载文件</a></div>`
    }
  } else {
    body.innerHTML = `<div class="fp-other">
      <div style="font-size:48px;text-align:center;margin:24px">📎</div>
      <p style="text-align:center">${_e(filename)}</p>
      <div style="text-align:center;margin-top:16px">
        <a class="fp-download-btn" href="${_e(url)}" download="${_e(filename)}">下载文件</a>
      </div>
    </div>`
  }
}

function _e(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
