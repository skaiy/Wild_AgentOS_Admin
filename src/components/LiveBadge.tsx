/**
 * 实时/占位状态徽标：表示某块数据是否来自后端实时接口。
 */
interface Props {
  live: boolean;
  loading?: boolean;
  error?: string | null;
  liveText?: string;
  fallbackText?: string;
}

export default function LiveBadge({
  live,
  loading,
  error,
  liveText = '实时',
  fallbackText = '示例数据',
}: Props) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
        加载中
      </span>
    );
  }
  if (live) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        {liveText}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"
      title={error || '后端未连接，显示占位内容'}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      {fallbackText}
    </span>
  );
}
