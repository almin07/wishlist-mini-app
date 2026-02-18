// WISHLIST MINI APP - TELEGRAM BROWSER FIXED VERSION v1.2 (FIXED LOADING)
const APIBASE = 'https://wishlist-backend-mu.vercel.app';
const APIWISHES = `${APIBASE}/api/wishes`;

let appState = {
    userId: null,
    wishes: [],
    notifications: [],
    settings: {
        notificationsEnabled: JSON.parse(localStorage.getItem('notificationsEnabled') ?? 'true'),
        birthdayNotifications: JSON.parse(localStorage.getItem('birthdayNotifications') ?? 'true')
    },
    currentTab: 'wishes'
};

// Показать/скрыть loader
function showLoader(show = true) {
    const loader = document.querySelector('.loader');
    if (loader) loader.classList.toggle('hidden', !show);
}

// Toast
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// TELEGRAM INITIALIZATION
async function initializeApp() {
    showLoader(true);
    try {
        console.log('Initializing Wishlist Mini App...');
        
        // Telegram check
        if (window.Telegram?.WebApp) {
            console.log('Telegram environment detected...');
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            tg.setHeaderColor('#1f2121');
            
            const initDataUnsafe = tg.initDataUnsafe;
            if (initDataUnsafe?.user?.id) {
                appState.userId = initDataUnsafe.user.id;
                console.log('User ID from Telegram:', appState.userId);
            } else {
                appState.userId = 123456; // demo
            }
        } else {
            console.log('Browser mode - demo data');
            appState.userId = parseInt(localStorage.getItem('userId') || '123456');
        }
        
        // Load data
        await loadWishes();
        await loadNotifications();
        setupEventHandlers();
        renderWishesTab();
        
        showLoader(false);
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Initialization error:', error);
        showLoader(false);
        appState.wishes = getDemoWishes();
        appState.notifications = getDemoNotifications();
        renderWishesTab();
        setupEventHandlers();
        showToast('Загружено в демо-режиме', 'error');
    }
}

// API CALLS
async function loadWishes() {
    try {
        const response = await fetch(`${APIWISHES}?userId=${appState.userId}`);
        const data = await response.json();
        if (data.success) {
            appState.wishes = data.wishes;
        } else {
            appState.wishes = getDemoWishes();
        }
    } catch (error) {
        console.error('Load wishes error:', error);
        appState.wishes = getDemoWishes();
    }
}

async function loadNotifications() {
    try {
        const response = await fetch(`${APIBASE}/api/notifications?userId=${appState.userId}`);
        const data = await response.json();
        if (data.success) {
            appState.notifications = data.notifications;
        } else {
            appState.notifications = getDemoNotifications();
        }
    } catch (error) {
        console.error('Load notifications error:', error);
        appState.notifications = getDemoNotifications();
    }
}

// DEMO DATA
function getDemoWishes() {
    return [
        { id: 1, userid: appState.userId, title: 'MacBook', description: 'MacBook Pro 16"', price: 2500, status: 'active' },
        { id: 2, userid: appState.userId, title: 'iPhone 16', price: 2000, status: 'active' },
        { id: 3, userid: appState.userId, title: 'Курс Next.js', description: 'Next.js + TypeScript', price: 300, status: 'active' }
    ];
}

function getDemoNotifications() {
    return [
        { id: 1, type: 'friendrequest', message: '@friend добавил вас в друзья', createdat: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, type: 'giftselected', message: '@friend выбрал ваше желание "MacBook"', createdat: new Date(Date.now() - 7200000).toISOString() }
    ];
}

// ... (остальной код renderWishesTab, switchTab, setupEventHandlers, showAddWishForm из предыдущего ответа остается)

function renderWishesTab() {
    const content = document.getElementById('wishesContent');
    if (!content) return console.error('#wishesContent not found!');
    
    if (appState.wishes.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <p>✨</p>
                <p>Пока нет желаний</p>
                <p class="small-text">Нажмите "+" чтобы добавить</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = appState.wishes.map(wish => `
        <div class="wish-card">
            <div class="wish-header">
                <h3>${escapeHtml(wish.title)}</h3>
                <button class="delete-wish-btn" data-wish-id="${wish.id}" title="Удалить">×</button>
            </div>
            ${wish.description ? `<p class="wish-description">${escapeHtml(wish.description)}</p>` : ''}
            <div class="wish-footer">
                ${wish.price ? `<span class="wish-price">${wish.price}₽</span>` : ''}
                <button class="gift-btn" data-wish-id="${wish.id}">Подарить</button>
            </div>
        </div>
    `).join('');
}

// showAddWishForm из предыдущего ответа (с fetch)
async function showAddWishForm(editWish = null) {
    const title = prompt(editWish ? `Редактировать "${editWish.title}"` : 'Название желания:');
    if (!title) return;
    
    const description = prompt('Описание (опционально):') || null;
    const priceStr = prompt('Цена (опционально):') || null;
    const price = priceStr ? parseFloat(priceStr) : null;
    
    const wishData = { title, description, price, userId: appState.userId };
    
    try {
        const response = await fetch(`${APIBASE}/api/wishes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wishData)
        });
        if (response.ok) {
            await loadWishes();
            renderWishesTab();
            showToast('Желание добавлено! ✅');
        } else throw new Error();
    } catch {
        // Fallback demo
        const newWish = { ...wishData, id: Date.now(), status: 'active' };
        appState.wishes.unshift(newWish);
        renderWishesTab();
        showToast('Добавлено локально');
    }
}

// Запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
