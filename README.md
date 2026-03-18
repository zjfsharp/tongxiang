# 桐乡研学 — 部署文档

## 项目概述

桐乡石门湾研学落地页，包含：

- **主站**（`/txyx/`）— 研学资源展示、非遗传承人、石门湾基地介绍
- **研学日志**（`/txyx/journal.html`）— 学生填写行前/行中/行后记录
- **管理后台**（`/txyx/admin.html`）— 小组管理、研学记录对比查看
- **API 服务** — 纯 Node.js，端口 3001，数据存为 JSON 文件

---

## 环境要求

| 组件 | 版本要求 |
|------|---------|
| Node.js | ≥ 18（需支持 ES Modules） |
| nginx | 任意现代版本 |
| npm | ≥ 9（仅构建时需要） |

---

## 一、本地开发

```bash
# 1. 安装依赖（仅 vite，无其他依赖）
cd /path/to/tongxiang
npm install

# 2. 启动 API 服务（另开一个终端）
bash server/start.sh start

# 3. 启动前端开发服务器
npm run dev
# → http://localhost:5173/txyx/
```

开发时 vite 已配置代理，`/txyx/api/*` 自动转发到 `localhost:3001`，无需额外配置。

---

## 二、生产部署

### 第一步：构建前端静态文件

```bash
cd /path/to/tongxiang
npm install
npm run build
# 产物输出到 dist/ 目录
```

### 第二步：部署静态文件

将 `dist/` 目录内容复制到 nginx 的 web 根目录下的 `txyx/` 子目录：

```bash
cp -r dist/* /var/www/html/txyx/
```

> **注意**：`dist/` 里已包含 `images/` 等静态资源，直接复制即可。

### 第三步：配置 nginx

在 nginx 配置文件中（通常为 `/etc/nginx/sites-available/default` 或 `/etc/nginx/nginx.conf`）添加以下内容：

```nginx
# 前端静态文件
location /txyx/ {
    root /var/www/html;
    try_files $uri $uri/ /txyx/index.html;
}

# API 代理（追加在 /txyx/ 块之后）
location /txyx/api/ {
    proxy_pass         http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    # proxy_pass 末尾有 /，nginx 会自动去掉 /txyx/api 前缀
    # 即：/txyx/api/groups → http://127.0.0.1:3001/groups
}
```

重载 nginx：

```bash
nginx -t && nginx -s reload
```

### 第四步：启动 API 服务

```bash
cd /path/to/tongxiang
bash server/start.sh start
```

API 服务常用命令：

```bash
bash server/start.sh start    # 启动
bash server/start.sh stop     # 停止
bash server/start.sh restart  # 重启
bash server/start.sh status   # 查看状态
bash server/start.sh log      # 实时查看日志
```

服务启动后监听 `127.0.0.1:3001`，数据文件存放在 `server/data/` 目录，每个小组一个 JSON 文件（如 `server/data/A1.json`）。

---

## 三、访问地址

| 页面 | 地址 |
|------|------|
| 主站 | `https://your-domain.com/txyx/` |
| 学生研学日志 | `https://your-domain.com/txyx/journal.html?code=A1` |
| 管理后台 | `https://your-domain.com/txyx/admin.html` |
| 管理后台密码 | `tongxiang2026` |

---

## 四、小组管理流程

```
老师在管理后台 → 小组管理 → 输入组号（如 A1）→ 点「创建」
    ↓
学生访问主站 → 输入组号 → 首次登录设置 4 位数字密码
    ↓
学生填写行前 / 行中 / 行后记录，数据实时保存到服务器
    ↓
老师在管理后台 → 研学记录 → 横向对比各组填写情况
```

---

## 五、数据备份

小组数据全部存放在 `server/data/` 目录，定期备份该目录即可：

```bash
cp -r /path/to/tongxiang/server/data /backup/txyx-data-$(date +%Y%m%d)
```

---

## 六、常见问题

**API 无法连接**

```bash
bash server/start.sh status   # 确认服务在运行
bash server/start.sh log      # 查看错误日志
lsof -ti:3001                 # 检查端口占用
```

**前端页面 404**

检查 nginx 的 `try_files` 配置是否正确，以及 `dist/` 文件是否已复制到 `/var/www/html/txyx/`。

**更新前端内容**

```bash
npm run build
cp -r dist/* /var/www/html/txyx/
# 无需重启 API 服务
```

**更新 API 服务**

```bash
bash server/start.sh restart
```
