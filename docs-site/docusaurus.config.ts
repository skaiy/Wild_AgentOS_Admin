import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Wild AgentOS',
  tagline: '工业级多智能体协同与控制操作系统',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://skaiy.github.io',
  // 文档站与管理台同域部署（nginx 同容器子路径），入口为 /docs-site/。
  // 修改此值时需同步 sync-docs.js 的 SITE_BASE_URL。
  baseUrl: '/docs-site/',
  // 生成带尾斜杠的链接：容器内 nginx 对无尾斜杠目录会发 301 绝对跳转并丢失自定义端口，
  // 直接输出 /path/ 可避免深链在 NodePort 访问下跳转失败。
  trailingSlash: true,

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'skaiy', // Usually your GitHub org/user name.
  projectName: 'Wild_AgentOS', // Usually your repo name.

  onBrokenLinks: 'warn',
  markdown: {
    format: 'detect',
    mermaid: true,
    hooks: {
      onBrokenMarkdownImages: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
      type: 'text/css',
      integrity:
        'sha384-GMR9m/tgltyQPzT9m3GD8RehFqACKfZObwTCryQRjjdmk1/PpQlPLl+nyY/Wfr8c',
      crossorigin: 'anonymous',
    },
  ],

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // 不配置 editUrl：文档正文由 content/ 与后端仓库同步生成，
          // 指向公开仓库的「编辑此页」链接无法解析（404），故按官方方式关闭该入口。
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false, // Disable blog feature since we are focusing on documentation
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Wild AgentOS',
      logo: {
        alt: 'Wild AgentOS Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '系统文档 (Docs)',
        },
        {
          to: '/docs/agent-dev/environment',
          position: 'left',
          label: 'Agent 开发手册',
        },
        {
          to: '/docs/admin-console/overview',
          position: 'left',
          label: '前端管理平台',
        },
        {
          // 用原始 html：Docusaurus 会给 href/to 追加 baseUrl，而管理台位于站点根路径；
          // target=_top 保证在管理台 iframe 内嵌时跳出到顶层窗口。
          type: 'html',
          position: 'right',
          value: '<a class="navbar__item navbar__link" href="/" target="_top">返回管理台</a>',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '系统文档',
          items: [
            {
              label: '项目说明 (Overview)',
              to: '/docs/',
            },
            {
              label: '版本说明 (Release Notes)',
              to: '/docs/release-notes/history',
            },
            {
              label: 'Agent 开发手册 (Agent Development)',
              to: '/docs/agent-dev/environment',
            },
            {
              label: '前端管理平台 (Admin Console)',
              to: '/docs/admin-console/overview',
            },
            {
              label: '后端内核 (Wild AgentOS)',
              to: '/docs/backend/agent-management',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Wild AgentOS Project. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
