
import React, { useState } from 'react';
import { Activity, Lock, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (password: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const envPassword = process.env.ADMIN_PASSWORD;
    
    // 如果没有设置环境变量，默认允许进入或弹窗提示
    if (!envPassword) {
      onLogin(password);
      return;
    }

    if (password === envPassword) {
      onLogin(password);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4">
            <Activity className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NodeScout<span className="text-emerald-500">.CF</span></h1>
          <p className="text-gray-500 mt-2">安全节点收集与管理系统</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">管理员密码</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-gray-950 border ${error ? 'border-red-500' : 'border-gray-800'} focus:border-emerald-500 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-700 outline-none transition-all shadow-inner`}
                  placeholder="请输入访问密码"
                  autoFocus
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-3 text-red-400 text-xs animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={14} />
                  密码错误，请重试
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-emerald-900/20"
            >
              登录系统
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-xs">
            {process.env.ADMIN_PASSWORD ? '系统受密码保护' : '未检测到 ADMIN_PASSWORD 变量，将跳过验证'}
          </p>
        </div>
      </div>
    </div>
  );
};
