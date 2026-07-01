import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Loader2 } from 'lucide-react';

export default function Documentation() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/architecture_vision.md')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load documentation:', err);
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">架构与愿景</h1>
          <p className="text-sm text-gray-500 mt-1">Wild Agent OS 架构设计及应用前景</p>
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
             prose-li:mb-2 prose-strong:text-gray-900 prose-strong:font-semibold"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
