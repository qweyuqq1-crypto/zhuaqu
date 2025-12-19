
import React, { useState, useEffect } from 'react';
import { AppSettings } from '../types';
import { Save, Mail, Clock, Key, Server, Plus, Trash2, Code, Copy, CheckCircle2, AlertCircle, Play, Globe, Bell, Send, HelpCircle, ExternalLink, Shield } from 'lucide-react';

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
    setNotification('配置已保存至本地！');
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
        const pw = process.env.ADMIN_PASSWORD ? `?password=${process.env.ADMIN_PASSWORD}` : '';
        const res = await fetch(`${url}/test${pw}`);
        const text = await res.text();
        if (res.ok) {
            alert(`✅ Worker 执行成功！\n\n日志反馈:\n${text}`);
        } else {
            alert(`❌ 执行失败 (${res.status}): ${text}`);
        }
    } catch (e) {
        alert(`❌ 无法连接到 Worker。\n错误: ${(e as Error).message}`);
    } finally {
        setRemoteTesting(false);
    }
  };

  const generateScript = () => {
    const safeApiKey = settings.apiKey.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const safeSources = JSON.stringify(settings.sources, null, 2);
    const cleanWorkerUrl = settings.workerUrl ? settings.workerUrl.replace(/\/$/, "") : "";
    const adminPassword = process.env.ADMIN_PASSWORD || "";

    const script = `/**
 * NodeScout CF - Enterprise Edition Worker (v4.2 Auth Protected)
 */

const CONFIG = {
  RECIPIENT: "${settings.email || ''}",
  PROVIDER: "${settings.emailProvider}",
  API_KEY: "${safeApiKey}",
  ADMIN_PASSWORD: "${adminPassword}", // 从环境变量同步
  SOURCES: ${safeSources},
  MAX_NODES: 1000,
  WORKER_URL: "${cleanWorkerUrl}",
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) v2rayN/6.33",
};

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleAutoTask(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    
    // 权限校验逻辑
    const checkAuth = () => {
        if (!CONFIG.ADMIN_PASSWORD) return true;
        return url.searchParams.get("password") === CONFIG.ADMIN_PASSWORD;
    };

    if (!checkAuth()) {
        return new Response("Unauthorized: Please provide correct password query parameter.", { status: 401, headers: corsHeaders });
    }
    
    if (url.pathname === "/test") {
      const result = await handleAutoTask(env);
      return new Response(result, { headers: { ...corsHeaders, 'content-type': 'text/plain; charset=utf-8'} });
    }

    if (url.pathname === "/sub") {
       const { base64 } = await fetchAndParseNodes();
       return new Response(base64, { headers: { ...corsHeaders, 'content-type': 'text/plain'} });
    }

    return new Response(
      "NodeScout Worker is Running.\\n\\nSubscription URL: " + url.origin + "/sub" + (CONFIG.ADMIN_PASSWORD ? "?password=" + CONFIG.ADMIN_PASSWORD : ""), 
      { headers: { ...corsHeaders, 'content-type': 'text/plain'} }
    );
  }
};

async function handleAutoTask(env) {
  const logs = [];
  const log = (msg) => logs.push(\`[\${new Date().toISOString()}] \${msg}\`);
  const { nodes, base64 } = await fetchAndParseNodes(log);

  if (nodes.length > 0 && CONFIG.RECIPIENT && CONFIG.API_KEY) {
    try {
      await sendNotification(nodes.length, CONFIG.RECIPIENT, log);
      log("Success: Push sent.");
    } catch (e) {
      log(\`Error: Push failed - \${e.message}\`);
    }
  }
  
  return logs.join("\\n");
}

async function fetchAndParseNodes(log = () => {}) {
  let allRawData = "";
  const promises = CONFIG.SOURCES.map(async (url) => {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': CONFIG.USER_AGENT } });
      let text = await res.text();
      return recursiveDecode(text);
    } catch (e) { return ""; }
  });

  const results = await Promise.all(promises);
  allRawData = results.join("\\n");

  const protocols = ['vmess', 'vless', 'ss', 'ssr', 'trojan'];
  let candidates = [];
  protocols.forEach(proto => {
    const regex = new RegExp(\`\${proto}://[^\\\\s<>"']+\`, 'g');
    candidates = [...candidates, ...(allRawData.match(regex) || [])];
  });

  const uniqueLinks = Array.from(new Set(candidates)).slice(0, CONFIG.MAX_NODES);
  const base64 = btoa(unescape(encodeURIComponent(uniqueLinks.join("\\n"))));
  return { nodes: uniqueLinks, base64 };
}

function recursiveDecode(text, depth = 0) {
    if (depth > 3) return text;
    const clean = text.replace(/\\s/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(clean) || /^[A-Za-z0-9-_]+$/.test(clean)) {
        try {
            const normalized = clean.replace(/-/g, '+').replace(/_/g, '/');
            const decoded = atob(normalized);
            if (decoded.length > 20 && !decoded.includes('://')) return recursiveDecode(decoded, depth + 1);
            return decoded;
        } catch (e) { return text; }
    }
    return text;
}

async function sendNotification(count, recipient, log) {
    const today = new Date().toLocaleDateString();
    const subUrl = CONFIG.WORKER_URL ? (CONFIG.WORKER_URL + "/sub" + (CONFIG.ADMIN_PASSWORD ? "?password=" + CONFIG.ADMIN_PASSWORD : "")) : "URL MISSING";
    
    if (CONFIG.PROVIDER === 'telegram') {
        const message = \`🌍 *NodeScout 订阅更新*\\n---\\n📊 节点: \${count} 个\\n🔗 \` + "\`" + subUrl + "\`";
        await fetch(\`https://api.telegram.org/bot\${CONFIG.API_KEY}/sendMessage\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: recipient, text: message, parse_mode: 'Markdown' })
        });
    }
}`;
    setWorkerScript(script);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-white mb-2">部署配置</h2>
            <p className="text-gray-400 text-sm">生成的脚本将自动同步您的 ADMIN_PASSWORD 环境变量。</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-full">
            <Shield size={14} />
            管理员验证已激活
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 size={18} />
            {notification}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-emerald-400">
                    <Server size={20} />
                    <h3 className="font-semibold text-gray-200">1. 订阅源配置</h3>
                </div>
                <div className="flex gap-2">
                    <input type="text" value={newSource} onChange={e => setNewSource(e.target.value)} className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 outline-none" placeholder="输入订阅链接..."/>
                    <button onClick={addSource} className="bg-gray-800 hover:bg-emerald-600 text-white px-3 rounded-lg transition-colors"><Plus size={18} /></button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
                    {settings.sources.map((source, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-950 px-3 py-2 rounded border border-gray-800/50 group hover:border-gray-700">
                            <span className="text-xs text-gray-400 truncate w-64">{source}</span>
                            <button onClick={() => removeSource(source)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-blue-400">
                    <Bell size={20} />
                    <h3 className="font-semibold text-gray-200">2. 推送与定时</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">渠道</label>
                        <div className="flex gap-2 bg-gray-950 p-1 rounded-lg border border-gray-800">
                            <button onClick={() => setSettings({...settings, emailProvider: 'telegram'})} className={`flex-1 py-1.5 rounded-md text-xs ${settings.emailProvider === 'telegram' ? 'bg-blue-600 text-white' : 'text-gray-500'}`}>Telegram</button>
                            <button onClick={() => setSettings({...settings, emailProvider: 'mailgun'})} className={`flex-1 py-1.5 rounded-md text-xs ${settings.emailProvider === 'mailgun' ? 'bg-orange-600 text-white' : 'text-gray-500'}`}>Mailgun</button>
                        </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Cron</label>
                        <input type="text" value={settings.cronSchedule} onChange={e => setSettings({...settings, cronSchedule: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs font-mono outline-none"/>
                    </div>
                    <div className="col-span-2">
                        <input type="text" value={settings.email} onChange={e => setSettings({...settings, email: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm outline-none" placeholder="Chat ID / Email"/>
                    </div>
                    <div className="col-span-2">
                        <input type="text" value={settings.apiKey} onChange={e => setSettings({...settings, apiKey: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none" placeholder="Bot Token / API Key"/>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-purple-400">
                    <Globe size={20} />
                    <h3 className="font-semibold text-gray-200">3. 远程端点</h3>
                </div>
                <input type="text" value={settings.workerUrl} onChange={e => setSettings({...settings, workerUrl: e.target.value})} className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none" placeholder="https://xxx.workers.dev"/>
                <button onClick={handleRemoteTest} disabled={!settings.workerUrl || remoteTesting} className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all">
                    {remoteTesting ? <div className="animate-spin w-3 h-3 border-2 border-current border-t-transparent rounded-full"/> : <Play size={14} fill="currentColor"/>}
                    发送测试指令 (附带密码)
                </button>
            </div>

            <button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:-translate-y-0.5"><Save size={18} className="inline mr-2"/>保存配置</button>
        </div>

        <div className="flex flex-col h-full">
             <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-full overflow-hidden shadow-2xl">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                    <div className="flex items-center gap-2 text-gray-200 font-semibold"><Code size={18} className="text-yellow-400"/><span>worker.js (受保护代码)</span></div>
                    <button onClick={handleCopyScript} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                        {copyScriptSuccess ? '已复制' : '复制代码'}
                    </button>
                </div>
                <div className="flex-1 relative bg-[#0d1117]">
                    <textarea readOnly value={workerScript} className="absolute inset-0 w-full h-full bg-transparent text-gray-400 p-4 font-mono text-[11px] outline-none resize-none leading-relaxed"></textarea>
                </div>
                <div className="bg-gray-950 p-2 text-[10px] text-gray-500 border-t border-gray-800 text-center">
                    代码已同步 ADMIN_PASSWORD，远程访问需携带参数。
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
