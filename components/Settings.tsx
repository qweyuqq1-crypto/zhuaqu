import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Save, Mail, Clock, Key, Server, Plus, Trash2, Code, Copy, CheckCircle2, AlertCircle, Play, Globe, Bell, Send, HelpCircle, ExternalLink } from 'lucide-react';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    email: '',
    emailProvider: 'telegram',
    apiKey: '',
    cronSchedule: '0 8 * * *',
    sources: [
        'https://raw.githubusercontent.com/freefq/free/master/v2',
        'https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2',
        'https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt'
    ],
    workerUrl: ''
  });

  const [newSource, setNewSource] = useState('');
  const [notification, setNotification] = useState('');
  const [workerScript, setWorkerScript] = useState('');
  const [copyScriptSuccess, setCopyScriptSuccess] = useState(false);
  const [remoteTesting, setRemoteTesting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nodescout_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.sources || parsed.sources.length === 0) {
          parsed.sources = settings.sources;
      }
      setSettings(parsed);
    }
  }, []);

  useEffect(() => {
    generateScript();
  }, [settings]);

  const handleSave = () => {
    localStorage.setItem('nodescout_settings', JSON.stringify(settings));
    setNotification('配置已保存至本地！请重新复制脚本并部署。');
    setTimeout(() => setNotification(''), 4000);
  };

  const addSource = () => {
    if (newSource && !settings.sources.includes(newSource)) {
      setSettings({ ...settings, sources: [...settings.sources, newSource] });
      setNewSource('');
    }
  };

  const removeSource = (source: string) => {
    setSettings({ ...settings, sources: settings.sources.filter(s => s !== source) });
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(workerScript);
    setCopyScriptSuccess(true);
    setTimeout(() => setCopyScriptSuccess(false), 2000);
  };

  const handleRemoteTest = async () => {
    if (!settings.workerUrl) return;
    setRemoteTesting(true);
    try {
        const url = settings.workerUrl.replace(/\/$/, "");
        const res = await fetch(`${url}/test`);
        const text = await res.text();
        if (res.ok) {
            alert(`✅ Worker 执行成功！\n\n日志反馈:\n${text}`);
        } else {
            alert(`❌ 执行失败 (${res.status}): ${text}`);
        }
    } catch (e) {
        alert(`❌ 无法连接到 Worker。\n请检查 URL 是否正确，或是否配置了 CORS。\n\n错误: ${(e as Error).message}`);
    } finally {
        setRemoteTesting(false);
    }
  };

  const generateScript = () => {
    // Escape the API key properly for JS string
    const safeApiKey = settings.apiKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const safeSources = JSON.stringify(settings.sources, null, 2);
    // Remove trailing slash if present
    const cleanWorkerUrl = settings.workerUrl ? settings.workerUrl.replace(/\/$/, "") : "";

    const script = `/**
 * NodeScout CF - Enterprise Edition Worker (v4 Subscription Mode)
 * -----------------------------------------
 * 更新日志：
 * - 移除了直接推送 Base64 乱码的功能
 * - 改为推送“订阅链接”，点击即可更新节点
 * - 优化了 Telegram 消息排版
 */

const CONFIG = {
  RECIPIENT: "${settings.email || ''}",
  PROVIDER: "${settings.emailProvider}",
  API_KEY: "${safeApiKey}",
  MAILGUN_DOMAIN: "mg.yourdomain.com", 
  SOURCES: ${safeSources},
  MAX_NODES: 1000,
  WORKER_URL: "${cleanWorkerUrl}", // 你的 Worker 地址
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 v2rayN/6.33",
};

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleAutoTask(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    
    // 触发手动测试
    if (url.pathname === "/test") {
      const result = await handleAutoTask(env);
      return new Response(result, { headers: { ...corsHeaders, 'content-type': 'text/plain; charset=utf-8'} });
    }

    // 获取订阅链接 (核心功能)
    if (url.pathname === "/sub") {
       const { base64 } = await fetchAndParseNodes();
       // 返回 text/plain 以便 v2rayN/Clash 识别
       return new Response(base64, { headers: { ...corsHeaders, 'content-type': 'text/plain'} });
    }

    return new Response(
      "NodeScout Worker is Running.\\n\\nSubscription URL: " + url.origin + "/sub", 
      { headers: { ...corsHeaders, 'content-type': 'text/plain'} }
    );
  }
};

async function handleAutoTask(env) {
  const logs = [];
  const log = (msg) => logs.push(\`[\${new Date().toISOString().split('T')[1].split('.')[0]}] \${msg}\`);
  
  log("Start: Task initiated.");
  
  // 1. 获取并清洗节点
  const { nodes, base64 } = await fetchAndParseNodes(log);
  log(\`Process: Extracted \${nodes.length} unique valid nodes.\`);

  // 2. 推送 (仅推送状态和订阅链接，不推送 Base64 内容)
  if (nodes.length > 0 && CONFIG.RECIPIENT && CONFIG.API_KEY) {
    try {
      log(\`Push: Sending via \${CONFIG.PROVIDER}...\`);
      await sendNotification(nodes.length, CONFIG.RECIPIENT, log);
      log("Success: Notification sent.");
    } catch (e) {
      log(\`Error: Push failed - \${e.message}\`);
    }
  } else {
    log("Skip: Push skipped (No nodes or missing config).");
  }
  
  return logs.join("\\n");
}

async function fetchAndParseNodes(log = () => {}) {
  let allRawData = "";
  
  // 并发拉取
  const promises = CONFIG.SOURCES.map(async (url) => {
    try {
      const res = await fetch(url, { 
        headers: { 'User-Agent': CONFIG.USER_AGENT }, 
        cf: { cacheTtl: 60 } 
      });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      let text = await res.text();
      return recursiveDecode(text);
    } catch (e) {
      log(\`Fail source [\${url}]: \${e.message}\`);
      return "";
    }
  });

  const results = await Promise.all(promises);
  allRawData = results.join("\\n");

  const protocols = ['vmess', 'vless', 'ss', 'ssr', 'trojan'];
  let candidates = [];
  
  protocols.forEach(proto => {
    const regex = new RegExp(\`\${proto}://[^\\\\s<>"']+\`, 'g');
    candidates = [...candidates, ...(allRawData.match(regex) || [])];
  });

  // 去重
  const uniqueSet = new Set(candidates);
  const uniqueLinks = Array.from(uniqueSet).slice(0, CONFIG.MAX_NODES);
  
  const finalString = uniqueLinks.join("\\n");
  const base64 = btoa(unescape(encodeURIComponent(finalString)));
  
  return { nodes: uniqueLinks, base64 };
}

function recursiveDecode(text, depth = 0) {
    if (depth > 3) return text;
    const clean = text.replace(/\\s/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(clean) || /^[A-Za-z0-9-_]+$/.test(clean)) {
        try {
            const normalized = clean.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = atob(normalized);
            if (decoded.length > 20 && !decoded.includes('://') && /^[A-Za-z0-9+/=]+$/.test(decoded.replace(/\\s/g,''))) {
                return recursiveDecode(decoded, depth + 1);
            }
            return decoded;
        } catch (e) { return text; }
    }
    return text;
}

// 核心修改：只发送订阅链接
async function sendNotification(count, recipient, log) {
    const today = new Date().toLocaleDateString();
    // 自动构建订阅链接
    const subUrl = CONFIG.WORKER_URL ? (CONFIG.WORKER_URL + "/sub") : "⚠️ 请先在配置页面填写 Worker URL";
    
    if (CONFIG.PROVIDER === 'telegram') {
        const url = \`https://api.telegram.org/bot\${CONFIG.API_KEY}/sendMessage\`;
        
        const message = \`
🌍 *NodeScout 每日播报*
-------------------------
📅 日期: \${today}
📊 节点: \${count} 个
-------------------------
🔗 *订阅链接 (点击复制):*
\` + "\`" + subUrl + "\`" + \`

💡 *使用说明:*
1. 复制上方链接。
2. 粘贴到 v2rayN / Clash / Shadowrocket。
3. 更新订阅即可获取最新节点。
\`;

        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                chat_id: recipient, 
                text: message, 
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });
    }
    
    else if (CONFIG.PROVIDER === 'mailgun') {
        const url = \`https://api.mailgun.net/v3/\${CONFIG.MAILGUN_DOMAIN}/messages\`;
        const formData = new FormData();
        formData.append('from', \`NodeScout <postmaster@\${CONFIG.MAILGUN_DOMAIN}>\`);
        formData.append('to', recipient);
        formData.append('subject', \`NodeScout 每日订阅更新 - \${count}个节点\`);
        formData.append('text', \`
NodeScout 采集完成。

日期: \${today}
节点数量: \${count}

订阅链接:
\${subUrl}

请将此链接添加到您的代理软件中。
\`);

        const auth = btoa(\`api:\${CONFIG.API_KEY}\`);
        await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': \`Basic \${auth}\` },
            body: formData
        });
    }
}`;
    setWorkerScript(script);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">全自动部署配置</h2>
        <p className="text-gray-400 text-sm">配置订阅源与推送方式，生成 Cloudflare Worker 脚本。</p>
      </div>

      {notification && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg animate-fade-in flex items-center gap-2">
            <CheckCircle2 size={18} />
            {notification}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
            {/* 1. Sources Config */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-emerald-400">
                    <Server size={20} />
                    <h3 className="font-semibold text-gray-200">1. 订阅源配置</h3>
                </div>
                
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newSource}
                        onChange={e => setNewSource(e.target.value)}
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                        placeholder="输入 v2ray/clash 订阅链接..."
                    />
                    <button onClick={addSource} className="bg-gray-800 hover:bg-emerald-600 text-white px-3 rounded-lg transition-colors">
                        <Plus size={18} />
                    </button>
                </div>

                <div className="space-y-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {settings.sources.map((source, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-950 px-3 py-2 rounded border border-gray-800/50 group hover:border-gray-700 transition-colors">
                            <span className="text-xs text-gray-400 truncate w-64">{source}</span>
                            <button onClick={() => removeSource(source)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {settings.sources.length === 0 && <span className="text-gray-600 text-xs italic p-2 block text-center">请添加至少一个订阅源...</span>}
                </div>
            </div>

            {/* 2. Push Notification Config */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-blue-400">
                    <Bell size={20} />
                    <h3 className="font-semibold text-gray-200">2. 每日推送设置</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">推送渠道</label>
                        <div className="flex gap-2 bg-gray-950 p-1 rounded-lg border border-gray-800">
                            <button 
                                onClick={() => setSettings({...settings, emailProvider: 'telegram'})}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${settings.emailProvider === 'telegram' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <Send size={12} /> Telegram
                            </button>
                            <button 
                                onClick={() => setSettings({...settings, emailProvider: 'mailgun'})}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${settings.emailProvider === 'mailgun' ? 'bg-orange-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <Mail size={12} /> Mailgun
                            </button>
                        </div>
                    </div>

                     <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cron 表达式 (定时)</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={settings.cronSchedule}
                                onChange={e => setSettings({...settings, cronSchedule: e.target.value})}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                            />
                            <Clock size={12} className="absolute left-3 top-2.5 text-gray-500" />
                        </div>
                         <p className="text-[10px] text-gray-600 mt-1">* 示例: 0 8 * * * (每天早8点)</p>
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                            {settings.emailProvider === 'telegram' ? 'Chat ID (用户ID)' : '接收邮箱地址'}
                        </label>
                        <input 
                            type="text" 
                            value={settings.email}
                            onChange={e => setSettings({...settings, email: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                            placeholder={settings.emailProvider === 'telegram' ? '例如: 123456789' : 'name@example.com'}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">
                             {settings.emailProvider === 'telegram' ? 'Bot Token' : 'Mailgun API Key'}
                        </label>
                        <div className="relative">
                             <input 
                                type="text" 
                                value={settings.apiKey}
                                onChange={e => setSettings({...settings, apiKey: e.target.value})}
                                className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-8 pr-3 py-2 text-white text-sm font-mono focus:border-blue-500 focus:outline-none"
                                placeholder={settings.emailProvider === 'telegram' ? '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' : 'key-xxxxxxxxxxxx'}
                            />
                            <Key size={12} className="absolute left-3 top-3 text-gray-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Remote Deployment Config */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-purple-400">
                    <Globe size={20} />
                    <h3 className="font-semibold text-gray-200">3. 远程部署与验证</h3>
                </div>
                
                <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-500/20 mb-4">
                    <div className="flex items-start gap-2">
                        <HelpCircle size={14} className="text-purple-400 mt-0.5 shrink-0" />
                        <div className="text-xs text-gray-400 space-y-1">
                            <p className="font-semibold text-purple-300">必填：Worker URL (用于生成订阅链接)</p>
                            <ol className="list-decimal pl-4 space-y-0.5">
                                <li>在 Cloudflare 创建 Worker，先部署一次默认代码。</li>
                                <li>复制 Worker 详情页的 URL (如 xxx.workers.dev) 到下方输入框。</li>
                                <li><strong>保存配置</strong>，然后复制右侧生成的新代码覆盖 Cloudflare 里的代码。</li>
                            </ol>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Worker URL (订阅/后端地址)</label>
                    <input 
                        type="text" 
                        value={settings.workerUrl}
                        onChange={e => setSettings({...settings, workerUrl: e.target.value})}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none placeholder-gray-700 font-mono"
                        placeholder="https://nodescout-backend.yourname.workers.dev"
                    />
                </div>

                <div className="flex gap-2">
                     <a 
                        href="https://dash.cloudflare.com/?to=/:account/workers/services/new" 
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all"
                     >
                        <ExternalLink size={14} /> 去创建 Worker
                     </a>
                     <button 
                        onClick={handleRemoteTest}
                        disabled={!settings.workerUrl || remoteTesting}
                        className="flex-[2] bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:bg-gray-800 text-white text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                    >
                        {remoteTesting ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full"/> : <Play size={14} fill="currentColor"/>}
                        {remoteTesting ? '指令发送中...' : '测试推送 (检查 TG)'}
                    </button>
                </div>
            </div>

            <button 
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-900/40 hover:-translate-y-0.5"
            >
                <Save size={18} />
                保存配置并更新脚本
            </button>
        </div>

        {/* Script Output Column */}
        <div className="flex flex-col h-full">
             <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-full overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                    <div className="flex items-center gap-2 text-gray-200 font-semibold">
                        <Code size={18} className="text-yellow-400"/>
                        <span>worker.js (部署代码)</span>
                    </div>
                    <button 
                        onClick={handleCopyScript}
                        className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors group"
                    >
                        {copyScriptSuccess ? <CheckCircle2 size={14} className="text-emerald-500"/> : <Copy size={14} className="group-hover:text-white" />}
                        {copyScriptSuccess ? '已复制' : '复制代码'}
                    </button>
                </div>
                <div className="flex-1 relative bg-[#0d1117]">
                    <textarea 
                        readOnly
                        value={workerScript}
                        className="absolute inset-0 w-full h-full bg-transparent text-gray-400 p-4 font-mono text-[11px] focus:outline-none resize-none leading-relaxed custom-scrollbar selection:bg-emerald-500/30 selection:text-emerald-200"
                    ></textarea>
                </div>
                <div className="bg-gray-950 p-2 text-[10px] text-gray-600 border-t border-gray-800 text-center">
                    代码已优化：推送干净的订阅链接，拒绝乱码。
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};