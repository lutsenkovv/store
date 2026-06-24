const productsContainer = document.getElementById("products-container");
const skeletonContainer = document.getElementById("skeleton-container");
const categoryTabsContainer = document.getElementById("category-tabs");

let allProducts = [];
let cart = JSON.parse(localStorage.getItem("shopCart")) || {};
let wishlist = JSON.parse(localStorage.getItem("shopWishlist")) || [];

// Читання стану з sessionStorage (щоб зберегти після F5)
let currentCategory = sessionStorage.getItem("activeCategory") || "all";
let searchQuery = sessionStorage.getItem("activeSearch") || "";
let currentSort = sessionStorage.getItem("activeSort") || "default";
let customOnly = sessionStorage.getItem("activeCustomFilter") === "true";

const ITEMS_PER_PAGE = 12;
let visibleCount = ITEMS_PER_PAGE;
const ORIGINAL_TITLE = document.title;

const categoryEmojis = {
  Зошити: "📓",
  Ручки: "🖊️",
  Сублімація: "🎨",
  Олівці: "✏️",
  Блокноти: "📔",
};

window.onscroll = function () {
  const scrollBtn = document.getElementById("scrollTopBtn");
  if (
    document.body.scrollTop > 300 ||
    document.documentElement.scrollTop > 300
  ) {
    scrollBtn.style.display = "flex";
  } else {
    scrollBtn.style.display = "none";
  }
};

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message, isError = false) {
  const toastElement = document.getElementById("liveToast");
  const toastMessage = document.getElementById("toast-message");
  toastElement.className = `toast align-items-center text-white border-0 shadow-lg rounded-pill ${isError ? "bg-danger" : "bg-success"}`;
  toastMessage.innerText = message;
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
}

function loadClientData() {
  const savedData = JSON.parse(localStorage.getItem("clientData"));
  if (savedData) {
    document.getElementById("client-name").value = savedData.name || "";
    document.getElementById("client-phone").value = savedData.phone || "";
    document.getElementById("client-city").value = savedData.city || "";
    document.getElementById("client-branch").value = savedData.branch || "";
  }
}

// Завантаження з імітацією затримки для перевірки скелетону (опціонально)
async function fetchProducts() {
  try {
    const response = await fetch("products.json");
    allProducts = await response.json();

    // Ховаємо скелетон, показуємо контейнер товарів
    skeletonContainer.classList.add("d-none");
    productsContainer.classList.remove("d-none");

    // Відновлення UI з sessionStorage
    if (searchQuery)
      document.getElementById("search-input").value = searchQuery;
    if (currentSort !== "default")
      document.getElementById("sort-select").value = currentSort;
    if (customOnly) document.getElementById("custom-filter").checked = true;

    renderCategoryTabs();
    updateDisplay();
    updateWishlistCounter();
  } catch (error) {
    console.error("Помилка:", error);
    skeletonContainer.classList.add("d-none");
    productsContainer.classList.remove("d-none");
    if (productsContainer)
      productsContainer.innerHTML =
        '<p class="text-danger text-center mt-5">Не вдалося завантажити товари.</p>';
  }
}

function renderCategoryTabs() {
  if (!categoryTabsContainer) return;
  const categories = [...new Set(allProducts.map((p) => p.category))];

  let tabsHTML = `<button class="btn ${currentCategory === "all" ? "btn-dark" : "btn-outline-dark"} category-btn" onclick="handleCategory('all', this)">Всі товари 🌟</button>`;

  categories.forEach((category) => {
    const emoji = categoryEmojis[category] || "📦";
    const btnClass =
      currentCategory === category ? "btn-dark" : "btn-outline-dark";
    tabsHTML += `<button class="btn ${btnClass} category-btn" onclick="handleCategory('${category}', this)">${category} ${emoji}</button>`;
  });
  categoryTabsContainer.innerHTML = tabsHTML;
}

function handleCategory(selectedCategory, clickedButton) {
  const allButtons = document.querySelectorAll(".category-btn");
  allButtons.forEach((btn) => {
    btn.classList.remove("btn-dark");
    btn.classList.add("btn-outline-dark");
  });
  clickedButton.classList.remove("btn-outline-dark");
  clickedButton.classList.add("btn-dark");

  currentCategory = selectedCategory;
  sessionStorage.setItem("activeCategory", currentCategory);
  visibleCount = ITEMS_PER_PAGE;
  updateDisplay();
}

function handleSearch() {
  searchQuery = document.getElementById("search-input").value.toLowerCase();
  sessionStorage.setItem("activeSearch", searchQuery);
  visibleCount = ITEMS_PER_PAGE;
  updateDisplay();
}

function resetSearch() {
  document.getElementById("search-input").value = "";
  searchQuery = "";
  sessionStorage.removeItem("activeSearch");
  visibleCount = ITEMS_PER_PAGE;
  updateDisplay();
}

function handleSort() {
  currentSort = document.getElementById("sort-select").value;
  sessionStorage.setItem("activeSort", currentSort);
  visibleCount = ITEMS_PER_PAGE;
  updateDisplay();
}

function handleCustomFilter() {
  customOnly = document.getElementById("custom-filter").checked;
  sessionStorage.setItem("activeCustomFilter", customOnly);
  visibleCount = ITEMS_PER_PAGE;
  updateDisplay();
}

function updateDisplay() {
  let processedProducts = [...allProducts];

  if (currentCategory !== "all") {
    processedProducts = processedProducts.filter(
      (p) => p.category === currentCategory,
    );
  }
  if (customOnly) {
    processedProducts = processedProducts.filter((p) => p.isCustomizable);
  }
  if (searchQuery) {
    processedProducts = processedProducts.filter(
      (p) =>
        p.title.toLowerCase().includes(searchQuery) ||
        p.description.toLowerCase().includes(searchQuery),
    );
  }

  if (currentSort === "price-asc") {
    processedProducts.sort((a, b) => a.price - b.price);
  } else if (currentSort === "price-desc") {
    processedProducts.sort((a, b) => b.price - a.price);
  }

  renderProducts(processedProducts);
}

function renderProducts(products) {
  productsContainer.innerHTML = "";
  const loadMoreBtn = document.getElementById("load-more-btn");

  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted fs-5 mb-3">За вашим запитом нічого не знайдено 😔</p>
        <button class="btn btn-outline-dark rounded-pill px-4" onclick="resetSearch()">Скинути пошук</button>
      </div>`;
    if (loadMoreBtn) loadMoreBtn.classList.add("d-none");
    return;
  }

  const productsToShow = products.slice(0, visibleCount);

  productsToShow.forEach((product) => {
    const customBadge = product.isCustomizable
      ? '<span class="badge bg-warning text-dark mb-2 px-2 py-1 position-absolute top-0 start-0 m-3 z-3">Під принт 🎨</span>'
      : "";

    const outOfStockOverlay = !product.inStock
      ? '<div class="position-absolute top-0 start-0 w-100 h-100 bg-white opacity-50 z-2"></div><span class="badge bg-dark position-absolute top-50 start-50 translate-middle z-3 px-3 py-2 fs-6">Немає в наявності</span>'
      : "";
    const btnText = product.inStock ? "В кошик" : "Немає";
    const btnClass = product.inStock ? "btn-buy" : "btn btn-secondary disabled";
    const btnAction = product.inStock
      ? `onclick="addToCart('${product.id}')"`
      : "";
    const filterStyle = !product.inStock ? "filter: grayscale(100%);" : "";

    const isWished = wishlist.includes(product.id);
    const heartClass = isWished ? "active" : "";
    const heartIcon = isWished ? "❤️" : "🤍";

    const cardHTML = `
      <div class="col-md-4 mb-4">
          <div class="card h-100">
              ${outOfStockOverlay}
              ${customBadge}
              <button class="heart-btn ${heartClass} z-3" onclick="toggleWishlist('${product.id}', event)">${heartIcon}</button>
              
              <img src="${product.image}" loading="lazy" class="card-img-top" style="height: 250px; object-fit: cover; cursor:pointer; ${filterStyle}" onclick="openProductModal('${product.id}')" onerror="this.src='https://via.placeholder.com/250?text=Фото+відсутнє'">
              
              <div class="card-body d-flex flex-column p-4 z-1">
                  <h5 class="card-title" style="cursor:pointer;" onclick="openProductModal('${product.id}')">${product.title}</h5>
                  <p class="card-text text-muted small mb-3">${product.category}</p>
                  <p class="card-text text-truncate mb-4">${product.description}</p>
                  <div class="mt-auto d-flex justify-content-between align-items-center">
                      <span class="price-tag">${product.price} ₴</span>
                      <button class="${btnClass}" ${btnAction}>${btnText}</button>
                  </div>
              </div>
          </div>
      </div>
    `;
    productsContainer.innerHTML += cardHTML;
  });

  if (loadMoreBtn) {
    if (visibleCount < products.length) loadMoreBtn.classList.remove("d-none");
    else loadMoreBtn.classList.add("d-none");
  }
}

function loadMore() {
  visibleCount += ITEMS_PER_PAGE;
  updateDisplay();
}

// --- УЛЮБЛЕНЕ ---
function toggleWishlist(productId, event) {
  event.stopPropagation();
  const index = wishlist.indexOf(productId);
  if (index === -1) {
    wishlist.push(productId);
    showToast("❤️ Додано в улюблене");
  } else {
    wishlist.splice(index, 1);
    showToast("🤍 Видалено з улюбленого");
  }
  localStorage.setItem("shopWishlist", JSON.stringify(wishlist));
  updateWishlistCounter();
  updateDisplay();
  renderWishlistModal();
}

function updateWishlistCounter() {
  const wishBtn = document.getElementById("wishlist-btn");
  if (wishBtn) {
    wishBtn.innerText = `🤍 (${wishlist.length})`;
    if (wishlist.length > 0) wishBtn.classList.add("active");
    else wishBtn.classList.remove("active");
  }
}

function renderWishlistModal() {
  const container = document.getElementById("wishlist-items");
  if (!container) return;
  container.innerHTML = "";

  if (wishlist.length === 0) {
    container.innerHTML =
      '<p class="text-muted text-center py-4">Список бажань поки порожній.</p>';
    return;
  }

  wishlist.forEach((id) => {
    const product = allProducts.find((p) => p.id === id);
    if (product) {
      container.innerHTML += `
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
            <div>
                <h6 class="mb-1">${product.title}</h6>
                <small class="text-dark fw-bold">${product.price} ₴</small>
            </div>
            <div>
                <button class="btn btn-sm btn-dark me-2" onclick="addToCart('${product.id}')" ${!product.inStock ? "disabled" : ""}>В кошик</button>
                <button class="btn btn-sm btn-outline-danger" onclick="toggleWishlist('${product.id}', event)">✕</button>
            </div>
        </div>
      `;
    }
  });
}

// --- Web Share API ---
async function shareProduct(title, desc) {
  const shareData = {
    title: title,
    text: desc,
    url: window.location.href, // В майбутньому можна додати ?product=id
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("🔗 Посилання скопійовано!", false);
    }
  } catch (err) {
    console.log("Шеринг скасовано або не підтримується");
  }
}

// --- Детальний перегляд ---
function openProductModal(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  // Динамічний Title
  document.title = `${product.title} | У Маринки`;

  document.getElementById("productModalLabel").innerText = product.title;

  const customInfo = product.isCustomizable
    ? `<div class="alert alert-warning mt-3">✨ <b>Зверніть увагу:</b> Це кастомний товар. При оформленні замовлення в кошику ви зможете вказати текст або побажання для сублімації!</div>`
    : "";

  const btnText = product.inStock ? "ДОДАТИ В КОШИК" : "НЕМАЄ В НАЯВНОСТІ";
  const btnState = product.inStock ? "" : "disabled";

  const modalBody = `
    <div class="row">
      <div class="col-md-6 mb-3 text-center" style="min-height: 300px;">
        <img src="${product.image}" class="img-fluid rounded-4 h-100" style="object-fit: cover; max-height: 400px;" onerror="this.src='https://via.placeholder.com/400?text=Фото+відсутнє'">
      </div>
      <div class="col-md-6 d-flex flex-column">
        <p class="text-muted mb-1">Категорія: ${product.category}</p>
        <h3 class="text-dark fw-bold my-2">${product.price} грн</h3>
        <p class="mt-3"><b>Опис:</b><br>${product.description}</p>
        ${customInfo}
        <div class="mt-auto pt-3 d-flex gap-2">
            <button class="btn btn-dark btn-lg flex-grow-1 rounded-3 fw-bold" onclick="addToCart('${product.id}')" ${btnState}>${btnText}</button>
            <button class="btn-share" onclick="shareProduct('${product.title}', '${product.description}')" title="Поділитися">📤</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("product-modal-body").innerHTML = modalBody;
  const pModal = new bootstrap.Modal(document.getElementById("productModal"));
  pModal.show();
}

// Повертаємо Title назад при закритті модалки
document
  .getElementById("productModal")
  .addEventListener("hidden.bs.modal", function () {
    document.title = ORIGINAL_TITLE;
  });

// --- Кошик ---
function addToCart(productId) {
  if (cart[productId]) cart[productId] += 1;
  else cart[productId] = 1;
  localStorage.setItem("shopCart", JSON.stringify(cart));
  updateCartCounter();

  const cartBtn = document.getElementById("cart-btn");
  cartBtn.classList.remove("pop-animation");
  void cartBtn.offsetWidth;
  cartBtn.classList.add("pop-animation");

  showToast("✅ Товар додано до кошика!");
}

function changeQuantity(productId, delta) {
  if (cart[productId]) {
    cart[productId] += delta;
    if (cart[productId] <= 0) delete cart[productId];
    localStorage.setItem("shopCart", JSON.stringify(cart));
    updateCartCounter();
    renderCartModal();
  }
}

function removeFromCart(productId) {
  delete cart[productId];
  localStorage.setItem("shopCart", JSON.stringify(cart));
  updateCartCounter();
  renderCartModal();
}

function updateCartCounter() {
  const cartBtn = document.getElementById("cart-btn");
  if (!cartBtn) return;
  const totalItems = Object.values(cart).reduce(
    (sum, current) => sum + current,
    0,
  );
  cartBtn.innerText = `Кошик (${totalItems})`;
}

const cartItemsContainer = document.getElementById("cart-items");
const cartTotalElement = document.getElementById("cart-total");
const sublimationContainer = document.getElementById(
  "sublimation-field-container",
);

function renderCartModal() {
  if (!cartItemsContainer) return;
  cartItemsContainer.innerHTML = "";
  let totalSum = 0;
  let hasCustomizableItem = false;

  if (Object.keys(cart).length === 0) {
    cartItemsContainer.innerHTML =
      '<p class="text-muted text-center py-4">Кошик поки що порожній 🤍</p>';
    cartTotalElement.innerText = "0";
    if (sublimationContainer) sublimationContainer.classList.add("d-none");
    return;
  }

  for (const [productId, quantity] of Object.entries(cart)) {
    const product = allProducts.find((p) => p.id === productId);
    if (product) {
      if (product.isCustomizable) hasCustomizableItem = true;
      const subtotal = product.price * quantity;
      totalSum += subtotal;

      const itemHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
            <div style="flex: 1;">
                <h6 class="mb-1 text-truncate" style="max-width: 250px;">${product.title}</h6>
                <small class="text-muted">${product.price} грн</small>
            </div>
            <div class="d-flex align-items-center">
                <button class="btn btn-sm btn-outline-secondary me-2 rounded-circle" style="width: 30px; height: 30px;" onclick="changeQuantity('${product.id}', -1)">-</button>
                <span class="fw-bold mx-1" style="width: 20px; text-align: center;">${quantity}</span>
                <button class="btn btn-sm btn-outline-secondary ms-2 me-4 rounded-circle" style="width: 30px; height: 30px;" onclick="changeQuantity('${product.id}', 1)">+</button>
                <span class="fw-bold me-3" style="width: 70px; text-align: right;">${subtotal} ₴</span>
                <button class="btn btn-sm btn-outline-danger px-2" onclick="removeFromCart('${product.id}')" title="Видалити">✕</button>
            </div>
        </div>
      `;
      cartItemsContainer.innerHTML += itemHTML;
    }
  }

  cartTotalElement.innerText = totalSum;
  if (sublimationContainer) {
    if (hasCustomizableItem) sublimationContainer.classList.remove("d-none");
    else sublimationContainer.classList.add("d-none");
  }
}

// Оновлення даних клієнта при кожному відкритті кошика
const cartModalEl = document.getElementById("cartModal");
if (cartModalEl) {
  cartModalEl.addEventListener("show.bs.modal", () => {
    loadClientData();
    renderCartModal();
  });
}

// --- Відправка замовлення ---
async function sendOrder() {
  const BOT_TOKEN = "8866679269:AAF2eoqRVCqTkym8hih91PAXNs4k9pu1u0c";
  const CHAT_ID = "826800769";

  const name = document.getElementById("client-name").value.trim();
  const phone = document.getElementById("client-phone").value.trim();
  const city = document.getElementById("client-city").value.trim();
  const branch = document.getElementById("client-branch").value.trim();
  const printText = document.getElementById("client-print")
    ? document.getElementById("client-print").value.trim()
    : "";

  // Валідація телефону (мінімум 10 символів, дозволені цифри, +, -, дужки, пробіли)
  const phoneRegex = /^[\d\+\(\)\-\s]{10,}$/;

  if (!name || !phone || !city || !branch) {
    showToast("⚠️ Будь ласка, заповніть всі поля для доставки!", true);
    return;
  }

  if (!phoneRegex.test(phone)) {
    showToast("⚠️ Введіть коректний номер телефону!", true);
    return;
  }

  if (Object.keys(cart).length === 0) {
    showToast("⚠️ Ваш кошик порожній!", true);
    return;
  }

  let message = `🛒 <b>НОВЕ ЗАМОВЛЕННЯ!</b>\n\n👤 Клієнт: ${name}\n📞 Телефон: ${phone}\n📍 Доставка: м. ${city}, Відділення №${branch}\n`;
  if (
    sublimationContainer &&
    !sublimationContainer.classList.contains("d-none") &&
    printText
  ) {
    message += `🎨 <b>Принт:</b> ${printText}\n`;
  }
  message += `\n<b>Товари:</b>\n`;

  let totalSum = 0;
  for (const [productId, quantity] of Object.entries(cart)) {
    const product = allProducts.find((p) => p.id === productId);
    if (product) {
      message += `- ${product.title} (${quantity} шт.) = ${product.price * quantity} грн\n`;
      totalSum += product.price * quantity;
    }
  }
  message += `\n💰 <b>Всього до сплати: ${totalSum} грн</b>`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      },
    );

    if (response.ok) {
      showToast("🎉 Дякуємо! Ваше замовлення успішно прийнято.");
      localStorage.setItem(
        "clientData",
        JSON.stringify({ name, phone, city, branch }),
      );
      cart = {};
      localStorage.removeItem("shopCart");
      if (document.getElementById("client-print"))
        document.getElementById("client-print").value = "";
      updateCartCounter();
      renderCartModal();
      const cartModal = bootstrap.Modal.getInstance(
        document.getElementById("cartModal"),
      );
      if (cartModal) cartModal.hide();
    } else {
      showToast("❌ Сталася помилка при відправці. Спробуйте пізніше.", true);
    }
  } catch (error) {
    console.error("Помилка відправки:", error);
    showToast("❌ Сталася помилка. Перевірте з'єднання з інтернетом.", true);
  }
}

updateCartCounter();
fetchProducts();
