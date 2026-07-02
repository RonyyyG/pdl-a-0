Este projeto foi integralmente desenvolvido em ambiente de Vibe Code utilizando o Gemini Pro. O simulador foi diretamente inspirado no aclamado site 7a0, concebido estritamente sem fins lucrativos e com propósitos puramente educacionais, servindo como um estudo prático de manipulação do DOM, gerenciamento de estado procedural em JavaScript e lógica matemática de simulação de eventos baseada em probabilidade e pesos estatísticos.

Abaixo está o detalhamento minucioso de toda a arquitetura lógica, regras de validação do Draft e equações probabilísticas que regem os bastidores do jogo.
1. Arquitetura do Draft e Regras de Escalação

O fluxo inicial consiste em preencher as 11 vagas (slots) do esquema tático selecionado no menu. O estado centralizado controla a validação das cartas através de regras rígidas:

    Mapeamento de Linhas do Campo (pitchRowsMap): Divide o campo e valida a compatibilidade das siglas em quatro setores macro:

        ATK: ['ATA', 'SA', 'PTE', 'PTD', 'PL']

        MID: ['MC', 'VOL', 'ME', 'MD']

        DEF: ['ZAG', 'LE', 'LD']

        GK: ['GK']

    Bloqueio de Posição (isPlayerCompletelyBlocked): Toda vez que um time é sorteado, o script verifica se o jogador possui vagas disponíveis no esquema tático escolhido pelo usuário. A função conta quantos jogadores daquela posição exata já foram escalados (countFilled) e compara com o limite máximo permitido pelo esquema tático (countNeeded). Se o jogador não possuir a string 'ALL' em seu array pitchPos e todas as suas posições nativas estiverem lotadas, a carta recebe a propriedade disabled, a classe CSS correspondente, e sua interatividade de clique é revogada.

    Tratamento de Bloqueio Total (Reroll de Emergência): Caso o array sorteado resulte em 100% de cartas bloqueadas (seja por estarem indisponíveis no esquema ou por já terem sido escaladas), a variável booleana allDisabled permanece como true. O sistema oculta as instruções, remove a classe oculta do warningBox para avisar o usuário e disponibiliza o botão "Reroll de Emergência Grátis", evitando que o jogo trave por falta de opções válidas.

    Mecânica do Super Trunfo ("Chamar PDL"): O botão "Chamar PDL" atua como um modificador de estado de uso único (appState.usedPDLCall = true). Ele ignora o sorteio aleatório global de equipes do banco de dados e força uma requisição local filtrando o objeto de nome "PDL". Uma função interna aplica um algoritmo de embaralhamento rápido (sort(() => 0.5 - Math.random())) sobre a lista de membros e extrai uma fatia de exatamente 5 jogadores (slice(0, 5)) para renderização controlada.

2. A Lógica Matemática da Simulação da Partida

Quando os 11 jogadores são escalados, a média aritmética simples dos atributos ovr (Overall) do elenco é calculada para definir o poder geral do usuário (appState.myOvr). O adversário segue o mesmo cálculo pegando os 11 melhores atletas de seu banco de dados (sort((a,b) => b.ovr - a.ovr).slice(0,11)).

A simulação acontece dentro de um loop de tempo assíncrono recursivo (gameStep) disparado a cada ciclo definido pelo elemento #match-speed (1200ms, 600ms ou 150ms). A cada ciclo, o cronômetro avança linearmente 4 minutos de jogo até atingir o teto de 90 minutos.

Média Usuário (myOvr) ────┐
                          ├───► Cálculo da Diferença (diff) ───► Chances de Ataque (attackChance)
Média Oponente (oppOvr) ──┘

Cálculo de Probabilidade de Ataque

A cada 4 minutos virtuais, o algoritmo gera um número flutuante aleatório entre 0 e 100 (Math.random() * 100) e o confronta com as janelas estatísticas de oportunidade de ataque de cada lado. Essas janelas são diretamente moldadas pela diferença de força (diff = appState.myOvr - oppOvr) entre as equipes:
attackChanceMy=12+(diff×0.4)
attackChanceOpp=12−(diff×0.4)

    Se o número sorteado for menor que attackChanceMy, o usuário constrói um ataque.

    Se o número sorteado for maior que (100−attackChanceOpp), o adversário constrói um ataque.

    Qualquer valor que caia no intervalo intermediário resulta em um ciclo neutro (subdividido a cada 12 minutos em mensagens de ambientação do meio-campo).

3. Resolução Interna dos Eventos de Ataque

Uma vez determinado o time atacante do ciclo, o motor do jogo executa um segundo sorteio de 0 a 100 (eventRoll = Math.random() * 100) para discernir o desfecho exato da jogada.
Cenário A: Ataque do Usuário

O script seleciona dinamicamente os atletas participantes invocando a função getRandomPlayerByRow. Ela filtra os escalados do usuário que correspondam às posições macro exigidas (como 'ATK' para finalizar e 'MID' para dar assistência). Se o setor estiver vazio, ela cria um "Jogador Fantasma".

O destino da jogada segue a seguinte árvore de decisão:

    eventRoll < 40 (Tentativa de Gol Tradicional): Ocorre uma finalização clara. No entanto, o sistema introduz uma checagem de interferência externa: há 20% de chance estática (Math.random() < 0.20) de o VAR anular a jogada.

        Se o VAR for acionado: O log exibe o aviso, um cronômetro parcial é gerado com metade da velocidade atual e imprime o cancelamento do gol.

        Se o VAR não intervir: O placar incrementa em 1, o nome do atacante é enviado ao array de artilheiros e o gol é validado.

    40 <= eventRoll < 50 (Impedimento): O ataque é abortado e uma mensagem de infração tática do atacante sorteado é impressa no painel de logs.

    50 <= eventRoll < 80 (Escanteio): O ataque resulta em tiro de canto cobrado pelo meio-campista sorteado, sem alteração de placar.

    eventRoll >= 80 (Pênalti): O atacante sofre falta dentro da área grande. O script aciona uma taxa de conversão padrão de 75% de sucesso (Math.random() < 0.75). O acerto computa o gol; o erro gera um log de desperdício.

Cenário B: Ataque do Adversário

A lógica de defesa puxa um atacante do elenco adversário, um defensor do usuário ('DEF') e o goleiro escalado ('GK'). O eventRoll do oponente possui pesos ligeiramente distintos:

    eventRoll < 45 (Gol do Adversário): O atacante oponente vence o zagueiro do usuário na corrida e balança as redes. O placar do oponente sobe e o nome é listado.

    45 <= eventRoll < 65 (Falta Perigosa): O defensor do usuário comete uma infração dura para parar a jogada do oponente. O evento é registrado como parada defensiva por falta.

    eventRoll >= 65 (Defesaça do Goleiro): O goleiro do usuário opera uma defesa milagrosa contra o chute do atacante adversário, mantendo o placar inalterado.

4. Critérios de Desempate e Resolução da Campanha

Ao atingir o minuto 90, a função finishMatch avalia o estado do placar:

    Vitória Dinâmica: Se o número de gols do usuário for estritamente superior ao do oponente, o índice da fase (appState.currentStage) avança 1 ponto, permitindo o gatilho da próxima partida no próximo tier se a campanha não tiver acabado.

    Derrota: Se o placar for inferior, o loop limpa os timeouts e direciona o usuário imediatamente para a tela screen-end com o estilo de derrota.

    Mecânica de Pênaltis de Morte Súbita: Em caso de igualdade de gols no tempo regulamentar, o motor de jogo simula uma disputa de pênaltis utilizando uma moeda perfeita de 50% de probabilidade (Math.random() > 0.5). O resultado define instantaneamente a sobrevivência do usuário na campanha ou sua eliminação sumária, sem prorrogação.

5. Termos de Uso e Propriedade Intelectual

Este software foi gerado exclusivamente para fins de demonstração técnica e portfólio acadêmico de desenvolvimento web.

    Todos os direitos de imagem, marcas nominativas, entidades, siglas corporativas e direitos de atributos dos atletas e competições oficiais do futebol mundial são reservados e de propriedade exclusiva da FIFA (Fédération Internationale de Football Association).

    Todos os conceitos de personagens fictícios, marcas e marcas registradas atreladas à obra Blue Lock (incluindo conceitos como "Neo Egoist League", "Bastard München", "PXG", "Ubers", e nomes de personagens como Isagi, Rin e Kaiser) são de direitos estritamente reservados aos seus respectivos criadores, ilustradores e à editora detentora da propriedade intelectual da obra.

    Quaisquer marcas ou menções a produtores de conteúdo e canais digitais pertencem inteiramente aos seus respectivos canais do YouTube e criadores de conteúdo independentes listados na base de dados de nível amador.

