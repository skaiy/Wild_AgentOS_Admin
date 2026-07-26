import { useEffect, useMemo, useRef, useState } from 'react';
import type { ForceGraph3DInstance, LinkObject, NodeObject } from '3d-force-graph';
import { Focus, Maximize2, Pause, Play, Rotate3D } from 'lucide-react';

export interface Graph3DNode extends NodeObject {
  id: string;
  label: string;
  category: string;
  color: string;
  value: number;
  description?: string;
  details?: string[];
}

export interface Graph3DLink extends LinkObject<Graph3DNode> {
  source: string | Graph3DNode;
  target: string | Graph3DNode;
  label: string;
  color?: string;
  description?: string;
}

export interface GraphLegendItem {
  label: string;
  color: string;
}

interface ForceGraph3DViewProps {
  nodes: Graph3DNode[];
  links: Graph3DLink[];
  height?: number;
  legend?: GraphLegendItem[];
}

interface OrbitControlsLike {
  autoRotate: boolean;
  autoRotateSpeed: number;
}

function nodeId(value: string | Graph3DNode): string {
  return typeof value === 'string' ? value : value.id;
}

function tooltip(title: string, rows: string[]): HTMLElement {
  const element = document.createElement('div');
  element.style.cssText = 'max-width:360px;padding:10px 12px;border:1px solid #334155;border-radius:10px;background:rgba(2,6,23,.94);color:#e2e8f0;font:12px/1.5 system-ui;box-shadow:0 10px 30px rgba(0,0,0,.35)';
  const heading = document.createElement('div');
  heading.textContent = title;
  heading.style.cssText = 'font-weight:700;color:#fff;margin-bottom:4px';
  element.appendChild(heading);
  rows.filter(Boolean).forEach((row) => {
    const line = document.createElement('div');
    line.textContent = row;
    line.style.color = '#94a3b8';
    element.appendChild(line);
  });
  return element;
}

export default function ForceGraph3DView({
  nodes,
  links,
  height = 520,
  legend = [],
}: ForceGraph3DViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph3DInstance<Graph3DNode, Graph3DLink> | null>(null);
  const dataRef = useRef({ nodes, links });
  const [selectedNode, setSelectedNode] = useState<Graph3DNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<Graph3DLink | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [paused, setPaused] = useState(false);
  const isLargeGraph = links.length > 5000;

  useEffect(() => {
    dataRef.current = { nodes, links };
    setSelectedNode(null);
    setSelectedLink(null);
    const graph = graphRef.current;
    if (graph) {
      graph.graphData(dataRef.current).d3ReheatSimulation();
    }
  }, [nodes, links]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;

    import('3d-force-graph').then(({ default: ForceGraph3D }) => {
      if (disposed || !hostRef.current) return;
      const graph = new ForceGraph3D(hostRef.current, {
        controlType: 'orbit',
        rendererConfig: { antialias: true, alpha: true },
      }) as ForceGraph3DInstance<Graph3DNode, Graph3DLink>;
      graphRef.current = graph;
      graph
        .width(host.clientWidth)
        .height(height)
        .backgroundColor('#020617')
        .showNavInfo(false)
        .graphData(dataRef.current)
        .forceEngine(isLargeGraph ? 'ngraph' : 'd3')
        .ngraphPhysics(isLargeGraph ? {
          springLength: 28,
          springCoeff: 0.0008,
          gravity: -1.2,
          theta: 0.8,
          dragCoeff: 0.02,
        } : {})
        .cooldownTicks(isLargeGraph ? 180 : 100)
        .cooldownTime(isLargeGraph ? 15000 : 8000)
        .nodeId('id')
        .nodeVal((node) => Math.max(1.5, Math.sqrt(node.value + 1) * 1.6))
        .nodeColor((node) => node.color)
        .nodeOpacity(isLargeGraph ? 0.78 : 0.92)
        .nodeResolution(isLargeGraph ? 6 : 18)
        .nodeLabel((node) => tooltip(node.label, [
          node.category,
          node.description ?? '',
          ...(node.details ?? []),
          node.id,
        ]))
        .linkColor((link) => link.color ?? '#64748b')
        .linkOpacity(isLargeGraph ? 0.13 : 0.45)
        .linkWidth(isLargeGraph ? 0.18 : 0.8)
        .linkCurvature(isLargeGraph ? 0 : 0.08)
        .linkDirectionalArrowLength(isLargeGraph ? 0 : 4)
        .linkDirectionalArrowRelPos(0.9)
        .linkDirectionalArrowColor((link) => link.color ?? '#94a3b8')
        .linkDirectionalParticles((link) => (!isLargeGraph && link.label ? 1 : 0))
        .linkDirectionalParticleWidth(1.2)
        .linkDirectionalParticleSpeed(0.004)
        .linkDirectionalParticleColor((link) => link.color ?? '#a5b4fc')
        .linkLabel((link) => tooltip(link.label, [
          `${nodeId(link.source)} → ${nodeId(link.target)}`,
          link.description ?? '',
        ]))
        .onNodeClick((node) => {
          setSelectedNode(node);
          setSelectedLink(null);
          const distance = 90;
          const length = Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0) || 1;
          const ratio = 1 + distance / length;
          graph.cameraPosition(
            {
              x: (node.x ?? 0) * ratio,
              y: (node.y ?? 0) * ratio,
              z: (node.z ?? 0) * ratio,
            },
            { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 },
            900,
          );
        })
        .onLinkClick((link) => {
          setSelectedLink(link);
          setSelectedNode(null);
        })
        .onBackgroundClick(() => {
          setSelectedNode(null);
          setSelectedLink(null);
        })
        .onEngineStop(() => graph.zoomToFit(700, 60));

      const controls = graph.controls() as OrbitControlsLike;
      controls.autoRotate = false;
      controls.autoRotateSpeed = 0.55;

      if (!isLargeGraph) {
        const charge = graph.d3Force('charge') as { strength?: (value: number) => void } | undefined;
        charge?.strength?.(-150);
        const linkForce = graph.d3Force('link') as { distance?: (value: number) => void } | undefined;
        linkForce?.distance?.(55);
      }

      resizeObserver = new ResizeObserver(() => {
        if (hostRef.current) graph.width(hostRef.current.clientWidth).height(height);
      });
      resizeObserver.observe(host);
    });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      graphRef.current?._destructor();
      graphRef.current = null;
      host.replaceChildren();
    };
  }, [height, isLargeGraph]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const controls = graph.controls() as OrbitControlsLike;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.55;
  }, [autoRotate]);

  const selected = useMemo(() => {
    if (selectedNode) {
      return {
        title: selectedNode.label,
        rows: [
          selectedNode.category,
          selectedNode.description,
          ...(selectedNode.details ?? []),
          selectedNode.id,
        ].filter(Boolean) as string[],
      };
    }
    if (selectedLink) {
      return {
        title: selectedLink.label,
        rows: [
          `${nodeId(selectedLink.source)} → ${nodeId(selectedLink.target)}`,
          selectedLink.description,
        ].filter(Boolean) as string[],
      };
    }
    return null;
  }, [selectedLink, selectedNode]);

  const togglePause = () => {
    const graph = graphRef.current;
    if (!graph) return;
    if (paused) graph.resumeAnimation();
    else graph.pauseAnimation();
    setPaused(!paused);
  };

  return (
    <div className="relative overflow-hidden bg-slate-950" style={{ height }}>
      <div ref={hostRef} className="absolute inset-0" />

      <div className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/75 p-1.5 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => graphRef.current?.zoomToFit(700, 60)}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          title="聚焦全部节点"
        >
          <Focus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setAutoRotate((value) => !value)}
          className={`rounded-lg p-2 hover:bg-white/10 ${autoRotate ? 'bg-indigo-500/25 text-indigo-300' : 'text-slate-300 hover:text-white'}`}
          title={autoRotate ? '停止自动旋转' : '自动旋转'}
        >
          <Rotate3D className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={togglePause}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          title={paused ? '继续渲染' : '暂停渲染'}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => hostRef.current?.parentElement?.requestFullscreen?.()}
          className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
          title="全屏查看"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute right-3 top-3 z-10 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-[11px] text-slate-300 shadow-xl backdrop-blur">
        <div>{nodes.length} 节点 · {links.length} 关系</div>
        {isLargeGraph && <div className="mt-1 text-amber-300">全量大图模式 · NGraph 布局</div>}
        <div className="mt-1 text-slate-500">拖拽旋转 · 滚轮缩放 · 点击聚焦</div>
      </div>

      {legend.length > 0 && (
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-x-3 gap-y-1 rounded-xl border border-white/10 bg-slate-950/75 px-3 py-2 text-[11px] text-slate-300 backdrop-blur">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      {selected && (
        <div className="absolute bottom-3 right-3 z-10 max-w-sm rounded-xl border border-indigo-400/20 bg-slate-950/90 p-3 text-xs text-slate-300 shadow-2xl backdrop-blur">
          <div className="mb-1 font-semibold text-white">{selected.title}</div>
          {selected.rows.map((row, index) => (
            <div key={`${row}-${index}`} className="truncate text-slate-400" title={row}>{row}</div>
          ))}
        </div>
      )}
    </div>
  );
}
