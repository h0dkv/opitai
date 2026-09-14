const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiOverlay = document.getElementById('ui-overlay');
const screenStart = document.getElementById('screen-start');
const screenLoading = document.getElementById('screen-loading');
const screenGreeting = document.getElementById('screen-greeting');
const screenGameOver = document.getElementById('screen-gameover');

const mainStartBtn = document.getElementById('main-start-btn');
const playBtn = document.getElementById('play-btn');
const restartBtn = document.getElementById('restart-btn');
const trashGuiBtn = document.getElementById('trash-gui-btn');

const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const ordersBar = document.getElementById('orders-bar');
const finalScoreText = document.getElementById('final-score-text');

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    repositionStations();
}

let gameState = 'MENU';
let score = 0;
let timeLeft = 60;
let timerInterval = null;
let orders = [];

function showScreen(screen) {
    [screenStart, screenLoading, screenGreeting, screenGameOver].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

mainStartBtn.addEventListener('click', () => {
    showScreen(screenLoading);
    setTimeout(() => {
        showScreen(screenGreeting);
    }, 1500);
});

playBtn.addEventListener('click', () => {
    uiOverlay.style.display = 'none';
    startGame();
});

restartBtn.addEventListener('click', () => {
    showScreen(screenLoading);
    setTimeout(() => {
        showScreen(screenGreeting);
        uiOverlay.style.display = 'flex';
    }, 1000);
});

// Готвач
const chef = {
    x: 0,
    y: 0,
    size: 22,
    holding: null,

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0284c7';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -5, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        if (this.holding) {
            ctx.beginPath();
            ctx.arc(16, 0, 9, 0, Math.PI * 2);
            ctx.fillStyle = getItemColor(this.holding);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
        }

        ctx.restore();
    }
};

let stations = [];

function repositionStations() {
    const w = canvas.width;
    const h = canvas.height;
    const btnW = (w - 40) / 3;
    const btnH = 45;

    stations = [
        { id: 'mince', name: '🥩 Кайма', x: 10, y: 15, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'potato', name: '🥔 Картофи', x: 20 + btnW, y: 15, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'topping', name: '🥣 Заливка', x: 30 + btnW*2, y: 15, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        
        { id: 'cucumber', name: '🥒 Краставица', x: 10, y: 70, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'yogurt', name: '🥛 К. Мляко', x: 20 + btnW, y: 70, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'cheese', name: '🧀 Сирене', x: 30 + btnW*2, y: 70, w: btnW, h: btnH, color: '#334155', isIngredient: true },

        { id: 'prep', name: '🍳 Плот (Тава)', x: 15, y: 140, w: (w - 40)/2, h: 65, color: '#475569', contents: [] },
        { id: 'oven', name: '🔥 Фурна', x: 25 + (w - 40)/2, y: 140, w: (w - 40)/2, h: 65, color: '#ea580c', state: 'empty', timer: 0, content: null },
        { id: 'ayran_machine', name: '🥤 Айрян', x: 15, y: 220, w: (w - 40)/2, h: 60, color: '#0284c7', state: 'empty', timer: 0 },
        { id: 'trash', name: '🗑️ Кош', x: 25 + (w - 40)/2, y: 220, w: (w - 40)/2, h: 60, color: '#334155' },

        { id: 'serve', name: '🛎️ СЕРВИРАЙ ПОРЪЧКА', x: 15, y: h - 60, w: w - 30, h: 50, color: '#059669' }
    ];
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const RECIPES = [
    { name: 'Мусака', req: ['кайма', 'картофи', 'заливка'], needsOven: true, rawResult: 'мусака_сурова', cookedResult: 'мусака_печена' },
    { name: 'Запеканка', req: ['картофи', 'сирене', 'заливка'], needsOven: true, rawResult: 'запеканка_сурова', cookedResult: 'запеканка_печена' },
    { name: 'Таратор', req: ['краставица', 'кисело мляко'], needsOven: false, rawResult: null, cookedResult: 'таратор' },
    { name: 'Айрян', req: [], needsOven: false, rawResult: null, cookedResult: 'айрян' }
];

function getItemColor(item) {
    switch(item) {
        case 'кайма': return '#9f1239';
        case 'картофи': return '#ca8a04';
        case 'заливка': return '#fef08a';
        case 'краставица': return '#16a34a';
        case 'кисело мляко': return '#f8fafc';
        case 'сирене': return '#fef9c3';
        case 'мусака_сурова': return '#cbd5e1';
        case 'мусака_печена': return '#ea580c';
        case 'запеканка_сурова': return '#fef08a';
        case 'запеканка_печена': return '#eab308';
        case 'таратор': return '#86efac';
        case 'айрян': return '#38bdf8';
        case 'загаряне': return '#18181b';
        default: return '#fff';
    }
}

function addOrder() {
    if (orders.length >= 3) return;
    const randomRecipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    orders.push({
        id: Date.now() + Math.random(),
        name: randomRecipe.name,
        targetItem: randomRecipe.cookedResult,
        reqText: randomRecipe.name === 'Айрян' ? 'Напитка' : randomRecipe.req.join(' + '),
        patience: 100,
        maxPatience: 100
    });
    renderOrders();
}

function renderOrders() {
    ordersBar.innerHTML = '';
    orders.forEach((ord, idx) => {
        const card = document.createElement('div');
        card.className = 'order-card';
        const fillPercent = (ord.patience / ord.maxPatience) * 100;
        let barColor = '#10b981';
        if (fillPercent < 50) barColor = '#f59e0b';
        if (fillPercent < 25) barColor = '#ef4444';

        card.innerHTML = `
            <div>
                <div class="order-title">Поръчка #${idx + 1}</div>
                <div class="order-name">${ord.name}</div>
                <div class="order-items">${ord.reqText}</div>
            </div>
            <div class="patience-bar-bg">
                <div class="patience-bar-fill" style="width: ${fillPercent}%; background-color: ${barColor};"></div>
            </div>
        `;
        ordersBar.appendChild(card);
    });
}

function update() {
    if (gameState !== 'PLAYING') return;

    // Гарантира, че винаги има поне 1 поръчка
    if (orders.length === 0) {
        addOrder();
    }

    const oven = stations.find(s => s.id === 'oven');
    if (oven.state === 'cooking') {
        oven.timer += 1;
        if (oven.timer >= 120) oven.state = 'ready';
    } else if (oven.state === 'ready') {
        oven.timer += 1;
        if (oven.timer >= 320) {
            oven.state = 'burnt';
            oven.content = 'загаряне';
        }
    }

    const ayran = stations.find(s => s.id === 'ayran_machine');
    if (ayran.state === 'filling') {
        ayran.timer += 1;
        if (ayran.timer >= 90) ayran.state = 'ready';
    }

    for (let i = orders.length - 1; i >= 0; i--) {
        orders[i].patience -= 0.12;
        if (orders[i].patience <= 0) {
            orders.splice(i, 1);
            score = Math.max(0, score - 30);
            scoreEl.textContent = score;
            setTimeout(addOrder, 1000);
        }
    }
    renderOrders();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stations.forEach(s => {
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.roundRect(s.x, s.y, s.w, s.h, 10);
        ctx.fill();

        if (s.isIngredient) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#475569';
            ctx.stroke();
            ctx.fillStyle = '#f8fafc';
            ctx.font = '600 11px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(s.name, s.x + s.w/2, s.y + s.h/2 + 4);
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = '600 12px Poppins';
            ctx.textAlign = 'center';
            ctx.fillText(s.name, s.x + s.w/2, s.y + 20);

            if (s.id === 'prep') {
                ctx.font = '500 10px Poppins';
                ctx.fillText(s.contents.length > 0 ? `(${s.contents.length} съставки)` : 'Свободен', s.x + s.w/2, s.y + 42);
            }
            if (s.id === 'oven') {
                ctx.font = '500 10px Poppins';
                if (s.state === 'empty') ctx.fillText('Празна', s.x + s.w/2, s.y + 42);
                if (s.state === 'cooking') ctx.fillText('Пече...', s.x + s.w/2, s.y + 42);
                if (s.state === 'ready') ctx.fillText('ГОТОВО!', s.x + s.w/2, s.y + 42);
                if (s.state === 'burnt') ctx.fillText('ЗАГОРЯ!', s.x + s.w/2, s.y + 42);
            }
            if (s.id === 'ayran_machine') {
                ctx.font = '500 10px Poppins';
                if (s.state === 'empty') ctx.fillText('[Натисни]', s.x + s.w/2, s.y + 40);
                if (s.state === 'filling') ctx.fillText('Пълни...', s.x + s.w/2, s.y + 40);
                if (s.state === 'ready') ctx.fillText('ГОТОВ!', s.x + s.w/2, s.y + 40);
            }
        }
    });

    if (gameState === 'PLAYING') chef.draw();
}

function checkPrepMatch(contents) {
    for (let recipe of RECIPES) {
        if (recipe.req.length > 0 && contents.length === recipe.req.length && recipe.req.every(ing => contents.includes(ing))) {
            return recipe;
        }
    }
    return null;
}

function handleInteraction(x, y) {
    chef.x = x;
    chef.y = y;

    stations.forEach(s => {
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
            
            const map = { 'mince': 'кайма', 'potato': 'картофи', 'topping': 'заливка', 'cucumber': 'краставица', 'yogurt': 'кисело мляко', 'cheese': 'сирене' };
            if (map[s.id] && !chef.holding) {
                chef.holding = map[s.id];
            }
            else if (s.id === 'prep') {
                const rawIngredients = Object.values(map);
                if (chef.holding && rawIngredients.includes(chef.holding) && !s.contents.includes(chef.holding)) {
                    s.contents.push(chef.holding);
                    chef.holding = null;
                    const matched = checkPrepMatch(s.contents);
                    if (matched) {
                        s.contents = [];
                        chef.holding = matched.needsOven ? matched.rawResult : matched.cookedResult;
                    }
                }
            }
            else if (s.id === 'oven') {
                if ((chef.holding === 'мусака_сурова' || chef.holding === 'запеканка_сурова') && s.state === 'empty') {
                    s.state = 'cooking';
                    s.timer = 0;
                    s.content = chef.holding === 'мусака_сурова' ? 'мусака_печена' : 'запеканка_печена';
                    chef.holding = null;
                } else if ((s.state === 'ready' || s.state === 'burnt') && !chef.holding) {
                    chef.holding = s.content;
                    s.state = 'empty';
                    s.content = null;
                }
            }
            else if (s.id === 'ayran_machine') {
                if (s.state === 'empty') {
                    s.state = 'filling';
                    s.timer = 0;
                } else if (s.state === 'ready' && !chef.holding) {
                    chef.holding = 'айрян';
                    s.state = 'empty';
                }
            }
            else if (s.id === 'trash') {
                chef.holding = null;
                stations.find(st => st.id === 'prep').contents = [];
            }
            else if (s.id === 'serve' && chef.holding && orders.length > 0) {
                const idx = orders.findIndex(o => o.targetItem === chef.holding);
                if (idx !== -1) {
                    const delivered = orders.splice(idx, 1)[0];
                    score += delivered.targetItem === 'айрян' ? 50 : 120;
                    scoreEl.textContent = score;
                    chef.holding = null;
                    renderOrders();
                    setTimeout(addOrder, 1000);
                }
            }
        }
    });
}

trashGuiBtn.addEventListener('click', () => {
    chef.holding = null;
});

window.addEventListener('touchmove', (e) => {
    if (gameState === 'PLAYING' && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        handleInteraction(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }
}, { passive: true });

window.addEventListener('mousedown', (e) => {
    if (gameState === 'PLAYING') {
        const rect = canvas.getBoundingClientRect();
        handleInteraction(e.clientX - rect.left, e.clientY - rect.top);
    }
});

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    timeLeft = 60;
    orders = [];
    chef.holding = null;
    chef.x = canvas.width / 2;
    chef.y = canvas.height / 2;

    stations.find(st => st.id === 'prep').contents = [];
    stations.find(st => st.id === 'oven').state = 'empty';
    stations.find(st => st.id === 'ayran_machine').state = 'empty';

    scoreEl.textContent = score;
    timerEl.textContent = timeLeft + 's';

    // Задължително създаване на 2 поръчки при старт
    addOrder();
    addOrder();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft + 's';
        if (timeLeft <= 0) gameOver();
    }, 1000);
}

function gameOver() {
    gameState = 'GAMEOVER';
    clearInterval(timerInterval);
    finalScoreText.textContent = `Резултат: ${score} точки!`;
    showScreen(screenGameOver);
    uiOverlay.style.display = 'flex';
}

gameLoop();