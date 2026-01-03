
import React, { useEffect } from 'react';
import { GOOGLE_CLIENT_ID } from '../constants';
import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  
  useEffect(() => {
    // Access google global via window to avoid TypeScript "Cannot find name 'google'" error
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors">
      <div className="bg-white dark:bg-slate-800 max-w-sm w-full p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-center transition-colors">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">
          $
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Fluxo de Caixa GSC</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Gerencie múltiplos restaurantes e hotéis com inteligência artificial e segurança OAuth2.</p>
        
        <div id="googleBtn" className="w-full flex justify-center"></div>
        
        <div className="mt-8 text-xs text-slate-400">
          Acesso restrito à organização GSC Tech • v1.2
        </div>
      </div>
    </div>
  );
};
