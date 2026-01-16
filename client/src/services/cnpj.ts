export interface CNPJData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  telefone: string;
  email: string;
  cep: string;
  bairro: string;
  cidade: string;
  uf: string;
}

function formatarTelefone(dddTelefone: string): string {
  if (!dddTelefone) return '';
  const numeros = dddTelefone.replace(/\D/g, '');
  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }
  return dddTelefone;
}

export async function buscarCNPJ(cnpj: string): Promise<CNPJData | null> {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  if (cnpjLimpo.length !== 14) {
    return null;
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    const endereco = [
      data.logradouro,
      data.numero,
      data.complemento
    ].filter(Boolean).join(', ');

    return {
      cnpj: cnpjLimpo,
      razaoSocial: data.razao_social || '',
      nomeFantasia: data.nome_fantasia || data.razao_social || '',
      endereco: endereco,
      telefone: formatarTelefone(data.ddd_telefone_1),
      email: data.email || '',
      cep: data.cep || '',
      bairro: data.bairro || '',
      cidade: data.municipio || '',
      uf: data.uf || ''
    };
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    return null;
  }
}

export interface CPFData {
  nome: string;
  cpf: string;
}

export function formatCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return cpf;
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) return cnpj;
  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}
