import type { ReactNode } from 'react';

export const TOOLTIP_MAX_CHARS = 500;

/** 悬浮提示文本：超长内容截断并附带原始长度，避免原生 tooltip 撑满屏幕。 */
export function tooltipText(value?: string | null, max = TOOLTIP_MAX_CHARS): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…（共 ${text.length} 字符）`;
}

/** 是否需要截断展示（用于决定是否附加悬浮提示）。 */
export function needsTruncation(value?: string | null, visible = 40): boolean {
  if (!value) return false;
  return String(value).trim().length > visible;
}

const CLAMP_CLASS: Record<number, string> = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
};

interface TruncatedTextProps {
  text?: string | null;
  /** 1 表示单行省略；大于 1 时按行数截断。 */
  lines?: number;
  className?: string;
  fallback?: ReactNode;
  as?: 'span' | 'div' | 'p';
  /** 关闭悬浮全文提示（例如已有自定义提示时）。 */
  noTooltip?: boolean;
}

/**
 * 统一的长文本展示：省略号截断 + 悬浮显示全文。
 * 单行模式依赖父容器具备 `min-w-0`，否则 flex 子项不会收缩。
 */
export function TruncatedText({
  text,
  lines = 1,
  className = '',
  fallback = '—',
  as = 'span',
  noTooltip = false,
}: TruncatedTextProps) {
  const value = text === null || text === undefined ? '' : String(text);
  const Tag = as;
  if (!value.trim()) {
    return <Tag className={className}>{fallback}</Tag>;
  }
  const clampClass = lines <= 1 ? 'truncate' : `${CLAMP_CLASS[lines] ?? 'line-clamp-3'} break-all`;
  return (
    <Tag className={`${clampClass} ${className}`.trim()} title={noTooltip ? undefined : tooltipText(value)}>
      {value}
    </Tag>
  );
}

export default TruncatedText;
