# pdl-a-0

 <h2 style="color: var(--accent-gold); margin-bottom: 15px;">Sobre o Simulador PDL A 0</h2>
            <p>Este projeto foi integralmente desenvolvido em ambiente de Vibe Code utilizando o Gemini Pro. O simulador foi diretamente inspirado no aclamado site 7a0, concebido estritamente sem fins lucrativos e com propósitos puramente educacionais, servindo como um estudo prático de manipulação do DOM, gerenciamento de estado procedural em JavaScript e lógica matemática de simulação de eventos baseada em probabilidade e pesos estatísticos.</p>
            <p>Abaixo está o detalhamento minucioso de toda a arquitetura lógica, regras de validação do Draft e equações probabilísticas que regem os bastidores do jogo.</p>

            <hr style="border-color: #334155; margin: 20px 0;">

            <h3 style="color: var(--accent-blue);">1. Arquitetura do Draft e Regras de Escalação</h3>
            <p>O fluxo inicial consiste em preencher as 11 vagas (slots) do esquema tático selecionado no menu. O estado centralizado controla a validação das cartas através de regras rígidas:</p>
            <ul>
                <li><strong>Mapeamento de Linhas do Campo (pitchRowsMap):</strong> Divide o campo e valida a compatibilidade das siglas em quatro setores macro:
                    <ul>
                        <li><code>ATK: ['ATA', 'SA', 'PTE', 'PTD', 'PL']</code></li>
                        <li><code>MID: ['MC', 'VOL', 'ME', 'MD']</code></li>
                        <li><code>DEF: ['ZAG', 'LE', 'LD']</code></li>
                        <li><code>GK:  ['GK']</code></li>
                    </ul>
                </li>
                <li><strong>Bloqueio de Posição (isPlayerCompletelyBlocked):</strong> Toda vez que um time é sorteado, o script verifica se o jogador possui vagas disponíveis no esquema tático escolhido pelo usuário. A função conta quantos jogadores daquela posição exata já foram escalados (<code>countFilled</code>) e compara com o limite máximo permitido pelo esquema tático (<code>countNeeded</code>). Se o jogador não possuir a string 'ALL' em seu array <code>pitchPos</code> e todas as suas posições nativas estiverem lotadas, a carta recebe a propriedade disabled, a classe CSS correspondente, e sua interatividade de clique é revogada.</li>
                <li><strong>Tratamento de Bloqueio Total (Reroll de Emergência):</strong> Caso o array sorteado resulte em 100% de cartas bloqueadas (seja por estarem indisponíveis no esquema ou por já terem sido escaladas), a variável booleana <code>allDisabled</code> permanece como true. O sistema oculta as instruções, remove a classe oculta do <code>warningBox</code> para avisar o usuário e disponibiliza o botão "Reroll de Emergência Grátis", evitando que o jogo trave por falta de opções válidas.</li>
                <li><strong>Mecânica do Super Trunfo ("Chamar PDL"):</strong> O botão "Chamar PDL" atua como um modificador de estado de uso único (<code>appState.usedPDLCall = true</code>). Ele ignora o sorteio aleatório global de equipes do banco de dados e força uma requisição local filtrando o objeto de nome "PDL". Uma função interna aplica um algoritmo de embaralhamento rápido (<code>sort(() => 0.5 - Math.random())</code>) sobre a lista de membros e extrai uma fatia de exatamente 5 jogadores (<code>slice(0, 5)</code>) para renderização controlada.</li>
            </ul>

            <h3 style="color: var(--accent-blue); margin-top: 20px;">2. A Lógica Matemática da Simulação da Partida</h3>
            <p>Quando os 11 jogadores são escalados, a média aritmética simples dos atributos ovr (Overall) do elenco é calculada para definir o poder geral do usuário (<code>appState.myOvr</code>). O adversário segue o mesmo cálculo pegando os 11 melhores atletas de seu banco de dados (<code>sort((a,b) => b.ovr - a.ovr).slice(0,11)</code>).</p>
            <p>A simulação acontece dentro de um loop de tempo assíncrono recursivo (<code>gameStep</code>) disparado a cada ciclo definido pelo elemento #match-speed (1200ms, 600ms ou 150ms). A cada ciclo, o cronômetro avança linearmente 4 minutos de jogo até atingir o teto de 90 minutos.</p>
            
            <p><strong>Cálculo de Probabilidade de Ataque</strong></p>
            <p>A cada 4 minutos virtuais, o algoritmo gera um número flutuante aleatório entre 0 e 100 e o confronta com as janelas estatísticas de oportunidade de ataque de cada lado. Essas janelas são diretamente moldadas pela diferença de força (<code>diff = appState.myOvr - oppOvr</code>) entre as equipes:</p>
            
            <p>$$ \text{attackChanceMy} = 12 + (\text{diff} \times 0.4) $$</p>
            <p>$$ \text{attackChanceOpp} = 12 - (\text{diff} \times 0.4) $$</p>
            
            <ul>
                <li>Se o número sorteado for menor que \(\text{attackChanceMy}\), o usuário constrói um ataque.</li>
                <li>Se o número sorteado for maior que \((100 - \text{attackChanceOpp})\), o adversário constrói um ataque.</li>
                <li>Qualquer valor que caia no intervalo intermediário resulta em um ciclo neutro (subdividido a cada 12 minutos em mensagens de ambientação do meio-campo).</li>
            </ul>

            <h3 style="color: var(--accent-blue); margin-top: 20px;">3. Resolução Interna dos Eventos de Ataque</h3>
            <p>Uma vez determinado o time atacante do ciclo, o motor do jogo executa um segundo sorteio de 0 a 100 para discernir o desfecho exato da jogada.</p>
            
            <p><strong>Cenário A: Ataque do Usuário</strong></p>
            <p>O script seleciona dinamicamente os atletas participantes invocando a função <code>getRandomPlayerByRow</code>. Ela filtra os escalados do usuário que correspondam às posições macro exigidas. O destino da jogada segue a seguinte árvore de decisão:</p>
            <ul>
                <li><strong>eventRoll < 40 (Tentativa de Gol Tradicional):</strong> Ocorre uma finalização clara. No entanto, o sistema introduz uma checagem de interferência externa: há 20% de chance estática (<code>Math.random() < 0.20</code>) de o VAR anular a jogada. Se o VAR intervir, um cronômetro parcial é gerado e imprime o cancelamento do gol. Caso contrário, o gol é validado e o artilheiro listado.</li>
                <li><strong>40 <= eventRoll < 50 (Impedimento):</strong> O ataque é abortado e uma mensagem de infração tática é impressa.</li>
                <li><strong>50 <= eventRoll < 80 (Escanteio):</strong> O ataque resulta em tiro de canto, sem alteração de placar.</li>
                <li><strong>eventRoll >= 80 (Pênalti):</strong> O atacante sofre falta na área. O script aciona uma taxa de conversão padrão de 75% de sucesso (<code>Math.random() < 0.75</code>).</li>
            </ul>

            <p><strong>Cenário B: Ataque do Adversário</strong></p>
            <p>A lógica de defesa puxa um atacante do elenco adversário, um defensor do usuário e o goleiro escalado. O eventRoll do oponente possui pesos distintos:</p>
            <ul>
                <li><strong>eventRoll < 45 (Gol do Adversário):</strong> O atacante oponente vence o zagueiro do usuário e balança as redes.</li>
                <li><strong>45 <= eventRoll < 65 (Falta Perigosa):</strong> O defensor do usuário comete uma infração dura para parar a jogada.</li>
                <li><strong>eventRoll >= 65 (Defesaça do Goleiro):</strong> O goleiro do usuário opera uma defesa milagrosa, mantendo o placar inalterado.</li>
            </ul>

            <h3 style="color: var(--accent-blue); margin-top: 20px;">4. Critérios de Desempate e Resolução da Campanha</h3>
            <p>Ao atingir o minuto 90, a função <code>finishMatch</code> avalia o estado do placar:</p>
            <ul>
                <li><strong>Vitória Dinâmica:</strong> Se o número de gols do usuário for superior, o índice da fase (<code>appState.currentStage</code>) avança 1 ponto, engatilhando a próxima partida.</li>
                <li><strong>Derrota:</strong> Se inferior, o loop direciona o usuário para a tela <code>screen-end</code>.</li>
                <li><strong>Mecânica de Pênaltis de Morte Súbita:</strong> Em caso de igualdade de gols, simula-se uma disputa de pênaltis utilizando uma moeda perfeita de 50% de probabilidade (<code>Math.random() > 0.5</code>), definindo instantaneamente a sobrevivência ou eliminação.</li>
            </ul>

            <h3 style="color: var(--accent-green); margin-top: 20px;">5. Termos de Uso e Propriedade Intelectual</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted);">Este software foi gerado exclusivamente para fins de demonstração técnica e portfólio acadêmico de desenvolvimento web.<br><br>
            Todos os direitos de imagem, marcas nominativas, entidades, siglas corporativas e direitos de atributos dos atletas e competições oficiais do futebol mundial são reservados e de propriedade exclusiva da FIFA (Fédération Internationale de Football Association).<br><br>
            Todos os conceitos de personagens fictícios, marcas e marcas registradas atreladas à obra Blue Lock (incluindo conceitos como "Neo Egoist League", "Bastard München", "PXG", "Ubers", e nomes de personagens como Isagi, Rin e Kaiser) são de direitos estritamente reservados aos seus respectivos criadores, ilustradores e à editora detentora da propriedade intelectual da obra.<br><br>
            Quaisquer marcas ou menções a produtores de conteúdo e canais digitais pertencem inteiramente aos seus respectivos canais do YouTube e criadores de conteúdo independentes listados na base de dados de nível amador.</p>
        </div>
    </dialog>
