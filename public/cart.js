const stage = 'prod';
let products = [];

async function getProducts() {
  const host = stage === 'dev' ? 'http://localhost:3000' : '';
  const response = await axios.get(`${host}/products/api`);
  products = response.data.products.map(p => ({
    ...p,
    inCart: 0,
    tag: p.tag || p.name.replace(/\s+/g, '-').toLowerCase()
  }));
  populateProducts();
}

function populateProducts() {
  const container = document.querySelector('.container.bg-products .row');
  const productsHtml = products.map((product, i) => {
    const stockStatus = product.stock > 0 
      ? `<span class="badge badge-success">In Stock</span>` 
      : `<span class="badge badge-danger">Out of Stock</span>`;

    const cartButton = product.stock > 0
      ? `<div class="p-3 foodItem text-center mt-3 add-to-cart" data-index="${i}">
           <a class="text-uppercase text-white text-decoration-none">Add to cart</a>
           <i class="fa-solid fa-cart-shopping"></i>
         </div>`
      : `<div class="p-3 foodItem text-center mt-3 text-muted">
           <span class="text-uppercase rounded btn-light p-1">Unavailable</span>
         </div>`;

    return `
      <div class="d-flex justify-content-center align-items-center col-lg-3 col-md-4 col-sm-6">
        <div class="card mt-3 row">
          <div class="eachitem align-items-center p-3" >
            <div class="d-flex">
              <h5 class="mt-1">${product.name}</h5>
              <span class="ml-auto"> 
                <i class="fa-regular fa-heart wishlist-icon" role="button"
                   data-id="${product.id || product._id}" 
                   data-name="${product.name}" 
                   data-image="${product.image}" 
                   data-price="${product.price}"></i>
              </span>
            </div>
            <img src="${product.image}" alt="${product.description}" height="200" width="200" class="trigger" data-toggle="modal" data-target="#exampleModal">
            <div class="my-2">${stockStatus}</div>
            <div style="font-size: 18px; font-weight: 700">Price: BGN ${product.price.toFixed(2)}</div>
          </div>
          ${cartButton}
        </div>
      </div>`;
  });

  if (container) {
    container.innerHTML = productsHtml.join('');
    addCartActions();
    attachWishlistListeners();
  }
}




function addCartActions() {
  document.querySelectorAll('.add-to-cart').forEach(cart => {
    cart.addEventListener('click', () => {
      const index = parseInt(cart.dataset.index);
      const product = products[index];
      if (product) {
        addToCart(product);
            Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `${product.name} added to cart!`,
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
            });
      }
    });
  });
  updateCartBadge();
}

function addToCart(product) {
  const key = product.id || product._id;
  let cartItems = JSON.parse(localStorage.getItem('productsInCart')) || {};

  if (cartItems[key]) {
    cartItems[key].inCart += 1;
  } else {
    cartItems[key] = { ...product, inCart: 1 };
  }

  localStorage.setItem('productsInCart', JSON.stringify(cartItems));
  updateCartBadge();
  updateCartTotal();
}

function updateCartBadge() {
  const badge = document.querySelector('.my-cart-badge');
  const cartItems = JSON.parse(localStorage.getItem('productsInCart')) || {};
  const totalQty = Object.values(cartItems).reduce((sum, item) => sum + item.inCart, 0);
  if (badge) badge.textContent = totalQty;
}

function updateCartTotal() {
  const cartItems = JSON.parse(localStorage.getItem('productsInCart')) || {};
  const total = Object.values(cartItems).reduce((sum, item) => sum + item.inCart * item.price, 0);
  localStorage.setItem('totalCost', total);
}

function attachWishlistListeners() {
  document.querySelectorAll('.wishlist-icon').forEach(icon => {
    icon.addEventListener('click', () => {
      icon.classList.toggle('fa-regular');
      icon.classList.toggle('fa-solid');

      const { id, name, price, image } = icon.dataset;
      const wishlist = JSON.parse(localStorage.getItem("wishlistItems")) || {};

      if (!wishlist[id]) {
        wishlist[id] = { id, name, price: parseFloat(price), image };
        localStorage.setItem("wishlistItems", JSON.stringify(wishlist));
            Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `${name} added to wishlist!`,
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
            });
        updateWishlistBadge();
      } else {
          Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: `${name} is already in your wishlist.`,
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
          });
      }
    });
  });
}

function updateWishlistBadge() {
  const badge = document.querySelector('.wishlist-count');
  const wishlistItems = JSON.parse(localStorage.getItem('wishlistItems')) || {};
  const total = Object.keys(wishlistItems).length;
  if (badge) badge.textContent = total;
}

function displayCart() {
  const productContainer = document.querySelector(".products");
  const cartItems = JSON.parse(localStorage.getItem("productsInCart")) || {};

  if (!productContainer) return;

  if (Object.keys(cartItems).length === 0) {
    productContainer.innerHTML = `
      <div class="text-center py-5">
        <h4>Your cart is empty.</h4>
        <a href="/shop" class="btn btn-outline-success mt-3 mr-5">Continue Shopping</a>
      </div>`;
    return;
  }

  let cartCost = 0;
  productContainer.innerHTML = '';

  Object.entries(cartItems).forEach(([key, item]) => {
    cartCost += item.price * item.inCart;
    productContainer.innerHTML += `
      <div class="product d-flex justify-content-between align-items-center py-3 border-bottom">
        <div class="d-flex align-items-center gap-3" style="flex: 1;">
          <span class="material-icons removebtn" data-key="${key}">delete</span>
          <img src="${item.image}" width="80" height="80">
          <span>${item.name}</span>
        </div>
        <div class="price" style="flex: 1; text-align: center;">BGN ${item.price}</div>
        <div class="quantity d-flex align-items-center justify-content-center" style="flex: 1;">
          <span class="material-icons decrease" data-key="${key}">remove_circle</span>
          <span style="margin: 0 10px;" id="cartno">${item.inCart}</span>
          <span class="material-icons increase" data-key="${key}">add_circle</span>
        </div>
        <div class="total" style="flex: 1; text-align: center;">BGN ${(item.inCart * item.price).toFixed(2)}</div>
      </div>`;
  });

  localStorage.setItem('totalCost', cartCost);

  productContainer.innerHTML += `
    <div class="cartTotalContainer">
      <h4 class="cartTotalTitle">Cart Total</h4>
      <h4 class="cartTotal">BGN ${cartCost.toFixed(2)}</h4>
    </div>`;

  attachCartEventHandlers();
}

function attachCartEventHandlers() {
  let cartItems = JSON.parse(localStorage.getItem('productsInCart')) || {};

  document.querySelectorAll('.increase').forEach(btn => {
    const key = btn.dataset.key;
    btn.addEventListener('click', () => {
      cartItems[key].inCart += 1;
      localStorage.setItem('productsInCart', JSON.stringify(cartItems));
      updateCartTotal();
      updateCartBadge();
      displayCart();
    });
  });

  document.querySelectorAll('.decrease').forEach(btn => {
    const key = btn.dataset.key;
    btn.addEventListener('click', () => {
      if (cartItems[key].inCart > 1) {
        cartItems[key].inCart -= 1;
        localStorage.setItem('productsInCart', JSON.stringify(cartItems));
        updateCartTotal();
        updateCartBadge();
        displayCart();
      }
    });
  });

  document.querySelectorAll('.removebtn').forEach(btn => {
    const key = btn.dataset.key;
    btn.addEventListener('click', () => {
      delete cartItems[key];
      localStorage.setItem('productsInCart', JSON.stringify(cartItems));
      updateCartTotal();
      updateCartBadge();
      displayCart();
    });
  });
}

document.addEventListener("DOMContentLoaded", function () {
  getProducts();
  updateCartBadge();
  updateWishlistBadge();

  if (document.querySelector(".products")) {
    displayCart();
  }

  const checkoutPanel = document.getElementById('checkoutPanel');
  const closeCheckout = document.getElementById('closeCheckout');
  const checkoutTrigger = document.getElementById('checkoutPage');

  if (checkoutTrigger && checkoutPanel) {
    checkoutTrigger.addEventListener('click', () => {
      const storedTotal = parseFloat(localStorage.getItem('totalCost')) || 0;
      document.getElementById('subtotal').textContent = `BGN ${storedTotal.toFixed(2)}`;
      const finalAmount = storedTotal + 10;
      document.getElementById('amount').textContent = `BGN ${finalAmount.toFixed(2)}`;

      const cartData = JSON.parse(localStorage.getItem('productsInCart')) || {};
      const checkoutItemsDiv = document.getElementById('checkoutItems');
      checkoutItemsDiv.innerHTML = '';
      Object.values(cartData).forEach(item => {
        checkoutItemsDiv.insertAdjacentHTML('beforeend', `
          <div class="d-flex align-items-center mb-2">
            <img src="${item.image}" alt="${item.name}" width="50" height="50" class="mr-2 rounded">
            <div>
              <div><strong>${item.name}</strong></div>
              <div>Total: BGN ${(item.price * item.inCart).toFixed(2)}</div>
            </div>
          </div>`);
      });

      checkoutPanel.classList.add('active');
    });

    closeCheckout.addEventListener('click', () => {
      checkoutPanel.classList.remove('active');
    });
  }
});


