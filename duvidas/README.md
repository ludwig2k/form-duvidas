# Formulário web em etapas — Diagnóstico GGDP

## Atualizações realizadas
- Inseridas as logos da Secretaria de Estado da Administração / Estado de Goiás e do programa Sead por Você.
- Substituído o perfil `Servidor que atua como referência ou disseminador de informações na unidade` por `Amigo da GGDP`.
- Removida a pergunta sobre orientar outros servidores no dia a dia.
- Removido o tema `Sistemas de Gestão de Pessoas`.
- Inserido o tema `Ações e eventos de qualidade de vida e integração` com foco em inscrições, datas e público-alvo.
- Removida a pergunta sobre nível geral de segurança para orientar outras pessoas.
- Ajustado o texto da pergunta para `Que tipo de recurso ajudaria você a compreender ou disseminar melhor as informações do dia a dia funcional?`
- Removida a dependência de Netlify Forms.

## Arquivos
- `index.html`: formulário completo, responsivo e com lógica condicional.
- `obrigado.html`: página de confirmação após conclusão.
- `assets/logo-sead-goias.jpg`: logo institucional da SEAD com brasão do Estado de Goiás.
- `assets/logo-sead-por-voce.png`: logo do Sead por Você.

## Funcionamento atual
O formulário está pronto para ser hospedado em qualquer hospedagem estática.

### Sem backend configurado
Por padrão, ao concluir o formulário:
1. um arquivo `resposta-diagnostico-ggdp.json` é gerado automaticamente no navegador;
2. o usuário é direcionado para `obrigado.html`.

### Com backend configurado futuramente
No `index.html`, existe a constante:
```js
const FORM_ENDPOINT = "";
```
Se desejarem integrar o formulário a outro serviço, basta informar ali a URL do endpoint que receberá um `POST` em JSON.

## Estrutura do formulário
1. Perfil
2. Temas prioritários
3. Aprofundamento dos temas escolhidos
4. Necessidades de informação
5. Revisão final

## Sugestões finais
- Se quiserem, substituam o campo textual de unidade por uma lista oficial das unidades da SEAD.
- Se houver backend próprio, o ideal é salvar cada resposta em banco de dados ou planilha automaticamente.
- Se o formulário for publicado em ambiente institucional, vale testar em celular e desktop antes da divulgação.

## Atualização de redação
- `Quando surge uma dúvida em sua vida funcional, qual costuma ser sua principal dificuldade?`
- `Nos conte algo que podemos melhorar como GGDP que pode ajudar na sua gestão!`

## Correção de imagens
As duas logos agora estão incorporadas diretamente nos arquivos HTML em base64. Assim, elas aparecem mesmo ao abrir o HTML isoladamente, sem depender da pasta `assets`.

## Ajuste de identidade visual
- As duas logos agora ficam no mesmo lado do cabeçalho.
- Ordem: `Sead por Você` primeiro e, em seguida, a nova marca institucional `SEAD / Governo de Goiás`.
- A marca institucional anterior foi substituída pela imagem fornecida em 08/10/2026.
- As duas logos foram mantidas em tamanho discreto.
