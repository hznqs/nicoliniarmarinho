import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { Layout } from './components/Layout';

const Login = React.lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Fornecedores = React.lazy(() => import('./pages/Fornecedores').then(m => ({ default: m.Fornecedores })));
const Produtos = React.lazy(() => import('./pages/Produtos').then(m => ({ default: m.Produtos })));
const Cartoes = React.lazy(() => import('./pages/Cartoes').then(m => ({ default: m.Cartoes })));
const Compras = React.lazy(() => import('./pages/Compras').then(m => ({ default: m.Compras })));
const Vendas = React.lazy(() => import('./pages/Vendas').then(m => ({ default: m.Vendas })));
const Financeiro = React.lazy(() => import('./pages/Financeiro').then(m => ({ default: m.Financeiro })));
const Calendario = React.lazy(() => import('./pages/Calendario').then(m => ({ default: m.Calendario })));
const Configuracoes = React.lazy(() => import('./pages/Configuracoes').then(m => ({ default: m.Configuracoes })));

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-zinc-950">
    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
  </div>
);

const PageLoader = () => (
  <div className="h-[60vh] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <Routes>
            <Route path="/login" element={
              <Suspense fallback={<FullScreenLoader />}>
                <Login />
              </Suspense>
            } />
            
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute><Vendas /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute><Fornecedores /></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute><Compras /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
            <Route path="/cartoes" element={<ProtectedRoute><Cartoes /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
          </Routes>
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
