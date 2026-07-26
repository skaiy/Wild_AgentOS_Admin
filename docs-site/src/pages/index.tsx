import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="hero hero--primary">
      <div className="container text--center">
        <Heading as="h1" className="hero-title-gradient">
          {siteConfig.title}
        </Heading>
        <p className="hero-subtitle">{siteConfig.tagline}</p>
        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            className="button button--primary button--lg glow-btn"
            to="/docs/">
            项目说明 (Overview)
          </Link>
          <Link
            className="button button--secondary button--lg secondary-btn"
            to="/docs/agent-dev/environment">
            Agent 开发手册 (Development)
          </Link>
          <Link
            className="button button--secondary button--lg secondary-btn"
            to="/docs/admin-console/overview">
            前端管理平台 (Console)
          </Link>
          <Link
            className="button button--secondary button--lg secondary-btn"
            to="/docs/backend/agent-management">
            后端内核文档 (Backend)
          </Link>
        </div>
      </div>
    </header>
  );
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

const FeatureList: FeatureItem[] = [
  {
    icon: '⚡',
    title: 'PDCA 智能体编排引擎',
    description: '集成 5W2H 任务分析，动态生命周期编排与调度。智能适配 L0 至 L6 级任务，调度多角色协同（Supervisor/Doer/Checker）。',
  },
  {
    icon: '🧠',
    title: '五层记忆与一致性系统',
    description: '支持 L0 磁盘持久化到 L3 SPARQL 投影视图。创新引入 MESI 一致性协议与扩散激活，强最终一致性保障与 90% 感知延迟降低。',
  },
  {
    icon: '🚀',
    title: 'Hyperspace 向量引擎',
    description: '独立的 Rust 嵌入式向量数据库（crates/hyperspace-engine）。支持 HNSW 搜索、WAL 写入校验，以及多维非欧几何空间度量。',
  },
  {
    icon: '🕸️',
    title: '动态认知技能图谱',
    description: '超图结构动态认知网络，支持 6 种语义链接。集成形式化不变式校验、社区发现、因果分析与版本快照追溯。',
  },
];

function Feature({icon, title, description}: FeatureItem) {
  return (
    <div className="col col--6" style={{ marginBottom: '2rem' }}>
      <div className="card-premium">
        <span className="card-icon">{icon}</span>
        <h3 className="card-premium-title">{title}</h3>
        <p className="card-premium-desc">{description}</p>
      </div>
    </div>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="工业级智能体操作系统"
      description="Wild AgentOS (如野智能体操作系统) 官方文档库与控制台说明">
      <HomepageHeader />
      <main>
        <section className="cards-container">
          <div className="container">
            <h2 className="text--center section-title" style={{ marginBottom: '3rem', fontSize: '2.25rem', fontWeight: 700 }}>
              系统核心特性 (Core Architecture)
            </h2>
            <div className="row">
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
