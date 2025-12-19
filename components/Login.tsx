
import React, { useState } from 'react';
import { Activity, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

interface LoginProps {
  onLogin: (password: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 模拟一个微小的延迟增加仪式感
    setTimeout(() => {
      const envPassword = process.env.ADMIN_PASSWORD;
      
      // 如果没有设置环境变量，默认允许进入
      if (!envPassword) {
        onLogin(password);
        setLoading(false);
        return;
      }

      if (password === envPassword) {
        onLogin(password);
      } else {
        setError(true);
        setTimeout(() => setError(false), 3000);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* 背景装饰 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-500/10 rounded-3xl mb-6 shadow-inner border border-emerald-500/20">
            <Activity className="w-12 h-12 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">NodeScout<span className="text-emerald-500">.CF</span></h1>
          <p className="text-gray-400 mt-3 text-sm tracking-wide uppercase">节点采集与管理中心</p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest">管理员身份验证</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-gray-950/50 border ${error ? 'border-red-500/50 ring-2 ring-red-500/10' : 'border-gray-800 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5'} rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-700 outline-none transition-all duration-300`}
                  placeholder="请输入访问密码"
                  autoFocus
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-3 text-red-400 text-xs animate-in slide-in-from-top-2">
                  <AlertCircle size={14} />
                  密码校验失败，请检查环境变量设置
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (!password && !!process.env.ADMIN_PASSWORD)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg shadow-emerald-900/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  开启面板
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-10 text-center animate-in fade-in duration-1000 delay-500">
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em]">
            {process.env.ADMIN_PASSWORD ? 'System Securely Encrypted' : 'Security Warning: ADMIN_PASSWORD Not Configured'}
          </p>
        </div>
      </div>
    </div>
  );
};
