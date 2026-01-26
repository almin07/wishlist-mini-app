// ============================================
// ГЛАВНЫЕ ПЕРЕМЕННЫЕ
// ============================================

const API_BASE_URL = 'https://wishlist-backend-mu.vercel.app';
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
        showLoader(true);

        if (!currentUser || !currentUser.id) {
            throw new Error('Пользователь не авторизован');
        }

        const userId = currentUser.id;

        // Загружаем параллельно
        const [wishesRes, friendsRes, pendingRes, notifRes] = await Promise.all([
            fetchWithAuth(`${API_BASE_URL}/wishes/${userId}`),
            fetchWithAuth(`${API_BASE_URL}/friends/${userId}`),
            fetchWithAuth(`${API_BASE_URL}/friends/${userId}/pending`),
            fetchWithAuth(`${API_BASE_URL}/notifications/${userId}?limit=10`)
        ]);

        // Отображаем данные
        displayMyWishes(wishesRes.wishes || []);
        displayFriends(friendsRes.friends || []);
        displayInvitations(pendingRes.requests || []);
        displayNotifications(notifRes.notifications || []);

        showLoader(false);
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        showToast('Ошибка загрузки данных', 'error');
        showLoader(false);
    }
}

// ============================================
// FETCH С АВТОРИЗАЦИЕЙ
// ============================================

async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'x-user-id': currentUser?.id || '',
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
        throw new Error(error.error || error.message || 'Ошибка запроса');
    }

    return response.json();
}

// ============================================
// ОТОБРАЖЕНИЕ ДАННЫХ
// ============================================

function displayMyWishes(wishes) {
    const container = document.getElementById('myWishesList');
    
    if (!wishes || wishes.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>📝 У вас ещё нет желаний</p></div>`;
        return;
    }

    container.innerHTML = wishes.map(wish => `
        <div class="wish-card">
            <div class="wish-header">
                <h3>${escapeHtml(wish.title)}</h3>
                <span class="wish-status ${wish.status}">${wish.status === 'active' ? '✓ Активно' : '✓ Выполнено'}</span>
            </div>
            ${wish.description ? `<p class="wish-description">${escapeHtml(wish.description)}</p>` : ''}
            <div class="wish-details">
                ${wish.price ? `<span class="wish-price">💰 $${wish.price.toLocaleString()}</span>` : ''}
                ${wish.link ? `<a href="${escapeHtml(wish.link)}" target="_blank" class="wish-link">🔗 Ссылка</a>` : ''}
            </div>
            <div class="wish-actions">
                <button class="btn-small" onclick="editWish(${wish.id})">✏️ Редактировать</button>
                <button class="btn-small btn-danger" onclick="deleteWish(${wish.id})">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

function displayFriends(friends) {
    const container = document.getElementById('friendsList');
    
    if (!friends || friends.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>👥 У вас ещё нет друзей</p></div>`;
        return;
    }

    container.innerHTML = friends.map(friendship => {
        const friend = friendship.users;
        return `
            <div class="friend-card">
                <div class="friend-info">
                    <div class="friend-name">${escapeHtml(friend.first_name)} ${friend.last_name || ''}</div>
                    <div class="friend-username">@${escapeHtml(friend.username)}</div>
                </div>
                <div class="friend-action">
                    <a href="#" onclick="viewFriendWishes(${friend.id}); return false;" class="btn-small">👁️ Желания</a>
                </div>
            </div>
        `;
    }).join('');
}

function displayInvitations(requests) {
    const container = document.getElementById('invitationsList');
    
    if (!requests || requests.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>📬 Входящие приглашения отсутствуют</p></div>`;
        return;
    }

    container.innerHTML = requests.map(request => {
        const user = request.users;
        return `
            <div class="invite-card">
                <div class="invite-info">
                    <p><strong>${escapeHtml(user.first_name)}</strong> пригласил вас в друзья</p>
                    <div class="friend-username">@${escapeHtml(user.username)}</div>
                </div>
                <div class="invite-actions">
                    <button class="btn-small" onclick="acceptInvitation(${user.id})">✅ Принять</button>
                    <button class="btn-small btn-danger" onclick="rejectInvitation(${user.id})">❌ Отклонить</button>
                </div>
            </div>
        `;
    }).join('');
}

function displayNotifications(notifications) {
    const container = document.getElementById('notificationsList');
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>🔔 Нет уведомлений</p></div>`;
        return;
    }

    container.innerHTML = notifications.map(notif => {
        const actor = notif.users;
        const typeText = {
            'wish_created': 'создал новое желание',
            'friend_request': 'отправил приглашение в друзья',
            'friend_accepted': 'принял приглашение в друзья',
            'gift_marked': 'отметил подарок'
        }[notif.type] || notif.type;

        return `
            <div class="notification-item">
                <p>
                    <strong>@${escapeHtml(actor.username)}</strong> 
                    ${typeText}
                </p>
                <span class="notif-time">${new Date(notif.sent_at).toLocaleDateString()}</span>
            </div>
        `;
    }).join('');
}

// ============================================
// МОДАЛЬНЫЕ ОКНА
// ============================================

function showAddWishModal() {
    const modal = document.getElementById('addWishModal');
    if (!modal) {
        createAddWishModal();
        return;
    }
    modal.style.display = 'flex';
}

function createAddWishModal() {
    const modal = document.createElement('div');
    modal.id = 'addWishModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Добавить желание</h2>
                <button class="close-btn" onclick="this.closest('.modal').style.display='none'">✕</button>
            </div>
            <form id="addWishForm" onsubmit="submitAddWish(event)">
                <div class="form-group">
                    <label>Название *</label>
                    <input type="text" id="wishTitle" required maxlength="100">
                </div>
                <div class="form-group">
                    <label>Описание</label>
                    <textarea id="wishDescription" maxlength="500"></textarea>
                </div>
                <div class="form-group">
                    <label>Цена ($)</label>
                    <input type="number" id="wishPrice" step="0.01" min="0">
                </div>
                <div class="form-group">
                    <label>Ссылка</label>
                    <input type="url" id="wishLink" placeholder="https://...">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">➕ Добавить</button>
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').style.display='none'">Отменить</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function showAddFriendModal() {
    const modal = document.getElementById('addFriendModal');
    if (!modal) {
        createAddFriendModal();
        return;
    }
    modal.style.display = 'flex';
}

function createAddFriendModal() {
    const modal = document.createElement('div');
    modal.id = 'addFriendModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Пригласить друга</h2>
                <button class="close-btn" onclick="this.closest('.modal').style.display='none'">✕</button>
            </div>
            <form id="addFriendForm" onsubmit="submitAddFriend(event)">
                <div class="form-group">
                    <label>ID или Username друга *</label>
                    <input type="text" id="friendId" required placeholder="@username или ID">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn-primary">➕ Пригласить</button>
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').style.display='none'">Отменить</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

// ============================================
// ФУНКЦИИ ДЕЙСТВИЙ
// ============================================

async function submitAddWish(e) {
    e.preventDefault();
    try {
        showLoader(true);

        const wishData = {
            title: document.getElementById('wishTitle').value,
            description: document.getElementById('wishDescription').value || null,
            price: parseFloat(document.getElementById('wishPrice').value) || null,
            link: document.getElementById('wishLink').value || null
        };

        const response = await fetchWithAuth(`${API_BASE_URL}/wishes`, {
            method: 'POST',
            body: JSON.stringify({
                userId: currentUser.id,
                ...wishData
            })
        });

        showToast('✅ Желание добавлено!', 'success');
        document.getElementById('addWishModal').style.display = 'none';
        document.getElementById('addWishForm').reset();
        await loadAppData();

    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

async function deleteWish(wishId) {
    if (!confirm('Вы уверены, что хотите удалить это желание?')) return;

    try {
        showLoader(true);

        await fetchWithAuth(`${API_BASE_URL}/wishes/${wishId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': currentUser.id }
        });

        showToast('✅ Желание удалено!', 'success');
        await loadAppData();

    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

async function submitAddFriend(e) {
    e.preventDefault();
    try {
        showLoader(true);

        const friendIdInput = document.getElementById('friendId').value;
        const friendId = isNaN(friendIdInput) ? friendIdInput : parseInt(friendIdInput);

        const response = await fetchWithAuth(`${API_BASE_URL}/friends/add`, {
            method: 'POST',
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });

        showToast('✅ Приглашение отправлено!', 'success');
        document.getElementById('addFriendModal').style.display = 'none';
        document.getElementById('addFriendForm').reset();
        await loadAppData();

    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

async function acceptInvitation(friendId) {
    try {
        showLoader(true);

        await fetchWithAuth(`${API_BASE_URL}/friends/accept`, {
            method: 'POST',
            body: JSON.stringify({
                userId: currentUser.id,
                friendId: friendId
            })
        });

        showToast('✅ Приглашение принято!', 'success');
        await loadAppData();

    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

async function rejectInvitation(friendId) {
    try {
        showLoader(true);
        
        // Используем удаление из таблицы friends
        await fetchWithAuth(`${API_BASE_URL}/friends/${friendId}`, {
            method: 'DELETE',
            headers: { 'x-user-id': currentUser.id }
        });

        showToast('✅ Приглашение отклонено', 'success');
        await loadAppData();

    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        showLoader(false);
    }
}

async function viewFriendWishes(friendId) {
    try {
        showLoader(true);

        const response = await fetchWithAuth(`${API_BASE_URL}/wishes/${friendId}`);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Желания друга</h2>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">✕</button>
                </div>
                <div id="friendWishesContainer"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const container = modal.querySelector('#friendWishesContainer');
        displayMyWishes(response.wishes || []);
        const wishes = document.getElementById('myWishesList').innerHTML;
        container.innerHTML = wishes;

        showLoader(false);

    } catch (error) {
        showToast(`❌ Ошибка: ${error.message}`, 'error');
        showLoader(false);
    }
}

async function editWish(wishId) {
    showToast('📝 Функция редактирования в разработке', 'info');
}

// ============================================
// УТИЛИТЫ
// ============================================

function showLoader(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
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
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================

function setupEventHandlers() {
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;

            // Скрываем все табы
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            tabButtons.forEach(b => b.classList.remove('active'));

            // Показываем выбранный таб
            const activeTab = document.getElementById(tabName);
            if (activeTab) {
                activeTab.classList.add('active');
                e.target.classList.add('active');
            }
        });
    });

    // Кнопки действий
    const addWishBtn = document.getElementById('addWishBtn');
    const addFriendBtn = document.getElementById('addFriendBtn');

    if (addWishBtn) {
        addWishBtn.addEventListener('click', showAddWishModal);
    }

    if (addFriendBtn) {
        addFriendBtn.addEventListener('click', showAddFriendModal);
    }

    // Закрытие модалей при клике вне их
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});