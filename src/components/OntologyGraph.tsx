import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ObjectType, LinkType } from '../api/client';

/** Tailwind 色名 → 十六进制（与本体对象的 color 字段对应）。 */
const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', indigo: '#6366f1', slate: '#64748b', violet: '#8b5cf6',
  amber: '#f59e0b', rose: '#f43f5e', orange: '#f97316', cyan: '#06b6d4',
  emerald: '#10b981', teal: '#14b8a6', lime: '#84cc16', sky: '#0ea5e9',
  zinc: '#71717a', green: '#22c55e', purple: '#a855f7',
};
function hex(c: string): string { return COLOR_HEX[c] ?? '#6366f1'; }

const CARD_LABEL: Record<string, string> = {
  one_to_one: '1:1', one_to_many: '1:N', many_to_one: 'N:1', many_to_many: 'N:N',
};

interface OntologyGraphProps {
  objectTypes: ObjectType[];
  linkTypes: LinkType[];
  height?: number;
}

/** 本体对象模型的力导向可视化：对象类型为节点，链接类型为有向边。 */
export default function OntologyGraph({ objectTypes, linkTypes, height = 560 }: OntologyGraphProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const byId = new Map(objectTypes.map((o) => [o.id, o]));
    // 节点出入度决定大小。
    const degree = new Map<string, number>();
    linkTypes.forEach((l) => {
      degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
      degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
    });
    const maxDeg = Math.max(1, ...Array.from(degree.values()));

    const nodes = objectTypes.map((o) => ({
      id: o.id,
      name: o.label,
      value: o.properties.length,
      symbolSize: 30 + ((degree.get(o.id) ?? 0) / maxDeg) * 34,
      itemStyle: { color: hex(o.color) },
      _obj: o,
    }));

    const links = linkTypes
      .filter((l) => byId.has(l.source) && byId.has(l.target))
      .map((l) => ({
        source: l.source,
        target: l.target,
        label: l.label,
        _card: CARD_LABEL[l.cardinality] ?? '',
        _desc: l.description,
      }));

    chart.setOption({
      tooltip: {
        formatter: (p: any) => {
          if (p.dataType === 'edge') {
            return `${byId.get(p.data.source)?.label ?? p.data.source} —[${p.data.label} · ${p.data._card}]→ ${byId.get(p.data.target)?.label ?? p.data.target}<br/><span style="color:#888;font-size:11px">${p.data._desc}</span>`;
          }
          const o: ObjectType = p.data._obj;
          return `<b>${o.label}</b> <span style="color:#888">(${o.id})</span><br/><span style="color:#666;font-size:12px">${o.description}</span><br/><span style="color:#9333ea;font-size:11px">${o.properties.length} 个属性 · 主键 ${o.primary_key}</span>`;
        },
      },
      animationDuration: 700,
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          label: { show: true, position: 'right', fontSize: 12, fontWeight: 'bold', color: '#1f2937' },
          edgeLabel: { show: true, fontSize: 10, color: '#9333ea', formatter: (p: any) => p.data.label },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 8,
          lineStyle: { color: '#cbd5e1', width: 1.4, curveness: 0.14, opacity: 0.9 },
          emphasis: { focus: 'adjacency', lineStyle: { width: 3.5 } },
          force: { repulsion: 420, edgeLength: 150, gravity: 0.06 },
          data: nodes,
          links,
        },
      ],
    });
  }, [objectTypes, linkTypes]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
