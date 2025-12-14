import React, { useState, useCallback, useEffect } from 'react';
import { GeminiService } from '../services/geminiService';
import { NodeItem, ScanLog, AppSettings } from '../types';
import { Play, FileText, Loader2, Sparkles, Terminal, Server, Layers } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ScannerProps {
  onNodesFound: (nodes: NodeItem[]) => void;
  logs: ScanLog[];
  addLog: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onNodesFound, logs, addLog }) => {
  const [inputText, setInputText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'ai' | 'regex' | 'deep'>('ai');
  const [savedSources, setSavedSources] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('nodescout_settings');
    if (saved) {
      const settings: AppSettings = JSON.parse(saved);
      if (settings.sources && settings.sources.length > 0) {
        setSavedSources(settings.sources);
      }
    }
  }, []);

  const recursiveDecode = (text: string, depth = 0): string => {
      if (depth > 3) return text; // Prevent infinite loops
      
      const clean = text.replace(/\s/g, '');
      // Check if purely base64
      if (/^[A-Za-z0-9+/=]+$/.test(clean) || /^[A-Za-z0-9-_]+$/.test(clean)) {
          try {
              const normalized = clean.replace(/-/g, '+').replace(/_/g, '/');
              const decoded = atob(normalized);
              // If decoded text looks like another base64 string, recurse
              if (decoded.length > 20 && !decoded.includes('://') && (/^[A-Za-z0-9+/=]+$/.test(decoded.replace(/\s/g,'')))) {
                   return recursiveDecode(decoded, depth + 1);
              }
              return decoded;
          } catch (e) {
              return text;
          }
      }
      return text;
  };

  const handleFetchSources = async () => {
    if (savedSources.length === 0) {
        addLog('未配置订阅源。请前往设置页添加。', 'warning');
        return;
    }
    
    setIsScanning(true);
    addLog(`正在拉取 ${savedSources.length} 个配置源...`, 'info');
    
    try {
        const promises = savedSources.map(async (url) => {
            try {
                addLog(`GET ${url}`, 'info');
                // Attempt fetch. Note: CORS might still block this in browser.
                const res = await fetch(url).catch(() => {
                    throw new Error("CORS 跨域限制 (建议使用 Worker 拉取)");
                });
                
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const text = await res.text();
                // Apply recursive decode immediately
                return recursiveDecode(text);
            } catch (e) {
                addLog(`失败 [${url}]: ${(e as Error).message}`, 'error');
                return "";
            }
        });

        const results = await Promise.all(promises);
        const combinedText = results.join('\n');
        
        if (!combinedText.trim()) {
            addLog('拉取内容为空或被拦截。', 'warning');
        } else {
            setInputText(combinedText);
            addLog(`已拉取 ${combinedText.length} 字符，准备解析。`, 'success');
        }

    } catch (e) {
        addLog('拉取任务异常终止。', 'error');
    } finally {
        setIsScanning(false);
    }
  };

  const handleScan = useCallback(async () => {
    if (!inputText.trim()) return;
    setIsScanning(true);
    addLog('启动解析引擎...', 'info');

    try {
      let contentToParse = inputText;
      
      // Pre-processing for Deep Mode: Try to decode everything first
      if (scanMode === 'deep') {
           addLog('应用深度递归解码...', 'info');
           contentToParse = recursiveDecode(inputText);
           if (contentToParse !== inputText) {
               addLog('检测到 Base64 编码，已自动展开。', 'success');
           }
      }

      let foundNodes: NodeItem[] = [];

      if (scanMode === 'ai') {
        addLog('调用 Gemini AI 模型...', 'info');
        if (!process.env.API_KEY) {
             addLog('未配置 API Key，降级为正则模式。', 'warning');
        } else {
            const rawNodes = await GeminiService.parseNodeText(contentToParse);
            foundNodes = rawNodes.map(raw => ({
            id: uuidv4(),
            protocol: (raw.protocol as any) || 'unknown',
            name: raw.name || `Node ${Math.floor(Math.random() * 1000)}`,
            address: raw.address || '127.0.0.1',
            port: raw.port || 443,
            status: 'untested',
            rawLink: raw.rawLink || '',
            country: raw.country || '未知',
            latency: 0
            }));
        }
      } 
      
      // Regex fallback or explicit selection
      if (foundNodes.length === 0) {
        if (scanMode === 'ai') addLog('AI 未返回结果，尝试正则补救...', 'info');
        else addLog('执行标准正则匹配...', 'info');

        const protocols = ['vmess', 'vless', 'ss', 'ssr', 'trojan'];
        let matches: string[] = [];
        
        protocols.forEach(p => {
            // Enhanced regex to catch params better
            const regex = new RegExp(`${p}://[^\\s<>"']+`, 'g');
            const m = contentToParse.match(regex) || [];
            matches = [...matches, ...m];
        });

        foundNodes = matches.map(link => {
            const proto = link.split(':')[0] as any;
            return {
                id: uuidv4(),
                protocol: proto,
                name: '导入节点 ' + link.substring(0, 15) + '...',
                address: 'unknown',
                port: 0,
                status: 'untested',
                rawLink: link,
                country: '未知',
                latency: 0
            };
        });
      }

      // Deduplicate
      const uniqueNodes = foundNodes.filter((v, i, a) => a.findIndex(t => t.rawLink === v.rawLink) === i);

      if (uniqueNodes.length > 0) {
        addLog(`解析完成: 捕获 ${uniqueNodes.length} 个节点。`, 'success');
        onNodesFound(uniqueNodes);
      } else {
        addLog('未发现有效节点连接。', 'warning');
      }

    } catch (error) {
      addLog(`解析错误: ${(error as Error).message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  }, [inputText, scanMode, addLog, onNodesFound]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Input Area */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex-1 flex flex-col shadow-lg">
            <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-xl">
                 <div className="flex gap-2 text-sm flex-wrap">
                    <button 
                        onClick={() => setScanMode('ai')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${scanMode === 'ai' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'text-gray-500 border-transparent hover:bg-gray-800'}`}
                    >
                        <Sparkles size={14} /> AI 智能
                    </button>
                    <button 
                        onClick={() => setScanMode('deep')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${scanMode === 'deep' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'text-gray-500 border-transparent hover:bg-gray-800'}`}
                        title="自动处理多层 Base64 嵌套"
                    >
                        <Layers size={14} /> 深度解码
                    </button>
                    <button 
                         onClick={() => setScanMode('regex')}
                         className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors border ${scanMode === 'regex' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'text-gray-500 border-transparent hover:bg-gray-800'}`}
                    >
                        <FileText size={14} /> 纯正则
                    </button>
                 </div>
                 
                 {savedSources.length > 0 && (
                     <button 
                        onClick={handleFetchSources}
                        disabled={isScanning}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-gray-700 rounded-lg transition-colors"
                     >
                        <Server size={12} />
                        拉取源 ({savedSources.length})
                     </button>
                 )}
            </div>
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="在此粘贴订阅链接、Base64 乱码、或网页源代码。&#10;建议使用 [深度解码] 模式处理复杂订阅。"
                className="flex-1 bg-gray-950 p-4 text-xs font-mono text-gray-300 focus:outline-none resize-none rounded-b-xl leading-relaxed"
                spellCheck={false}
            />
        </div>
        
        <div className="flex gap-4">
            <button
                onClick={handleScan}
                disabled={isScanning || !inputText}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
            >
                {isScanning ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                {isScanning ? '正在分析...' : '执行提取'}
            </button>
            <button
                className="px-6 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 flex items-center gap-2 transition-colors"
                onClick={() => setInputText('')}
            >
                清空
            </button>
        </div>
      </div>

      {/* Log Console */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl flex flex-col overflow-hidden font-mono text-xs shadow-lg">
        <div className="bg-gray-900 p-3 border-b border-gray-800 flex items-center gap-2">
            <Terminal size={14} className="text-gray-400" />
            <span className="font-semibold text-gray-300">运行日志</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {logs.length === 0 && <span className="text-gray-600 italic">系统就绪...</span>}
            {logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                    <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                    <span className={`break-all
                        ${log.type === 'error' ? 'text-red-400' : ''}
                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                        ${log.type === 'warning' ? 'text-yellow-400' : ''}
                        ${log.type === 'info' ? 'text-blue-300' : ''}
                    `}>
                        {log.type === 'info' && '> '}
                        {log.message}
                    </span>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};