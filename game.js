const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiOverlay = document.getElementById('ui-overlay');
const startBtn = document.getElementById('start-btn');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const ordersBar = document.getElementById('orders-bar');

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let gameState = 'START';
let score = 0;
let timeLeft = 60;
let timerInterval = null;
let orders = [];

// Готвач (Играч)
const chef = {
    x: 0,
    y: 0,
    size: 25,
    holding: null,

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fillStyle = '#2196f3';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#0d47a1';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -5, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        if (this.holding) {
            ctx.beginPath();
            ctx.arc(18, 0, 10, 0, Math.PI * 2);
            ctx.fillStyle = getItemColor(this.holding);
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#000';
            ctx.stroke();
        }

        ctx.restore();
    }
};

// Станции
const stations = [
    { id: 'mince', name: 'Кайма', x: 15, y: 20, w: 60, h: 45, color: '#a52a2a' },
    { id: 'potato', name: 'Картофи', x: 85, y: 20, w: 60, h: 45, color: '#e3c16f' },
    { id: 'topping', name: 'Заливка', x: 155, y: 20, w: 60, h: 45, color: '#fff8dc' },
    { id: 'cucumber', name: 'Краставица', x: 225, y: 20, w: 60, h: 45, color: '#4caf50' },
    { id: 'yogurt', name: 'Кисело мляко', x: 295, y: 20, w: 60, h: 45, color: '#f5f5f5' },
    { id: 'cheese', name: 'Сирене', x: 365, y: 20, w: 60, h: 45, color: '#fffde7' },

    { id: 'prep', name: 'Плот (Тава)', x: 30, y: 160, w: 90, h: 70, color: '#9e9e9e', contents: [] },
    { id: 'oven', name: 'Фурна', x: 140, y: 160, w: 90, h: 70, color: '#ff5722', state: 'empty', timer: 0, content: null },
    { id: 'ayran_machine', name: 'Айрян Машина', x: 250, y: 160, w: 85, h: 70, color: '#00bcd4', state: 'empty', timer: 0 },
    { id: 'trash', name: 'Кош', x: 350, y: 160, w: 75, h: 70, color: '#757575' },

    { id: 'serve', name: 'ИЗДАВАНЕ НА ПОРЪЧКА', x: 120, y: 340, w: 180, h: 60, color: '#2e7d32' }
];

const RECIPES = [
    { name: 'Мусака', req: ['кайма', 'картофи', 'заливка'], needsOven: true, rawResult: 'мусака_сурова', cookedResult: 'мусака_печена' },
    { name: 'Запеканка', req: ['картофи', 'сирене', 'заливка'], needsOven: true, rawResult: 'запеканка_сурова', cookedResult: 'запеканка_печена' },
    { name: 'Таратор', req: ['краставица', 'кисело мляко'], needsOven: false, rawResult: null, cookedResult: 'таратор' },
    { name: 'Айрян', req: [], needsOven: false, rawResult: null, cookedResult: 'айрян' }
];

function getItemColor(item) {
    switch(item) {
        case 'кайма': return '#a52a2a';
        case 'картофи': return '#e3c16f';
        case 'заливка': return '#fff8dc';
        case 'краставица': return '#4caf50';
        case 'кисело мляко': return '#ffffff';
        case 'сирене': return '#fffde7';
        case 'мусака_сурова': return '#d7ccc8';
        case 'мусака_печена': return '#d84315';
        case 'запеканка_сурова': return '#fff9c4';
        case 'запеканка_печена': return '#fbc02d';
        case 'таратор': return '#e8f5e9';
        case 'айрян': return '#e0f7fa';
        case 'загаряне': return '#212121';
        default: return '#fff';
    }
}

function addOrder() {
    if (orders.length >= 3) return;
    const randomRecipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    const newOrder = {
        id: Date.now(),
        name: randomRecipe.name,
        targetItem: randomRecipe.cookedResult,
        reqText: randomRecipe.name === 'Айрян' ? 'Освежаваща напитка' : randomRecipe.req.join(' + '),
        patience: 100, // 100%
        maxPatience: 100
    };
    orders.push(newOrder);
    renderOrders();
}

function renderOrders() {
    ordersBar.innerHTML = '';
    orders.forEach((ord, idx) => {
        const card = document.createElement('div');
        card.className = 'order-card';
        const fillPercent = (ord.patience / ord.maxPatience) * 100;
        let barColor = '#4caf50';
        if (fillPercent < 50) barColor = '#ff9800';
        if (fillPercent < 25) barColor = '#f44336';

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

    // 1. Логика на фурната (Печене и Загаряне)
    const oven = stations.find(s => s.id === 'oven');
    if (oven.state === 'cooking') {
        oven.timer += 1;
        if (oven.timer >= 120) { // Пече се 2 сек.
            oven.state = 'ready';
        }
    } else if (oven.state === 'ready') {
        oven.timer += 1;
        if (oven.timer >= 320) { // Загаря след още 3.5 сек.
            oven.state = 'burnt';
            oven.content = 'загаряне';
        }
    }

    // 2. Логика на машината за айрян
    const ayran = stations.find(s => s.id === 'ayran_machine');
    if (ayran.state === 'filling') {
        ayran.timer += 1;
        if (ayran.timer >= 90) { // 1.5 сек.
            ayran.state = 'ready';
        }
    }

    // 3. Търпение на клиентите
    for (let i = orders.length - 1; i >= 0; i--) {
        orders[i].patience -= 0.15;
        if (orders[i].patience <= 0) {
            orders.splice(i, 1);
            score = Math.max(0, score - 50); // Глоба за изпуснат клиент
            scoreEl.textContent = score;
            setTimeout(addOrder, 2000);
        }
    }
    renderOrders();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    stations.forEach(s => {
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#333';
        ctx.strokeRect(s.x, s.y, s.w, s.h);

        ctx.fillStyle = (s.id === 'serve' || s.id === 'mince') ? '#fff' : '#000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(s.name, s.x + s.w/2, s.y + 16);

        if (s.id === 'prep') {
            if (s.contents.length > 0) {
                ctx.fillText(`(${s.contents.length} съставки)`, s.x + s.w/2, s.y + 40);
            } else {
                ctx.fillText('(Свободен)', s.x + s.w/2, s.y + 40);
            }
        }

        if (s.id === 'oven') {
            if (s.state === 'empty') ctx.fillText('(Празна)', s.x + s.w/2, s.y + 42);
            if (s.state === 'cooking') ctx.fillText('Пече се...', s.x + s.w/2, s.y + 42);
            if (s.state === 'ready') {
                ctx.fillStyle = '#ffeb3b';
                ctx.fillText('ГОТОВО!', s.x + s.w/2, s.y + 42);
            }
            if (s.state === 'burnt') {
                ctx.fillStyle = '#ff1744';
                ctx.fillText('ЗАГОРЯ!', s.x + s.w/2, s.y + 42);
            }
        }

        if (s.id === 'ayran_machine') {
            if (s.state === 'empty') ctx.fillText('[Натисни]', s.x + s.w/2, s.y + 42);
            if (s.state === 'filling') ctx.fillText('Пълнене...', s.x + s.w/2, s.y + 42);
            if (s.state === 'ready') {
                ctx.fillStyle = '#00e676';
                ctx.fillText('ГОТОВ!', s.x + s.w/2, s.y + 42);
            }
        }
    });

    if (gameState === 'PLAYING') {
        chef.draw();
    }
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
            
            // 1. Съставки
            const ingredientIds = ['mince', 'potato', 'topping', 'cucumber', 'yogurt', 'cheese'];
            if (ingredientIds.includes(s.id) && !chef.holding) {
                const map = {
                    'mince': 'кайма', 'potato': 'картофи', 'topping': 'заливка',
                    'cucumber': 'краставица', 'yogurt': 'кисело мляко', 'cheese': 'сирене'
                };
                chef.holding = map[s.id];
            }

            // 2. Плот
            else if (s.id === 'prep') {
                const rawIngredients = ['кайма', 'картофи', 'заливка', 'краставица', 'кисело мляко', 'сирене'];
                if (chef.holding && rawIngredients.includes(chef.holding)) {
                    if (!s.contents.includes(chef.holding)) {
                        s.contents.push(chef.holding);
                        chef.holding = null;

                        const matchedRecipe = checkPrepMatch(s.contents);
                        if (matchedRecipe) {
                            s.contents = [];
                            chef.holding = matchedRecipe.needsOven ? matchedRecipe.rawResult : matchedRecipe.cookedResult;
                        }
                    }
                }
            }

            // 3. Фурна
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

            // 4. Машина за айрян
            else if (s.id === 'ayran_machine') {
                if (s.state === 'empty') {
                    s.state = 'filling';
                    s.timer = 0;
                } else if (s.state === 'ready' && !chef.holding) {
                    chef.holding = 'айрян';
                    s.state = 'empty';
                }
            }

            // 5. Кош за боклук
            else if (s.id === 'trash') {
                chef.holding = null;
                const prep = stations.find(st => st.id === 'prep');
                prep.contents = [];
            }

            // 6. Издаване на поръчка
            else if (s.id === 'serve') {
                if (chef.holding && orders.length > 0) {
                    const matchedOrderIndex = orders.findIndex(o => o.targetItem === chef.holding);
                    if (matchedOrderIndex !== -1) {
                        const delivered = orders.splice(matchedOrderIndex, 1)[0];
                        const bonus = delivered.targetItem === 'айрян' ? 50 : 120;
                        score += bonus;
                        scoreEl.textContent = score;
                        chef.holding = null;
                        renderOrders();
                        setTimeout(addOrder, 1500);
                    }
                }
            }
        }
    });
}

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

    const prep = stations.find(st => st.id === 'prep');
    prep.contents = [];
    const oven = stations.find(st => st.id === 'oven');
    oven.state = 'empty';
    oven.content = null;
    const ayran = stations.find(st => st.id === 'ayran_machine');
    ayran.state = 'empty';

    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
    uiOverlay.style.display = 'none';

    addOrder();
    addOrder();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) gameOver();
    }, 1000);
}

function gameOver() {
    gameState = 'GAMEOVER';
    clearInterval(timerInterval);
    titleEl.textContent = "ВРЕМЕТО ИЗТЕЧЕ!";
    subtitleEl.innerHTML = `Резултат: <strong>${score}</strong> точки!`;
    startBtn.textContent = "ОПИТАЙ ПАК";
    uiOverlay.style.display = 'flex';
}

startBtn.addEventListener('click', startGame);
gameLoop();