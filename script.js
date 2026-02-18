console.log('SCRIPT v1.4 LOADED - DEMO MODE');

let wishes = [
  {id:1, title:'MacBook Pro', description:'16"', price:2500},
  {id:2, title:'iPhone 16', price:2000},
  {id:3, title:'Курс Next.js', price:300},
  {id:4, title:'iPad Pro', price:1500}
];

let userId = 647859651; // Ваш Telegram ID

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render wishes
function renderWishes() {
  const content = document.getElementById('wishesContent') || document.querySelector('.container');
  if (!content) return console.error('No content!');
  
  content.innerHTML = wishes.map(w => `
    <div class="wish-card" style="padding:16px; border:1px solid #ccc; margin:10px 0; border-radius:8px;">
      <div style="display:flex; justify-content:space-between;">
        <h3 style="margin:0;">${escapeHtml(w.title)}</h3>
        <button onclick="deleteWish(${w.id})" style="background:red; color:white; border:none; border-radius:4px; padding:4px 8px;">×</button>
      </div>
      ${w.description ? `<p style="color:#666;">${escapeHtml(w.description)}</p>` : ''}
      ${w.price ? `<p style="font-weight:bold; color:green;">${w.price}₽</p>` : ''}
      <button onclick="giftWish(${w.id})" style="background:#4CAF50; color:white; border:none; border-radius:4px; padding:8px;">Подарить</button>
    </div>
  `).join('');
  console.log('Rendered', wishes.length);
}

// Delete
function deleteWish(id) {
  if (confirm('Удалить?')) {
    wishes = wishes.filter(w => w.id !== id);
    renderWishes();
  }
}

// Gift
function giftWish(id) {
  const wish = wishes.find(w => w.id === id);
  if (wish) {
    wish.gifted = true;
    renderWishes();
    alert(`🎁 "${wish.title}" подарено!`);
  }
}

// Add wish
function addWish() {
  const title = prompt('Название желания:');
  if (!title) return;
  const desc = prompt('Описание:') || '';
  const price = prompt('Цена:') || 0;
  
  wishes.unshift({
    id: Date.now(),
    title,
    description: desc,
    price: parseInt(price) || 0
  });
  renderWishes();
}

// Event handlers
document.addEventListener('click', e => {
  if (e.target.id === 'addWishBtn') addWish();
  if (e.target.dataset.tab) {
    // Tab switch
    document.querySelectorAll('[data-tab]').forEach(tab => tab.classList.remove('active'));
    e.target.classList.add('active');
  }
});

// Telegram
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  console.log('Telegram ready');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderWishes);
} else {
  renderWishes();
}
console.log('READY');
