// 桐乡研学 API — 纯 Node.js 内置模块，无需 npm install
import http from 'http'
import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT      = 3001
const DATA_DIR  = path.join(__dirname, 'data')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

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
function safe(d) {         // strip password before sending to client
  const { password, ...rest } = d
  return {
    ...rest,
    hasPassword: !!password,
    phase1Done:  !!d.phase1?.completedAt,
    phase2Done:  !!d.phase2?.completedAt,
    phase3Done:  !!d.phase3?.completedAt,
  }
}

// ── server ───────────────────────────────────────────────
http.createServer(async (req, res) => {
  const url   = new URL(req.url, `http://localhost:${PORT}`)
  const route = url.pathname.replace(/\/$/, '') || '/'

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.writeHead(204); res.end(); return
  }

  // GET /groups/:code/status — check existence for student
  const mStatus = route.match(/^\/groups\/(\w+)\/status$/)
  if (req.method === 'GET' && mStatus) {
    const d = readJSON(groupFile(mStatus[1]))
    if (!d) return send(res, 200, { exists: false, hasPassword: false })
    return send(res, 200, { exists: true, hasPassword: !!d.password })
  }

  // POST /groups/:code/init — first-time set password (only works if group has no password)
  const mInit = route.match(/^\/groups\/(\w+)\/init$/)
  if (req.method === 'POST' && mInit) {
    const code = mInit[1]
    const body = await parseBody(req)
    const file = groupFile(code)
    const d = readJSON(file)
    if (!d) return send(res, 404, { error: '该组号不存在，请联系老师' })
    if (d.password) return send(res, 409, { error: '该组已设置密码，请直接登录' })
    const pwd = String(body.password || '')
    if (!/^\d{4}$/.test(pwd)) return send(res, 400, { error: '请设置4位数字密码' })
    const updated = {
      ...d,
      password: pwd,
      school:   body.school  || '',
      members:  body.members || [],
      updatedAt: new Date().toISOString(),
    }
    writeJSON(file, updated)
    return send(res, 200, safe(updated))
  }

  // PUT /groups/:code — admin pre-create empty group (no password)
  const mPut = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'PUT' && mPut) {
    const code = mPut[1]
    const file = groupFile(code)
    if (fs.existsSync(file)) return send(res, 409, { error: `组号 "${code}" 已存在` })
    const doc = { code, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    writeJSON(file, doc)
    return send(res, 201, doc)
  }

  // DELETE /groups/:code — admin delete group
  const mDel = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'DELETE' && mDel) {
    const code = mDel[1]
    const file = groupFile(code)
    const d = readJSON(file)
    if (!d) return send(res, 404, { error: '找不到该组号' })
    if (d.password && (d.phase1 || d.phase2 || d.phase3)) {
      return send(res, 409, { error: '该组已有填报数据，无法删除' })
    }
    fs.unlinkSync(file)
    return send(res, 200, { ok: true })
  }

  // GET /groups — teacher list (no password)
  if (req.method === 'GET' && route === '/groups') {
    const list = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => { const d = readJSON(path.join(DATA_DIR, f)); return d ? safe(d) : null })
      .filter(Boolean)
      .sort((a, b) => a.code.localeCompare(b.code))
    return send(res, 200, list)
  }

  // GET /groups/:code/full — admin full view (includes password)
  const mFull = route.match(/^\/groups\/(\w+)\/full$/)
  if (req.method === 'GET' && mFull) {
    const d = readJSON(groupFile(mFull[1]))
    if (!d) return send(res, 404, { error: '找不到该组号' })
    return send(res, 200, d)   // 教师端，返回完整数据含密码
  }

  // GET /groups/:code?pwd=xxxx — student load
  const mGet = route.match(/^\/groups\/(\w+)$/)
  if (req.method === 'GET' && mGet) {
    const d = readJSON(groupFile(mGet[1]))
    if (!d) return send(res, 404, { error: '找不到该组号，请先创建' })
    if (d.password !== url.searchParams.get('pwd'))
      return send(res, 403, { error: '密码不正确' })
    return send(res, 200, safe(d))
  }

  // POST /groups/:code — create or update
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
