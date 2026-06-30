// 前端真实创建「电池维修助手」端到端：用 Chrome DevTools Protocol 驱动真实 UI。
// 零额外依赖：Node 22 内置 WebSocket + fetch。运行后即清理（一次性产物）。
const FRONTEND = 'http://localhost:3000/#agents';
const CDP = 'http://127.0.0.1:9222';
const AGENT_NAME = process.env.AGENT_NAME || '电池维修助手';

function connect(url) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(url);
    ws.onopen = () => res(ws);
    ws.onerror = (e) => rej(new Error('ws error: ' + (e?.message || e)));
  });
}

function makeRpc(ws) {
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    }
  };
  return (method, params = {}) =>
    new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 在页面上下文执行的驱动脚本（字符串形式，注入 Runtime.evaluate）。
function inPageDriver(name) {
  return `(async () => {
    const log = [];
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const setNative = (el, val) => {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const btnByText = (t) => [...document.querySelectorAll('button')]
      .find(b => b.textContent.trim() === t);
    const waitFor = async (fn, ms = 8000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(150); }
      return null;
    };

    location.hash = 'agents';
    await sleep(800);
    const openBtn = await waitFor(() => btnByText('创建新智能体'));
    if (!openBtn) return { ok: false, step: 'open', log };
    openBtn.click(); log.push('opened create modal');

    const nameInput = await waitFor(() => document.querySelector('input[placeholder="例如：新能源电池维修助手"]'));
    if (!nameInput) return { ok: false, step: 'name-input', log };
    setNative(nameInput, ${JSON.stringify(name)}); log.push('filled name');
    const desc = document.querySelector('textarea[placeholder="描述智能体的功能和使用场景..."]');
    if (desc) setNative(desc, '聚合多Skill+专用故障码知识库+用户态会话隔离的工业级Agent');
    const domain = document.querySelector('input[placeholder="例如：battery_repair"]');
    if (domain) setNative(domain, 'battery_repair');
    const kg = document.querySelector('input[placeholder="iri://kg/battery_repair"]');
    if (kg) setNative(kg, 'tenant:t-tesla/kb/fault-codes');
    log.push('filled form');
    await sleep(300);

    const submit = await waitFor(() => btnByText('创建智能体'));
    if (!submit) return { ok: false, step: 'submit-btn', log };
    submit.click(); log.push('clicked submit');

    // 等待后端落库并刷新列表
    let found = null;
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      try {
        const r = await fetch('/api/v1/agents');
        const d = await r.json();
        found = (d.agents || []).find(a => a.name === ${JSON.stringify(name)} && a.source === 'user');
        if (found) break;
      } catch (e) { log.push('fetch err ' + e.message); }
    }
    if (!found) return { ok: false, step: 'verify-api', log };
    log.push('agent persisted id=' + found.id);

    // DOM 校验：用户态卡片出现该名称
    const inDom = await waitFor(() => [...document.querySelectorAll('span')]
      .some(s => s.textContent.trim() === ${JSON.stringify(name)}), 5000);
    log.push('inDom=' + !!inDom);
    return { ok: true, agent: found, inDom: !!inDom, log };
  })()`;
}

async function main() {
  let targets = await (await fetch(CDP + '/json')).json();
  let page = targets.find((t) => t.type === 'page');
  if (!page) {
    await fetch(CDP + '/json/new?about:blank', { method: 'PUT' }).catch(() => {});
    await sleep(500);
    targets = await (await fetch(CDP + '/json')).json();
    page = targets.find((t) => t.type === 'page');
  }
  if (!page) throw new Error('no page target');

  const ws = await connect(page.webSocketDebuggerUrl);
  const rpc = makeRpc(ws);
  await rpc('Page.enable');
  await rpc('Runtime.enable');
  await rpc('Page.navigate', { url: FRONTEND });
  await sleep(2500);

  const evalRes = await rpc('Runtime.evaluate', {
    expression: inPageDriver(AGENT_NAME),
    awaitPromise: true,
    returnByValue: true,
  });
  const result = evalRes.result?.value;
  console.log('=== UI E2E RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  ws.close();
  process.exit(result && result.ok ? 0 : 1);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
