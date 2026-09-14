const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiOverlay = document.getElementById('ui-overlay');
const screenStart = document.getElementById('screen-start');
const screenLoading = document.getElementById('screen-loading');
const screenGreeting = document.getElementById('screen-greeting');

const mainStartBtn = document.getElementById('main-start-btn');
const playBtn = document.getElementById('play-btn');
const trashGuiBtn = document.getElementById('trash-gui-btn');
const recipesToggleBtn = document.getElementById('recipes-toggle-btn');
const recipesDrawer = document.getElementById('recipes-drawer');
const arrowIcon = document.getElementById('arrow-icon');

const scoreEl = document.getElementById('score');
const ordersBar = document.getElementById('orders-bar');

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    repositionStations();
}

let gameState = 'MENU';
let score = 0;
let orders = [];

function showScreen(screen) {
    [screenStart, screenLoading, screenGreeting].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

mainStartBtn.addEventListener('click', () => {
    showScreen(screenLoading);
    setTimeout(() => showScreen(screenGreeting), 1500);
});

playBtn.addEventListener('click', () => {
    uiOverlay.style.display = 'none';
    startGame();
});

recipesToggleBtn.addEventListener('click', () => {
    recipesDrawer.classList.toggle('drawer-hidden');
    arrowIcon.style.transform = recipesDrawer.classList.contains('drawer-hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
});

// Готвач
const chef = {
    x: 0, y: 0, size: 22, holding: null,
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
    const btnH = 42;

    stations = [
        // Съставки
        { id: 'mince', name: '🥩 Кайма', x: 10, y: 10, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'potato', name: '🥔 Картофи', x: 20 + btnW, y: 10, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'topping', name: '🥣 Заливка', x: 30 + btnW*2, y: 10, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        
        { id: 'cucumber', name: '🥒 Краставица', x: 10, y: 60, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'yogurt', name: '🥛 К. Мляко', x: 20 + btnW, y: 60, w: btnW, h: btnH, color: '#334155', isIngredient: true },
        { id: 'cheese', name: '🧀 Сирене', x: 30 + btnW*2, y: 60, w: btnW, h: btnH, color: '#334155', isIngredient: true },

        // Сглобяване и печене
        { id: 'prep', name: '🍳 ПЛОТ (Тава)', x: 15, y: 115, w: (w - 40)/2, h: 60, color: '#475569', contents: [] },
        { id: 'oven', name: '🔥 ФУРНА', x: 25 + (w - 40)/2, y: 115, w: (w - 40)/2, h: 60, color: '#ea580c', state: 'empty', timer: 0, content: null },

        // Напитки
        { id: 'ayran_machine', name: '🥤 Айрян', x: 10, y: 185, w: btnW, h: 45, color: '#0284c7', drink: 'айрян' },
        { id: 'lemonade_machine', name: '🍋 Лимонада', x: 20 + btnW, y: 185, w: btnW, h: 45, color: '#eab308', drink: 'лимонада' },
        { id: 'juice_machine', name: '🍊 Сок', x: 30 + btnW*2, y: 185, w: btnW, h: 45, color: '#f97316', drink: 'сок' },

        // Кош
        { id: 'trash', name: '🗑️ Изчисти плота', x: 15, y: 240, w: w - 30, h: 35, color: '#334155', isTrash: true },

        // Бутон за сервиране
        { id: 'serve', name: '🛎️ СЕРВИРАЙ ПОРЪЧКА ТУК', x: 15, y: h - 75, w: w - 30, h: 65, color: '#059669', isServe: true }
    ];
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const RECIPES = [
    { id: 'moussaka', name: 'Мусака', req: ['кайма', 'картофи', 'заливка'], needsOven: true, rawResult: 'мусака_сурова', cookedResult: 'мусака_печена' },
    { id: 'bake', name: 'Запеканка', req: ['картофи', 'сирене', 'заливка'], needsOven: true, rawResult: 'запеканка_сурова', cookedResult: 'запеканка_печена' },
    { id: 'tarator', name: 'Таратор', req: ['краставица', 'кисело мляко'], needsOven: false, rawResult: null, cookedResult: 'таратор' },
    { id: 'ayran', name: 'Айрян', req: [], needsOven: false, cookedResult: 'айрян' },
    { id: 'lemonade', name: 'Лимонада', req: [], needsOven: false, cookedResult: 'лимонада' },
    { id: 'juice', name: 'Сок', req: [], needsOven: false, cookedResult: 'сок' }
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
        case 'лимонада': return '#fef08a';
        case 'сок': return '#f97316';
        case 'загаряне': return '#18181b';
        default: return '#fff';
    }
}

function addOrder() {
    if (orders.length >= 3) return;
    const randomRecipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    orders.push({
        id: Date.now() + Math.random(),
        recipeId: randomRecipe.id,
        name: randomRecipe.name,
        targetItem: randomRecipe.cookedResult,
        reqText: randomRecipe.req && randomRecipe.req.length > 0 ? randomRecipe.req.join(' + ') : 'Напитка',
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

    if (orders.length === 0) addOrder();

    const oven = stations.find(s => s.id === 'oven');
    if (oven.state === 'cooking') {
        oven.timer += 1;
        if (oven.timer >= 100) oven.state = 'ready';
    } else if (oven.state === 'ready') {
        oven.timer += 1;
        if (oven.timer >= 350) {
            oven.state = 'burnt';
            oven.content = 'загаряне';
        }
    }

    for (let i = orders.length - 1; i >= 0; i--) {
        orders[i].patience -= 0.08;
        if (orders[i].patience <= 0) {
            orders.splice(i, 1);
            score = Math.max(0, score - 20);
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

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 11px Poppins';
        ctx.textAlign = 'center';

        if (s.isIngredient || s.drink || s.isTrash) {
            ctx.fillText(s.name, s.x + s.w/2, s.y + s.h/2 + 4);
        } else if (s.isServe) {
            ctx.font = '700 13px Poppins';
            ctx.fillText(s.name, s.x + s.w/2, s.y + s.h/2 + 5);
        } else {
            ctx.fillText(s.name, s.x + s.w/2, s.y + 18);

            if (s.id === 'prep') {
                ctx.font = '500 10px Poppins';
                ctx.fillText(s.contents.length > 0 ? `Съставки: ${s.contents.length}/3` : 'Сложи съставки тук', s.x + s.w/2, s.y + 38);
            }
            if (s.id === 'oven') {
                ctx.font = '500 10px Poppins';
                if (s.state === 'empty') ctx.fillText('Сложи сурово ястие', s.x + s.w/2, s.y + 38);
                if (s.state === 'cooking') ctx.fillText('Пече се...', s.x + s.w/2, s.y + 38);
                if (s.state === 'ready') ctx.fillText('ГОТОВО! (Вземи)', s.x + s.w/2, s.y + 38);
                if (s.state === 'burnt') ctx.fillText('ЗАГОРЯ!', s.x + s.w/2, s.y + 38);
            }
        }
    });

    if (gameState === 'PLAYING') chef.draw();
}

function checkPrepMatch(contents) {
    for (let recipe of RECIPES) {
        if (recipe.req && recipe.req.length > 0 && contents.length === recipe.req.length && recipe.req.every(ing => contents.includes(ing))) {
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
            
            // Вземане на съставка
            if (map[s.id] && !chef.holding) {
                chef.holding = map[s.id];
            }
            // Вземане на напитка
            else if (s.drink && !chef.holding) {
                chef.holding = s.drink;
            }
            // Поставяне на плота (Тавата)
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
            // Поставяне и вземане от фурната
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
            // Кош
            else if (s.id === 'trash') {
                chef.holding = null;
                stations.find(st => st.id === 'prep').contents = [];
            }
            // Точна логика за сервиране
            else if (s.id === 'serve' && chef.holding) {
                const idx = orders.findIndex(o => o.targetItem === chef.holding);
                if (idx !== -1) {
                    orders.splice(idx, 1);
                    score += 100;
                    scoreEl.textContent = score;
                    chef.holding = null;
                    renderOrders();
                    setTimeout(addOrder, 800);
                }
            }
        }
    });
}

trashGuiBtn.addEventListener('click', () => { chef.holding = null; });

window.addEventListener('touchmove', (e) => {
    if (gameState === 'PLAYING' && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        handleInteraction(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }
}, { passive: true });

window.addEventListener('touchstart', (e) => {
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
    orders = [];
    chef.holding = null;
    chef.x = canvas.width / 2;
    chef.y = canvas.height / 2;

    stations.find(st => st.id === 'prep').contents = [];
    stations.find(st => st.id === 'oven').state = 'empty';

    scoreEl.textContent = score;

    addOrder();
    addOrder();
}

gameLoop();