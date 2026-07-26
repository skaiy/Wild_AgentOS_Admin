#!/usr/bin/env bash
# 构建项目内 docs-site（Docusaurus，baseUrl=/docs-site/）并嵌入管理台 public/docs-site，
# 使 vite build 后文档站与管理台同源、同容器提供服务（菜单「平台文档」以 iframe 内嵌）。
set -euo pipefail

ADMIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_SITE_DIR="$ADMIN_DIR/docs-site"
TARGET_DIR="$ADMIN_DIR/public/docs-site"

if [ ! -d "$DOCS_SITE_DIR" ]; then
  echo "未找到文档站目录：$DOCS_SITE_DIR" >&2
  exit 1
fi

if [ ! -d "$DOCS_SITE_DIR/node_modules" ]; then
  echo "安装文档站依赖…"
  npm --prefix "$DOCS_SITE_DIR" ci
fi

echo "构建文档站…"
npm --prefix "$DOCS_SITE_DIR" run build

echo "嵌入到 $TARGET_DIR"
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -R "$DOCS_SITE_DIR/build/." "$TARGET_DIR/"
# 镜像内 nginx 以非 root 读取静态文件，需保证可读权限（历史上 600 权限导致过 403）。
chmod -R a+rX "$TARGET_DIR"

echo "文档站已嵌入：$(find "$TARGET_DIR" -type f | wc -l | tr -d ' ') 个文件"
