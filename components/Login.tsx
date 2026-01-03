
import React, { useEffect } from 'react';
import { GOOGLE_CLIENT_ID } from '../constants';
import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  
  useEffect(() => {
    const g = (window as any).google;
    if (g && g.accounts) {
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      g.accounts.id.renderButton(
        document.getElementById("googleBtn")!,
        { 
          theme: "filled_blue", 
          size: "large", 
          width: "320", 
          text: "continue_with", 
          shape: "pill",
          logo_alignment: "left"
        }
      );
    }
  }, []);

  const handleCredentialResponse = (response: any) => {
    const payload = decodeJwt(response.credential);
    const user: UserProfile = {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      token: response.credential
    };
    onLogin(user);
  };

  const decodeJwt = (token: string) => {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-600/5 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 dark:bg-emerald-600/5 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 w-full max-w-[440px] animate-fade-in">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white dark:border-slate-800 p-10 md:p-12 text-center transition-all duration-300">
          
          {/* Logo Section */}
          <div className="relative mb-10 inline-block">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl flex items-center justify-center text-white font-bold text-5xl shadow-2xl transform hover:rotate-6 transition-transform duration-300 cursor-default">
              $
            </div>
          </div>
          
          <div className="space-y-3 mb-10">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Fluxo <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-400">GSC</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Bem-vindo ao centro de inteligência financeira da sua rede.
            </p>
          </div>
          
          {/* Login Action Area */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">
              Acesso Restrito
            </div>
            
            <div id="googleBtn" className="flex justify-center transition-transform hover:scale-[1.02] active:scale-[0.98]"></div>
            
            <p className="mt-6 text-[11px] text-slate-400 dark:text-slate-500 max-w-[280px] mx-auto leading-normal">
              Utilize suas credenciais corporativas @gsc.com para autenticação automática.
            </p>
          </div>
          
          {/* Security Badges */}
          <div className="mt-10 flex items-center justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zm0 18c-3.75-1-6-5-6-9V6.3l6-2 6 2V11c0 4-2.25 8-6 9z"/></svg>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">SSL Secure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Google Auth</span>
            </div>
          </div>
        </div>

        {/* Outer Footer */}
        <div className="mt-8 flex justify-between items-center px-4 text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          <span>v1.5.0 Cloud</span>
          <span>© 2024 GSC Tech Group</span>
        </div>
      </div>
    </div>
  );
};
