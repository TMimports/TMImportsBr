import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import { Button, Input, Card, SectionHeader } from '../components/ui';

interface Grupo {
  id: number;
  nome: string;
  ativo: boolean;
  createdAt: string;
  _count?: { lojas: number; usuarios: number };
  lojas?: { id: number; nomeFantasia: string }[];
}

interface NovoGrupo {
  nome: string;
  nomeProprietario: string;
  emailProprietario: string;
}

export function Grupos() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [sucessoModal, setSucessoModal] = useState<{ email: string; senha: string } | null>(null);
  const [detalhesGrupo, setDetalhesGrupo] = useState<Grupo | null>(null);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  
  const [form, setForm] = useState<NovoGrupo>({
    nome: '',
    nomeProprietario: '',
    emailProprietario: ''
  });

  const loadGrupos = () => {
    setLoading(true);
    api.get<Grupo[]>('/grupos')
      .then(setGrupos)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGrupos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSaving(true);

    try {
      const response = await fetch('/api/grupos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Erro ao criar grupo');
        return;
      }

      setModalOpen(false);
      
      if (data.senhaTemporaria) {
        setSucessoModal({
          email: form.emailProprietario,
          senha: data.senhaTemporaria
        });
      }
      
      setForm({ nome: '', nomeProprietario: '', emailProprietario: '' });
      loadGrupos();
    } catch (error) {
      setErro('Erro de conexao com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const copiarCredenciais = () => {
    if (sucessoModal) {
      const texto = `Email: ${sucessoModal.email}\nSenha temporaria: ${sucessoModal.senha}`;
      navigator.clipboard.writeText(texto);
      alert('Credenciais copiadas!');
    }
  };

  const verDetalhes = async (grupo: Grupo) => {
    try {
      const detalhes = await api.get<Grupo>(`/grupos/${grupo.id}`);
      setDetalhesGrupo(detalhes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExcluir = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este grupo? Todos os usuarios e lojas vinculados tambem serao afetados.')) return;
    try {
      await api.delete(`/grupos/${id}`);
      loadGrupos();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir grupo');
    }
  };

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} grupo(s)? Todos os usuarios e lojas vinculados tambem serao afetados.`)) return;
    
    try {
      await Promise.all(selecionados.map(id => api.delete(`/grupos/${id}`)));
      setSelecionados([]);
      loadGrupos();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir grupos');
    }
  };

  const toggleSelecao = (id: number) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (selecionados.length === grupos.length) {
      setSelecionados([]);
    } else {
      setSelecionados(grupos.map(g => g.id));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <SectionHeader
        title="Grupos"
        subtitle="Gerencie os grupos de lojas da rede"
        actions={
          <div className="flex gap-2">
            {selecionados.length > 0 && (
              <Button variant="danger" onClick={handleExcluirSelecionados}>
                Excluir ({selecionados.length})
              </Button>
            )}
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Novo Grupo
            </Button>
          </div>
        }
      />

      {grupos.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-400">
            Nenhum grupo cadastrado
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selecionados.length === grupos.length && grupos.length > 0}
                      onChange={toggleTodos}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome do Grupo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Lojas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Usuarios</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Criado em</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {grupos.map(grupo => (
                  <tr key={grupo.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(grupo.id)}
                        onChange={() => toggleSelecao(grupo.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">{grupo.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{grupo._count?.lojas || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 hidden md:table-cell">{grupo._count?.usuarios || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 hidden md:table-cell">
                      {new Date(grupo.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => verDetalhes(grupo)}>
                          Detalhes
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleExcluir(grupo.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Grupo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Grupo"
            value={form.nome}
            onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
            placeholder="Ex: Franquia Joao Silva"
            required
          />

          <div className="border-t border-zinc-700 pt-4">
            <p className="text-sm text-gray-400 mb-4">
              Dados do proprietario (usuario DONO_LOJA)
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do Proprietario"
                value={form.nomeProprietario}
                onChange={(e) => setForm(prev => ({ ...prev, nomeProprietario: e.target.value }))}
                placeholder="Nome completo"
                required
              />
              <Input
                label="Email de Acesso"
                type="email"
                value={form.emailProprietario}
                onChange={(e) => setForm(prev => ({ ...prev, emailProprietario: e.target.value }))}
                placeholder="email@exemplo.com"
                required
              />
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {erro}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" loading={saving}>
              Criar Grupo
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={!!sucessoModal} 
        onClose={() => setSucessoModal(null)} 
        title="Grupo Criado com Sucesso!"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-green-400 font-medium mb-2">
              Credenciais de acesso do proprietario:
            </p>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-400">Email:</span> <span className="text-white">{sucessoModal?.email}</span></p>
              <p><span className="text-gray-400">Senha temporaria:</span> <span className="text-white font-mono">{sucessoModal?.senha}</span></p>
            </div>
          </div>

          <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
            No primeiro login, o proprietario sera obrigado a trocar a senha.
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={copiarCredenciais}>
              Copiar Credenciais
            </Button>
            <Button variant="primary" onClick={() => setSucessoModal(null)}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!detalhesGrupo} 
        onClose={() => setDetalhesGrupo(null)} 
        title={`Detalhes: ${detalhesGrupo?.nome}`}
      >
        {detalhesGrupo && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400 mb-2">Lojas do grupo:</p>
              {detalhesGrupo.lojas && detalhesGrupo.lojas.length > 0 ? (
                <ul className="space-y-2">
                  {detalhesGrupo.lojas.map(loja => (
                    <li key={loja.id} className="flex items-center gap-2 p-2 bg-zinc-800 rounded">
                      <span className="text-orange-500">🏪</span>
                      <span>{loja.nomeFantasia}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">Nenhuma loja vinculada ainda</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDetalhesGrupo(null)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
