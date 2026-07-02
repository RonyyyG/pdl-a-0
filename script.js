// script.js

// --- ESTADO GLOBAL DA APLICAÇÃO ---
const appState = {
    formation: [],             
    squad: [],                 
    currentStage: 0,           
    myOvr: 0,                  
    activePlayerToPlace: null,
    rerolls: 3,
    usedPDLCall: false, 
    campaign: [] 
};

const screens = {
    menu: document.getElementById('screen-menu'),
    draft: document.getElementById('screen-draft'),
    match: document.getElementById('screen-match'),
    end: document.getElementById('screen-end')
};

const pitchRowsMap = {
    ATK: ['ATA', 'SA', 'PTE', 'PTD', 'PL'],
    MID: ['MC', 'VOL', 'ME', 'MD'],
    DEF: ['ZAG', 'LE', 'LD'],
    GK:  ['GK']
};

const STAGE_NAMES = [
    "Fase de Grupos", 
    "Oitavas de Final", 
    "Quartas de Final", 
    "Semifinal", 
    "A Grande Final!"
];

function showScreen(screenName) {
    Object.values(screens).forEach(s => {
        if(s) s.classList.remove('active');
    });
    if(screens[screenName]) screens[screenName].classList.add('active');
}

const formSelect = document.getElementById('formation-select');
const miniPitch = document.getElementById('preview-pitch');

function updatePreview() {
    if (!formSelect || !miniPitch || typeof FORMATIONS === 'undefined') return;
    miniPitch.innerHTML = '';
    const slots = FORMATIONS[formSelect.value].slots;
    const order = ['ATK', 'MID', 'DEF', 'GK'];
    
    order.forEach(rowName => {
        const count = slots.filter(p => pitchRowsMap[rowName].includes(p)).length;
        if (count > 0) {
            const row = document.createElement('div');
            row.className = 'mini-row';
            for(let i=0; i<count; i++) {
                row.innerHTML += `<div class="mini-dot"></div>`;
            }
            miniPitch.appendChild(row);
        }
    });
}
if(formSelect) formSelect.addEventListener('change', updatePreview);
updatePreview();

function generateCampaign() {
    const campaign = [];
    if (typeof TEAMS_DATABASE === 'undefined') return campaign;
    
    for (let tier = 1; tier <= 5; tier++) {
        const availableTeams = TEAMS_DATABASE.filter(t => t.tier === tier);
        const randomTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];
        
        campaign.push({
            stageName: STAGE_NAMES[tier - 1],
            team: randomTeam || TEAMS_DATABASE[0]
        });
    }
    return campaign;
}

const btnStart = document.getElementById('btn-start');
if(btnStart) {
    btnStart.addEventListener('click', () => {
        if (typeof FORMATIONS === 'undefined' || typeof TEAMS_DATABASE === 'undefined') return;
        
        appState.formation = [...FORMATIONS[formSelect.value].slots];
        appState.squad = new Array(appState.formation.length).fill(null);
        appState.currentStage = 0;
        appState.activePlayerToPlace = null;
        appState.rerolls = 3; 
        appState.usedPDLCall = false; 
        
        const btnCallPdl = document.getElementById('btn-call-pdl');
        if (btnCallPdl) {
            btnCallPdl.disabled = false;
            btnCallPdl.classList.remove('hidden');
        }

        appState.campaign = generateCampaign();
        
        updateRerollUI();
        renderPitch();
        updateDraftStatus();
        showScreen('draft');
    });
}

const pitchArea = document.getElementById('pitch-area');

function renderPitch() {
    if (!pitchArea) return;
    pitchArea.innerHTML = '';
    const rowsOrder = ['ATK', 'MID', 'DEF', 'GK']; 
    
    rowsOrder.forEach(rowName => {
        const indicesInRow = [];
        appState.formation.forEach((pos, idx) => {
            if (pitchRowsMap[rowName].includes(pos)) indicesInRow.push(idx);
        });

        if (indicesInRow.length > 0) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'pitch-row';
            
            indicesInRow.forEach(realIndex => {
                const requiredPos = appState.formation[realIndex];
                const pData = appState.squad[realIndex];
                const slotDiv = document.createElement('div');
                
                if (pData !== null) {
                    slotDiv.className = 'player-slot filled';
                    slotDiv.innerHTML = `
                        <span style="font-size:0.6rem; color:var(--text-muted)">${pData.role}</span>
                        <span>${pData.name}</span>
                        <strong>${pData.ovr}</strong>
                    `;
                } else {
                    slotDiv.className = 'player-slot';
                    slotDiv.innerHTML = `
                        <span class="slot-pos">${requiredPos}</span>
                        <span class="slot-plus">+</span>
                    `;
                    
                    if (appState.activePlayerToPlace) {
                        const canPlayHere = appState.activePlayerToPlace.pitchPos.includes(requiredPos) || appState.activePlayerToPlace.pitchPos.includes('ALL');
                        if (canPlayHere) {
                            slotDiv.classList.add('highlight-placement');
                            slotDiv.onclick = () => placePlayerInSlot(realIndex);
                        }
                    }
                }
                rowDiv.appendChild(slotDiv);
            });
            pitchArea.appendChild(rowDiv);
        }
    });
}

const btnRollDice = document.getElementById('btn-roll-dice');
const btnManualReroll = document.getElementById('btn-manual-reroll');
const btnCallPdl = document.getElementById('btn-call-pdl');
const btnEmergencyReroll = document.getElementById('btn-reroll');
const btnSimulate = document.getElementById('btn-simulate');
const draftResultArea = document.getElementById('draft-result-area');
const draftOptions = document.getElementById('draft-options');
const draftRolledTitle = document.getElementById('draft-rolled-title');
const warningBox = document.getElementById('draft-warning');

const countNeeded = (pos) => appState.formation.filter(p => p === pos).length;
const countFilled = (pos) => appState.squad.filter((p, idx) => p !== null && appState.formation[idx] === pos).length;

const isPlayerCompletelyBlocked = (player) => {
    if (player.pitchPos.includes('ALL')) return false;
    return player.pitchPos.every(pos => countFilled(pos) >= countNeeded(pos));
};

function updateRerollUI() {
    if (btnManualReroll) {
        btnManualReroll.innerText = `🔄 Rerolls: ${appState.rerolls}`;
        btnManualReroll.disabled = appState.rerolls <= 0;
    }
}

if (btnRollDice) btnRollDice.addEventListener('click', () => rollDiceFlow());
if (btnEmergencyReroll) btnEmergencyReroll.addEventListener('click', () => rollDiceFlow());

if (btnManualReroll) {
    btnManualReroll.addEventListener('click', () => {
        if (appState.rerolls > 0) {
            appState.rerolls--;
            updateRerollUI();
            appState.activePlayerToPlace = null; 
            renderPitch();
            rollDiceFlow();
        }
    });
}

if (btnCallPdl) {
    btnCallPdl.addEventListener('click', () => {
        if (appState.usedPDLCall || typeof TEAMS_DATABASE === 'undefined') return;
        appState.usedPDLCall = true;
        btnCallPdl.disabled = true;
        btnRollDice.disabled = true;
        
        if(btnEmergencyReroll) btnEmergencyReroll.classList.add('hidden');
        if(warningBox) warningBox.classList.add('hidden');
        draftResultArea.classList.remove('hidden');
        draftOptions.innerHTML = '';
        draftRolledTitle.classList.add('dice-rolling');

        let cycles = 0;
        const pdlTeam = TEAMS_DATABASE.find(t => t.name === "PDL");

        const animationInterval = setInterval(() => {
            draftRolledTitle.innerText = `🔥 INVOCANDO PDL...`;
            cycles++;
            
            if (cycles >= 12) {
                clearInterval(animationInterval);
                draftRolledTitle.classList.remove('dice-rolling');
                draftRolledTitle.innerText = `🔥 ${pdlTeam.flag} ${pdlTeam.name} (Chamada Especial)`;
                
                const shuffledPDL = [...pdlTeam.players].sort(() => 0.5 - Math.random());
                const selectedFive = shuffledPDL.slice(0, 5);
                
                generateDraftCards(selectedFive);
            }
        }, 100);
    });
}

function rollDiceFlow() {
    if (typeof TEAMS_DATABASE === 'undefined') return;
    btnRollDice.disabled = true;
    if(btnEmergencyReroll) btnEmergencyReroll.classList.add('hidden');
    if(warningBox) warningBox.classList.add('hidden');
    draftResultArea.classList.remove('hidden');
    draftOptions.innerHTML = '';
    draftRolledTitle.classList.add('dice-rolling');
    
    let cycles = 0;
    const animationInterval = setInterval(() => {
        const randTeam = TEAMS_DATABASE[Math.floor(Math.random() * TEAMS_DATABASE.length)];
        draftRolledTitle.innerText = `🎲 ${randTeam.flag} ${randTeam.name}`;
        cycles++;
        
        if (cycles >= 12) {
            clearInterval(animationInterval);
            draftRolledTitle.classList.remove('dice-rolling');
            
            const shuffledPlayers = [...randTeam.players].sort(() => 0.5 - Math.random());
            generateDraftCards(shuffledPlayers); 
        }
    }, 100);
}

function generateDraftCards(playerList) {
    let allDisabled = true;
    draftOptions.innerHTML = '';

    playerList.forEach(player => {
        const card = document.createElement('div');
        const isAlreadyDrafted = appState.squad.some(p => p !== null && p.name === player.name);
        const posFull = isPlayerCompletelyBlocked(player);
        const isDisabled = isAlreadyDrafted || posFull;
        
        let statusMsg = "";
        if (isAlreadyDrafted) statusMsg = "Já escalado";
        else if (posFull) statusMsg = "Sem vagas na tática";

        card.className = `draft-card ${isDisabled ? 'disabled' : ''}`;
        card.innerHTML = `
            <div style="width: 100%; display: flex; justify-content: space-between;">
                <strong>${player.name}</strong>
                <strong style="color:var(--accent-gold)">${player.ovr}</strong>
            </div>
            <small style="color:var(--text-muted)">Faz: ${player.pitchPos.join(', ')}</small>
            ${isDisabled ? `<div class="draft-card-status">🔒 ${statusMsg}</div>` : ''}
        `;
        
        if (!isDisabled) {
            allDisabled = false;
            card.onclick = () => {
                document.querySelectorAll('.draft-card').forEach(c => c.classList.remove('selected-card'));
                card.classList.add('selected-card');
                appState.activePlayerToPlace = player;
                renderPitch();
            };
        }
        draftOptions.appendChild(card);
    });

    const instruction = document.getElementById('instruction-text');
    if (allDisabled) {
        if(warningBox) warningBox.classList.remove('hidden');
        if(btnEmergencyReroll) btnEmergencyReroll.classList.remove('hidden');
        if(instruction) instruction.classList.add('hidden');
    } else {
        if(instruction) instruction.classList.remove('hidden');
    }
}

function placePlayerInSlot(targetIndex) {
    if (!appState.activePlayerToPlace) return;
    appState.squad[targetIndex] = appState.activePlayerToPlace;
    appState.activePlayerToPlace = null;
    
    draftOptions.innerHTML = '';
    draftResultArea.classList.add('hidden');
    btnRollDice.disabled = false;
    
    renderPitch();
    updateDraftStatus();
}

function updateDraftStatus() {
    const filledCount = appState.squad.filter(p => p !== null).length;
    const totalCount = appState.formation.length;
    document.getElementById('draft-status').innerText = `${filledCount}/${totalCount}`;
    
    if (filledCount === totalCount) {
        if(btnRollDice) btnRollDice.classList.add('hidden');
        if(btnManualReroll) btnManualReroll.classList.add('hidden');
        if(btnCallPdl) btnCallPdl.classList.add('hidden'); 
        if(btnSimulate) btnSimulate.classList.remove('hidden');
        
        const sum = appState.squad.reduce((s, p) => s + p.ovr, 0);
        appState.myOvr = Math.round(sum / totalCount);
    }
}

function getRandomPlayerByRow(roster, rowName) {
    let pool = roster.filter(p => p !== null);
    if (pool.length === 0) return { name: "Jogador Genérico", pitchPos: ["ALL"] };

    if (rowName) {
        const allowedRoles = pitchRowsMap[rowName] || [];
        let filtered = pool.filter(p => p.pitchPos && (p.pitchPos.some(r => allowedRoles.includes(r)) || p.pitchPos.includes('ALL')));
        if (filtered.length === 0) filtered = pool.filter(p => p.pitchPos && !p.pitchPos.includes('GK'));
        if (filtered.length > 0) pool = filtered;
    }
    return pool[Math.floor(Math.random() * pool.length)] || { name: "Jogador Genérico" };
}

// --- SISTEMA E LÓGICA DO MOTOR DE JOGO (BLINDADO CONTRA 0 SEGUNDOS) ---
const matchLog = document.getElementById('match-log');
const scoreMy = document.getElementById('score-my');
const scoreOpp = document.getElementById('score-opp');
const timerEl = document.getElementById('match-timer');
const btnNextMatch = document.getElementById('btn-next-match');
const scorersMyEl = document.getElementById('scorers-my');
const scorersOppEl = document.getElementById('scorers-opp');
let gameLoopTimeout;

if(btnSimulate) btnSimulate.addEventListener('click', startMatch);

function startMatch() {
    showScreen('match');
    
    // Leitura segura da rodada e do oponente
    const currentMatchup = appState.campaign[appState.currentStage] || {
        stageName: "Partida Amistosa",
        team: { name: "Time Desafiante", players: [] }
    };
    const opponentTeam = currentMatchup.team || { name: "Time Desafiante", players: [] };
    
    document.getElementById('my-ovr').innerText = `OVR: ${appState.myOvr}`;
    document.getElementById('opp-name').innerText = opponentTeam.name;
    
    const oppPlayers = opponentTeam.players || [];
    const oppTop11 = [...oppPlayers].sort((a,b) => b.ovr - a.ovr).slice(0,11);
    const oppOvr = oppTop11.length > 0 ? Math.round(oppTop11.reduce((acc, p) => acc + p.ovr, 0) / oppTop11.length) : 75;
    document.getElementById('opp-ovr').innerText = `OVR: ${oppOvr}`;
    
    scoreMy.innerText = '0';
    scoreOpp.innerText = '0';
    scorersMyEl.innerHTML = '';
    scorersOppEl.innerHTML = '';
    
    matchLog.innerHTML = `<div class="log-event log-special">🏟️ ROLA A BOLA! Jogo válido por: ${currentMatchup.stageName}.</div>`;
    if(btnNextMatch) btnNextMatch.classList.add('hidden');
    clearTimeout(gameLoopTimeout);
    
    let minute = 0;
    let goalsMy = 0;
    let goalsOpp = 0;
    
    // Leitura segura da velocidade
    const getSpeed = () => {
        const el = document.getElementById('match-speed');
        const val = el ? parseInt(el.value) : 600;
        return isNaN(val) ? 600 : val;
    };
    
    function gameStep() {
        minute += 4; 
        if (minute > 90) minute = 90;
        timerEl.innerText = `${minute}'`;
        
        try {
            const diff = appState.myOvr - oppOvr;
            const randomRoll = Math.random() * 100;
            let attackChanceMy = 12 + (diff * 0.4);
            let attackChanceOpp = 12 - (diff * 0.4);
            
            const currentSpeed = getSpeed();
            
            if (randomRoll < attackChanceMy) {
                const eventRoll = Math.random() * 100;
                const attacker = getRandomPlayerByRow(appState.squad, 'ATK');
                const assister = getRandomPlayerByRow(appState.squad, 'MID');
                
                if (eventRoll < 40) { 
                    if (Math.random() < 0.20) { 
                        addLog(minute, `⚠️ VAR em ação! O juiz revisa a jogada de ${attacker.name}...`, "log-special");
                        setTimeout(() => addLog(minute, `❌ VAR NULO! Gol de ${attacker.name} foi anulado!`, "log-bad"), currentSpeed / 2);
                    } else {
                        goalsMy++; scoreMy.innerText = goalsMy;
                        addScorer(scorersMyEl, attacker.name, minute);
                        addLog(minute, `⚽ GOOOOOL! Passe de ${assister.name} e finalização de ${attacker.name}!`, "log-goal");
                    }
                } else if (eventRoll < 50) { 
                    addLog(minute, `🚩 Impedimento! ${attacker.name} se precipitou.`);
                } else if (eventRoll < 80) {
                    addLog(minute, `📐 Escanteio cobrado por ${assister.name}.`);
                } else { 
                    addLog(minute, `💥 PÊNALTI! Derrubaram ${attacker.name} na área!`, "log-special");
                    if (Math.random() < 0.75) {
                        goalsMy++; scoreMy.innerText = goalsMy;
                        addScorer(scorersMyEl, attacker.name, minute);
                        addLog(minute, `⚽ GOOOOOL DE PÊNALTI! ${attacker.name} crava na rede!`, "log-goal");
                    } else {
                        addLog(minute, `❌ PERDEU! ${attacker.name} desperdiça a cobrança!`);
                    }
                }
            } else if (randomRoll > 100 - attackChanceOpp) {
                const eventRoll = Math.random() * 100;
                const oppAttacker = getRandomPlayerByRow(oppPlayers, 'ATK');
                const myDefender = getRandomPlayerByRow(appState.squad, 'DEF');
                const myGK = getRandomPlayerByRow(appState.squad, 'GK');

                if (eventRoll < 45) {
                    goalsOpp++; scoreOpp.innerText = goalsOpp;
                    addScorer(scorersOppEl, oppAttacker.name, minute);
                    addLog(minute, `⚡ GOL DO ADVERSÁRIO! ${myDefender.name} perdeu na corrida e ${oppAttacker.name} não perdoou.`, "log-bad");
                } else if (eventRoll < 65) {
                    addLog(minute, `🧲 Falta Perigosa! ${myDefender.name} comete infração dura.`);
                } else {
                    addLog(minute, `🧤 DEFESAÇA! Chute de ${oppAttacker.name}, milagre de ${myGK.name}!`);
                }
            } else if (minute % 12 === 0) {
                const mid = getRandomPlayerByRow(appState.squad, 'MID');
                const fluff = [
                    `Partida truncada. ${mid.name} tenta cadenciar.`, 
                    "Troca de passes burocrática no meio-campo.", 
                    `Disputa de bola intensa envolvendo ${mid.name}.`
                ];
                addLog(minute, fluff[Math.floor(Math.random() * fluff.length)]);
            }
        } catch(err) {
            console.warn("Aviso na simulação do minuto:", minute, err);
        }

        if (minute >= 90) {
            timerEl.innerText = "FIM DE JOGO";
            finishMatch(goalsMy, goalsOpp, currentMatchup.stageName);
        } else {
            gameLoopTimeout = setTimeout(gameStep, getSpeed());
        }
    }
    
    gameLoopTimeout = setTimeout(gameStep, getSpeed());
}

function addLog(minute, text, className = "") {
    const el = document.createElement('div');
    el.className = `log-event ${className}`;
    el.innerText = `[${minute}'] ${text}`;
    matchLog.appendChild(el);
    matchLog.scrollTop = matchLog.scrollHeight;
}

function addScorer(element, name, minute) {
    if(!element) return;
    const el = document.createElement('div');
    el.className = 'scorer-item';
    el.innerHTML = `⚽ ${name} <small>(${minute}')</small>`;
    element.appendChild(el);
}

function finishMatch(myGoals, oppGoals, currentStageName) {
    if(btnNextMatch) btnNextMatch.classList.remove('hidden');
    let won = myGoals > oppGoals;
    
    if (myGoals === oppGoals) {
        addLog(90, "⚖️ Empate! Decisão nos pênaltis...", "log-special");
        won = Math.random() > 0.5;
        if (won) addLog(90, "🎉 Vitória nos pênaltis! Seu time é heroico!", "log-goal");
        else addLog(90, "❌ Derrota nos pênaltis. Fim da linha.", "log-bad");
    }

    if(btnNextMatch) {
        btnNextMatch.onclick = () => {
            if (won) {
                appState.currentStage++;
                if (appState.currentStage >= appState.campaign.length) {
                    endGame(true, currentStageName);
                } else {
                    startMatch();
                }
            } else {
                endGame(false, currentStageName);
            }
        };
    }
}

function endGame(isVictory, currentStageName) {
    showScreen('end');
    const title = document.getElementById('end-title');
    const msg = document.getElementById('end-message');
    
    if (isVictory && title && msg) {
        title.innerText = "🏆 CAMPEÃO DO MUNDO!";
        title.className = "end-title victory";
        msg.innerText = "Parabéns! Você sobreviveu à jornada, derrubou seleções lendárias e evitou o 7 a 0!";
    } else if(title && msg) {
        title.innerText = "❌ ELIMINADO!";
        title.className = "end-title defeat";
        msg.innerText = `Você foi eliminado na fase: ${currentStageName}. Tente montar um elenco melhor da próxima vez!`;
    }
}

const btnRestart = document.getElementById('btn-restart');
if(btnRestart) {
    btnRestart.addEventListener('click', () => {
        if(btnRollDice) { btnRollDice.classList.remove('hidden'); btnRollDice.disabled = false; }
        if(btnManualReroll) btnManualReroll.classList.remove('hidden');
        if(btnSimulate) btnSimulate.classList.add('hidden');
        if(draftResultArea) draftResultArea.classList.add('hidden');
        showScreen('menu');
    });
}

// --- CONTROLE ISOLADO DO MODAL DE INFO (DIALOG HTML5) ---
const btnInfo = document.getElementById('btn-info');
const infoModal = document.getElementById('info-modal');
const closeInfo = document.getElementById('close-info');

if (btnInfo && infoModal && closeInfo) {
    btnInfo.addEventListener('click', () => {
        if(typeof infoModal.showModal === 'function') infoModal.showModal();
        else infoModal.style.display = 'block';
    });

    closeInfo.addEventListener('click', () => {
        if(typeof infoModal.close === 'function') infoModal.close();
        else infoModal.style.display = 'none';
    });
}