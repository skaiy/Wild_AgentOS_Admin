import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import TruncatedText from '../TruncatedText';

export interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'slate';
  delay?: number;
  onClick?: () => void;
}

const TONES: Record<string, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-50', fg: 'text-blue-600' },
  green: { bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  purple: { bg: 'bg-purple-50', fg: 'text-purple-600' },
  amber: { bg: 'bg-amber-50', fg: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', fg: 'text-rose-600' },
  slate: { bg: 'bg-slate-100', fg: 'text-slate-600' },
};

export function KpiCard({ label, value, hint, icon: Icon, tone = 'blue', delay = 0, onClick }: KpiCardProps) {
  const palette = TONES[tone] ?? TONES.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`rounded-xl border border-gray-100 bg-white p-5 shadow-sm ${
        onClick ? 'cursor-pointer transition-shadow hover:border-blue-200 hover:shadow-md' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className={`shrink-0 rounded-lg p-2.5 ${palette.bg}`}>
          <Icon className={`h-5 w-5 ${palette.fg}`} />
        </div>
        {hint && <TruncatedText text={hint} className="min-w-0 text-right text-xs font-medium text-gray-400" fallback={null} />}
      </div>
      <h3 className="text-sm font-medium text-gray-500">
        <TruncatedText text={label} className="block" />
      </h3>
      <TruncatedText as="p" text={value} className="mt-1 text-2xl font-bold text-gray-900" />
    </motion.div>
  );
}

export interface PanelProps {
  title: string;
  icon: LucideIcon;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  delay?: number;
  children: ReactNode;
}

export function Panel({ title, icon: Icon, hint, actionLabel, onAction, className = '', delay = 0, children }: PanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-gray-400" />
          <h2 className="min-w-0 truncate text-base font-bold text-gray-900">{title}</h2>
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {actionLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          hint && <TruncatedText text={hint} className="min-w-0 text-right text-xs text-gray-400" fallback={null} />
        )}
      </div>
      <div className="flex-1">{children}</div>
    </motion.section>
  );
}

/** 键值行：右侧为强调值，支持副标题。 */
export function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-50 py-2 last:border-0">
      <TruncatedText text={label} className="min-w-0 flex-1 text-sm text-gray-500" />
      <span className="flex min-w-0 max-w-[65%] items-baseline justify-end gap-2 text-right">
        <TruncatedText text={value} className="min-w-0 text-sm font-semibold text-gray-900" />
        {sub && <TruncatedText text={sub} className="min-w-0 shrink text-xs text-gray-400" />}
      </span>
    </div>
  );
}

/** 占比条：用于分类分布的轻量可视化。 */
export function DistributionBar({ items, total, colors }: { items: { name: string; value: number }[]; total: number; colors?: string[] }) {
  const palette = colors ?? ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-slate-400'];
  if (total <= 0 || items.length === 0) {
    return <p className="py-3 text-sm text-gray-400">暂无数据</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-100">
        {items.map((item, index) => (
          <div
            key={item.name}
            className={palette[index % palette.length]}
            style={{ width: `${(item.value / total) * 100}%` }}
            title={`${item.name}: ${item.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {items.map((item, index) => (
          <span key={item.name} className="flex min-w-0 max-w-[12rem] items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${palette[index % palette.length]}`} />
            <TruncatedText text={item.name} className="min-w-0 flex-1" />
            <span className="shrink-0 font-semibold text-gray-700">{item.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function EmptyHint({ icon: Icon, text, sub }: { icon: LucideIcon; text: string; sub?: string }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center text-gray-400">
      <Icon className="mb-2 h-8 w-8 text-gray-300" />
      <p className="text-sm">{text}</p>
      {sub && <p className="mt-1 text-xs">{sub}</p>}
    </div>
  );
}

export function Badge({ label, tone = 'slate' }: { label: string; tone?: 'slate' | 'green' | 'amber' | 'rose' | 'blue' | 'purple' }) {
  const map: Record<string, string> = {
    slate: 'bg-gray-100 text-gray-600 border-gray-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <TruncatedText text={label} className={`max-w-[8rem] shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${map[tone]}`} />
  );
}
