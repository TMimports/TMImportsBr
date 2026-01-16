import { useState } from 'react';
import { Button, Input } from '../components/ui';

interface TrocarSenhaProps {
  onSuccess: () => void;
}

export function TrocarSenha({ onSuccess }: TrocarSenhaProps) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (novaSenha !== confirmarSenha) {
      setErro('Nova senha e confirmacao nao conferem');
      return;
    }

    if (novaSenha.length < 8) {
      setErro('Nova senha deve ter no minimo 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/trocar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha })
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.error || 'Erro ao trocar senha');
        return;
      }

      onSuccess();
    } catch (err) {
      setErro('Erro de conexao com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Tecle Motos" className="w-24 h-24 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Troca de Senha Obrigatoria</h1>
          <p className="text-gray-400 mt-2">
            Por seguranca, voce precisa alterar sua senha temporaria antes de acessar o sistema.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Senha Atual (temporaria)"
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder="Digite a senha temporaria"
              required
            />

            <Input
              label="Nova Senha"
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Minimo 8 caracteres"
              required
            />

            <Input
              label="Confirmar Nova Senha"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Repita a nova senha"
              required
            />

            {erro && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {erro}
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Alterar Senha e Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
