import ForceGraph3DView, { type Graph3DLink, type Graph3DNode } from './ForceGraph3DView';

/** 三元组结构：SPARQL `SELECT ?s ?p ?o` 的一行结果。 */
export interface Triple { [key: string]: string }

/** 取 IRI / 前缀名的可读短标签（保留最后一段）。 */
export function shortLabel(v: string): string {
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

/** 将 SPARQL 三元组转换为 3D 力导向图数据。 */
export function buildGraph(triples: Triple[]): { nodes: Graph3DNode[]; links: Graph3DLink[] } {
  const nodes = new Map<string, Graph3DNode>();
  const subjects = new Set<string>();
  triples.forEach((t) => subjects.add(t['?s']));
  const ensure = (id: string) => {
    if (!nodes.has(id)) {
      const isSubject = subjects.has(id);
      nodes.set(id, {
        id,
        label: shortLabel(id),
        category: isSubject ? '主语实体' : '宾语 / 属性值',
        color: isSubject ? '#818cf8' : '#34d399',
        value: 0,
      });
    }
    return nodes.get(id)!;
  };
  const links: Graph3DLink[] = [];
  triples.forEach((t) => {
    const s = t['?s'], p = t['?p'], o = t['?o'];
    if (!s || !o) return;
    ensure(s).value += 1;
    ensure(o).value += 1;
    links.push({
      source: s,
      target: o,
      label: shortLabel(p),
      color: '#a78bfa',
      description: p,
    });
  });
  return {
    nodes: Array.from(nodes.values()).map((node) => ({
      ...node,
      description: node.id,
      details: [`关联度 ${node.value}`],
    })),
    links,
  };
}

interface KgGraphProps { triples: Triple[]; height?: number }

/** 知识图谱三元组的 WebGL 3D 力导向可视化。 */
export default function KgGraph({ triples, height = 460 }: KgGraphProps) {
  const graph = buildGraph(triples);
  return (
    <ForceGraph3DView
      nodes={graph.nodes}
      links={graph.links}
      height={height}
      legend={[
        { label: '主语实体', color: '#818cf8' },
        { label: '宾语 / 属性值', color: '#34d399' },
      ]}
    />
  );
}
