document.addEventListener('DOMContentLoaded', function () {
  displayWishlist();
  updateWishlistCount();
});

function displayWishlist() {
  const wishlistItems = JSON.parse(localStorage.getItem("wishlistItems")) || {};
  const wishlistContainer = document.querySelector(".wishlist-container");

  if (!wishlistContainer) return;

  if (Object.keys(wishlistItems).length === 0) {
    wishlistContainer.innerHTML = `
      <div class="text-center py-5">
        <h4>Your wishlist is empty.</h4>
        <a href="/shop" class="btn btn-outline-success mt-3">Start Shopping</a>
      </div>`;
    return;
  }

  wishlistContainer.innerHTML = '';

  Object.values(wishlistItems).forEach(item => {
    wishlistContainer.innerHTML += `
      <div class="wishlist-item d-flex card m-3 flex-row justify-content-center align-items-center border-bottom py-3">
        <div class=" justify-content-between w-50 align-items-center gap-3">
          <img src="${item.image}" alt="${item.name}" width="80" height="80">
          <div class="align-items-center ">
            <h5>${item.name}</h5>
            <p class="mb-1">Price: BGN ${parseFloat(item.price).toFixed(2)}</p>
          </div>
        </div>
        <div>
          <button class="btn border-dark btn-white btn-md remove-wishlist" data-id="${item.id}">Remove</button>
          <button class="btn btn-success btn-md move-to-cart" data-id="${item.id}">Move to Cart</button>
        </div>
      </div>`;
  });

  attachWishlistItemEvents();
}

function attachWishlistItemEvents() {
  const wishlistItems = JSON.parse(localStorage.getItem("wishlistItems")) || {};
  const cartItems = JSON.parse(localStorage.getItem("productsInCart")) || {};

  document.querySelectorAll('.remove-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      delete wishlistItems[id];
      localStorage.setItem("wishlistItems", JSON.stringify(wishlistItems));
      displayWishlist();
      updateWishlistCount();
    });
  });

  document.querySelectorAll('.move-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const item = wishlistItems[id];
      if (!item) return;

      if (cartItems[id]) {
        cartItems[id].inCart += 1;
      } else {
        cartItems[id] = { ...item, inCart: 1 };
      }

      delete wishlistItems[id];
      localStorage.setItem("productsInCart", JSON.stringify(cartItems));
      localStorage.setItem("wishlistItems", JSON.stringify(wishlistItems));
      updateWishlistCount();
      updateCartBadge(); // From cart.js
      displayWishlist();
      alert(`${item.name} moved to cart!`);
    });
  });
}

function updateWishlistCount() {
  const wishlistItems = JSON.parse(localStorage.getItem("wishlistItems")) || {};
  const badge = document.querySelector(".wishlist-count");
  const total = Object.keys(wishlistItems).length;
  if (badge) badge.textContent = total;
}
