
import React, { ReactNode } from 'react';
import { LayoutDashboard, Globe, Settings, Radio, Activity, LogOut } from 'lucide-react';
import { TabView } from '../types';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onLogout }) => {
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
          <div className="bg-emerald-500/10 p-2 rounded-xl">
            <Activity className="w-6 h-6 text-emerald-500" />
          </div>
          <span className="text-xl font-bold tracking-wider text-white">NodeScout<span className="text-emerald-500">.CF</span></span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                activeTab === item.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-emerald-400' : 'text-gray-500 group-hover:text-emerald-400 transition-colors'} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-3">
          <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-800 text-xs text-gray-500">
            <div className="flex justify-between items-center mb-2">
                <span>状态:</span>
                <span className="text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    在线
                </span>
            </div>
            <div className="flex justify-between items-center">
                <span>权限:</span>
                <span className="text-gray-400">管理员</span>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200 border border-transparent hover:border-red-400/20"
          >
            <LogOut size={18} />
            <span className="font-semibold text-sm">退出登录</span>
          </button>
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
             <button onClick={onLogout} className="text-gray-500"><LogOut size={20}/></button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
