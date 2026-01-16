import { useState, useEffect } from 'react';
import { Button, Input, Card, SectionHeader } from '../components/ui';
import { Modal } from '../components/Modal';
import { buscarCNPJ } from '../services/cnpj';

interface Franqueado {
  id: number;
  nome: string;
  email: string;
  ativo: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  loja?: {
    id: number;
    nomeFantasia: string;
    cnpj: string;
  };
}

interface NovoFranqueado {
  nome: string;
  email: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  telefone: string;
  emailLoja: string;
}

export function Franqueados() {
  const [franqueados, setFranqueados] = useState<Franqueado[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [sucessoModal, setSucessoModal] = useState<{ email: string; senha: string } | null>(null);
  
  const [form, setForm] = useState<NovoFranqueado>({
    nome: '',
    email: '',
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    endereco: '',
    telefone: '',
    emailLoja: ''
  });

  useEffect(() => {
    loadFranqueados();
  }, []);

  const loadFranqueados = async () => {
    try {
      const response = await fetch('/api/franqueados', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFranqueados(data);
      }
    } catch (error) {
      console.error('Erro ao carregar franqueados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscarCNPJ = async () => {
    const cnpjLimpo = form.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14) {
      setErro('CNPJ deve ter 14 digitos');
      return;
    }

    setBuscandoCNPJ(true);
    setErro('');

    try {
      const dados = await buscarCNPJ(cnpjLimpo);
      if (dados) {
        setForm(prev => ({
          ...prev,
          razaoSocial: dados.razaoSocial || '',
          nomeFantasia: dados.nomeFantasia || dados.razaoSocial || '',
          endereco: dados.endereco || '',
          telefone: dados.telefone || '',
          emailLoja: dados.email || ''
        }));
      } else {
        setErro('CNPJ nao encontrado');
      }
    } catch (error) {
      setErro('CNPJ nao encontrado ou invalido');
    } finally {
      setBuscandoCNPJ(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSaving(true);

    try {
      const response = await fetch('/api/franqueados', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Erro ao cadastrar franqueado');
        return;
      }

      setModalOpen(false);
      setSucessoModal({
        email: data.usuario.email,
        senha: data.senhaTemporaria
      });
      setForm({
        nome: '',
        email: '',
        cnpj: '',
        razaoSocial: '',
        nomeFantasia: '',
        endereco: '',
        telefone: '',
        emailLoja: ''
      });
      loadFranqueados();
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

  return (
    <div>
      <SectionHeader
        title="Franqueados"
        subtitle="Gerencie os franqueados da rede"
        actions={
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            Novo Franqueado
          </Button>
        }
      />

      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : franqueados.length === 0 ? (
        <Card>
          <div className="text-center py-8 text-gray-400">
            Nenhum franqueado cadastrado
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase hidden md:table-cell">Loja</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {franqueados.map(f => (
                  <tr key={f.id} className="hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-white">{f.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-300">{f.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 hidden md:table-cell">
                      {f.loja?.nomeFantasia || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {f.mustChangePassword ? (
                        <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">
                          Aguardando acesso
                        </span>
                      ) : f.ativo ? (
                        <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400">
                          Inativo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Novo Franqueado">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Franqueado"
              value={form.nome}
              onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome completo"
              required
            />
            <Input
              label="Email de Acesso"
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                label="CNPJ da Loja"
                value={form.cnpj}
                onChange={(e) => setForm(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
                required
              />
            </div>
            <div className="flex items-end">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleBuscarCNPJ}
                loading={buscandoCNPJ}
              >
                Buscar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razao Social"
              value={form.razaoSocial}
              onChange={(e) => setForm(prev => ({ ...prev, razaoSocial: e.target.value }))}
              placeholder="Razao social da empresa"
              required
            />
            <Input
              label="Nome Fantasia"
              value={form.nomeFantasia}
              onChange={(e) => setForm(prev => ({ ...prev, nomeFantasia: e.target.value }))}
              placeholder="Nome fantasia"
            />
          </div>

          <Input
            label="Endereco"
            value={form.endereco}
            onChange={(e) => setForm(prev => ({ ...prev, endereco: e.target.value }))}
            placeholder="Endereco completo"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(e) => setForm(prev => ({ ...prev, telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
            <Input
              label="Email da Loja"
              type="email"
              value={form.emailLoja}
              onChange={(e) => setForm(prev => ({ ...prev, emailLoja: e.target.value }))}
              placeholder="contato@loja.com"
            />
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
              Cadastrar Franqueado
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={!!sucessoModal} 
        onClose={() => setSucessoModal(null)} 
        title="Franqueado Criado com Sucesso!"
      >
        <div className="space-y-4">
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
            <p className="text-green-400 font-medium mb-2">
              Credenciais de acesso do franqueado:
            </p>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-400">Email:</span> <span className="text-white">{sucessoModal?.email}</span></p>
              <p><span className="text-gray-400">Senha temporaria:</span> <span className="text-white font-mono">{sucessoModal?.senha}</span></p>
            </div>
          </div>

          <div className="p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
            No primeiro login, o franqueado sera obrigado a trocar a senha.
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
    </div>
  );
}
