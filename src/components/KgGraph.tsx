import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

/** 三元组结构：SPARQL `SELECT ?s ?p ?o` 的一行结果。 */
export interface Triple { [key: string]: string }

/** 取 IRI / 前缀名的可读短标签（保留最后一段）。 */
function shortLabel(v: string): string {
  if (!v) return '';
  let s = v.replace(/^<|>$/g, '');
  if (/^".*"/.test(s)) return s.replace(/^"|"(\^\^.*|@.*)?$/g, '');
  const hash = s.lastIndexOf('#');
  if (hash >= 0) return s.slice(hash + 1);
  const slash = s.lastIndexOf('/');
  if (slash >= 0 && slash < s.length - 1) return s.slice(slash + 1);
  const colon = s.lastIndexOf(':');
  if (colon >= 0) return s.slice(colon + 1);
  return s;
}

/** 将三元组转换为 ECharts graph 的 nodes / links。 */
function buildGraph(triples: Triple[]) {
  const nodes = new Map<string, { id: string; name: string; category: number; value: number }>();
  const subjects = new Set<string>();
  triples.forEach((t) => subjects.add(t['?s']));
  const ensure = (id: string) => {
    if (!nodes.has(id)) {
      nodes.set(id, { id, name: shortLabel(id), category: subjects.has(id) ? 0 : 1, value: 0 });
    }
    return nodes.get(id)!;
  };
  const links: { source: string; target: string; label: string }[] = [];
  triples.forEach((t) => {
    const s = t['?s'], p = t['?p'], o = t['?o'];
    if (!s || !o) return;
    ensure(s).value += 1;
    ensure(o).value += 1;
    links.push({ source: s, target: o, label: shortLabel(p) });
  });
  return { nodes: Array.from(nodes.values()), links };
}

interface KgGraphProps { triples: Triple[]; height?: number }

/** 知识图谱三元组的力导向可视化（ECharts graph + force 布局）。 */
export default function KgGraph({ triples, height = 460 }: KgGraphProps) {
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
    const { nodes, links } = buildGraph(triples);
    const maxVal = Math.max(1, ...nodes.map((n) => n.value));
    chart.setOption({
      tooltip: {
        formatter: (p: any) =>
          p.dataType === 'edge'
            ? `${shortLabel(p.data.source)} —[${p.data.label}]→ ${shortLabel(p.data.target)}`
            : `<b>${p.data.name}</b><br/><span style="color:#888;font-size:11px">${p.data.id}</span>`,
      },
      legend: [{ data: ['主语实体', '宾语 / 属性值'], top: 8, textStyle: { fontSize: 12 } }],
      animationDuration: 600,
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          categories: [{ name: '主语实体' }, { name: '宾语 / 属性值' }],
          color: ['#6366f1', '#10b981'],
          label: { show: true, position: 'right', fontSize: 11, color: '#374151' },
          edgeLabel: { show: true, fontSize: 10, color: '#9333ea', formatter: (p: any) => p.data.label },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 7,
          lineStyle: { color: '#cbd5e1', width: 1.2, curveness: 0.12, opacity: 0.9 },
          emphasis: { focus: 'adjacency', lineStyle: { width: 3 } },
          force: { repulsion: 220, edgeLength: 110, gravity: 0.08 },
          symbolSize: (_v: number, p: any) => 16 + (p.data.value / maxVal) * 30,
          data: nodes.map((n) => ({ ...n, symbolSize: 16 + (n.value / maxVal) * 30 })),
          links,
        },
      ],
    });
  }, [triples]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
