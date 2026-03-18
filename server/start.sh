#!/bin/bash
# 桐乡研学 API 进程管理脚本
# 用法: ./start.sh [start|stop|restart|status|log]

DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$DIR/api.pid"
LOG_FILE="$DIR/api.log"
NODE_CMD="$(which node)"

start() {
  if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✅ API 已在运行 (PID: $(cat "$PID_FILE"))"
    return
  fi
  nohup "$NODE_CMD" "$DIR/index.js" >> "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1
  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "✅ API 已启动 (PID: $(cat "$PID_FILE")，端口: 3001)"
  else
    echo "❌ 启动失败，查看日志: $LOG_FILE"
  fi
}

stop() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill "$PID" 2>/dev/null; then
      rm -f "$PID_FILE"
      echo "⏹ API 已停止 (PID: $PID)"
    else
      rm -f "$PID_FILE"
      echo "⚠️  进程不存在，已清理 PID 文件"
    fi
  else
    echo "⚠️  API 未运行"
  fi
}

case "${1:-start}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; sleep 1; start ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ 运行中 (PID: $(cat "$PID_FILE"))"
    else
      echo "⏹ 未运行"
    fi ;;
  log) tail -f "$LOG_FILE" ;;
  *) echo "用法: $0 [start|stop|restart|status|log]" ;;
esac
