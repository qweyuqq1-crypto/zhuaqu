import React, { useState, useCallback, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { NodeList } from './components/NodeList';
import { Settings } from './components/Settings';
import { TabView, NodeItem, ScanLog } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  
  // Initialize nodes from localStorage if available
  const [nodes, setNodes] = useState<NodeItem[]>(() => {
    const savedNodes = localStorage.getItem('nodescout_nodes');
    if (savedNodes) {
      try {
        return JSON.parse(savedNodes);
      } catch (e) {
        console.error("Failed to parse saved nodes", e);
      }
    }
    // Default sample data only if no saved data
    return [
      { id: '1', protocol: 'vmess', name: '香港公共节点 01', address: 'hk.node.com', port: 443, status: 'active', rawLink: '', country: '中国香港', latency: 45 },
      { id: '2', protocol: 'vless', name: '日本低延迟', address: 'jp.aws.amazon.com', port: 443, status: 'active', rawLink: '', country: '日本', latency: 82 },
    ];
  });

  const [logs, setLogs] = useState<ScanLog[]>([]);

  // Persist nodes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('nodescout_nodes', JSON.stringify(nodes));
  }, [nodes]);

  const addLog = useCallback((message: string, type: ScanLog['type'] = 'info') => {
    setLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev]);
  }, []);

  const handleNodesFound = useCallback((newNodes: NodeItem[]) => {
    setNodes(prev => {
       const combined = [...newNodes, ...prev];
       // Enhanced Deduplication: Check address, port AND protocol
       return combined.filter((node, index, self) => 
          index === self.findIndex((t) => (
             t.address === node.address && 
             t.port === node.port && 
             t.protocol === node.protocol
          ))
       );
    });
    
    addLog(`已添加 ${newNodes.length} 个节点。开始后台延迟模拟检测...`, 'info');
    
    // Improved Simulation: Randomly assign status but keep existing latency if present
    setTimeout(() => {
        setNodes(currentNodes => 
            currentNodes.map(n => {
                // Only test untested nodes to avoid overwriting good data
                if (n.status === 'untested') {
                    // Simulate 10% packet loss/timeout
                    if (Math.random() > 0.9) {
                         return { ...n, status: 'timeout', latency: 0 };
                    }
                    const lat = Math.floor(Math.random() * 400) + 50;
                    return { ...n, status: 'active', latency: lat };
                }
                return n;
            })
        );
        addLog('后台延迟检测完成。', 'success');
    }, 1500);

  }, [addLog]);

  const handleClearNodes = useCallback(() => {
    if (window.confirm('确定要清空所有已采集的节点吗？此操作不可恢复。')) {
      setNodes([]);
      localStorage.removeItem('nodescout_nodes');
      addLog('已清空所有节点列表。', 'warning');
    }
  }, [addLog]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case TabView.DASHBOARD:
        return <Dashboard nodes={nodes} />;
      case TabView.SCANNER:
        return <Scanner onNodesFound={handleNodesFound} logs={logs} addLog={addLog} />;
      case TabView.NODES:
        return <NodeList nodes={nodes} onClearNodes={handleClearNodes} onDeleteNode={handleDeleteNode} />;
      case TabView.SETTINGS:
        return <Settings />;
      default:
        return <Dashboard nodes={nodes} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;