import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { isValidElement } from 'react';
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

export default function OperationsManual() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">操作与开发手册</h1>
          <p className="text-sm text-gray-500 mt-1">Wild Agent OS 操作手册与 Agent 开发配置手册</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[500px]">
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
                // 页内锚点：本控制台为 hash 路由（/#manual），原生 #anchor 会篡改路由，
                // 故拦截 # 开头链接改为 JS 平滑滚动；外链新开页签。
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
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
