// ГЛАВНЫЕ ПЕРЕМЕННЫЕ
const API_BASE_URL = 'https://your-backend-url.vercel.app/api';
let currentUser = null;
let authToken = null;

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// ============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

async function initializeApp() {
    try {
        showLoader(true);

        // Инициализируем Telegram WebApp
        tg.ready();
        tg.setHeaderColor('#0088cc');
        tg.setBackgroundColor('#f0f0f0');

        // Получаем данные от Telegram
        const initData = tg.initData;
        
        if (!initData) {
            throw new Error('Не удалось получить данные от Telegram');
        }

        // Отправляем на бэкенд для проверки
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ initData })
        });

        if (!response.ok) {
            throw new Error('Ошибка аутентификации');
        }

        const data = await response.json();
        currentUser = data.user;
        authToken = data.token;

        console.log('✅ Пользователь авторизован:', currentUser);

        // Загружаем данные приложения
        await loadAppData();

        // Подключаем обработчики
        setupEventHandlers();

        showLoader(false);

    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showToast('Ошибка инициализации приложения', 'error');
        showLoader(false);
    }
}

// ============================================
// ЗАГРУЗКА ДАННЫХ
// ============================================

async function loadAppData() {
    try {
        const [wishes, friends, invitations] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/wishes`),
            fetchWithAuth(`${API_BASE_URL}/friends`),
            fetchWithAuth(`${API_BASE_URL}/friends/invitations`)
        ]);

        displayMyWishes(wishes.wishes || []);
        displayFriends(friends.friends || []);
        displayInvitations(invitations.invitations || []);

    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showToast('Ошибка загрузки данных', 'error');
    }
}

// ============================================
// FETCH С АВТОРИЗАЦИЕЙ
// ============================================

async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...options.headers
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        location.reload();
        throw new Error('Сессия истекла');
    }

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка запроса');
    }

    return response.json();
}

// ============================================
// ОТОБРАЖЕНИЕ ДАННЫХ
// ============================================

function displayMyWishes(wishes) {
    const container = document.getElementById('myWishesList');
    
    if (!wishes || wishes.length === 0) {
        container.innerHTML = `<div class="wish-empty"><p>😢 У вас еще нет желаний</p></div>`;
        return;
    }

    container.innerHTML = wishes.map(wish => `
        <div class="wish-card">
            <div class="wish-title">${escapeHtml(wish.title)}</div>
            ${wish.description ? `<div class="wish-description">${escapeHtml(wish.description)}</div>` : ''}
            <div class="wish-details">
                ${wish.price ? `<span>₽${wish.price.toLocaleString()}</span>` : ''}
                <span>${wish.status === 'active' ? '✓ Активное' : '✓ Исполнено'}</span>
            </div>
            ${wish.marked_by && wish.marked_by.length > 0 ? `
                <div><strong>Дарит:</strong> ${wish.marked_by.map(g => `@${g.username}`).join(', ')}</div>
            ` : ''}
            <div class="wish-actions">
                <button class="wish-btn" onclick="editWish(${wish.id})">✎ Редактировать</button>
            </div>
        </div>
    `).join('');
}

function displayFriends(friends) {
    const container = document.getElementById('friendsList');
    
    if (!friends || friends.length === 0) {
        container.innerHTML = `<div class="wish-empty"><p>😔 У вас нет друзей</p></div>`;
        return;
    }

    container.innerHTML = friends.map(friend => `
        <div class="friend-card">
            <div>
                <div class="friend-name">${escapeHtml(friend.first_name)}</div>
                <div style="font-size: 12px; color: #666;">@${friend.username}</div>
            </div>
            <div>→</div>
        </div>
    `).join('');
}

function displayInvitations(invitations) {
    const container = document.getElementById('invitationsList');
    
    if (!invitations || invitations.length === 0) {
        container.innerHTML = `<div class="invitation-empty"><p>📭 Нет входящих приглашений</p></div>`;
        return;
    }

    container.innerHTML = invitations.map(inv => `
        <div class="wish-card">
            <div><strong>${escapeHtml(inv.from.first_name)}</strong> пригласил вас</div>
            <div style="font-size: 12px; color: #666;">@${inv.from.username}</div>
            <div class="wish-actions">
                <button class="wish-btn" onclick="acceptInvitation(${inv.id})">✅ Принять</button>
                <button class="wish-btn" onclick="rejectInvitation(${inv.id})">❌ Отклонить</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// УТИЛИТЫ
// ============================================

function showLoader(show) {
    document.getElementById('loader').classList.toggle('hidden', !show);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// ФУНКЦИИ ПРИГЛАШЕНИЙ
// ============================================

async function acceptInvitation(invitationId) {
    try {
        showLoader(true);
        
        await fetchWithAuth(`${API_BASE_URL}/friends/accept/${invitationId}`, {
            method: 'POST'
        });

        showToast('✅ Приглашение принято!', 'success');
        await loadAppData();
        
    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

async function rejectInvitation(invitationId) {
    try {
        showLoader(true);
        
        await fetchWithAuth(`${API_BASE_URL}/friends/decline/${invitationId}`, {
            method: 'POST'
        });

        showToast('✅ Приглашение отклонено', 'success');
        await loadAppData();
        
    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

// ============================================
// СОБЫТИЯ
// ============================================

function setupEventHandlers() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            document.getElementById(tabName).classList.add('active');
            e.target.classList.add('active');
        });
    });
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
