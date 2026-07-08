import { useState, useEffect, isValidElement, cloneElement } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, Loader2 } from 'lucide-react';

/**
 * 页内锚点 slug（确定性）：与源/在线手册目录里的 [文案](#slug) 保持同一算法，
 * 从而中文标题（含全角空格）也能精确命中。规则：小写 → 空白（含全角 U+3000）转连字符
 * → 仅保留字母/数字/下划线/中日韩汉字/连字符 → 折叠多余连字符。
 */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\s\u3000]+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 递归提取 ReactMarkdown 传入标题的纯文本，用于生成锚点 id。 */
function textOf(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  if (isValidElement(children)) return textOf((children.props as { children?: ReactNode }).children);
  return '';
}

/** 生成带确定性 id 的标题组件；scroll-mt 让锚点跳转不被页面顶部遮挡。 */
const heading = (Tag: 'h1' | 'h2' | 'h3' | 'h4') =>
  function Heading({ children, ...props }: { children?: ReactNode }) {
    return (
      <Tag id={slugify(textOf(children))} className="scroll-mt-24" {...props}>
        {children}
      </Tag>
    );
  };

/** 递归处理 ReactNode 节点，将其中的 `<br>` 文本/HTML 替换为真实的 `<br />` 组件，用以正确在 markdown 表格内换行。 */
function renderContentWithBr(children: ReactNode): ReactNode {
  if (typeof children === 'string') {
    if (/<br\s*\/?>/i.test(children)) {
      const parts = children.split(/<br\s*\/?>/i);
      return parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && <br />}
        </span>
      ));
    }
    return children;
  }
  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <span key={index}>{renderContentWithBr(child)}</span>
    ));
  }
  if (isValidElement(children)) {
    const elementChildren = (children.props as { children?: ReactNode }).children;
    if (elementChildren) {
      return cloneElement(children as any, {}, renderContentWithBr(elementChildren));
    }
  }
  return children;
}

interface HeaderItem {
  text: string;
  level: number;
  slug: string;
}

export default function OperationsManual() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [headers, setHeaders] = useState<HeaderItem[]>([]);
  const [activeSlug, setActiveSlug] = useState('');

  useEffect(() => {
    fetch('/operations_manual.md')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load operations manual:', err);
        setError(true);
        setLoading(false);
      });
  }, []);

  // 解析 markdown 文本中的标题生成目录大纲
  useEffect(() => {
    if (!content) return;
    const lines = content.split('\n');
    const list: HeaderItem[] = [];
    for (const line of lines) {
      const match = line.match(/^(#{1,3})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        // 清理 markdown 粗体/链接等标识
        const cleanText = text.replace(/[\*_`]/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1');
        list.push({
          text: cleanText,
          level,
          slug: slugify(cleanText)
        });
      }
    }
    setHeaders(list);
    if (list.length > 0) {
      setActiveSlug(list[0].slug);
    }
  }, [content]);

  // 监听滚动更新 active 锚点
  useEffect(() => {
    if (headers.length === 0) return;

    const handleScroll = () => {
      let currentActive = '';
      for (const h of headers) {
        const el = document.getElementById(h.slug);
        if (el) {
          const rect = el.getBoundingClientRect();
          // 当标题划过顶部或接近顶部 (140px 以内)
          if (rect.top <= 140) {
            currentActive = h.slug;
          }
        }
      }
      if (currentActive) {
        setActiveSlug(currentActive);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headers]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">操作与开发手册</h1>
          <p className="text-sm text-gray-500 mt-1">Wild Agent OS 操作手册与 Agent 开发配置手册</p>
        </div>
      </div>

      <div className="flex gap-6 items-start">
        {/* 左侧主要内容 */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[500px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-500 gap-2 min-h-[400px]">
              <Loader2 className="w-6 h-6 animate-spin" /> 加载文档中...
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-500 h-[400px]">
              文档加载失败，请刷新重试。
            </div>
          ) : (
            <div className="prose prose-blue max-w-none text-gray-700
               prose-headings:text-gray-900 prose-headings:font-bold
               prose-h1:text-3xl prose-h1:border-b prose-h1:pb-4 prose-h1:mb-6
               prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
               prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
               prose-p:leading-relaxed prose-p:mb-4
               prose-ul:list-disc prose-ul:pl-5 md:prose-ul:pl-8 prose-ul:mb-4
               prose-ol:list-decimal prose-ol:pl-5 md:prose-ol:pl-8 prose-ol:mb-4
               prose-li:mb-2 prose-strong:text-gray-900 prose-strong:font-semibold
               prose-table:text-sm prose-th:bg-gray-50 prose-td:align-top
               prose-code:text-pink-600 prose-code:bg-gray-50 prose-code:px-1 prose-code:rounded
               prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-pre:border prose-pre:border-gray-200
               [&_pre_code]:text-gray-800 [&_pre_code]:bg-transparent"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: heading('h1'),
                  h2: heading('h2'),
                  h3: heading('h3'),
                  h4: heading('h4'),
                  // 页内锚点：拦截 # 开头链接改为平滑滚动，防止与 hash 路由冲突
                  a: ({ href, children, ...props }) => {
                    if (href && href.startsWith('#')) {
                      return (
                        <a
                          href={href}
                          onClick={(e) => {
                            e.preventDefault();
                            const el = document.getElementById(decodeURIComponent(href.slice(1)));
                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    }
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                        {children}
                      </a>
                    );
                  },
                  img: ({ node, ...props }) => (
                    <img
                      {...props}
                      loading="lazy"
                      className="rounded-lg border border-gray-200 shadow-sm my-4 max-w-full"
                    />
                  ),
                  td: ({ node, children, ...props }) => (
                    <td {...props}>{renderContentWithBr(children)}</td>
                  ),
                  th: ({ node, children, ...props }) => (
                    <th {...props}>{renderContentWithBr(children)}</th>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* 右侧悬浮目录大纲 */}
        {!loading && !error && headers.length > 0 && (
          <div className="w-64 shrink-0 sticky top-24 bg-white border border-gray-200 rounded-xl p-4 shadow-sm max-h-[calc(100vh-120px)] overflow-y-auto hidden xl:block">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">目录大纲</h3>
            <ul className="space-y-1">
              {headers.map((h, idx) => (
                <li
                  key={idx}
                  style={{ paddingLeft: `${(h.level - 1) * 10}px` }}
                >
                  <button
                    onClick={() => {
                      const el = document.getElementById(h.slug);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`text-left text-xs py-1.5 px-2.5 rounded w-full transition-all duration-200 block truncate ${
                      activeSlug === h.slug
                        ? 'text-blue-600 bg-blue-50/70 font-semibold border-l-2 border-blue-600 rounded-l-none'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    title={h.text}
                  >
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
