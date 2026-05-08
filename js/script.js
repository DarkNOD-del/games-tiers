const QUESTIONS = [{
    full: "Геймплей",
    short: "Геймплей"
}, {
    full: "Графика",
    short: "Графика"
}, {
    full: "Сюжет",
    short: "Сюжет"
}, {
    full: "Звук/музыка",
    short: "Звук/музыка"
}, {
    full: "Погружение",
    short: "Погружение"
}, {
    full: "Стабильность",
    short: "Стабильность"
}, {
    full: "Эргономика",
    short: "Эргономика"
}];

const TIER_RULES = [{
    id: "S",
    label: "Шедевры",
    min: 9.5,
    max: 10.0
}, {
    id: "A",
    label: "Отличные игры",
    min: 8.5,
    max: 9.5
}, {
    id: "B",
    label: "Хорошие игры",
    min: 7.0,
    max: 8.5
}, {
    id: "C",
    label: "Средние игры",
    min: 5.5,
    max: 7.0
}, {
    id: "D",
    label: "Плохие игры",
    min: 3.0,
    max: 5.5
}, {
    id: "F",
    label: "Полный провал",
    min: 0.0,
    max: 3.0
}];
let tierlistData = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: []
};
let editingMode = false,
    editingTarget = null,
    radarChart = null;

function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return "—";

    let formatted = Number(num).toLocaleString('ru-RU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    return formatted.replace(',', '.');
}

function sortTiers() {
    for (let tier of TIER_RULES) {
        tierlistData[tier.id].sort((a, b) => b.avgScore - a.avgScore);
    }
}

function showToast(msg, type = 'info') {
    let c = document.getElementById('toastContainer'),
        t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${type==='success'?'fa-check-circle':type==='error'?'fa-exclamation-circle':'fa-info-circle'}" style="margin-right:8px;"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => {
        t.classList.add('fade-out');
        setTimeout(() => t.remove(), 300);
    }, 2300);
}

function computeAverage(scores, enabled) {
    let total = 0,
        count = 0;
    for (let q of QUESTIONS)
        if (!(enabled && enabled[q.short] === false)) {
            total += scores[q.short] || 0;
            count++;
        } return count ? Math.round(total / count * 100) / 100 : 0;
}

function getTierId(avg) {
    for (let t of TIER_RULES)
        if (avg >= t.min && (avg < t.max || t.id === "S")) return t.id;
    return "F";
}

function escapeHtml(s) {
    return s?.replace(/[&<>]/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;'
    } [m])) || "";
}

function renderTiers() {
    sortTiers();
    let c = document.getElementById("tiersContainer");
    c.innerHTML = "";
    for (let tier of TIER_RULES) {
        let games = tierlistData[tier.id],
            div = document.createElement("div");
        div.className = "tier-row";
        div.innerHTML = `<div class="tier-header ${tier.id}"><div class="tier-left"><div class="tier-label ${tier.id}">${tier.label}</div></div><div class="tier-count"><i class="fas fa-gamepad"></i> ${games.length}</div></div><div class="games-container" id="games-${tier.id}"></div>`;
        let gDiv = div.querySelector('.games-container');
        games.forEach((game, idx) => {
            let card = document.createElement("div");
            card.className = "game-card";
            card.innerHTML = `<div class="game-cover">${game.coverUrl?`<img src="${game.coverUrl}">`:'<div class="no-cover"><i class="fas fa-image" style="font-size:2rem; color:#cbd5e1;"></i></div>'}</div><div class="game-score-badge"><i class="fas fa-star"></i> ${game.avgScore}</div>${game.isDlc ? '<div class="game-dlc-badge"><i class="fas fa-box-open"></i> DLC</div>' : ''}<div class="game-info"><div class="game-title">${escapeHtml(game.name)}</div></div>`;
            card.onclick = () => openDetail(game, tier.id, idx);
            gDiv.appendChild(card);
        });
        c.appendChild(div);
    }
    updateStats();
}

function updateRadarChart() {
    let all = [];
    for (let t of TIER_RULES) all.push(...tierlistData[t.id]);
    let labels = QUESTIONS.map(q => q.full),
        dataValues = QUESTIONS.map(q => {
            let s = 0,
                cnt = 0;
            for (let g of all)
                if (!(g.enabled && g.enabled[q.short] === false) && g.scores?.[q.short] !== undefined) {
                    s += g.scores[q.short];
                    cnt++;
                } return cnt ? s / cnt : 0;
        });
    let ctx = document.getElementById('radarChartCanvas').getContext('2d');
    if (radarChart) radarChart.destroy();
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Средняя оценка',
                data: dataValues,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 10,
                    pointLabels: {
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        stepSize: 2,
                        backdropColor: 'transparent'
                    },
                    grid: {
                        color: '#e2e8f0'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.raw.toFixed(1)}/10`
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

function updateStats() {
    let all = [];
    for (let t of TIER_RULES) all.push(...tierlistData[t.id]);
    let total = all.length;
    document.getElementById("statTotalGames").innerText = formatNumber(total);
    let hours = all.filter(g => g.hours != null).map(g => g.hours);
    document.getElementById("statAvgTime").innerText = hours.length ? formatNumber((hours.reduce((a, b) => a + b, 0) / hours.length)) : "—";
    document.getElementById("statTotalTime").innerText = hours.length ? formatNumber(hours.reduce((a, b) => a + b, 0)) : "—";
    let prices = all.filter(g => g.price != null).map(g => g.price);
    document.getElementById("statAvgPrice").innerText = prices.length ? formatNumber(prices.reduce((a, b) => a + b, 0) / prices.length) : "—";
    document.getElementById("statTotalPrice").innerText = prices.length ? formatNumber(prices.reduce((a, b) => a + b, 0)) : "—";
    let difficulties = all.filter(g => g.difficulty >= 0).map(g => g.difficulty);
    document.getElementById("statAvgDifficulty").innerText = difficulties.length ? formatNumber((difficulties.reduce((a, b) => a + b, 0) / difficulties.length)) : "—";

    let sizes = all.filter(g => g.size != null).map(g => g.size);
    let gp = all.filter(g => g.price != null);
    if (gp.length) {
        let most = gp.reduce((m, g) => g.price > m.price ? g : m, gp[0]);
        document.getElementById("statMostExpensive").innerText = formatNumber(most.price);
        document.getElementById("statMostExpensiveGame").innerText = most.name;
    } else {
        document.getElementById("statMostExpensive").innerText = "—";
        document.getElementById("statMostExpensiveGame").innerText = "Нет данных";
    }
    let gr = all.filter(g => g.avgScore > 0);
    if (gr.length) {
        let hr = gr.reduce((m, g) => g.avgScore > m.avgScore ? g : m, gr[0]);
        document.getElementById("statHighestRated").innerText = formatNumber(hr.avgScore);
        document.getElementById("statHighestRatedGame").innerText = hr.name;
    } else {
        document.getElementById("statHighestRated").innerText = "—";
        document.getElementById("statHighestRatedGame").innerText = "Нет данных";
    }
    let gs = all.filter(g => g.size != null);
    if (gs.length) {
        let large = gs.reduce((m, g) => g.size > m.size ? g : m, gs[0]),
            small = gs.reduce((m, g) => g.size < m.size ? g : m, gs[0]);
        document.getElementById("statLargestSize").innerText = formatNumber(large.size);
        document.getElementById("statLargestSizeGame").innerText = large.name;
        document.getElementById("statSmallestSize").innerText = formatNumber(small.size);
        document.getElementById("statSmallestSizeGame").innerText = small.name;
    } else {
        document.getElementById("statLargestSize").innerText = "—";
        document.getElementById("statLargestSizeGame").innerText = "Нет данных";
        document.getElementById("statSmallestSize").innerText = "—";
        document.getElementById("statSmallestSizeGame").innerText = "Нет данных";
    }
    let gh = all.filter(g => g.hours != null && g.hours > 0);
    if (gh.length) {
        let long = gh.reduce((m, g) => g.hours > m.hours ? g : m, gh[0]),
            short = gh.reduce((m, g) => g.hours < m.hours ? g : m, gh[0]);
        document.getElementById("statLongest").innerText = formatNumber(long.hours);
        document.getElementById("statLongestGame").innerText = long.name;
        document.getElementById("statShortest").innerText = formatNumber(short.hours);
        document.getElementById("statShortestGame").innerText = short.name;
    } else {
        document.getElementById("statLongest").innerText = "—";
        document.getElementById("statLongestGame").innerText = "Нет данных";
        document.getElementById("statShortest").innerText = "—";
        document.getElementById("statShortestGame").innerText = "Нет данных";
    }
    updateRadarChart();
    let maxC = Math.max(...TIER_RULES.map(t => tierlistData[t.id].length), 1);
    document.getElementById("tierChart").innerHTML = TIER_RULES.map(tier => `<div class="bar-item"><div class="bar" style="height: ${tierlistData[tier.id].length/maxC*150}px; background: linear-gradient(180deg, ${tier.id==='S'?'#eab308':tier.id==='A'?'#10b981':tier.id==='B'?'#3b82f6':tier.id==='C'?'#f97316':tier.id==='D'?'#ef4444':'#94a3b8'}, #cbd5e1);"></div><div class="bar-label">${tier.label}</div><div class="bar-count">${formatNumber(tierlistData[tier.id].length)} шт.</div></div>`).join('');
}
let currentDetail = null;

function openDetail(game, tierId, idx) {
    document.body.classList.add('no-scroll');
    currentDetail = {
        tierId,
        idx,
        game: {
            ...game
        }
    };
    document.getElementById("detailTitle").innerHTML = `<i class="fas fa-gamepad"></i> ${escapeHtml(game.name)} ${game.isDlc ? '<span class="detail-dlc-badge"><i class="fas fa-box-open"></i> DLC</span>' : ''}`;
    let coverDiv = document.getElementById("detailCover");
    coverDiv.innerHTML = game.coverUrl ? `<img src="${game.coverUrl}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;"><i class="fas fa-image" style="font-size:2rem; color:#cbd5e1;"></i></div>';
    let scoresDiv = document.getElementById("detailScores");
    scoresDiv.innerHTML = `<div class="score-row"><strong>Средний балл</strong><strong>${game.avgScore}</strong></div>` + QUESTIONS.map(q => `<div class="score-row"><span>${q.full}</span><span>${game.enabled && game.enabled[q.short]===false?'❌ отключено':(game.scores[q.short]||0).toFixed(1)+'/10'}</span></div>`).join('');
    let extrasDiv = document.getElementById("detailExtras");
    extrasDiv.innerHTML = `<div><span><i class="far fa-clock"></i> <strong>Время:</strong></span><span>${game.hours!==null?formatNumber(game.hours)+' ч':'❓ не указано'}</span></div><div><span><i class="fas fa-coins"></i> <strong>Стоимость:</strong></span><span>${game.price!==null?(game.price===0?'Бесплатно':formatNumber(game.price)+' ₽'):'Бесплатно'}</span></div><div><span><i class="fas fa-database"></i> <strong>Вес:</strong></span><span>${game.size!==null?formatNumber(game.size)+' ГБ':'❓ не указано'}</span></div><div><span><i class="fas fa-chart-line"></i> <strong>Сложность:</strong></span><span>${game.difficulty>=0?formatNumber(game.difficulty)+'/10':'❓ не указано'}</span></div>`;
    let tabs = document.querySelectorAll('.detail-tab'),
        scoresCont = document.getElementById('detailScoresTab'),
        statsCont = document.getElementById('detailStatsTab');
    tabs.forEach(t => {
        t.onclick = () => {
            tabs.forEach(tt => tt.classList.remove('active'));
            t.classList.add('active');
            if (t.dataset.dtab === 'scores') {
                scoresCont.classList.add('active');
                statsCont.classList.remove('active');
            } else {
                statsCont.classList.add('active');
                scoresCont.classList.remove('active');
            }
        };
    });
    document.querySelector('.detail-tab[data-dtab="scores"]').click();
    document.getElementById("detailModal").style.display = "flex";
    scoresDiv.scrollTop = 0;
}

function openEditModal(gameData = null) {
    document.body.classList.add('no-scroll');
    editingMode = !!gameData;
    if (editingMode) {
        document.getElementById("modalTitle").innerHTML = '<i class="fas fa-pen"></i> Редактирование';
        editingTarget = gameData;
    } else {
        document.getElementById("modalTitle").innerHTML = '<i class="fas fa-plus-circle"></i> Новая игра';
        editingTarget = null;
    }
    document.getElementById("gameNameInput").value = editingMode ? gameData.game.name : "";
    document.getElementById("coverPreview").innerHTML = (editingMode && gameData.game.coverUrl) ? `<img src="${gameData.game.coverUrl}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><i class="fas fa-cloud-upload-alt" style="font-size:2rem; color:#94a3b8;"></i><span style="font-size:12px;">Нажмите или перетащите</span></div>`;
    document.getElementById("gameHours").value = (editingMode && gameData.game.hours !== null) ? gameData.game.hours : "";
    document.getElementById("gamePrice").value = (editingMode && gameData.game.price !== null) ? gameData.game.price : "";
    document.getElementById("gameSize").value = (editingMode && gameData.game.size !== null) ? gameData.game.size : "";

    let difficultySlider = document.getElementById("gameDifficulty");
    let difficultyValue = document.getElementById("difficultyValue");
    let initialDifficulty = (editingMode && gameData.game.difficulty !== null) ? gameData.game.difficulty : 5;
    difficultySlider.value = initialDifficulty;
    difficultyValue.innerText = initialDifficulty >= 0 ? initialDifficulty.toFixed(1) + "/10" : "❓ не указано";

    difficultySlider.oninput = function() {
        let val = parseFloat(parseFloat(this.value).toFixed(1));
        difficultyValue.innerText = val >= 0 ? val.toFixed(1) + "/10" : "❓ не указано";
        if (window.tempGame) window.tempGame.difficulty = val;
    };

    window.tempGame = {
        coverUrl: editingMode ? gameData.game.coverUrl : null,
        name: editingMode ? gameData.game.name : "",
        scores: editingMode ? {
            ...gameData.game.scores
        } : Object.fromEntries(QUESTIONS.map(q => [q.short, 5])),
        enabled: editingMode ? {
            ...(gameData.game.enabled || {})
        } : Object.fromEntries(QUESTIONS.map(q => [q.short, true])),
        hours: editingMode ? gameData.game.hours : null,
        price: editingMode ? gameData.game.price : null,
        size: editingMode ? gameData.game.size : null,
        difficulty: editingMode ? (gameData.game.difficulty !== null ? gameData.game.difficulty : 5) : 5,
        isDlc: editingMode ? (gameData.game.isDlc || false) : false
    };

    let dlcCheckbox = document.getElementById("isDlcCheckbox");
    if (dlcCheckbox) {
        dlcCheckbox.checked = window.tempGame.isDlc;
        dlcCheckbox.onchange = (e) => {
            if (window.tempGame) window.tempGame.isDlc = e.target.checked;
        };
    }

    let c = document.getElementById("questionsList");
    c.innerHTML = QUESTIONS.map(q => `<div class="toggle-wrapper"><label class="toggle-switch"><input type="checkbox" class="rating-toggle" data-short="${q.short}" ${(window.tempGame.enabled&&window.tempGame.enabled[q.short]!==false)?'checked':''}><span class="slider"></span></label><span>${q.full}</span></div><div class="question-item ${(window.tempGame.enabled&&window.tempGame.enabled[q.short]===false)?'disabled-rating':''}"><div class="question-label"><span></span><span class="score-value" id="val_${q.short}">${(window.tempGame.scores[q.short]||5).toFixed(1)}/10</span></div><input type="range" min="0" max="10" step="0.1" value="${window.tempGame.scores[q.short]||5}" data-short="${q.short}" class="q-slider" ${(window.tempGame.enabled&&window.tempGame.enabled[q.short]===false)?'disabled':''}></div>`).join('');
    document.querySelectorAll('.rating-toggle').forEach(t => {
        t.onchange = e => {
            let s = t.dataset.short;
            if (!window.tempGame.enabled) window.tempGame.enabled = {};
            window.tempGame.enabled[s] = t.checked;
            let item = t.closest('.toggle-wrapper').nextElementSibling,
                slider = item.querySelector('.q-slider');
            if (t.checked) {
                item.classList.remove('disabled-rating');
                slider.disabled = false;
            } else {
                item.classList.add('disabled-rating');
                slider.disabled = true;
            }
        };
    });
    document.querySelectorAll('.q-slider').forEach(s => {
        s.oninput = e => {
            let sh = s.dataset.short,
                val = parseFloat(parseFloat(s.value).toFixed(1));
            window.tempGame.scores[sh] = val;
            document.getElementById(`val_${sh}`).innerText = val.toFixed(1) + "/10";
        };
    });
    document.getElementById("step1").style.display = "block";
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "none";
    document.getElementById("editModal").style.display = "flex";
}

function saveGame() {
    let name = document.getElementById("gameNameInput").value.trim();
    if (!name) {
        showToast("Введите название", "error");
        return;
    }

    let isDlc = document.getElementById("isDlcCheckbox")?.checked || false;
    window.tempGame.isDlc = isDlc;
    window.tempGame.name = name;
    window.tempGame.avgScore = computeAverage(window.tempGame.scores, window.tempGame.enabled);
    let hours = document.getElementById("gameHours").value,
        price = document.getElementById("gamePrice").value,
        size = document.getElementById("gameSize").value,
        difficulty = document.getElementById("gameDifficulty").value;
    window.tempGame.hours = hours ? parseFloat(hours) : null;
    window.tempGame.price = (price !== "") ? parseInt(price) : null;
    window.tempGame.size = size ? parseFloat(size) : null;
    window.tempGame.difficulty = difficulty ? parseFloat(difficulty) : 0;

    if (editingMode && editingTarget) {
        let {
            tierId,
            idx,
            game
        } = editingTarget;
        tierlistData[tierId][idx] = {
            ...window.tempGame
        };
        tierlistData[tierId][idx].avgScore = computeAverage(window.tempGame.scores, window.tempGame.enabled);
        let newTier = getTierId(tierlistData[tierId][idx].avgScore);
        if (newTier !== tierId) {
            let moved = tierlistData[tierId].splice(idx, 1)[0];
            tierlistData[newTier].push(moved);
            showToast(`"${name}" перемещена в ${newTier}`, "success");
        } else showToast(`"${name}" обновлена`, "success");
    } else {
        let newGame = {
            ...window.tempGame
        };
        newGame.avgScore = computeAverage(newGame.scores, newGame.enabled);
        let tier = getTierId(newGame.avgScore);
        tierlistData[tier].push(newGame);
        showToast(`"${name}" добавлена в ${tier}`, "success");
    }
    sortTiers();
    renderTiers();
    document.getElementById("editModal").style.display = "none";
    document.body.classList.remove('no-scroll');
}

function deleteCurrentGame() {
    if (currentDetail) {
        let {
            tierId,
            idx,
            game
        } = currentDetail;
        tierlistData[tierId].splice(idx, 1);
        sortTiers();
        renderTiers();
        showToast(`"${game.name}" удалена`, "warning");
        document.getElementById("detailModal").style.display = "none";
        document.body.classList.remove('no-scroll');
    }
}

function setupDropzone() {
    let zone = document.getElementById("coverDropzone"),
        preview = document.getElementById("coverPreview");
    zone.onclick = () => {
        let inp = document.createElement("input");
        inp.type = "file";
        inp.accept = "image/*";
        inp.onchange = e => {
            if (e.target.files[0]) {
                let f = e.target.files[0];
                if (!f.type.startsWith("image/")) {
                    showToast("Нужно изображение", "error");
                    return;
                }
                let reader = new FileReader();
                reader.onload = ev => {
                    preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                    window.tempGame.coverUrl = ev.target.result;
                };
                reader.readAsDataURL(f);
            }
        };
        inp.click();
    };
    zone.ondragover = e => {
        e.preventDefault();
        zone.classList.add("drag-over");
    };
    zone.ondragleave = () => zone.classList.remove("drag-over");
    zone.ondrop = e => {
        e.preventDefault();
        zone.classList.remove("drag-over");
        if (e.dataTransfer.files[0]) {
            let f = e.dataTransfer.files[0];
            if (!f.type.startsWith("image/")) {
                showToast("Нужно изображение", "error");
                return;
            }
            let reader = new FileReader();
            reader.onload = ev => {
                preview.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
                window.tempGame.coverUrl = ev.target.result;
            };
            reader.readAsDataURL(f);
        }
    };
}

document.getElementById("saveDataBtn").onclick = () => {
    let a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({
        tiers: tierlistData
    }, null, 4)], {
        type: "application/json"
    }));
    a.download = `tierlist_${Date.now()}.json`;
    a.click();
    showToast("Сохранено", "success");
};
document.getElementById("loadDataBtn").onclick = () => {
    let inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json";
    inp.onchange = e => {
        let file = e.target.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = ev => {
            try {
                let data = JSON.parse(ev.target.result);
                if (data.tiers) tierlistData = data.tiers;
                sortTiers();
                renderTiers();
                showToast("Загружено", "success");
            } catch (e) {
                showToast("Ошибка", "error");
            }
        };
        reader.readAsText(file);
    };
    inp.click();
};
document.getElementById("addGameBtn").onclick = () => openEditModal(null);
document.getElementById("cancelEditBtn").onclick = () => {
    document.body.classList.remove('no-scroll');
    document.getElementById("editModal").style.display = "none";
};
document.getElementById("nextToStatsBtn").onclick = () => {
    if (document.getElementById("gameNameInput").value.trim()) {
        document.getElementById("step1").style.display = "none";
        document.getElementById("step2").style.display = "block";
        document.getElementById("questionsList").scrollTop = 0;
    } else showToast("Введите название", "error");
};
document.getElementById("backToStep1Btn").onclick = () => {
    document.getElementById("step2").style.display = "none";
    document.getElementById("step1").style.display = "block";
};
document.getElementById("nextToDetailsBtn").onclick = () => {
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "block";
};
document.getElementById("backToStep2Btn").onclick = () => {
    document.getElementById("step3").style.display = "none";
    document.getElementById("step2").style.display = "block";
};
document.getElementById("submitGameBtn").onclick = () => saveGame();
document.getElementById("closeDetailBtn").onclick = () => {
    document.body.classList.remove('no-scroll');
    document.getElementById("detailModal").style.display = "none";
};
document.getElementById("deleteFromDetailBtn").onclick = () => deleteCurrentGame();
document.getElementById("editFromDetailBtn").onclick = () => {
    if (currentDetail) {
        document.getElementById("detailModal").style.display = "none";
        openEditModal(currentDetail);
    }
};
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
        if (btn.dataset.tab === "stats") updateStats();
    };
});
setupDropzone();
renderTiers();
