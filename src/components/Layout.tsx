import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Truck, 
  ShoppingBag, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  Scissors,
  Boxes,
  Landmark,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../lib/services';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [config, setConfig] = useState({ nome: 'Armarinho', logo: '' });
  const hasLogo = Boolean(config.logo);

  const fetchConfig = async () => {
    try {
      const data = await DataService.getConfig();
      setConfig(data);
    } catch (error) {
      console.error('Erro ao buscar branding:', error);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig();
    const handleConfigUpdate = () => fetchConfig();
    window.addEventListener('config-updated', handleConfigUpdate);
    return () => window.removeEventListener('config-updated', handleConfigUpdate);
  }, []);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/vendas', icon: TrendingUp, label: 'Vendas' },
    { to: '/produtos', icon: Boxes, label: 'Produtos' },
    { to: '/fornecedores', icon: Truck, label: 'Fornecedores' },
    { to: '/compras', icon: ShoppingBag, label: 'Compras' },
    { to: '/financeiro', icon: Landmark, label: 'Financeiro' },
    { to: '/calendario', icon: CalendarDays, label: 'Calendário' },
    { to: '/cartoes', icon: CreditCard, label: 'Cartões' },
    { to: '/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarStyle: React.CSSProperties = {
    backgroundColor: 'var(--sidebar-bg-color, #18181b)',
    backdropFilter: 'var(--sidebar-blur, none)',
    WebkitBackdropFilter: 'var(--sidebar-blur, none)',
    borderRightColor: 'var(--sidebar-border-color, #27272a)',
    borderRightWidth: '1px',
    borderRightStyle: 'solid',
    boxShadow: 'var(--sidebar-shadow, none)',
  };

  return (
    <div className="app-shell min-h-screen flex font-inter text-zinc-100" style={{ backgroundColor: 'var(--app-bg-base, #09090b)' }}>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        style={sidebarStyle}
        className={`
          fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] transition-transform duration-300 transform
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:block
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 flex items-center justify-between" style={{ borderBottomColor: 'var(--sidebar-border-color, #27272a)', borderBottomWidth: '1px', borderBottomStyle: 'solid' }}>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 flex items-center justify-center overflow-hidden shrink-0 ${hasLogo ? 'bg-transparent rounded-none' : 'bg-primary rounded-xl'}`}
                style={{ color: 'var(--app-primary-text, #09090b)' }}
              >
                {hasLogo
                  ? <img src={config.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                  : <Scissors size={22} />
                }
              </div>
              <span className="text-base font-bold font-outfit tracking-tight truncate" style={{ color: 'var(--sidebar-text-color, #f4f4f5)' }}>
                {config.nome}
              </span>
            </div>
            <button type="button" title="Fechar menu" onClick={() => setIsSidebarOpen(false)} className="lg:hidden" style={{ color: 'var(--sidebar-muted-color, rgba(255,255,255,0.45))' }}>
              <X size={22} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className="block"
                onClick={() => setIsSidebarOpen(false)}
              >
                {({ isActive }) => (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer"
                    style={isActive ? {
                      background: 'var(--app-primary-hex, #f59e0b)',
                      color: 'var(--app-primary-text, #09090b)',
                      fontWeight: 700,
                      boxShadow: '0 0 16px var(--app-primary-glow, rgba(245,158,11,0.25))',
                    } : {
                      color: 'var(--sidebar-muted-color, rgba(255,255,255,0.5))',
                      backgroundColor: 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--sidebar-hover-bg, rgba(255,255,255,0.07))';
                        (e.currentTarget as HTMLDivElement).style.color = 'var(--sidebar-text-color, #f4f4f5)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLDivElement).style.color = 'var(--sidebar-muted-color, rgba(255,255,255,0.5))';
                      }
                    }}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3" style={{ borderTopColor: 'var(--sidebar-border-color, #27272a)', borderTopWidth: '1px', borderTopStyle: 'solid' }}>
            {user?.email && (
              <div className="px-4 py-3 mb-2 rounded-xl border" style={{ backgroundColor: 'var(--sidebar-surface-overlay, rgba(255,255,255,0.05))', borderColor: 'var(--sidebar-border-color, rgba(255,255,255,0.08))' }}>
                <p className="text-[11px] uppercase font-bold tracking-wider" style={{ color: 'var(--sidebar-muted-color, rgba(255,255,255,0.45))' }}>
                  Sessão segura
                </p>
                <p className="text-sm truncate mt-1" style={{ color: 'var(--sidebar-text-color, #f4f4f5)' }}>
                  {user.email}
                </p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200"
              style={{ color: 'var(--sidebar-muted-color, rgba(255,255,255,0.45))' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(248,113,113,0.07)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--sidebar-muted-color, rgba(255,255,255,0.45))';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Sair do Sistema</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col h-dvh overflow-hidden">
        {/* Mobile Top Header */}
        <header
          className="lg:hidden sticky top-0 z-30 p-4 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--sidebar-bg-color, #18181b)',
            borderBottomColor: 'var(--sidebar-border-color, #27272a)',
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
          }}
        >
          <div className="flex items-center gap-2">
            {hasLogo
              ? <img src={config.logo} alt="Logo" className="h-7 w-7 object-contain shrink-0" />
              : <Scissors className="text-primary shrink-0" size={22} />
            }
            <span className="text-lg font-bold font-outfit truncate max-w-[70vw]" style={{ color: 'var(--sidebar-text-color, #f4f4f5)' }}>{config.nome}</span>
          </div>
          <button type="button" title="Abrir menu" onClick={() => setIsSidebarOpen(true)} style={{ color: 'var(--sidebar-muted-color, rgba(255,255,255,0.5))' }}>
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 md:p-8 lg:p-12">
          <div className="max-w-7xl min-w-0 mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
