# Mapa de Requisitos - Sistema Integrado de Gestão

## 1. MULTI-TENANT (GRUPO / LOJA)
1.1 Entidade Grupo (dono)
1.2 Entidade Loja (pertence a 1 Grupo)
1.3 Isolamento: usuários de um Grupo não enxergam dados de outros Grupos
1.4 Gerente Geral do Grupo enxerga todas as lojas do mesmo grupo
1.5 Filtro de tenant em todas as queries

## 2. PERFIS (RBAC)
2.1 ADMIN_GERAL - Acesso total, define preços/margens/regras
2.2 ADMIN_REDE - Cria grupos/lojas/usuários, não mexe em preço
2.3 DONO_LOJA - Vê apenas sua loja (estoque, vendas, OS, financeiro)
2.4 GERENTE_LOJA - Opera vendas/OS/clientes, confirma pagamentos
2.5 VENDEDOR - Cria vendas/OS/orçamentos, vê suas comissões
2.6 Técnico NÃO usa o sistema

## 3. CRIAÇÃO DE LOJA COM CNPJ
3.1 Tela para Admin Rede informar CNPJ
3.2 Consulta API Receita Federal (ou fallback manual)
3.3 Preenche razão social, nome fantasia, endereço
3.4 Define grupo dono e cria loja

## 4. PRODUTOS (MODELO)
4.1 Código automático, nome, tipo (moto|peça), custo
4.2 Fórmula: Preço = Custo ÷ Percentual de custo
4.3 Moto: lucro 26,32%, custo 73,68%
4.4 Peça: lucro 60%, custo 40%
4.5 Permitir alterar manualmente
4.6 Importar/Exportar CSV

## 5. UNIDADE FÍSICA
5.1 Campos: produtoId, cor, chassi, codigoMotor, ano, numeroSerie, status, lojaId
5.2 Status: estoque | vendida | manutenção | reservada
5.3 Venda de moto exige selecionar unidade física
5.4 Ao vender, status vira "vendida"

## 6. ESTOQUE
6.1 Por loja: produtoId, quantidade, estoqueMinimo, estoqueMaximo
6.2 Alertas de mínimo
6.3 Consulta entre lojas do mesmo grupo
6.4 Transferência entre lojas (solicitar/aprovar/registrar)
6.5 NÃO existe venda entre lojas

## 7. SERVIÇOS
7.1 Por tempo: 15min=70, 30min=140, 45min=270, 60min=330
7.2 Fixos: Revitalização 1290, Manutenção motor 1200, etc.
7.3 Permitir criar novos serviços

## 8. ORDEM DE SERVIÇO (OS)
8.1 Status: Orçamento | Em execução | Executada
8.2 Campos: número, data, cliente, moto, técnico, serviços, produtos, valor, garantia 3 meses
8.3 Desconto máximo: 10%
8.4 Ações: enviar email, WhatsApp, imprimir

## 9. VENDAS
9.1 Tipo: Venda | Orçamento
9.2 Seleciona cliente, vendedor, produtos
9.3 Moto: selecionar unidade física
9.4 Desconto: moto 3,5%, peça/serviço 10%
9.5 Pagamento: Pix, Dinheiro (com desconto), Cartão (sem desconto)
9.6 Parcelamento apenas informativo

## 10. GARANTIAS E REVISÕES
10.1 Garantia geral: 3 meses
10.2 Garantia 1 ano: motor, módulo, bateria (com revisões a cada 3 meses)
10.3 1ª revisão grátis, demais pagas
10.4 Alertas: 20 dias antes, todo dia até prazo
10.5 Tela de agendamento

## 11. FINANCEIRO
11.1 Caixa por loja
11.2 Venda/OS entra no caixa após confirmação do financeiro
11.3 Contas a pagar: Luz, Água, Gás, Internet, Aluguel, IPTU, Condomínio, Fornecedores, Outros
11.4 Campos: descrição, valor, vencimento, recorrente
11.5 Alertas: 5 dias antes, todo dia até pagar

## 12. COMISSÕES
12.1 Técnico: 25% sobre mão de obra, nunca sobre peça
12.2 Vendedor: 1% sobre venda de moto
12.3 Checkbox "permitir comissão em peça" (padrão desligado)
12.4 Período: semanal, quinzenal, mensal

## 13. DASHBOARDS
13.1 Admin Geral: visão total
13.2 Dono da Loja: vendas, OS, garantias, revisões, estoque, financeiro
13.3 Gerente: operação diária
13.4 Vendedor: suas vendas, OS, comissões, revisões
13.5 Alertas visuais

## 14. FORA DO ESCOPO
- NF-e/fiscal
- Contabilidade
- CRM/marketing
- Automações extras
- Telas para técnico
- Venda entre lojas
