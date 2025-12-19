
import React, { useState, useEffect } from 'react';
import { Activity, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff, Info } from 'lucide-react';

interface LoginProps {
  onLogin: (password: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 检查构建时是否成功注入了密码变量
  const isEnvConfigured = !!process.env.ADMIN_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 延迟校验，增加安全性感知
    setTimeout(() => {
      const envPassword = process.env.ADMIN_PASSWORD;
      
      // 如果构建时完全没有设置变量，为了防止无法进入，
      // 我们在 UI 上显示警告，但此处逻辑允许进入（或者你可以改为强制报错）
      if (!isEnvConfigured) {
        onLogin(password);
        setLoading(false);
        return;
      }

      if (password === envPassword) {
        onLogin(password);
      } else {
        setError(true);
        // 抖动效果可以通过 CSS 类实现
        setTimeout(() => setError(false), 3000);
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 overflow-hidden relative">
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

        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-[2rem] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-widest flex justify-between">
                管理员身份验证
                {!isEnvConfigured && <span className="text-amber-500 lowercase font-normal italic flex items-center gap-1"><Info size={10}/> 未配置环境变量</span>}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-gray-950/50 border ${error ? 'border-red-500/50 ring-2 ring-red-500/10 animate-shake' : 'border-gray-800 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5'} rounded-2xl py-4 pl-12 pr-12 text-white placeholder-gray-700 outline-none transition-all duration-300`}
                  placeholder={isEnvConfigured ? "请输入管理员密码" : "环境变量未设置，可直接进入"}
                  autoFocus
                  disabled={loading}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 mt-3 text-red-400 text-xs animate-in slide-in-from-top-2">
                  <AlertCircle size={14} />
                  密码错误。提示：请确保已在 Cloudflare 设置“构建变量”并重新部署。
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg shadow-emerald-900/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isEnvConfigured ? '验证并开启' : '立即进入 (调试模式)'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-10 text-center space-y-2">
          <p className="text-gray-600 text-[10px] uppercase tracking-[0.2em]">
            System Build ID: {Math.random().toString(36).substring(7).toUpperCase()}
          </p>
          {!isEnvConfigured && (
            <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl text-left">
              <p className="text-amber-500/80 text-[10px] leading-relaxed">
                <b>排错指南：</b><br/>
                1. 登录 Cloudflare 控制台 -> Pages -> 你的项目 -> 设置 -> 环境变量。<br/>
                2. 在 <b>“构建变量”</b> (Build variables) 中添加 <code className="bg-gray-800 px-1 rounded">ADMIN_PASSWORD</code>。<br/>
                3. <b>关键步骤</b>：前往“部署”页面，点击“重新部署”当前构建。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
