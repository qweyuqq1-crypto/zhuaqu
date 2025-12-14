import React, { useMemo } from 'react';
import { NodeItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ShieldCheck, Zap, Globe2, AlertTriangle, Download, Rocket, FileCode } from 'lucide-react';

interface DashboardProps {
  nodes: NodeItem[];
}

export const Dashboard: React.FC<DashboardProps> = ({ nodes }) => {
  const stats = useMemo(() => {
    const active = nodes.filter(n => n.status === 'active').length;
    const avgLatency = nodes.reduce((acc, curr) => acc + (curr.latency || 0), 0) / (nodes.length || 1);
    
    // Protocol Distribution
    const protocols = nodes.reduce((acc, curr) => {
      acc[curr.protocol] = (acc[curr.protocol] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Latency Buckets
    const latencyDist = {
        '极速 (<100ms)': nodes.filter(n => n.latency && n.latency < 100).length,
        '良好 (100-300)': nodes.filter(n => n.latency && n.latency >= 100 && n.latency < 300).length,
        '一般 (>300)': nodes.filter(n => n.latency && n.latency >= 300).length,
        '超时/未知': nodes.filter(n => !n.latency).length
    };
    
    return { active, avgLatency: Math.round(avgLatency), protocols, latencyDist, total: nodes.length };
  }, [nodes]);

  const protocolData = useMemo(() => {
      return Object.entries(stats.protocols).map(([name, count]) => ({ name, count }));
  }, [stats]);

  const latencyData = useMemo(() => {
      return Object.entries(stats.latencyDist).map(([name, count]) => ({ name, count }));
  }, [stats]);

  const handleExportBase64 = () => {
    if (nodes.length === 0) return alert("没有可导出的节点！");
    const rawLinks = nodes.map(n => n.rawLink).filter(Boolean).join('\n');
    const base64Content = btoa(unescape(encodeURIComponent(rawLinks)));
    downloadFile(base64Content, 'node_subscribe.txt');
  };

  const handleExportClash = () => {
    if (nodes.length === 0) return alert("没有可导出的节点！");
    // Simple mock Clash YAML generation
    const proxies = nodes.map(n => `  - { name: "${n.name}", type: ${n.protocol}, server: ${n.address}, port: ${n.port}, cipher: auto, password: uuid }`).join('\n');
    const yaml = `proxies:\n${proxies}\n\n# 注意: 这是一个基础模板，完整 Clash 配置需要更复杂的转换逻辑。`;
    downloadFile(yaml, 'clash_config.yaml');
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">网络概览</h2>
        <p className="text-gray-400 text-sm">全球各地区已采集节点的实时状态监控。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="节点总数" 
          value={stats.total} 
          icon={Globe2} 
          color="text-blue-400" 
          bg="bg-blue-500/10" 
        />
        <StatCard 
          title="可用节点" 
          value={stats.active} 
          icon={ShieldCheck} 
          color="text-emerald-400" 
          bg="bg-emerald-500/10" 
        />
        <StatCard 
          title="平均延迟" 
          value={`${stats.avgLatency}ms`} 
          icon={Zap} 
          color="text-yellow-400" 
          bg="bg-yellow-500/10" 
        />
        <StatCard 
          title="异常/超时" 
          value={stats.total - stats.active} 
          icon={AlertTriangle} 
          color="text-red-400" 
          bg="bg-red-500/10" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">协议分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={protocolData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {protocolData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#6b7280'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                   itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
              {protocolData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <div className="w-2 h-2 rounded-full" style={{backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#6b7280'][index % 5]}}></div>
                      {entry.name} ({entry.count})
                  </div>
              ))}
          </div>
        </div>

        {/* Latency Distribution */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">延迟质量分布</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={latencyData} layout="vertical" margin={{ left: 20 }}>
                        <XAxis type="number" stroke="#6b7280" hide />
                        <YAxis dataKey="name" type="category" stroke="#9ca3af" width={100} tick={{fontSize: 12}} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={30}>
                             {latencyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#10b981', '#fbbf24', '#ef4444', '#6b7280'][index]} />
                             ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">配置导出</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <button 
                    onClick={handleExportBase64}
                    className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition border border-gray-700 text-left group relative overflow-hidden"
                 >
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <Download className="w-6 h-6 text-emerald-500 mb-2" />
                        <div>
                            <span className="block text-emerald-400 font-bold group-hover:text-emerald-300">Base64 订阅</span>
                            <span className="text-xs text-gray-500">通用格式 (v2rayN/Clash)</span>
                        </div>
                    </div>
                 </button>

                 <button 
                    onClick={handleExportClash}
                    className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 transition border border-gray-700 text-left group relative overflow-hidden"
                 >
                     <div className="relative z-10 flex flex-col h-full justify-between">
                        <FileCode className="w-6 h-6 text-blue-500 mb-2" />
                        <div>
                            <span className="block text-blue-400 font-bold group-hover:text-blue-300">Clash 配置</span>
                            <span className="text-xs text-gray-500">YAML 格式 (简易模版)</span>
                        </div>
                     </div>
                 </button>
            </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: any; color: string; bg: string }> = ({ title, value, icon: Icon, color, bg }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-lg ${bg}`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
  </div>
);