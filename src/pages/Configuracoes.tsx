import { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  UploadCloud,
  Trash2,
  Loader2,
  CheckCircle2,
  Store,
  AlertCircle,
  XCircle,
  Palette,
  Type,
  Layout,
  Sliders,
  RotateCcw,
  Monitor
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DataService } from '../lib/services';
import { getErrorMessage } from '../lib/error';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  applyTheme,
  applyBgTheme,
  applyBorderRadius,
  applyFontFamily,
  applyDensity,
  applySidebarVisuals,
  saveFullTheme,
  loadFullTheme,
  resetTheme,
  type ThemeSettings,
} from '../lib/theme';
import { useConfirm } from '../contexts/confirm';

// ── Preset Palettes ─────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: 'Âmbar', primary: '#f59e0b', bg: '#09090b' },
  { label: 'Violeta', primary: '#8b5cf6', bg: '#0a0612' },
  { label: 'Esmeralda', primary: '#10b981', bg: '#061611' },
  { label: 'Rosa', primary: '#ec4899', bg: '#0d0509' },
  { label: 'Azul', primary: '#3b82f6', bg: '#050b18' },
  { label: 'Laranja', primary: '#f97316', bg: '#0d0805' },
  { label: 'Ciano', primary: '#06b6d4', bg: '#05100e' },
  { label: 'Vermelho', primary: '#ef4444', bg: '#100505' },
];

// ── Option Card ───────────────────────────────────────────────────────────────
const OptionCard = ({
  label,
  description,
  selected,
  onClick,
  children,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
      selected
        ? 'border-primary bg-primary/10 shadow-glow'
        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/40'
    }`}
  >
    {selected && (
      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
    )}
    {children}
    <p className={`text-sm font-semibold mt-2 ${selected ? 'text-primary' : 'text-white'}`}>
      {label}
    </p>
    {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
  </button>
);

// ── Section Header ────────────────────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) => (
  <div className="p-6 border-b border-zinc-800 bg-zinc-800/20">
    <h3 className="text-lg font-semibold text-white flex items-center gap-2.5">
      <Icon size={20} className="text-primary" />
      {title}
    </h3>
    <p className="text-sm text-zinc-500 mt-1 ml-7">{subtitle}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export const Configuracoes = () => {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loja
  const [nome, setNome] = useState('');
  const [logo, setLogo] = useState('');

  // Tema
  const [theme, setTheme] = useState<ThemeSettings>(() => loadFullTheme());

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await DataService.getConfig();
        setNome(data.nome);
        setLogo(data.logo);
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const updateTheme = (patch: Partial<ThemeSettings>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    if (patch.primaryColor) applyTheme(patch.primaryColor);
    if (patch.bgColor) applyBgTheme(patch.bgColor);
    if (patch.borderRadius) applyBorderRadius(patch.borderRadius);
    if (patch.fontFamily) applyFontFamily(patch.fontFamily);
    if (patch.density) applyDensity(patch.density);
    if (patch.bgColor || patch.sidebarColor || patch.sidebarStyle) {
      applySidebarVisuals(next.sidebarColor, next.sidebarStyle, next.bgColor);
    }
    saveFullTheme(next);
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    updateTheme({ primaryColor: preset.primary, bgColor: preset.bg });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Use apenas imagens PNG, JPG ou WEBP para o logotipo.');
      e.target.value = '';
      return;
    }

    if (file.size > 500 * 1024) {
      setError('O logotipo deve ter no máximo 500kb.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        setLogo(canvas.toDataURL('image/png'));
      };
      img.onerror = () => setError('Não foi possível processar esta imagem.');
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setError('Não foi possível ler o arquivo selecionado.');
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await DataService.saveConfig({ nome, logo });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
      window.dispatchEvent(new Event('config-updated'));
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Erro desconhecido ao salvar.');
      setError(msg);
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Restaurar aparência?',
      message: 'Todas as configurações visuais voltarão para o padrão do sistema.',
      confirmLabel: 'Restaurar padrão',
      tone: 'warning',
    });
    if (!ok) return;
    resetTheme();
    setTheme(loadFullTheme());
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-outfit mb-2">Configurações</h1>
          <p className="text-zinc-400">Personalize cada detalhe visual do seu sistema.</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors border border-zinc-800 hover:border-zinc-600 rounded-xl px-4 py-2.5"
        >
          <RotateCcw size={14} />
          Restaurar Padrão
        </button>
      </header>

      <form onSubmit={handleSave} className="space-y-6">

        {/* ── Perfil da Loja ── */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden">
          <SectionHeader icon={Store} title="Perfil da Loja" subtitle="Nome e logotipo exibidos no sistema" />
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Input
                label="Nome da Loja"
                placeholder="Ex: Nicolini Armarinho"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <p className="text-xs text-zinc-500">Aparece no menu lateral e relatórios exportados.</p>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium text-zinc-400">Logotipo</label>
              <div className="flex items-center gap-5">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
                    {logo
                      ? <img src={logo} alt="Logo" className="w-full h-full object-cover" />
                      : <Settings size={28} className="text-zinc-700" />
                    }
                  </div>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => setLogo('')}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div>
                  <input type="file" id="logo-upload" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleFileUpload} />
                  <label htmlFor="logo-upload" className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-xl cursor-pointer transition-all border border-zinc-700">
                    <UploadCloud size={16} /> Escolher Imagem
                  </label>
                  <p className="text-[11px] text-zinc-600 mt-2">PNG ou JPG, max 500kb.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Paletas Prontas ── */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden">
          <SectionHeader icon={Palette} title="Paletas de Cor" subtitle="Clique em um preset para aplicar instantaneamente" />
          <div className="p-8">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {COLOR_PRESETS.map((preset) => {
                const isActive = theme.primaryColor === preset.primary && theme.bgColor === preset.bg;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                      isActive ? 'border-white/30 bg-white/5' : 'border-transparent hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="relative w-10 h-10 rounded-full border-2 border-zinc-800 group-hover:scale-110 transition-transform overflow-hidden">
                      <div className="absolute inset-0" style={{ backgroundColor: preset.bg }} />
                      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-tl-full" style={{ backgroundColor: preset.primary }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom colors */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Primary */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-400">Cor de Destaque (Primária)</label>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-11 h-11 rounded-xl border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: theme.primaryColor }}
                    title="Clique para abrir o seletor"
                  >
                    <input type="color" value={theme.primaryColor}
                      onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
                    />
                  </div>
                  <Input
                    value={theme.primaryColor.toUpperCase()}
                    onChange={(e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) updateTheme({ primaryColor: e.target.value }); }}
                    placeholder="#F59E0B"
                  />
                </div>
                <p className="text-xs text-zinc-600">Botões, ícones ativos e destaques.</p>
              </div>
              {/* Background */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-400">Cor de Fundo (Conteúdo)</label>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-11 h-11 rounded-xl border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: theme.bgColor }}
                    title="Clique para abrir o seletor"
                  >
                    <input type="color" value={theme.bgColor}
                      onChange={(e) => updateTheme({ bgColor: e.target.value })}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
                    />
                  </div>
                  <Input
                    value={theme.bgColor.toUpperCase()}
                    onChange={(e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) updateTheme({ bgColor: e.target.value }); }}
                    placeholder="#09090B"
                  />
                </div>
                <p className="text-xs text-zinc-600">Área principal de conteúdo e cards.</p>
              </div>
              {/* Sidebar */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-zinc-400">Cor do Menu Lateral</label>
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-11 h-11 rounded-xl border border-zinc-700 overflow-hidden shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    style={{ backgroundColor: theme.sidebarColor }}
                    title="Clique para abrir o seletor"
                  >
                    <input type="color" value={theme.sidebarColor}
                      onChange={(e) => updateTheme({ sidebarColor: e.target.value })}
                      className="absolute inset-0 w-[200%] h-[200%] -top-1/2 -left-1/2 cursor-pointer opacity-0"
                    />
                  </div>
                  <Input
                    value={theme.sidebarColor.toUpperCase()}
                    onChange={(e) => { if (/^#[0-9A-F]{6}$/i.test(e.target.value)) updateTheme({ sidebarColor: e.target.value }); }}
                    placeholder="#18181B"
                  />
                </div>
                <p className="text-xs text-zinc-600">Fundo, texto e bordas do menu lateral.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tipografia ── */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden">
          <SectionHeader icon={Type} title="Tipografia" subtitle="Fonte utilizada em todo o sistema" />
          <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { value: 'inter', label: 'Inter', preview: 'Aa', desc: 'Moderna e legível' },
              { value: 'outfit', label: 'Outfit', preview: 'Aa', desc: 'Premium e elegante' },
              { value: 'mono', label: 'Monospace', preview: 'Aa', desc: 'Técnica e precisa' },
            ] as const).map((f) => (
              <OptionCard
                key={f.value}
                label={f.label}
                description={f.desc}
                selected={theme.fontFamily === f.value}
                onClick={() => updateTheme({ fontFamily: f.value })}
              >
                <div
                  className="text-3xl font-bold text-zinc-300"
                  style={{ fontFamily: f.value === 'mono' ? '"JetBrains Mono", monospace' : f.value === 'outfit' ? 'Outfit' : 'Inter' }}
                >
                  {f.preview}
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        {/* ── Bordas ── */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden">
          <SectionHeader icon={Layout} title="Estilo de Bordas" subtitle="Nível de arredondamento de cards e botões" />
          <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { value: 'sharp', label: 'Sharp', desc: 'Sem arredondamento', radii: ['2px', '4px', '6px'] },
              { value: 'default', label: 'Padrão', desc: 'Balanceado', radii: ['8px', '12px', '16px'] },
              { value: 'rounded', label: 'Arredondado', desc: 'Máximo suave', radii: ['16px', '24px', '32px'] },
            ] as const).map((r) => (
              <OptionCard
                key={r.value}
                label={r.label}
                description={r.desc}
                selected={theme.borderRadius === r.value}
                onClick={() => updateTheme({ borderRadius: r.value })}
              >
                <div className="flex gap-2 items-end">
                  {r.radii.map((rad, i) => (
                    <div
                      key={i}
                      className="bg-zinc-700 group-hover:bg-zinc-600 transition-colors"
                      style={{
                        width: `${(i + 1) * 12 + 12}px`,
                        height: `${(i + 1) * 12 + 12}px`,
                        borderRadius: rad,
                      }}
                    />
                  ))}
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        {/* ── Densidade ── */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden">
          <SectionHeader icon={Sliders} title="Densidade" subtitle="Espaçamento geral dos painéis e tabelas" />
          <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { value: 'compact', label: 'Compacto', desc: 'Mais dados na tela', lines: 4 },
              { value: 'default', label: 'Padrão', desc: 'Equilíbrio ideal', lines: 3 },
              { value: 'comfortable', label: 'Confortável', desc: 'Mais espaço e respiro', lines: 2 },
            ] as const).map((d) => (
              <OptionCard
                key={d.value}
                label={d.label}
                description={d.desc}
                selected={theme.density === d.value}
                onClick={() => updateTheme({ density: d.value })}
              >
                <div className="space-y-1.5">
                  {Array.from({ length: d.lines }).map((_, i) => (
                    <div key={i} className="h-2 rounded-full bg-zinc-700" style={{ width: `${80 - i * 15}%` }} />
                  ))}
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        {/* ── Sidebar Style ── */}
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl overflow-hidden">
          <SectionHeader icon={Monitor} title="Estilo do Menu Lateral" subtitle="Aparência do painel de navegação" />
          <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { value: 'glass', label: 'Glassmorphism', desc: 'Transparente com blur', opacity: '70%' },
              { value: 'solid', label: 'Sólido', desc: 'Cor sólida e definida', opacity: '100%' },
              { value: 'minimal', label: 'Minimal', desc: 'Sem fundo, transparente', opacity: '0%' },
            ] as const).map((s) => (
              <OptionCard
                key={s.value}
                label={s.label}
                description={s.desc}
                selected={theme.sidebarStyle === s.value}
                onClick={() => updateTheme({ sidebarStyle: s.value })}
              >
                <div className="h-14 rounded-xl border border-zinc-700 overflow-hidden flex">
                  <div
                    className="w-1/3 h-full border-r border-zinc-700 flex flex-col gap-1.5 p-2"
                    style={{ opacity: s.value === 'minimal' ? 0.3 : 1, background: s.value === 'solid' ? '#27272a' : s.value === 'glass' ? 'rgba(39,39,42,0.7)' : 'transparent' }}
                  >
                    {[1, 2, 3].map((i) => <div key={i} className="h-1.5 rounded-full bg-zinc-600" style={{ width: `${90 - i * 20}%` }} />)}
                  </div>
                  <div className="flex-1 p-2 space-y-1">
                    {[1, 2].map((i) => <div key={i} className="h-2 rounded bg-zinc-800" style={{ width: `${70 - i * 10}%` }} />)}
                  </div>
                </div>
              </OptionCard>
            ))}
          </div>
        </div>

        {/* ── Rodapé de Salvar ── */}
        <div className="space-y-3">
          {error && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Erro ao salvar</p>
                  <p className="text-xs mt-0.5 text-red-400/80">{error}</p>
                </div>
                <button type="button" onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400">
                  <XCircle size={16} />
                </button>
              </div>
            )}

          <div className="flex items-center justify-between bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl">
            {saved && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 size={18} />
                  Perfil da loja salvo com sucesso!
                </div>
              )}
            <div className="ml-auto">
              <Button
                type="submit"
                disabled={saving}
                leftIcon={saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              >
                {saving ? 'Salvando...' : 'Salvar Perfil da Loja'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
