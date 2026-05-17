import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Scissors, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { getErrorMessage } from '../lib/error';

export const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error('Informe um e-mail válido.');
      }

      if (!isLogin && password.length < 8) {
        throw new Error('A senha deve ter pelo menos 8 caracteres.');
      }

      if (!isLogin && password !== confirmPassword) {
        throw new Error('As senhas não conferem.');
      }

      if (password.length > 128) {
        throw new Error('A senha deve ter no máximo 128 caracteres.');
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email: normalizedEmail,
          password,
          options: {
            data: {
              store_name: 'Minha Loja'
            }
          }
        });
        if (error) throw error;
        setNotice('Conta criada. Verifique seu e-mail se a confirmação estiver habilitada.');
        setIsLogin(true);
        return;
      }
      navigate('/');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      if (message.includes('Invalid login')) {
        setError('E-mail ou senha incorretos.');
      } else if (message.includes('não conferem')) {
        setError('As senhas não conferem.');
      } else if (message.includes('already registered')) {
        setNotice('Se este e-mail já existir, use a recuperação de senha para acessar sua conta.');
        setIsLogin(true);
      } else if (message.includes('Password should be') || message.includes('8 caracteres')) {
        setError('A senha deve ter pelo menos 8 caracteres.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setNotice(null);

    if (!email) {
      setError('Informe seu e-mail para receber o link de redefinição.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setNotice('Se o e-mail existir, enviaremos um link de redefinição.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível enviar o link de redefinição.'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin((current) => !current);
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setNotice(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(var(--app-primary-rgb),0.13),transparent_34%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.08),transparent_28%)]" />

      <div className="w-full max-w-[420px] z-10">
        <div className="bg-zinc-900/40 backdrop-blur-3xl border border-white/5 shadow-2xl rounded-3xl p-8 md:p-10 relative overflow-hidden">
          {/* Subtle top light reflection */}
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-2xl flex items-center justify-center text-primary mb-6 shadow-glow relative">
              <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-md" />
              <Scissors size={32} className="relative z-10" />
            </div>
            <h1 className="text-3xl font-outfit font-bold text-white mb-2 tracking-tight">
              {isLogin ? 'Bem-vindo de volta' : 'Criar sua conta'}
            </h1>
            <p className="text-zinc-400 text-center text-sm font-medium">
              Gestão inteligente para o seu negócio
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-400 ml-1">E-mail</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 pl-11 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-zinc-400">Senha</label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-xs text-primary hover:text-primary-hover transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="password"
                  required
                  minLength={isLogin ? undefined : 8}
                  maxLength={128}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 pl-11 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400 ml-1">Confirmar senha</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-3 pl-11 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
                    placeholder="Repita sua senha"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notice && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium">
                {notice}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 inline-flex items-center justify-center gap-2 px-6 bg-primary text-zinc-950 font-bold rounded-xl transition-all hover:bg-primary-hover active:scale-[0.98] shadow-glow hover:shadow-primary/40 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Entrar no Sistema' : 'Criar Conta')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800/50 text-center">
            <button 
              type="button"
              onClick={handleToggleMode}
              className="text-zinc-400 hover:text-white text-sm transition-colors font-medium"
            >
              {isLogin ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
              <span className="text-primary hover:text-primary-hover">
                {isLogin ? 'Cadastre-se' : 'Entre aqui'}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
