const fs = require('fs');
const path = require('path');

// Target paths
const DOCS_DIR = path.join(__dirname, 'docs');
const BACKEND_TARGET_DIR = path.join(DOCS_DIR, 'backend');

// Source paths
// content/ 为文档站自有正文（项目说明、版本说明、Agent 开发手册、前端管理平台），
// backend/ 由后端仓库 docs 目录同步而来，两者合并为最终 docs 树。
const CONTENT_SRC_DIR = path.join(__dirname, 'content');
const BACKEND_SRC_DIR = path.resolve(__dirname, '../../Wild_AgentOS/docs');
const ASSET_SRC_DIR = path.resolve(__dirname, '../public/manual-assets');

// 文档站对外公开，需去除本地开发机路径与客户可识别信息（统一为行业中性表述）。
const SANITIZE_RULES = [
  { from: /file:\/\/\/[^\s)）"'>]+/g, to: '' },
  { from: /\/Users\/[^\s)）"'>]+/g, to: '' },
  { from: /A2026003-[^\s)）"'>/]+/g, to: '' },
  { from: /中汽数据/g, to: '行业客户' },
  { from: /电驴数字化转型/g, to: '新能源汽车后市场数字化' },
  { from: /电驴科技/g, to: '业务中台系统' },
  { from: /电驴闪修/g, to: '上门维修业务系统' },
  { from: /电驴/g, to: '业务方' },
];

function cleanAndRecreateDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Cleaned and created directory: ${dir}`);
}

/** MDX 兼容化 + 公开脱敏。 */
function normalizeMarkdown(content) {
  let out = content;
  out = out.replace(/<br\s*\/?>/gi, '<br />');
  out = out.replace(/<hr\s*\/?>/gi, '<hr />');
  out = out.replace(/<img([^>]*?)\/?>/gi, '<img$1 />');
  for (const rule of SANITIZE_RULES) {
    out = out.replace(rule.from, rule.to);
  }
  return out;
}

function copyAndProcessMarkdown(src, dest, prependedContent = '') {
  const content = normalizeMarkdown(fs.readFileSync(src, 'utf8'));
  fs.writeFileSync(dest, prependedContent + content, 'utf8');
}

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((element) => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

/** 递归复制 content/ 下的文档：Markdown 走脱敏管道，其余（_category_.json 等）直接复制。 */
function copyContentTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(from)) {
    const fromPath = path.join(from, entry);
    const toPath = path.join(to, entry);
    if (fs.lstatSync(fromPath).isDirectory()) {
      count += copyContentTree(fromPath, toPath);
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      copyAndProcessMarkdown(fromPath, toPath);
      count += 1;
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
  return count;
}

function main() {
  console.log('Starting documentation synchronization...');

  cleanAndRecreateDir(DOCS_DIR);

  // 1. 文档站自有正文
  if (fs.existsSync(CONTENT_SRC_DIR)) {
    const count = copyContentTree(CONTENT_SRC_DIR, DOCS_DIR);
    console.log(`Synced ${count} authored documentation files from content/.`);
  } else {
    console.warn(`Warning: content directory not found at ${CONTENT_SRC_DIR}`);
  }

  // 2. 后端内核文档（来自后端仓库 docs/，优先中文版本）
  if (fs.existsSync(BACKEND_SRC_DIR)) {
    fs.mkdirSync(BACKEND_TARGET_DIR, { recursive: true });
    const files = fs.readdirSync(BACKEND_SRC_DIR);
    const EXCLUDED_FILES = new Set([
      '12_workspace-filesystem-monitor.md',
      'CODE_OF_CONDUCT.md',
      'CODE_OF_CONDUCT.zh.md',
    ]);
    let count = 0;
    files.forEach((file) => {
      if (EXCLUDED_FILES.has(file)) return;
      if (!file.endsWith('.md') && !file.endsWith('.mdx')) return;
      if (file.endsWith('.zh.md')) {
        copyAndProcessMarkdown(
          path.join(BACKEND_SRC_DIR, file),
          path.join(BACKEND_TARGET_DIR, file.replace('.zh.md', '.md')),
        );
        count++;
      } else {
        const zhFile = file.replace(/\.mdx?$/, '.zh.md');
        if (!files.includes(zhFile)) {
          copyAndProcessMarkdown(
            path.join(BACKEND_SRC_DIR, file),
            path.join(BACKEND_TARGET_DIR, file),
          );
          count++;
        }
      }
    });
    console.log(`Synced ${count} backend documentation files.`);

    fs.writeFileSync(
      path.join(BACKEND_TARGET_DIR, '_category_.json'),
      JSON.stringify(
        {
          label: '后端内核 (Wild AgentOS)',
          position: 5,
          link: {
            type: 'generated-index',
            description: 'Wild AgentOS 后端核心系统的设计与实现文档',
          },
        },
        null,
        2,
      ),
      'utf8',
    );
  } else {
    console.warn(`Warning: Backend docs source directory not found at ${BACKEND_SRC_DIR}`);
  }

  // 3. 静态图片资源（架构图与管理端截图）
  const assetDest = path.join(__dirname, 'static/manual-assets');
  if (fs.existsSync(ASSET_SRC_DIR)) {
    if (fs.existsSync(assetDest)) {
      fs.rmSync(assetDest, { recursive: true, force: true });
    }
    copyFolderSync(ASSET_SRC_DIR, assetDest);
    console.log('Copied manual-assets to static/manual-assets');
  }

  console.log('Documentation synchronization complete!');
}

main();
