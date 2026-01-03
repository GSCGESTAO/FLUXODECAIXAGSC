
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
        { theme: "outline", size: "large", width: "100%", text: "continue_with", shape: "pill" }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 transition-colors">
      <div className="bg-white dark:bg-slate-800 max-w-sm w-full p-10 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        
        <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-8 shadow-lg shadow-indigo-200 dark:shadow-none animate-fade-in">
          $
        </div>
        
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">Fluxo GSC</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed text-sm">
          Gestão financeira inteligente para redes de hospitalidade. <br/>
          <span className="font-semibold text-indigo-500">Acesse com segurança organizacional.</span>
        </p>
        
        <div id="googleBtn" className="w-full flex justify-center transform transition-transform hover:scale-[1.02]"></div>
        
        <div className="mt-12 flex flex-col gap-2">
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
            Secure Cloud Access
          </div>
          <div className="text-[9px] text-slate-300 dark:text-slate-500">
            v1.5.0 • GSC Tech Group
          </div>
        </div>
      </div>
    </div>
  );
};
