# ⚽ PDL A 0 - Roguelike Draft Simulator

![Licença](https://img.shields.io/badge/Fins-Educacionais-green)
![Tecnologias](https://img.shields.io/badge/Vibe_Code-Gemini__Pro-blue)
![Inspirado em](https://img.shields.io/badge/Inspirado_no-7a0-orange)

> **Nota de Desenvolvimento:** Este projeto foi integralmente desenvolvido em ambiente de **Vibe Code utilizando o Gemini Pro**. O simulador foi diretamente inspirado no aclamado site **7a0**, concebido estritamente **sem fins lucrativos e com propósitos puramente educacionais**, servindo como um estudo prático de manipulação do DOM, gerenciamento de estado procedural em JavaScript e lógica matemática de simulação de eventos baseada em probabilidade e pesos estatísticos.

---

## 🛠️ Arquitetura do Draft e Regras de Escalação

O fluxo inicial consiste em preencher as 11 vagas (`slots`) do esquema tático selecionado no menu. O estado centralizado controla a validação das cartas através de regras rígidas de posicionamento:

* **Mapeamento de Linhas do Campo (`pitchRowsMap`):** Divide o campo e valida a compatibilidade das siglas em quatro setores macro:
  * ⚔️ **ATK:** `['ATA', 'SA', 'PTE', 'PTD', 'PL']`
  * 🧠 **MID:** `['MC', 'VOL', 'ME', 'MD']`
  * 🛡️ **DEF:** `['ZAG', 'LE', 'LD']`
  * 🧤 **GK:** `['GK']`

* **Bloqueio de Posição (`isPlayerCompletelyBlocked`):** Toda vez que um time é sorteado, o script verifica se o jogador possui vagas disponíveis no esquema tático escolhido pelo usuário. A função conta quantos jogadores daquela posição exata já foram escalados (`countFilled`) e compara com o limite máximo permitido pelo esquema tático (`countNeeded`). Se o jogador não possuir a string `'ALL'` em seu array `pitchPos` e todas as suas posições nativas estiverem lotadas, a carta recebe a propriedade `disabled`, a classe CSS correspondente, e sua interatividade de clique é revogada.

* **Tratamento de Bloqueio Total (Reroll de Emergência):** Caso o array sorteado resulte em 100% de cartas bloqueadas (seja por estarem indisponíveis no esquema ou por já terem sido escaladas), a variável booleana `allDisabled` permanece como `true`. O sistema oculta as instruções, remove a classe oculta do `warningBox` para avisar o usuário e disponibiliza o botão "Reroll de Emergência Grátis", evitando que o jogo trave por falta de opções válidas.

* **Mecânica do Super Trunfo ("Chamar PDL"):** O botão "Chamar PDL" atua como um modificador de estado de uso único (`appState.usedPDLCall = true`). Ele ignora o sorteio aleatório global de equipes do banco de dados e força uma requisição local filtrando o objeto de nome `"PDL"`. Uma função interna aplica um algoritmo de embaralhamento rápido (`sort(() => 0.5 - Math.random())`) sobre a lista de membros e extrai uma fatia de exatamente 5 jogadores (`slice(0, 5)`) para renderização controlada.

---

## 🧮 A Lógica Matemática da Simulação da Partida

Quando os 11 jogadores são escalados, a média aritmética simples dos atributos `ovr` (Overall) do elenco é calculada para definir o poder geral do usuário (`appState.myOvr`). O adversário segue o mesmo cálculo pegando os 11 melhores atletas de seu banco de dados (`sort((a,b) => b.ovr - a.ovr).slice(0,11)`).

A simulação acontece dentro de um loop de tempo assíncrono recursivo (`gameStep`) disparado a cada ciclo definido pelo elemento `#match-speed` (1200ms, 600ms ou 150ms). A cada ciclo, o cronômetro avança linearmente **4 minutos de jogo** até atingir o teto de 90 minutos.
