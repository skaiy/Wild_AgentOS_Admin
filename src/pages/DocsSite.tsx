import { BookOpen, ExternalLink } from 'lucide-react';

/** 文档站挂载路径（与 docs-site 的 docusaurus baseUrl 一致，nginx 同容器子路径提供）。 */
export const DOCS_SITE_PATH = '/docs-site/';

export default function DocsSite() {
  return (
    <div className="flex h-full min-h-[600px] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">平台文档</h1>
            <p className="mt-1 text-sm text-gray-500">
              项目说明、版本说明、Agent 开发手册、前端管理平台与后端内核文档（Docusaurus 文档站）
            </p>
          </div>
        </div>
        <a
          href={DOCS_SITE_PATH}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <ExternalLink className="h-4 w-4" /> 新窗口打开
        </a>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <iframe
          src={DOCS_SITE_PATH}
          title="平台文档站"
          className="h-full min-h-[600px] w-full border-0"
        />
      </div>
    </div>
  );
}
