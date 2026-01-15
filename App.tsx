import React, { useState } from 'react';
import { CostItem, GeneratorState } from './types';
import { generateGASCode } from './utils/scriptGenerator';

const App: React.FC = () => {
  const [state, setState] = useState<GeneratorState>({
    channelId: '',
    costs: [],
  });
  
  // Input states
  const [roleInput, setRoleInput] = useState('');
  const [costValue, setCostValue] = useState('');
  const [costType, setCostType] = useState<'long' | 'short'>('long');

  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleChannelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, channelId: e.target.value }));
  };

  const handleAddCost = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!roleInput.trim() || !costValue) return;
    
    const newCost: CostItem = {
      id: Date.now().toString(),
      role: roleInput.trim(),
      type: costType,
      value: Number(costValue),
    };
    
    setState(prev => ({
      ...prev,
      costs: [...prev.costs, newCost]
    }));
    
    // Reset inputs
    setRoleInput('');
    setCostValue('');
  };

  const removeCost = (id: string) => {
    setState(prev => ({
      ...prev,
      costs: prev.costs.filter(c => c.id !== id)
    }));
  };

  const handleGenerate = () => {
    if (!state.channelId) {
      alert("Por favor, insira o ID do Canal ou o Handle (@Nome).");
      return;
    }
    const code = generateGASCode(state.channelId, state.costs);
    setGeneratedCode(code);
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-2xl mb-6 shadow-2xl shadow-red-900/50 transform hover:scale-105 transition-transform duration-300">
          <i className="fa-brands fa-youtube text-4xl drop-shadow-md"></i>
        </div>
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4">
          YouTube Automation <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Generator</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
          Organize seus custos separadamente por Vídeos Longos e Shorts.
        </p>
      </header>

      <main className="grid gap-8">
        {/* Step 1: Config */}
        <section className="bg-slate-900/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white font-bold text-lg shadow-lg shadow-red-900/20">1</div>
            <h2 className="text-2xl font-bold text-white">Configurações e Custos</h2>
          </div>

          <div className="space-y-8">
            {/* Channel ID Input */}
            <div>
              <label htmlFor="channel-id" className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                ID DO CANAL OU HANDLE (@)
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-red-500 transition-colors">
                  <i className="fa-brands fa-youtube text-lg"></i>
                </div>
                <input
                  type="text"
                  id="channel-id"
                  placeholder="Ex: @SeuCanal ou UC_x5XG1OV2P6uYZ..."
                  value={state.channelId}
                  onChange={handleChannelIdChange}
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all shadow-inner"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                O script detectará automaticamente se você inseriu um ID ou um Handle.
              </p>
            </div>

            {/* Custom Costs Input */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                ADICIONAR CUSTO FIXO
              </label>
              <p className="text-slate-400 text-sm mb-4">
                Adicione quem você paga por vídeo. O sistema separará colunas para Longos e Shorts na planilha.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4 p-4 bg-slate-950/50 rounded-xl border border-slate-800">
                <div className="md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold mb-1 block">FUNÇÃO (Ex: Editor)</label>
                    <input 
                      type="text" 
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      placeholder="Nome"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-red-500 outline-none"
                    />
                </div>
                <div className="md:col-span-4">
                    <label className="text-xs text-slate-500 font-bold mb-1 block">TIPO DE VÍDEO</label>
                    <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 h-[50px]">
                      <button 
                        onClick={() => setCostType('long')}
                        className={`flex-1 rounded-md text-sm font-medium transition-all ${costType === 'long' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        Longo
                      </button>
                      <button 
                        onClick={() => setCostType('short')}
                        className={`flex-1 rounded-md text-sm font-medium transition-all ${costType === 'short' ? 'bg-red-900/50 text-red-200 border border-red-900 shadow' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        Shorts
                      </button>
                    </div>
                </div>
                <div className="md:col-span-3">
                    <label className="text-xs text-slate-500 font-bold mb-1 block">VALOR (R$)</label>
                    <input 
                      type="number" 
                      value={costValue}
                      onChange={(e) => setCostValue(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-1 focus:ring-red-500 outline-none"
                    />
                </div>
                <div className="md:col-span-1 flex items-end">
                    <button 
                      onClick={() => handleAddCost()}
                      className="w-full h-[50px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center shadow-lg shadow-emerald-900/20"
                    >
                      <i className="fa-solid fa-plus"></i>
                    </button>
                </div>
              </div>

              {/* Costs Table List */}
              {state.costs.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <table className="w-full text-sm text-left text-slate-400">
                    <thead className="text-xs text-slate-300 uppercase bg-slate-800/50">
                      <tr>
                        <th scope="col" className="px-6 py-3">Tipo</th>
                        <th scope="col" className="px-6 py-3">Função</th>
                        <th scope="col" className="px-6 py-3">Custo</th>
                        <th scope="col" className="px-6 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.costs.map((cost) => (
                        <tr key={cost.id} className="bg-slate-900 border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4">
                            {cost.type === 'long' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-slate-200 text-xs border border-slate-700">
                                    <i className="fa-regular fa-clock"></i> Longo
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-900/30 text-red-300 text-xs border border-red-900/50">
                                    <i className="fa-solid fa-bolt"></i> Shorts
                                </span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-medium text-white">{cost.role}</td>
                          <td className="px-6 py-4 text-emerald-400">R$ {cost.value.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => removeCost(cost.id)}
                              className="text-red-500 hover:text-red-400 transition-colors"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-500">Nenhum custo configurado.</p>
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              className="w-full py-5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-900/30 transform active:scale-[0.99] transition-all flex items-center justify-center gap-3 group"
            >
              <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform"></i>
              Gerar Código Automático
            </button>
          </div>
        </section>

        {/* Step 2: Result */}
        {generatedCode && (
          <section className="bg-slate-900/80 backdrop-blur-sm rounded-3xl p-8 border border-slate-800 shadow-xl animate-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500 text-white font-bold text-lg shadow-lg shadow-emerald-900/20">2</div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Código Gerado</h2>
                    <p className="text-slate-400 text-sm">Faturamento manual, custos automáticos.</p>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  copied 
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg' 
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                {copied ? 'Copiado!' : 'Copiar Script'}
              </button>
            </div>

            <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <div className="absolute top-0 right-0 p-2 opacity-50 text-xs font-mono text-slate-500 select-none">Google Apps Script</div>
              <textarea
                readOnly
                value={generatedCode}
                className="w-full h-[500px] p-6 bg-slate-950 text-emerald-400 font-mono text-sm focus:outline-none resize-none selection:bg-emerald-500/30"
                spellCheck={false}
              />
            </div>
          </section>
        )}
      </main>

      <footer className="mt-20 border-t border-slate-800 pt-8 pb-12 text-center">
        <p className="text-slate-500 text-sm">
          Desenvolvido por <a href="https://github.com/ricardomdn" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 transition-colors">Ricardão</a>
          <br/>
          <span className="text-slate-600 text-xs mt-2 block">
            Dados 100% seguros na sua planilha.
          </span>
        </p>
      </footer>
    </div>
  );
};

export default App;