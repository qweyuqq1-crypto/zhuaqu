import React, { ReactNode } from 'react';
import { LayoutDashboard, Globe, Settings, Radio, Activity } from 'lucide-react';
import { TabView } from '../types';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const navItems = [
    { id: TabView.DASHBOARD, label: '仪表盘', icon: LayoutDashboard },
    { id: TabView.SCANNER, label: '扫描与解析', icon: Radio },
    { id: TabView.NODES, label: '节点列表', icon: Globe },
    { id: TabView.SETTINGS, label: '设置', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900 flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-500" />
          <span className="text-xl font-bold tracking-wider text-white">NodeScout<span className="text-emerald-500">.CF</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                activeTab === item.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-800/50 p-3 rounded text-xs text-gray-500">
            <p>状态: <span className="text-emerald-500">在线</span></p>
            <p className="mt-1">Worker版本: <span className="text-gray-400">v2.4.1</span></p>
          </div>
        </div>
      </aside>

      {/* Mobile Nav Header */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="md:hidden h-16 border-b border-gray-800 flex items-center px-4 justify-between bg-gray-900">
          <div className="flex items-center gap-2">
             <Activity className="w-6 h-6 text-emerald-500" />
             <span className="font-bold">NodeScout</span>
          </div>
          <div className="flex gap-4">
             {navItems.map(item => (
                 <button key={item.id} onClick={() => onTabChange(item.id)} className={activeTab === item.id ? 'text-emerald-400' : 'text-gray-500'}>
                     <item.icon size={20} />
                 </button>
             ))}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};