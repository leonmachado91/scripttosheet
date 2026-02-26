import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from './services/api';
import { useProjetoStore } from './stores/useProjetoStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Toolbar } from './components/layout/Toolbar';
import { CenaTable } from './components/cena/CenaTable';
import { CenaDetalhePanel } from './components/cena/CenaDetalhePanel';

function App() {
  const setProjetos = useProjetoStore(state => state.setProjetos);
  const projetoAtual = useProjetoStore(state => state.projetoAtual);

  const { data: projetos, isLoading, error } = useQuery({
    queryKey: ['projetos'],
    queryFn: api.listarProjetos,
  });

  useEffect(() => {
    if (projetos) {
      setProjetos(projetos);
    }
  }, [projetos, setProjetos]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gruv-bg-hard text-gruv-fg">
      <Sidebar isLoading={isLoading} error={error ? error.message : null} />

      <main className="flex-1 flex flex-col min-w-0 bg-gruv-bg-hard">
        <Header />

        {projetoAtual ? (
          <>
            <Toolbar />
            <CenaTable />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gruv-gray">
              <span className="material-symbols-outlined text-[64px] block mb-4 opacity-50">note_stack</span>
              <h2 className="text-2xl font-bold text-gruv-fg0">Nenhum Projeto Selecionado</h2>
              <p className="mt-2 text-sm">Selecione um projeto na barra lateral ou crie um novo.</p>
            </div>
          </div>
        )}
      </main>

      {/* Painel flutuante (fixed position, não afeta layout) */}
      <CenaDetalhePanel />
    </div>
  );
}

export default App;
