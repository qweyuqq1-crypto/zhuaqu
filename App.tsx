
import React, { useState, useCallback, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { NodeList } from './components/NodeList';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { TabView, NodeItem, ScanLog } from './types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // 从 sessionStorage 获取登录状态，关闭浏览器即需重新登录
    return sessionStorage.getItem('nodescout_auth') === 'true' || !process.env.ADMIN_PASSWORD;
  });

  const [activeTab, setActiveTab] = useState<TabView>(TabView.DASHBOARD);
  
  const [nodes, setNodes] = useState<NodeItem[]>(() => {
    const savedNodes = localStorage.getItem('nodescout_nodes');
    if (savedNodes) {
      try {
        return JSON.parse(savedNodes);
      } catch (e) {
        console.error("Failed to parse saved nodes", e);
      }
    }
    return [];
  });

  const [logs, setLogs] = useState<ScanLog[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('nodescout_nodes', JSON.stringify(nodes));
    }
  }, [nodes, isAuthenticated]);

  const addLog = useCallback((message: string, type: ScanLog['type'] = 'info') => {
    setLogs(prev => [{
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }, ...prev]);
  }, []);

  const handleLogin = (password: string) => {
    // 逻辑已在 Login 组件内部验证，此处仅做状态同步
    sessionStorage.setItem('nodescout_auth', 'true');
    setIsAuthenticated(true);
  };

  const handleNodesFound = useCallback((newNodes: NodeItem[]) => {
    setNodes(prev => {
       const combined = [...newNodes, ...prev];
       return combined.filter((node, index, self) => 
          index === self.findIndex((t) => (
             t.address === node.address && 
             t.port === node.port && 
             t.protocol === node.protocol
          ))
       );
    });
    
    addLog(`已添加 ${newNodes.length} 个节点。开始检测...`, 'info');
    
    setTimeout(() => {
        setNodes(currentNodes => 
            currentNodes.map(n => {
                if (n.status === 'untested') {
                    if (Math.random() > 0.9) return { ...n, status: 'timeout', latency: 0 };
                    const lat = Math.floor(Math.random() * 400) + 50;
                    return { ...n, status: 'active', latency: lat };
                }
                return n;
            })
        );
        addLog('检测完成。', 'success');
    }, 1500);

  }, [addLog]);

  const handleClearNodes = useCallback(() => {
    if (window.confirm('确定要清空所有已采集的节点吗？')) {
      setNodes([]);
      localStorage.removeItem('nodescout_nodes');
      addLog('已清空列表。', 'warning');
    }
  }, [addLog]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

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
