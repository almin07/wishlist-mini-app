// ============================================
// WISHLIST MINI APP - TELEGRAM & BROWSER
// ============================================

// API Configuration
const API_BASE = 'https://wishlist-backend-mu.vercel.app';
const API_WISHES = `${API_BASE}/api/wishes`;

// State Management
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

// ============================================
// TELEGRAM INITIALIZATION
// ============================================

async function initializeApp() {
  try {
    console.log('🚀 Initializing Wishlist Mini App...');

    // Check if Telegram WebApp is available
    if (window.Telegram && window.Telegram.WebApp) {
      console.log('✅ Telegram environment detected');
      const tg = window.Telegram.WebApp;
      
      // Get user data from Telegram
      const initDataUnsafe = tg.initDataUnsafe;
      
      if (initDataUnsafe && initDataUnsafe.user && initDataUnsafe.user.id) {
        appState.userId = initDataUnsafe.user.id;
        console.log(`✅ User ID from Telegram: ${appState.userId}`);
      } else {
        console.warn('⚠️ No user data from Telegram, using demo ID');
        appState.userId = 123456;
      }

      // Expand app to full height
      tg.expand();
      
      // Set header color
      tg.setHeaderColor('#1f2121');
      
    } else {
      // Browser fallback (development mode)
      console.log('🌐 Browser environment detected (not Telegram)');
      appState.userId = parseInt(localStorage.getItem('userId') || '123456');
      console.log(`✅ Using demo User ID: ${appState.userId}`);
      
      // Show demo notice
      showDemoNotice();
    }

    // Load data from API
    await loadWishes();
    await loadNotifications();
    
    // Setup event handlers
    setupEventHandlers();
    
    // Render initial UI
    renderWishesTab();
    
    console.log('✅ App initialized successfully');

  } catch (error) {
    console.error('❌ Initialization error:', error);
    showError('Ошибка инициализации приложения');
  }
}

// ============================================
// API CALLS
// ============================================

async function loadWishes() {
  try {
    console.log(`📥 Fetching wishes for user ${appState.userId}...`);
    
    const response = await fetch(`${API_WISHES}?userId=${appState.userId}`);
    const data = await response.json();

    if (data.success && data.wishes) {
      appState.wishes = data.wishes;
      console.log(`✅ Loaded ${appState.wishes.length} wishes`);
    } else {
      console.warn('⚠️ No wishes returned from API');
      appState.wishes = [];
    }
  } catch (error) {
    console.error('❌ Error loading wishes:', error);
    // Use demo data if API fails
    appState.wishes = getDemoWishes();
  }
}

async function loadNotifications() {
  try {
    console.log(`📥 Fetching notifications for user ${appState.userId}...`);
    
    // API endpoint should be /notifications/:userId
    const response = await fetch(`${API_BASE}/notifications/${appState.userId}`);
    const data = await response.json();

    if (data.success && data.notifications) {
      appState.notifications = data.notifications;
      console.log(`✅ Loaded ${appState.notifications.length} notifications`);
    } else {
      console.warn('⚠️ No notifications returned from API');
      appState.notifications = getDemoNotifications();
    }
  } catch (error) {
    console.error('⚠️ Error loading notifications:', error);
    // Use demo notifications
    appState.notifications = getDemoNotifications();
  }
}

// ============================================
// DEMO DATA (for browser testing)
// ============================================

function getDemoWishes() {
  return [
    {
      id: 1,
      user_id: 123456,
      title: 'Купить MacBook',
      description: 'MacBook Pro 16 для работы',
      photo_url: null,
      link: null,
      price: 2500,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 123456,
      title: 'Отпуск в Таиланде',
      description: 'Неделя на пляже в Бангкоке',
      photo_url: null,
      link: null,
      price: 2000,
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      user_id: 123456,
      title: 'Курс по веб-разработке',
      description: 'Полный курс Next.js и TypeScript',
      photo_url: null,
      link: null,
      price: 300,
      status: 'active',
      created_at: new Date().toISOString()
    }
  ];
}

function getDemoNotifications() {
  return [
    {
      id: 1,
      type: 'friend_request',
      message: 'Друг @username подтвердил приглашение в приложение',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 2,
      type: 'gift_selected',
      message: 'Друг @friend_username выбрал подарить "Купить MacBook"',
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 3,
      type: 'birthday',
      message: 'День рождения друга @another_friend - 5 февраля (скоро!)',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];
}

function showDemoNotice() {
  const notice = document.createElement('div');
  notice.className = 'demo-notice';
  notice.innerHTML = `
    <p>🌐 <strong>Demo Mode</strong> — Используются тестовые данные. Откройте в Telegram для полной функциональности.</p>
  `;
  document.body.insertBefore(notice, document.body.firstChild);
}

// ============================================
// EVENT HANDLERS
// ============================================

function setupEventHandlers() {
  console.log('🔧 Setting up event handlers...');

  // Tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      console.log(`📑 Switching to ${tabName} tab`);
      switchTab(tabName);
    });
  });

  // Add wish button
  const addWishBtn = document.getElementById('addWishBtn');
  if (addWishBtn) {
    addWishBtn.addEventListener('click', () => {
      console.log('➕ Add wish button clicked');
      showAddWishForm();
    });
  }

  // Delete wish buttons
  const deleteWishBtns = document.querySelectorAll('.delete-wish-btn');
  deleteWishBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wishId = e.target.dataset.wishId;
      console.log(`🗑️ Delete wish ${wishId} clicked`);
      deleteWish(wishId);
    });
  });

  // Mark as gift buttons
  const giftBtns = document.querySelectorAll('.gift-btn');
  giftBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wishId = e.target.dataset.wishId;
      console.log(`🎁 Gift button for wish ${wishId} clicked`);
      markAsGift(wishId);
    });
  });

  // Settings toggles
  const notificationsToggle = document.getElementById('notificationsToggle');
  const birthdayToggle = document.getElementById('birthdayToggle');

  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', (e) => {
      appState.settings.notificationsEnabled = e.target.checked;
      localStorage.setItem('notificationsEnabled', e.target.checked);
      console.log(`🔔 Notifications ${e.target.checked ? 'enabled' : 'disabled'}`);
    });
  }

  if (birthdayToggle) {
    birthdayToggle.addEventListener('change', (e) => {
      appState.settings.birthdayNotifications = e.target.checked;
      localStorage.setItem('birthdayNotifications', e.target.checked);
      console.log(`🎂 Birthday notifications ${e.target.checked ? 'enabled' : 'disabled'}`);
    });
  }

  console.log('✅ Event handlers set up successfully');
}

// ============================================
// TAB MANAGEMENT
// ============================================

function switchTab(tabName) {
  appState.currentTab = tabName;

  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  switch (tabName) {
    case 'wishes':
      renderWishesTab();
      break;
    case 'notifications':
      renderNotificationsTab();
      break;
    case 'settings':
      renderSettingsTab();
      break;
  }
}

// ============================================
// RENDER WISHES TAB
// ============================================

function renderWishesTab() {
  const content = document.getElementById('wishesContent');
  
  if (!appState.wishes || appState.wishes.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <p>📝 Ваш список желаний пуст</p>
        <p class="small-text">Нажмите кнопку ниже, чтобы добавить первое желание</p>
      </div>
    `;
    return;
  }

  content.innerHTML = appState.wishes.map(wish => `
    <div class="wish-card">
      <div class="wish-header">
        <h3>${escapeHtml(wish.title)}</h3>
        <button class="delete-wish-btn" data-wish-id="${wish.id}" title="Удалить">
          ✕
        </button>
      </div>
      
      ${wish.description ? `<p class="wish-description">${escapeHtml(wish.description)}</p>` : ''}
      
      <div class="wish-footer">
        ${wish.price ? `<span class="wish-price">💰 $${wish.price}</span>` : ''}
        <button class="gift-btn" data-wish-id="${wish.id}">
          🎁 Подарить
        </button>
      </div>
    </div>
  `).join('');

  // Re-attach event listeners
  setupEventHandlers();
}

// ============================================
// RENDER NOTIFICATIONS TAB
// ============================================

function renderNotificationsTab() {
  const content = document.getElementById('notificationsContent');
  
  if (!appState.notifications || appState.notifications.length === 0) {
    content.innerHTML = `
      <div class="empty-state">
        <p>🔔 Нет уведомлений</p>
        <p class="small-text">Здесь появятся уведомления от друзей</p>
      </div>
    `;
    return;
  }

  content.innerHTML = appState.notifications.map(notif => {
    const date = new Date(notif.created_at);
    const timeAgo = getTimeAgo(date);
    
    return `
      <div class="notification-card">
        <div class="notification-content">
          <p>${notif.message}</p>
          <span class="notification-time">${timeAgo}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// RENDER SETTINGS TAB
// ============================================

function renderSettingsTab() {
  const content = document.getElementById('settingsContent');
  
  content.innerHTML = `
    <div class="settings-group">
      <h3>🔔 Уведомления</h3>
      
      <div class="setting-item">
        <label for="notificationsToggle">
          <span>Включить уведомления</span>
        </label>
        <input 
          type="checkbox" 
          id="notificationsToggle" 
          ${appState.settings.notificationsEnabled ? 'checked' : ''}
        />
      </div>
      
      <div class="setting-item">
        <label for="birthdayToggle">
          <span>Уведомления о днях рождения друзей</span>
        </label>
        <input 
          type="checkbox" 
          id="birthdayToggle" 
          ${appState.settings.birthdayNotifications ? 'checked' : ''}
        />
      </div>
    </div>

    <div class="settings-group">
      <h3>ℹ️ О приложении</h3>
      <p class="small-text">Wishlist Mini App v1.0</p>
      <p class="small-text">Управляйте списком желаний со своими друзьями</p>
    </div>
  `;

  // Re-attach event listeners
  setupEventHandlers();
}

// ============================================
// ACTIONS
// ============================================

function showAddWishForm() {
  const title = prompt('Введите название желания:');
  if (!title) return;

  const description = prompt('Описание (опционально):');
  const priceStr = prompt('Цена (опционально):');
  const price = priceStr ? parseFloat(priceStr) : null;

  // Here you would call API to create wish
  // For now, show confirmation
  alert(`✅ Желание "${title}" будет добавлено на сервер`);
  console.log('➕ Create wish:', { title, description, price });
}

function deleteWish(wishId) {
  if (!confirm('Вы уверены?')) return;
  
  // Here you would call API to delete wish
  alert(`🗑️ Желание #${wishId} будет удалено`);
  console.log('🗑️ Delete wish:', wishId);
}

function markAsGift(wishId) {
  // Here you would call API to mark as gift
  alert(`🎁 Вы пожелали подарить это желание!`);
  console.log('🎁 Mark as gift:', wishId);
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'только что';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  
  return date.toLocaleDateString('ru-RU');
}

function showError(message) {
  console.error('❌', message);
  alert(`❌ ${message}`);
}

// ============================================
// APP START
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

console.log('📦 Script loaded successfully');