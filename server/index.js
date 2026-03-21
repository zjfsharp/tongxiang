// 桐乡研学 API — 纯 Node.js 内置模块，无需 npm install
import http from 'http'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname  = path.dirname(fileURLToPath(import.meta.url))
const PORT       = 3001
const DATA_DIR   = path.join(__dirname, 'data')
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json')
const UPLOADS_DIR = path.join(__dirname, 'uploads')

if (!fs.existsSync(DATA_DIR))    fs.mkdirSync(DATA_DIR,    { recursive: true })
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

// ── helpers ──────────────────────────────────────────────
const readJSON  = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const writeJSON = (f, d) => fs.writeFileSync(f, JSON.stringify(d, null, 2), 'utf8')
const groupFile = code => path.join(DATA_DIR, `${code}.json`)

function parseBody(req) {
  return new Promise(resolve => {
    let b = ''
    req.on('data', c => b += c)
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')) } catch { resolve({}) } })
  })
}
function send(res, status, data) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}
function safe(d) {
  const { password, ...rest } = d
  return {
    ...rest,
    hasPassword: !!password,
    phase1Done:  !!d.phase1?.completedAt,
    phase2Done:  !!d.phase2?.completedAt,
    phase3Done:  !!d.phase3?.completedAt,
  }
}

// ── default tasks ────────────────────────────────────────
const DEFAULT_TASKS = [
  {
    id: 1,
    title: '石门湾研学记录',
    description: '走进石门湾现代农事服务中心，探索从一粒种子到一碗米饭的全过程。',
    grade: '三至六年级',
    gradeRange: [3, 6],
    location: '石门湾现代农事服务中心',
    duration: '一天',
    capacity: 40,
    enrolled: 0,
    status: '招募中',
    difficulty: '初级',
    tags: ['现代农业', '稻米文化', '科技探索'],
    startDate: '2026-04-15',
    organizer: '桐乡研学',
    journalEnabled: true,
    phases: {
      before: {
        mode: 'form',
        title: '行前准备',
        icon: '🎒',
        sections: [
          {
            id: 'questions_section', targetKey: null,
            title: '💡 最想弄清楚的问题（最多3个）',
            hint: '出发前先想好，回来再看看有没有答案',
            fields: [
              { id: 'questions', type: 'repeating_text', count: 3,
                placeholders: ['你们最想弄清楚什么？', '还有别的问题吗？', '第三个问题（选填）'] },
            ],
          },
          {
            id: 'items_section', targetKey: null,
            title: '🎒 要带的东西',
            fields: [
              { id: 'items', type: 'checklist', hasOther: true,
                options: ['📓 笔记本', '✏️ 铅笔/彩笔', '💧 水杯', '📸 相机/手机', '🌂 雨具（天气不好时）', '🎒 背包'] },
            ],
          },
          {
            id: 'route_section', targetKey: null,
            title: '🗺️ 我们想走什么路线？',
            fields: [
              { id: 'route', type: 'radio',
                options: ['先参观展厅，再参观生产车间', '先参观生产车间，再参观展厅', '跟着老师的安排走'] },
            ],
          },
        ],
      },
      during: {
        mode: 'form',
        title: '行中探索',
        icon: '🔍',
        subPhases: [
          {
            n: 1, icon: '🏛️', title: '展厅探秘', doneKey: 'sub1Done',
            sections: [
              {
                id: 'exhibition', targetKey: 'exhibition',
                hint: '展厅里藏着许多小秘密，写下你发现的信息！',
                fields: [
                  { id: 'd1', type: 'textarea', label: '📍 关于这里的地理位置和区域分布', placeholder: '你在地图上发现了什么？', rows: 3 },
                  { id: 'd2', type: 'textarea', label: '🤖 传统农业 vs 现代农业有哪些不同？', placeholder: '比如无人机喷药、直播卖米…', rows: 3 },
                  { id: 'd3', type: 'textarea', label: '🍚 大米有哪些不同的产品形式？', placeholder: '你看到了哪些大米的包装或产品？', rows: 3 },
                  { id: 'count', type: 'number', label: '我一共发现了___个秘密！', placeholder: '?' },
                ],
              },
            ],
          },
          {
            n: 2, icon: '⚙️', title: '车间高科技', doneKey: 'sub2Done',
            sections: [
              {
                id: 'equipment_section', targetKey: null,
                hint: '稻米生产车间里有哪些高新科技？记录下来！',
                fields: [
                  { id: 'equipment', type: 'table', rows: 4, rowLabel: '设备',
                    columns: [
                      { id: 'name',     label: '名称',       placeholder: '名称' },
                      { id: 'function', label: '它的作用是…', placeholder: '它的作用是…' },
                    ] },
                ],
              },
            ],
          },
          {
            n: 3, icon: '💡', title: '我还发现…', doneKey: 'sub3Done', isLast: true,
            sections: [
              {
                id: 'extra', targetKey: 'extra',
                hint: '你还发现了什么特别有趣的事情？自由记录！',
                fields: [
                  { id: 'text', type: 'textarea', placeholder: '写下任何你觉得有意思的发现，比如机器的声音、米的颜色、工人叔叔做的事…', rows: 6 },
                  { id: 'mood', type: 'emoji_picker', label: '此刻心情', options: ['😮', '😊', '🤔', '😎', '🤩', '😄'] },
                ],
              },
            ],
          },
        ],
      },
      after: {
        mode: 'form',
        title: '行后总结',
        icon: '💬',
        sections: [
          {
            id: 'resolved_section', targetKey: null,
            title: '🔄 行前的问题，现在有答案了吗？',
            fields: [
              { id: 'resolved', type: 'question_resolve', sourcePhase: 'before', sourceField: 'questions' },
            ],
          },
          {
            id: 'reflection_section', targetKey: null,
            title: '📝 我的研学感想',
            fields: [
              { id: 'reflection', type: 'textarea', rows: 6,
                placeholder: '写下这次研学最让你印象深刻的事，学到了什么，有什么想说的…' },
            ],
          },
          {
            id: 'finalMood_section', targetKey: null,
            title: '这次研学我的总体感受',
            fields: [
              { id: 'finalMood', type: 'emoji_picker', options: ['😊', '🤩', '😄', '🤔', '😮', '💪'] },
            ],
          },
        ],
      },
    },
  },
  {
    id: 2, journalEnabled: false,
    title: '蚕桑古法抽丝挑战',
    description: '前往蚕桑基地，亲手体验从蚕茧到丝线的古法缫丝过程，完成「现代版古法抽丝」闯关挑战。',
    grade: '三至五年级', gradeRange: [3, 5], location: '桐乡蚕桑基地',
    duration: '半天', capacity: 30, enrolled: 28, status: '招募中', difficulty: '初级',
    tags: ['蚕桑', '手工体验', '非遗文化'], startDate: '2026-04-15', organizer: '浙江传媒学院桐乡研究院',
  },
  {
    id: 3, journalEnabled: false,
    title: '濮商会馆历史探秘',
    description: '走进濮商会馆，扮演古代濮商，在老师带领下探索桐乡丝绸贸易的千年历史，完成「濮商小伙伴」成就。',
    grade: '六至八年级', gradeRange: [6, 8], location: '濮商会馆 · 濮院古镇',
    duration: '一天', capacity: 40, enrolled: 40, status: '已满', difficulty: '中级',
    tags: ['历史文化', '角色扮演', '丝绸之路'], startDate: '2026-04-20', organizer: '濮院镇文化旅游局',
  },
  {
    id: 4, journalEnabled: false,
    title: '杉林秘境自然研学',
    description: '走进红旗漾村杉林部落，在专业自然导师带领下完成植物识别、生态记录等任务，制作属于自己的自然日记。',
    grade: '三至六年级', gradeRange: [3, 6], location: '杉林部落 · 红旗漾村',
    duration: '一天', capacity: 25, enrolled: 10, status: '招募中', difficulty: '初级',
    tags: ['自然教育', '植物科普', '户外探索'], startDate: '2026-05-01', organizer: '濮院镇乡村旅游发展中心',
  },
  {
    id: 5, journalEnabled: false,
    title: '稻田迷宫农耕文化日',
    description: '穿越喜漾农耕园的艺术稻田迷宫，学习水稻种植知识，体验农耕文化，感受「粒粒皆辛苦」的深层含义。',
    grade: '一至四年级', gradeRange: [1, 4], location: '喜漾农耕园',
    duration: '一天', capacity: 50, enrolled: 20, status: '即将开始', difficulty: '初级',
    tags: ['农耕文化', '自然教育', '亲子活动'], startDate: '2026-05-10', organizer: '喜漾农耕园教育基地',
  },
  {
    id: 6, journalEnabled: false,
    title: '蓝印花布印染工坊',
    description: '由非遗传承人胡耀飞老师亲授蓝印花布印染技艺，设计专属图案，完成一块独一无二的蓝印花布作品带回家。',
    grade: '四至八年级', gradeRange: [4, 8], location: '桐乡非遗传承工坊',
    duration: '半天', capacity: 20, enrolled: 15, status: '招募中', difficulty: '中级',
    tags: ['蓝印花布', '非遗技艺', '创意制作'], startDate: '2026-04-25', organizer: '桐乡市非物质文化遗产保护中心',
  },
]

// Auto-init tasks.json
if (!fs.existsSync(TASKS_FILE)) writeJSON(TASKS_FILE, DEFAULT_TASKS)

// ── MIME helper ──────────────────────────────────────────
const MIMES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
}
function mimeFor(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  return MIMES[ext] || 'application/octet-stream'
}

// ── server ───────────────────────────────────────────────
http.createServer(async (req, res) => {
  const url   = new URL(req.url, `http://localhost:${PORT}`)
  const route = url.pathname.replace(/\/$/, '') || '/'

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.writeHead(204); res.end(); return
  }

  // ── Static file serving: GET /uploads/tasks/:id/:filename
  const mTaskStatic = route.match(/^\/uploads\/tasks\/(\d+)\/([^/]+)$/)
  if (req.method === 'GET' && mTaskStatic) {
    const [, id, filename] = mTaskStatic
    if (filename.includes('..') || filename.includes('/')) return send(res, 400, { error: 'Invalid filename' })
    const filepath = path.join(UPLOADS_DIR, 'tasks', id, filename)
    if (!fs.existsSync(filepath)) return send(res, 404, { error: 'File not found' })
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', mimeFor(filename))
    res.writeHead(200)
    fs.createReadStream(filepath).pipe(res)
    return
  }

  // ── Static file serving: GET /uploads/groups/:code/:filename
  const mStatic = route.match(/^\/uploads\/groups\/([^/]+)\/([^/]+)$/)
  if (req.method === 'GET' && mStatic) {
    const [, code, filename] = mStatic
    // Sanitize: no path traversal
    if (filename.includes('..') || filename.includes('/')) return send(res, 400, { error: 'Invalid filename' })
    const filepath = path.join(UPLOADS_DIR, 'groups', code, filename)
    if (!fs.existsSync(filepath)) return send(res, 404, { error: 'File not found' })
    const mime = mimeFor(filename)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', mime)
    res.writeHead(200)
    fs.createReadStream(filepath).pipe(res)
    return
  }

  // ── Tasks CRUD ───────────────────────────────────────────

  // GET /tasks
  if (req.method === 'GET' && route === '/tasks') {
    const tasks = readJSON(TASKS_FILE) || DEFAULT_TASKS
    return send(res, 200, tasks)
  }

  // GET /tasks/:id
  const mTaskGet = route.match(/^\/tasks\/(\d+)$/)
  if (req.method === 'GET' && mTaskGet) {
    const tasks = readJSON(TASKS_FILE) || DEFAULT_TASKS
    const task  = tasks.find(t => t.id === parseInt(mTaskGet[1]))
    if (!task) return send(res, 404, { error: '任务不存在' })
    return send(res, 200, task)
  }

  // POST /tasks — admin create
  const mTaskPost = route.match(/^\/tasks$/)
  if (req.method === 'POST' && mTaskPost) {
    const body  = await parseBody(req)
    const tasks = readJSON(TASKS_FILE) || DEFAULT_TASKS
    const maxId = tasks.reduce((m, t) => Math.max(m, t.id || 0), 0)
    const task  = { ...body, id: maxId + 1 }
    tasks.push(task)
    writeJSON(TASKS_FILE, tasks)
    return send(res, 201, task)
  }

  // PUT /tasks/:id — admin update
  const mTaskPut = route.match(/^\/tasks\/(\d+)$/)
  if (req.method === 'PUT' && mTaskPut) {
    const id    = parseInt(mTaskPut[1])
    const body  = await parseBody(req)
    const tasks = readJSON(TASKS_FILE) || DEFAULT_TASKS
    const idx   = tasks.findIndex(t => t.id === id)
    if (idx === -1) return send(res, 404, { error: '任务不存在' })
    tasks[idx] = { ...tasks[idx], ...body, id }
    writeJSON(TASKS_FILE, tasks)
    return send(res, 200, tasks[idx])
  }

  // DELETE /tasks/:id — admin delete (refuse if groups reference it)
  const mTaskDel = route.match(/^\/tasks\/(\d+)$/)
  if (req.method === 'DELETE' && mTaskDel) {
    const id    = parseInt(mTaskDel[1])
    const tasks = readJSON(TASKS_FILE) || DEFAULT_TASKS
    const idx   = tasks.findIndex(t => t.id === id)
    if (idx === -1) return send(res, 404, { error: '任务不存在' })
    if (tasks[idx].isDefault) return send(res, 403, { error: '默认任务不可删除' })
    // Check if any group references this task
    const refs = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json') && f !== 'tasks.json')
      .some(f => { const d = readJSON(path.join(DATA_DIR, f)); return d?.taskId === id })
    if (refs) return send(res, 409, { error: '已有小组使用此任务，无法删除' })
    tasks.splice(idx, 1)
    writeJSON(TASKS_FILE, tasks)
    return send(res, 200, { ok: true })
  }

  // POST /tasks/:id/images — upload a cover image (base64)
  const mTaskImgUp = route.match(/^\/tasks\/(\d+)\/images$/)
  if (req.method === 'POST' && mTaskImgUp) {
    const id    = parseInt(mTaskImgUp[1])
    const tasks = readJSON(TASKS_FILE) || DEFAULT_TASKS
    const idx   = tasks.findIndex(t => t.id === id)
    if (idx === -1) return send(res, 404, { error: '任务不存在' })
    const body = await parseBody(req)
    const { filename, data: b64 } = body
    if (!filename || !b64) return send(res, 400, { error: '缺少文件数据' })
    const safeName    = filename.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '_').slice(0, 100)
    const fileId      = `${Date.now()}_${safeName}`
    const uploadDir   = path.join(UPLOADS_DIR, 'tasks', String(id))
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    const base64Data  = b64.replace(/^data:[^;]+;base64,/, '')
    if (Buffer.byteLength(base64Data, 'base64') > 10 * 1024 * 1024)
      return send(res, 400, { error: '图片过大，最大 10MB' })
    fs.writeFileSync(path.join(uploadDir, fileId), Buffer.from(base64Data, 'base64'))
    const imgUrl = `/txyx/api/uploads/tasks/${id}/${fileId}`
    if (!tasks[idx].images) tasks[idx].images = []
    tasks[idx].images.push(imgUrl)
    writeJSON(TASKS_FILE, tasks)
    return send(res, 200, { ok: true, url: imgUrl, images: tasks[idx].images })
  }

  // DELETE /tasks/:id/images/:filename — delete a cover image
  const mTaskImgDel = route.match(/^\/tasks\/(\d+)\/images\/(.+)$/)
  if (req.method === 'DELETE' && mTaskImgDel) {
    const id       = parseInt(mTaskImgDel[1])
    const filename = decodeURIComponent(mTaskImgDel[2])
    if (filename.includes('..')) return send(res, 400, { error: 'Invalid filename' })
    const tasks = readJSON(TASKS_FILE) || DEFAULT_TASKS
    const idx   = tasks.findIndex(t => t.id === id)
    if (idx === -1) return send(res, 404, { error: '任务不存在' })
    // Only delete files from uploads dir (not static public images)
    if (filename.includes('/uploads/tasks/')) {
      const base = filename.split('/').pop()
      const fp   = path.join(UPLOADS_DIR, 'tasks', String(id), base)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }
    tasks[idx].images = (tasks[idx].images || []).filter(u => u !== filename)
    writeJSON(TASKS_FILE, tasks)
    return send(res, 200, { ok: true, images: tasks[idx].images })
  }

  // ── File upload ───────────────────────────────────────────

  // POST /groups/:code/upload/:phase
  const mUpload = route.match(/^\/groups\/(\w+)\/upload\/(phase[123])$/)
  if (req.method === 'POST' && mUpload) {
    const [, code, phaseKey] = mUpload
    const body = await parseBody(req)
    const file = groupFile(code)
    const d    = readJSON(file)
    if (!d) return send(res, 404, { error: '找不到该组号' })

    const { filename, type, data: b64 } = body
    if (!filename || !b64) return send(res, 400, { error: '缺少文件数据' })

    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '_').slice(0, 100)
    const id       = `${phaseKey}_${Date.now()}_${safeName}`

    // Write file
    const groupUploadDir = path.join(UPLOADS_DIR, 'groups', code)
    if (!fs.existsSync(groupUploadDir)) fs.mkdirSync(groupUploadDir, { recursive: true })

    const base64Data = b64.replace(/^data:[^;]+;base64,/, '')
    fs.writeFileSync(path.join(groupUploadDir, id), Buffer.from(base64Data, 'base64'))

    // Update group doc
    if (!d[phaseKey]) d[phaseKey] = {}
    if (!d[phaseKey].files) d[phaseKey].files = []
    const size = Buffer.byteLength(base64Data, 'base64')
    if (size > 20 * 1024 * 1024) {
      fs.unlinkSync(path.join(groupUploadDir, id))
      return send(res, 400, { error: '文件过大，最大 20MB' })
    }
    d[phaseKey].files.push({ id, filename: safeName, type: type || mimeFor(safeName), size })
    d[phaseKey].mode = 'file_upload'
    d.updatedAt = new Date().toISOString()
    writeJSON(file, d)
    return send(res, 200, { ok: true, files: d[phaseKey].files })
  }

  // DELETE /groups/:code/file/:phase/:id
  const mFileDel = route.match(/^\/groups\/(\w+)\/file\/(phase[123])\/(.+)$/)
  if (req.method === 'DELETE' && mFileDel) {
    const [, code, phaseKey, fileId] = mFileDel
    if (fileId.includes('..') || fileId.includes('/')) return send(res, 400, { error: 'Invalid file id' })
    const file = groupFile(code)
    const d    = readJSON(file)
    if (!d) return send(res, 404, { error: '找不到该组号' })
    const filepath = path.join(UPLOADS_DIR, 'groups', code, fileId)
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath)
    if (d[phaseKey]?.files) {
      d[phaseKey].files = d[phaseKey].files.filter(f => f.id !== fileId)
    }
    d.updatedAt = new Date().toISOString()
    writeJSON(file, d)
    return send(res, 200, { ok: true, files: d[phaseKey]?.files || [] })
  }

  // ── Groups ───────────────────────────────────────────────

  // GET /groups/:code/status
  const mStatus = route.match(/^\/groups\/(\w+)\/status$/)
  if (req.method === 'GET' && mStatus) {
    const d = readJSON(groupFile(mStatus[1]))
    if (!d) return send(res, 200, { exists: false, hasPassword: false, taskId: null })
    return send(res, 200, { exists: true, hasPassword: !!d.password, taskId: d.taskId || null })
  }

  // POST /groups/:code/init
  const mInit = route.match(/^\/groups\/(\w+)\/init$/)
  if (req.method === 'POST' && mInit) {
    const code = mInit[1]
    const body = await parseBody(req)
    const file = groupFile(code)
    const d    = readJSON(file)
    if (!d) return send(res, 404, { error: '该组号不存在，请联系老师' })
    if (d.password) return send(res, 409, { error: '该组已设置密码，请直接登录' })
    const pwd = String(body.password || '')
    if (!/^\d{4}$/.test(pwd)) return send(res, 400, { error: '请设置4位数字密码' })
    const updated = {
      ...d,
      password:  pwd,
      school:    body.school  || '',
      members:   body.members || [],
      updatedAt: new Date().toISOString(),
    }
    writeJSON(file, updated)
    return send(res, 200, safe(updated))
  }

  // PATCH /groups/:code — admin update taskId
  const mPatch = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'PATCH' && mPatch) {
    const code = mPatch[1]
    const body = await parseBody(req)
    const file = groupFile(code)
    const d    = readJSON(file)
    if (!d) return send(res, 404, { error: '找不到该组号' })
    d.taskId    = body.taskId || null
    d.updatedAt = new Date().toISOString()
    writeJSON(file, d)
    return send(res, 200, { ok: true, taskId: d.taskId })
  }

  // PUT /groups/:code — admin pre-create empty group
  const mPut = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'PUT' && mPut) {
    const code = mPut[1]
    const body = await parseBody(req)
    const file = groupFile(code)
    if (fs.existsSync(file)) return send(res, 409, { error: `组号 "${code}" 已存在` })
    const doc = {
      code,
      taskId:    body.taskId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    writeJSON(file, doc)
    return send(res, 201, doc)
  }

  // DELETE /groups/:code
  const mDel = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'DELETE' && mDel) {
    const code = mDel[1]
    const file = groupFile(code)
    const d    = readJSON(file)
    if (!d) return send(res, 404, { error: '找不到该组号' })
    if (d.password && (d.phase1 || d.phase2 || d.phase3)) {
      return send(res, 409, { error: '该组已有填报数据，无法删除' })
    }
    fs.unlinkSync(file)
    return send(res, 200, { ok: true })
  }

  // GET /groups
  if (req.method === 'GET' && route === '/groups') {
    const list = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json') && f !== 'tasks.json')
      .map(f => { const d = readJSON(path.join(DATA_DIR, f)); return d ? safe(d) : null })
      .filter(Boolean)
      .sort((a, b) => a.code.localeCompare(b.code))
    return send(res, 200, list)
  }

  // GET /groups/:code/full
  const mFull = route.match(/^\/groups\/(\w+)\/full$/)
  if (req.method === 'GET' && mFull) {
    const d = readJSON(groupFile(mFull[1]))
    if (!d) return send(res, 404, { error: '找不到该组号' })
    return send(res, 200, d)
  }

  // GET /groups/:code?pwd=xxxx
  const mGet = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'GET' && mGet) {
    const d = readJSON(groupFile(mGet[1]))
    if (!d) return send(res, 404, { error: '找不到该组号，请先创建' })
    if (d.password !== url.searchParams.get('pwd'))
      return send(res, 403, { error: '密码不正确' })
    return send(res, 200, safe(d))
  }

  // POST /groups/:code
  const mPost = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'POST' && mPost) {
    const code = mPost[1]
    const body = await parseBody(req)
    const file = groupFile(code)
    const existing = readJSON(file)

    if (existing) {
      if (existing.password !== body.password)
        return send(res, 403, { error: '密码不正确' })
      const updated = { ...existing, ...body, code, updatedAt: new Date().toISOString() }
      writeJSON(file, updated)
      return send(res, 200, safe(updated))
    } else {
      if (!body.password) return send(res, 400, { error: '首次使用请设置密码' })
      const doc = {
        code,
        password:  body.password,
        taskId:    body.taskId || null,
        school:    body.school  || '',
        members:   body.members || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phase1: body.phase1 || null,
        phase2: body.phase2 || null,
        phase3: body.phase3 || null,
      }
      writeJSON(file, doc)
      return send(res, 201, safe(doc))
    }
  }

  send(res, 404, { error: 'Not found' })

}).listen(PORT, () =>
  console.log(`[桐乡研学 API] 已启动 → http://localhost:${PORT}   数据目录: ${DATA_DIR}`)
)
