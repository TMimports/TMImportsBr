function gerarCPF() {
  const n = () => Math.floor(Math.random() * 9);
  const d = [n(), n(), n(), n(), n(), n(), n(), n(), n()];
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += d[i] * (10 - i);
  }
  let resto = soma % 11;
  d[9] = resto < 2 ? 0 : 11 - resto;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += d[i] * (11 - i);
  }
  resto = soma % 11;
  d[10] = resto < 2 ? 0 : 11 - resto;
  
  return d.join('');
}

function gerarCNPJ() {
  const n = () => Math.floor(Math.random() * 9);
  const d = [n(), n(), n(), n(), n(), n(), n(), n(), 0, 0, 0, 1];
  
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += d[i] * pesos1[i];
  }
  let resto = soma % 11;
  d[12] = resto < 2 ? 0 : 11 - resto;
  
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += d[i] * pesos2[i];
  }
  resto = soma % 11;
  d[13] = resto < 2 ? 0 : 11 - resto;
  
  return d.join('');
}

function formatarCPF(cpf) {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatarCNPJ(cnpj) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  let resto = soma % 11;
  if (parseInt(cpf[9]) !== (resto < 2 ? 0 : 11 - resto)) return false;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i);
  }
  resto = soma % 11;
  return parseInt(cpf[10]) === (resto < 2 ? 0 : 11 - resto);
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpj[i]) * pesos1[i];
  }
  let resto = soma % 11;
  if (parseInt(cnpj[12]) !== (resto < 2 ? 0 : 11 - resto)) return false;
  
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpj[i]) * pesos2[i];
  }
  resto = soma % 11;
  return parseInt(cnpj[13]) === (resto < 2 ? 0 : 11 - resto);
}

module.exports = {
  gerarCPF,
  gerarCNPJ,
  formatarCPF,
  formatarCNPJ,
  validarCPF,
  validarCNPJ
};
