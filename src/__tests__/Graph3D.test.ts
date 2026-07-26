import { describe, expect, it } from 'vitest';
import { buildGraph, shortLabel } from '../components/KgGraph';
import { buildOntologyGraph } from '../components/OntologyGraph';
import type { LinkType, ObjectType } from '../api/client';
import { GRAPH_TRIPLE_BATCH_SIZE, graphTriplePageQuery } from '../pages/KnowledgeBases';

describe('3D knowledge graph data', () => {
  it('converts triples into deduplicated nodes and directed links', () => {
    const graph = buildGraph([
      { '?s': 'https://example.com/fault/P0A80', '?p': 'aps:belongsToBrand', '?o': 'https://example.com/brand/tesla' },
      { '?s': 'https://example.com/fault/P0A80', '?p': 'meta:meaning', '?o': '"电池热管理异常"' },
    ]);

    expect(graph.nodes).toHaveLength(3);
    expect(graph.links).toHaveLength(2);
    expect(graph.nodes.find((node) => node.id.endsWith('P0A80'))).toMatchObject({
      label: 'P0A80',
      category: '主语实体',
      value: 2,
    });
    expect(graph.links[0]).toMatchObject({
      label: 'belongsToBrand',
      color: '#a78bfa',
    });
    expect(shortLabel('"电池热管理异常"')).toBe('电池热管理异常');
  });

  it('maps ontology colors, degree and cardinality into 3D data', () => {
    const objectTypes: ObjectType[] = [
      {
        id: 'FaultCode',
        iri: 'aps:FaultCode',
        label: '故障码',
        description: '车辆故障定义',
        icon: 'Alert',
        color: 'rose',
        primary_key: 'code',
        title_property: 'code',
        properties: [],
      },
      {
        id: 'Brand',
        iri: 'aps:Brand',
        label: '品牌',
        description: '车辆品牌',
        icon: 'Car',
        color: 'blue',
        primary_key: 'name',
        title_property: 'name',
        properties: [],
      },
    ];
    const linkTypes: LinkType[] = [
      {
        id: 'belongsToBrand',
        iri: 'aps:belongsToBrand',
        label: '归属品牌',
        description: '故障码适用品牌',
        source: 'FaultCode',
        target: 'Brand',
        cardinality: 'many_to_one',
      },
    ];

    const graph = buildOntologyGraph(objectTypes, linkTypes);
    expect(graph.nodes[0]).toMatchObject({ color: '#f43f5e', value: 1 });
    expect(graph.links[0]).toMatchObject({ label: '归属品牌 · N:1' });
  });

  it('loads graph triples in full-data batches without a 100-row cap', () => {
    expect(GRAPH_TRIPLE_BATCH_SIZE).toBe(5000);
    expect(graphTriplePageQuery(10000)).toBe(
      'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5000 OFFSET 10000',
    );
    expect(graphTriplePageQuery(0)).not.toContain('LIMIT 100 ');
  });
});
