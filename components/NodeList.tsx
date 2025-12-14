import React, { useState, useMemo } from 'react';
import { NodeItem } from '../types';
import { Signal, Globe, Copy, CheckCircle2, Download, ClipboardCheck, ArrowUpDown, ArrowUp, ArrowDown, Filter, Eye, X, Trash2 } from 'lucide-react';
import { GeminiService } from '../services/geminiService';

interface NodeListProps {
  nodes: NodeItem[];
  onClearNodes: () => void;
  onDeleteNode: (id: string) => void;
}

type SortField = 'latency' | 'country' | 'protocol';
type SortDirection = 'asc' | 'desc';

export const NodeList: React.FC<NodeListProps> = ({ nodes, onClearNodes, onDeleteNode }) => {
  const [protocolFilter, setProtocolFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('latency');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  
  const [advice, setAdvice] = useState<string>('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [copiedNodeId, setCopiedNodeId] = useState<string | null>(null);

  // Preview Modal State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [copyPreviewSuccess, setCopyPreviewSuccess] = useState(false);

  // Extract unique countries for filter dropdown
  const uniqueCountries = useMemo(() => {
    const countries = new Set(nodes.map(n => n.country || '未知'));
    return Array.from(countries).sort();
  }, [nodes]);

  // Filter and Sort Logic
  const processedNodes = useMemo(() => {
    let result = nodes.filter(node => {
        const matchProtocol = protocolFilter === 'all' || node.protocol === protocolFilter;
        const matchCountry = countryFilter === 'all' || (node.country || '未知') === countryFilter;
        return matchProtocol && matchCountry;
    });

    return result.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'latency') {
            // Treat 0 or undefined as very high latency (bottom of list)
            valA = valA || 9999;
            valB = valB || 9999;
        }

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });
  }, [nodes, protocolFilter, countryFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDir('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-600" />;
    return sortDir === 'asc' ? <ArrowUp size={14} className="text-emerald-400" /> : <ArrowDown size={14} className="text-emerald-400" />;
  };

  const getLatencyColor = (ms?: number) => {
    if (!ms) return 'text-gray-500';
    if (ms < 100) return 'text-emerald-400';
    if (ms < 300) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleGetAdvice = async () => {
    setLoadingAdvice(true);
    const text = await GeminiService.generateConfigAdvice(nodes);
    setAdvice(text);
    setLoadingAdvice(false);
  };

  const handleCopyAll = () => {
    const rawLinks = processedNodes.map(n => n.rawLink).filter(Boolean).join('\n');
    if (!rawLinks) return;
    navigator.clipboard.writeText(rawLinks);
    setCopySuccess('已复制');
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleCopyNodeLink = (id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedNodeId(id);
    setTimeout(() => setCopiedNodeId(null), 2000);
  };

  const generateBase64 = () => {
    const rawLinks = processedNodes.map(n => n.rawLink).filter(Boolean).join('\n');
    if (!rawLinks) return '';
    return btoa(unescape(encodeURIComponent(rawLinks)));
  };

  const handleDownloadSub = () => {
    const base64Content = generateBase64();
    if (!base64Content) return;
    
    const blob = new Blob([base64Content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nodes_subscribe.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreviewSub = () => {
    const content = generateBase64();
    if (!content) {
        alert("暂无节点可预览");
        return;
    }
    setPreviewContent(content);
    setShowPreviewModal(true);
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewContent);
    setCopyPreviewSuccess(true);
    setTimeout(() => setCopyPreviewSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                已采集节点 
                <span className="text-sm font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {processedNodes.length} / {nodes.length}
                </span>
            </h2>
            <p className="text-gray-500 text-xs mt-1">管理、筛选和导出您扫描到的代理节点</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
             <button 
                onClick={onClearNodes}
                disabled={nodes.length === 0}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600/10 hover:bg-red-600 hover:text-white border border-red-600/30 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="清空所有节点"
            >
                <Trash2 size={16} />
                清空列表
            </button>

            <button 
                onClick={handleCopyAll}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                title="复制当前列表所有链接"
            >
                {copySuccess ? <CheckCircle2 size={16} className="text-emerald-500"/> : <ClipboardCheck size={16} />}
                {copySuccess ? copySuccess : '复制链接'}
            </button>

            <button 
                onClick={handlePreviewSub}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                title="预览生成的 Base64 订阅内容"
            >
                <Eye size={16} />
                预览订阅
            </button>
            
            <button 
                onClick={handleDownloadSub}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors shadow-lg shadow-emerald-900/20"
                title="下载 Base64 格式订阅文件"
            >
                <Download size={16} />
                下载订阅
            </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 bg-gray-900 p-4 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                <span className="text-gray-500 text-xs uppercase font-bold mr-2">协议:</span>
                {['all', 'vmess', 'vless', 'ss', 'trojan'].map(p => (
                    <button
                        key={p}
                        onClick={() => setProtocolFilter(p)}
                        className={`px-3 py-1.5 rounded-md text-xs capitalize transition-colors whitespace-nowrap ${protocolFilter === p ? 'bg-gray-700 text-white font-medium' : 'text-gray-400 hover:text-white bg-gray-950 border border-gray-800'}`}
                    >
                        {p === 'all' ? '全部' : p}
                    </button>
                ))}
            </div>

            <div className="w-px bg-gray-800 hidden md:block"></div>

            <div className="flex items-center gap-3">
                <span className="text-gray-500 text-xs uppercase font-bold flex items-center gap-1">
                    <Filter size={12}/> 地区:
                </span>
                <select 
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="bg-gray-950 border border-gray-800 text-gray-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full md:w-48 p-1.5"
                >
                    <option value="all">所有地区</option>
                    {uniqueCountries.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
      </div>

      {/* AI Advice Section */}
      <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
          <div className="flex justify-between items-start mb-2">
              <h3 className="text-indigo-400 font-semibold text-sm flex items-center gap-2">
                  <Globe size={16} /> AI 网络分析
              </h3>
              <button 
                onClick={handleGetAdvice}
                disabled={loadingAdvice || nodes.length === 0}
                className="text-xs text-indigo-300 hover:text-white underline disabled:opacity-50"
              >
                  {loadingAdvice ? '分析中...' : '刷新建议'}
              </button>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
              {advice || "Gemini AI 可分析您的节点列表并推荐最佳地区。"}
          </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-950 text-gray-200 uppercase font-medium">
              <tr>
                <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-900 transition-colors group"
                    onClick={() => handleSort('protocol')}
                >
                    <div className="flex items-center gap-2">协议 {getSortIcon('protocol')}</div>
                </th>
                <th className="px-6 py-4">名称/备注</th>
                <th className="px-6 py-4">地址</th>
                <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-900 transition-colors group"
                    onClick={() => handleSort('country')}
                >
                    <div className="flex items-center gap-2">地区 {getSortIcon('country')}</div>
                </th>
                <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-900 transition-colors group"
                    onClick={() => handleSort('latency')}
                >
                    <div className="flex items-center gap-2">延迟 {getSortIcon('latency')}</div>
                </th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {processedNodes.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-600">
                        暂无符合条件的节点。
                    </td>
                </tr>
              ) : (
                processedNodes.map((node) => (
                    <tr key={node.id} className="hover:bg-gray-800/50 transition-colors group">
                    <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase w-16 text-center
                        ${node.protocol === 'vmess' ? 'bg-purple-900/30 text-purple-400' : ''}
                        ${node.protocol === 'vless' ? 'bg-blue-900/30 text-blue-400' : ''}
                        ${node.protocol === 'ss' ? 'bg-green-900/30 text-green-400' : ''}
                        ${node.protocol === 'trojan' ? 'bg-yellow-900/30 text-yellow-400' : ''}
                        ${node.protocol === 'unknown' ? 'bg-gray-800 text-gray-500' : ''}
                        `}>
                        {node.protocol}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-white font-medium max-w-[200px] truncate" title={node.name}>{node.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{node.address}:{node.port}</td>
                    <td className="px-6 py-4">{node.country}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                        <Signal size={16} className={getLatencyColor(node.latency)} />
                        <span className={`font-mono ${getLatencyColor(node.latency)}`}>
                            {node.latency ? `${node.latency}ms` : '-'}
                        </span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-emerald-400 transition"
                                title="复制链接"
                                onClick={() => handleCopyNodeLink(node.id, node.rawLink)}
                            >
                                {copiedNodeId === node.id ? <CheckCircle2 size={16} className="text-emerald-500"/> : <Copy size={16} />}
                            </button>
                            <button 
                                className="p-2 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400 transition"
                                title="删除此节点"
                                onClick={() => onDeleteNode(node.id)}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Eye className="text-emerald-400" size={18} />
                        <h3 className="text-lg font-semibold text-white">订阅内容预览 (Base64)</h3>
                    </div>
                    <button 
                        onClick={() => setShowPreviewModal(false)} 
                        className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                        <X size={20}/>
                    </button>
                </div>
                
                <div className="p-4 flex-1 overflow-hidden relative bg-[#0d1117]">
                    <textarea
                        readOnly
                        value={previewContent}
                        className="w-full h-full bg-transparent text-xs font-mono text-gray-400 focus:outline-none resize-none"
                    />
                </div>
                
                <div className="p-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-900 rounded-b-xl">
                     <div className="mr-auto text-xs text-gray-500 flex items-center">
                         * 此内容可直接用于 V2Ray/Clash 等客户端导入
                     </div>
                     <button 
                        onClick={() => setShowPreviewModal(false)} 
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        关闭
                     </button>
                     <button 
                        onClick={handleCopyPreview} 
                        className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                        {copyPreviewSuccess ? <CheckCircle2 size={16}/> : <Copy size={16} />}
                        {copyPreviewSuccess ? '已复制' : '一键复制'}
                     </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};