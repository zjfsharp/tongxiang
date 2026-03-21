// journal-renderer.js — Generic field renderer / binder / collector for dynamic study-journal tasks

const _e = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── Field renderers ───────────────────────────────────────

function renderRepeatingText(field, data, done) {
  const vals = data[field.id] || []
  return `<div class="jl-repeating-text">
    ${Array.from({ length: field.count }, (_, i) => `
      <div class="jl-q-row">
        <span class="jl-q-num">${i + 1}</span>
        <input class="jl-input jl-input-q" data-fid="${_e(field.id)}" data-qi="${i}"
               value="${_e(vals[i] || '')}"
               placeholder="${_e((field.placeholders || [])[i] || '')}"
               ${done ? 'readonly' : ''}/>
      </div>
    `).join('')}
  </div>`
}

function renderChecklist(field, data, done) {
  const checked = data[field.id] || []
  const opts = field.options || []
  return `<div class="jl-checklist">
    ${opts.map(opt => `
      <label class="jl-check-item">
        <input type="checkbox" class="jl-chk" data-fid="${_e(field.id)}" data-item="${_e(opt)}"
               ${checked.includes(opt) ? 'checked' : ''} ${done ? 'disabled' : ''}/>
        <span class="jl-check-label">${_e(opt)}</span>
      </label>
    `).join('')}
    ${field.hasOther ? `
      <label class="jl-check-item">
        <input type="checkbox" class="jl-chk jl-chk-other" data-fid="${_e(field.id)}" data-item="__other__"
               ${checked.some(i => !opts.includes(i)) ? 'checked' : ''} ${done ? 'disabled' : ''}/>
        <span class="jl-check-label">其他：</span>
        <input class="jl-input jl-input-inline" id="otherItem_${_e(field.id)}"
               value="${_e(checked.find(i => !opts.includes(i)) || '')}"
               placeholder="自己写" ${done ? 'readonly' : ''}/>
      </label>
    ` : ''}
  </div>`
}

function renderRadio(field, data, done) {
  const val = data[field.id] || ''
  return `<div class="jl-radio-group">
    ${(field.options || []).map(opt => `
      <label class="jl-radio-item">
        <input type="radio" name="${_e(field.id)}" value="${_e(opt)}"
               ${val === opt ? 'checked' : ''} ${done ? 'disabled' : ''}/>
        <span>${_e(opt)}</span>
      </label>
    `).join('')}
  </div>`
}

function renderTextarea(field, data, done) {
  const val = data[field.id] || ''
  return `<div class="jl-discovery">
    ${field.label ? `<div class="jl-discovery-label">${_e(field.label)}</div>` : ''}
    <textarea class="jl-textarea" data-fid="${_e(field.id)}" rows="${field.rows || 3}"
              placeholder="${_e(field.placeholder || '')}" ${done ? 'readonly' : ''}>${_e(val)}</textarea>
  </div>`
}

function renderNumber(field, data, done) {
  const val = data[field.id] ?? ''
  const parts = (field.label || '___').split('___')
  const prefix = parts[0] || ''
  const suffix = parts[1] ?? '个秘密！'
  return `<div class="jl-count-row">
    ${prefix ? `<span>${_e(prefix)}</span>` : ''}
    <input class="jl-count-input" type="number" min="0" max="99"
           data-fid="${_e(field.id)}" value="${_e(val)}"
           placeholder="${_e(field.placeholder || '')}" ${done ? 'readonly' : ''}/>
    ${suffix ? `<span>${_e(suffix)}</span>` : ''}
  </div>`
}

function renderTable(field, data, done) {
  const rows = data[field.id]
  const rowData = Array.isArray(rows) ? rows : Array.from({ length: field.rows || 4 }, () => ({}))
  const rowLabel = field.rowLabel || 'Row'
  const cols = field.columns || []
  return `<div class="jl-equip-grid">
    ${Array.from({ length: field.rows || 4 }, (_, i) => `
      <div class="jl-equip-card">
        <div class="jl-equip-num">${_e(rowLabel)} ${i + 1}</div>
        ${cols.map((col, ci) => {
          const v = rowData[i]?.[col.id] || ''
          return ci === 0
            ? `<input class="jl-input" placeholder="${_e(col.placeholder || col.label)}"
                      data-fid="${_e(field.id)}" data-row="${i}" data-col="${_e(col.id)}"
                      value="${_e(v)}" ${done ? 'readonly' : ''}/>`
            : `<textarea class="jl-textarea jl-textarea-sm" placeholder="${_e(col.placeholder || col.label)}"
                         data-fid="${_e(field.id)}" data-row="${i}" data-col="${_e(col.id)}"
                         rows="2" ${done ? 'readonly' : ''}>${_e(v)}</textarea>`
        }).join('')}
      </div>
    `).join('')}
  </div>`
}

function renderEmojiPicker(field, data, done) {
  const val = data[field.id] || ''
  return `<div class="jl-mood-wrap">
    ${field.label ? `<div class="jl-mood-label">${_e(field.label)}</div>` : ''}
    <div class="jl-mood-row">
      ${(field.options || []).map(m => `
        <button class="jl-mood-btn${val === m ? ' active' : ''}" data-fid="${_e(field.id)}" data-mood="${_e(m)}"
                type="button" ${done ? 'disabled' : ''}>${m}</button>
      `).join('')}
    </div>
  </div>`
}

function renderQuestionResolve(field, data, done, ctx) {
  const questions = (ctx?.group?.phase1?.questions || []).filter(q => q?.trim())
  const resolved = data[field.id] || {}
  if (!questions.length) return ''
  return `<div class="jl-resolve-items" data-fid="${_e(field.id)}">
    ${questions.map((q, i) => `
      <div class="jl-resolve-item">
        <div class="jl-resolve-q">Q${i + 1}：${_e(q)}</div>
        <div class="jl-resolve-btns">
          <button class="jl-resolve-btn${resolved[i] === 'yes' ? ' yes' : ''}"
                  data-fid="${_e(field.id)}" data-qi="${i}" data-ans="yes" type="button" ${done ? 'disabled' : ''}>✅ 解决了！</button>
          <button class="jl-resolve-btn${resolved[i] === 'no' ? ' no' : ''}"
                  data-fid="${_e(field.id)}" data-qi="${i}" data-ans="no" type="button" ${done ? 'disabled' : ''}>🤔 还不清楚</button>
        </div>
      </div>
    `).join('')}
  </div>`
}

// ── Public: render ────────────────────────────────────────

export function renderField(field, data, done, ctx = {}) {
  const d = data || {}
  switch (field.type) {
    case 'repeating_text':   return renderRepeatingText(field, d, done)
    case 'checklist':        return renderChecklist(field, d, done)
    case 'radio':            return renderRadio(field, d, done)
    case 'textarea':         return renderTextarea(field, d, done)
    case 'number':           return renderNumber(field, d, done)
    case 'table':            return renderTable(field, d, done)
    case 'emoji_picker':     return renderEmojiPicker(field, d, done)
    case 'question_resolve': return renderQuestionResolve(field, d, done, ctx)
    default: return ''
  }
}

export function renderSection(sec, data, done, ctx = {}) {
  const fields = (sec.fields || []).map(f => renderField(f, data || {}, done, ctx)).join('')
  return `<div class="jl-card">
    ${sec.title ? `<h3 class="jl-card-title">${_e(sec.title)}</h3>` : ''}
    ${sec.hint  ? `<p class="jl-card-hint">${_e(sec.hint)}</p>` : ''}
    ${fields}
  </div>`
}

// ── Public: bind event listeners ─────────────────────────

export function bindField(container, field, target, onChange) {
  switch (field.type) {
    case 'repeating_text': {
      container.querySelectorAll(`[data-fid="${field.id}"]`).forEach(inp =>
        inp.addEventListener('input', () => { collectField(container, field, target); onChange?.() }))
      break
    }
    case 'checklist': {
      container.querySelectorAll(`.jl-chk[data-fid="${field.id}"]`).forEach(chk =>
        chk.addEventListener('change', () => { collectField(container, field, target); onChange?.() }))
      container.querySelector(`#otherItem_${field.id}`)?.addEventListener('input', () => {
        collectField(container, field, target); onChange?.()
      })
      break
    }
    case 'radio': {
      container.querySelectorAll(`input[name="${field.id}"]`).forEach(inp =>
        inp.addEventListener('change', () => { collectField(container, field, target); onChange?.() }))
      break
    }
    case 'textarea':
    case 'number': {
      container.querySelectorAll(`[data-fid="${field.id}"]`).forEach(inp =>
        inp.addEventListener('input', () => { collectField(container, field, target); onChange?.() }))
      break
    }
    case 'table': {
      container.querySelectorAll(`[data-fid="${field.id}"]`).forEach(inp =>
        inp.addEventListener('input', () => { collectField(container, field, target); onChange?.() }))
      break
    }
    case 'emoji_picker': {
      container.querySelectorAll(`button[data-fid="${field.id}"]`).forEach(btn =>
        btn.addEventListener('click', () => {
          container.querySelectorAll(`button[data-fid="${field.id}"]`).forEach(b => b.classList.remove('active'))
          btn.classList.add('active')
          collectField(container, field, target); onChange?.()
        }))
      break
    }
    case 'question_resolve': {
      container.querySelectorAll(`button[data-fid="${field.id}"]`).forEach(btn =>
        btn.addEventListener('click', () => {
          const qi = btn.dataset.qi
          container.querySelectorAll(`button[data-fid="${field.id}"][data-qi="${qi}"]`).forEach(b => b.classList.remove('yes', 'no'))
          btn.classList.add(btn.dataset.ans)
          collectField(container, field, target); onChange?.()
        }))
      break
    }
  }
}

export function bindSection(container, sec, phaseData, onChange) {
  const target = _sectionTarget(sec, phaseData)
  ;(sec.fields || []).forEach(f => bindField(container, f, target, onChange))
}

// ── Public: collect ───────────────────────────────────────

export function collectField(container, field, target) {
  switch (field.type) {
    case 'repeating_text': {
      target[field.id] = Array.from({ length: field.count }, (_, i) =>
        container.querySelector(`[data-fid="${field.id}"][data-qi="${i}"]`)?.value || '')
      break
    }
    case 'checklist': {
      const opts = field.options || []
      const checked = [...container.querySelectorAll(`.jl-chk[data-fid="${field.id}"]:checked:not(.jl-chk-other)`)]
        .map(c => c.dataset.item)
      const otherOn  = container.querySelector(`.jl-chk-other[data-fid="${field.id}"]`)?.checked
      const otherVal = container.querySelector(`#otherItem_${field.id}`)?.value.trim() || ''
      target[field.id] = (otherOn && otherVal) ? [...checked, otherVal] : checked
      break
    }
    case 'radio': {
      target[field.id] = container.querySelector(`input[name="${field.id}"]:checked`)?.value || ''
      break
    }
    case 'textarea':
    case 'number': {
      target[field.id] = container.querySelector(`[data-fid="${field.id}"]`)?.value || ''
      break
    }
    case 'table': {
      const cols = field.columns || []
      target[field.id] = Array.from({ length: field.rows || 4 }, (_, i) => {
        const row = {}
        cols.forEach(col => {
          row[col.id] = container.querySelector(`[data-fid="${field.id}"][data-row="${i}"][data-col="${col.id}"]`)?.value || ''
        })
        return row
      })
      break
    }
    case 'emoji_picker': {
      const active = container.querySelector(`button.jl-mood-btn.active[data-fid="${field.id}"]`)
      if (active) target[field.id] = active.dataset.mood
      break
    }
    case 'question_resolve': {
      const resolved = {}
      container.querySelectorAll(`button[data-fid="${field.id}"]`).forEach(btn => {
        if (btn.classList.contains('yes')) resolved[btn.dataset.qi] = 'yes'
        else if (btn.classList.contains('no')) resolved[btn.dataset.qi] = 'no'
      })
      target[field.id] = resolved
      break
    }
  }
}

export function collectSection(container, sec, phaseData) {
  const target = _sectionTarget(sec, phaseData)
  ;(sec.fields || []).forEach(f => collectField(container, f, target))
}

// ── Helpers ───────────────────────────────────────────────

function _sectionTarget(sec, phaseData) {
  if (sec.targetKey) {
    if (!phaseData[sec.targetKey]) phaseData[sec.targetKey] = {}
    return phaseData[sec.targetKey]
  }
  return phaseData
}

// ── File upload rendering ─────────────────────────────────

export function renderFileUpload(phaseKey, phaseData, apiBase, code, done) {
  const files = (phaseData || {}).files || []
  return `<div class="jl-upload-zone" data-phase="${_e(phaseKey)}">
    ${files.length ? `
      <div class="jl-upload-list">
        ${files.map(f => `
          <div class="jl-upload-item" data-file-id="${_e(f.id)}">
            ${f.type?.startsWith('image/')
              ? `<img class="jl-upload-thumb" src="${_e(apiBase)}/uploads/groups/${_e(code)}/${_e(f.id)}" alt="${_e(f.filename)}"/>`
              : `<span class="jl-upload-icon">${f.type === 'application/pdf' ? '📄' : '📝'}</span>`}
            <span class="jl-upload-name">${_e(f.filename)}</span>
            <button class="jl-upload-preview-btn" type="button"
                    data-url="${_e(apiBase)}/uploads/groups/${_e(code)}/${_e(f.id)}"
                    data-type="${_e(f.type || '')}"
                    data-name="${_e(f.filename)}">预览</button>
            ${!done ? `<button class="jl-upload-del-btn" type="button" data-file-id="${_e(f.id)}">删除</button>` : ''}
          </div>
        `).join('')}
      </div>
    ` : `<p class="jl-upload-empty">还没有上传文件</p>`}
    ${!done ? `
      <label class="jl-upload-btn" for="fileInput_${_e(phaseKey)}">
        <input type="file" id="fileInput_${_e(phaseKey)}" accept=".jpg,.jpeg,.png,.pdf,.docx,.doc" multiple style="display:none"/>
        + 上传文件/图片
      </label>
      <p class="jl-upload-hint">支持 jpg / png / pdf / docx</p>
    ` : ''}
  </div>`
}

// ── Record field display (for admin records view) ─────────

export function renderFieldRecord(field, data, esc) {
  const e = esc || _e
  const val = data?.[field.id]
  if (val === undefined || val === null || val === '') return ''

  switch (field.type) {
    case 'repeating_text': {
      const arr = Array.isArray(val) ? val.filter(v => v?.trim()) : []
      if (!arr.length) return ''
      return arr.map((q, i) => `<div class="rec-row"><span class="rec-row-label">Q${i + 1}</span><span class="rec-row-val">${e(q)}</span></div>`).join('')
    }
    case 'checklist': {
      const arr = Array.isArray(val) ? val : []
      return arr.length
        ? `<div class="rec-row"><span class="rec-row-label">${e(field.title || '携带物品')}</span><span class="rec-row-val">${arr.map(e).join('、')}</span></div>`
        : ''
    }
    case 'radio': {
      return val ? `<div class="rec-row"><span class="rec-row-label">${e(field.title || '选择')}</span><span class="rec-row-val">${e(val)}</span></div>` : ''
    }
    case 'textarea': {
      return val ? `<div class="rec-row"><span class="rec-row-label">${e(field.label || field.title || '')}</span><span class="rec-row-val">${e(val)}</span></div>` : ''
    }
    case 'number': {
      return val !== '' ? `<div class="rec-row"><span class="rec-row-label">发现数量</span><span class="rec-row-val">${e(val)}</span></div>` : ''
    }
    case 'table': {
      const arr = Array.isArray(val) ? val.filter(r => Object.values(r).some(v => v)) : []
      if (!arr.length) return ''
      const cols = field.columns || []
      const rows = arr.map(r => cols.map(c => e(r[c.id] || '')).join('（') + '）').join('<br>')
      return `<div class="rec-row"><span class="rec-row-label">设备记录</span><span class="rec-row-val">${rows}</span></div>`
    }
    case 'emoji_picker': {
      return val ? `<div class="rec-row"><span class="rec-row-label">心情</span><span class="rec-row-val">${e(val)}</span></div>` : ''
    }
    case 'question_resolve': {
      // data.resolved is {0: 'yes', 1: 'no'}; questions come from context — handled in buildCardDynamic
      return ''
    }
    default: return ''
  }
}
