import type { ObjectType, LinkType } from '../api/client';
import ForceGraph3DView, { type Graph3DLink, type Graph3DNode } from './ForceGraph3DView';

/** Tailwind 色名 → 十六进制（与本体对象的 color 字段对应）。 */
const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6', indigo: '#6366f1', slate: '#64748b', violet: '#8b5cf6',
  amber: '#f59e0b', rose: '#f43f5e', orange: '#f97316', cyan: '#06b6d4',
  emerald: '#10b981', teal: '#14b8a6', lime: '#84cc16', sky: '#0ea5e9',
  zinc: '#71717a', green: '#22c55e', purple: '#a855f7',
};
export function hex(c: string): string { return COLOR_HEX[c] ?? '#6366f1'; }

const CARD_LABEL: Record<string, string> = {
  one_to_one: '1:1', one_to_many: '1:N', many_to_one: 'N:1', many_to_many: 'N:N',
};

interface OntologyGraphProps {
  objectTypes: ObjectType[];
  linkTypes: LinkType[];
  height?: number;
}

/** 将对象类型与链接类型转换为 3D 本体图数据。 */
export function buildOntologyGraph(
  objectTypes: ObjectType[],
  linkTypes: LinkType[],
): { nodes: Graph3DNode[]; links: Graph3DLink[] } {
  const byId = new Map(objectTypes.map((objectType) => [objectType.id, objectType]));
  const degree = new Map<string, number>();
  linkTypes.forEach((linkType) => {
    degree.set(linkType.source, (degree.get(linkType.source) ?? 0) + 1);
    degree.set(linkType.target, (degree.get(linkType.target) ?? 0) + 1);
  });
  const nodes: Graph3DNode[] = objectTypes.map((objectType) => ({
    id: objectType.id,
    label: objectType.label,
    category: '本体对象类型',
    color: hex(objectType.color),
    value: Math.max(1, (degree.get(objectType.id) ?? 0) + objectType.properties.length),
    description: objectType.description,
    details: [
      `${objectType.properties.length} 个属性`,
      `主键 ${objectType.primary_key}`,
    ],
  }));
  const links: Graph3DLink[] = linkTypes
    .filter((linkType) => byId.has(linkType.source) && byId.has(linkType.target))
    .map((linkType) => ({
      source: linkType.source,
      target: linkType.target,
      label: `${linkType.label} · ${CARD_LABEL[linkType.cardinality] ?? ''}`,
      description: linkType.description,
      color: '#c084fc',
    }));
  return { nodes, links };
}

/** 本体对象模型的 WebGL 3D 力导向可视化。 */
export default function OntologyGraph({ objectTypes, linkTypes, height = 560 }: OntologyGraphProps) {
  const graph = buildOntologyGraph(objectTypes, linkTypes);
  return (
    <ForceGraph3DView
      nodes={graph.nodes}
      links={graph.links}
      height={height}
      legend={[{ label: '本体对象类型（按配置着色）', color: '#818cf8' }]}
    />
  );
}
