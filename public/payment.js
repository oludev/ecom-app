document.addEventListener("DOMContentLoaded", () => {
  const host = stage === 'dev' ? 'http://localhost:3000' : '';
  const checkoutBtn = document.getElementById("checkoutBtn");
  const publicKey = window.FLW_PUBLIC_KEY || checkoutBtn?.dataset.publicKey;


  if (!checkoutBtn || !publicKey) return;

  const user = window.user || {};
  if (!user.name || !user.email) {
    alert("User info missing. Please reload or log in again.");
    return;
  }

  checkoutBtn.addEventListener("click", async () => {
    console.log("Proceed to Pay clicked");

    if (typeof FlutterwaveCheckout !== 'function') {
      alert("Payment library not loaded. Please wait a few seconds and try again.");
      return;
    }

    const cartProducts = getCartProducts(); 

    try {
      const response = await axios.post(`${host}/checkout`, {
        products: cartProducts,
       user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          firstname: user.firstname,
          lastname: user.lastname,
          username: user.username
        }
      });

      const { tx_ref, amount } = response.data;

      console.log("Checkout response:", response.data); 
      
      FlutterwaveCheckout({
        public_key: publicKey,
        tx_ref,
        amount,
        currency: "BGN",
        payment_options: "card,banktransfer",
        redirect_url: `${host}/checkout/success`,
        customer: {
          email: user.email,
          name: user.name,
        },
        customizations: {
          title: "9jafrozenfoods",
          description: "Payment for items in cart",
          logo: "/images/ff-logo-1.png",
        }
      });

      // Clear localStorage after initiating payment
      localStorage.removeItem('productsInCart');
      localStorage.removeItem('totalCost');
      localStorage.removeItem('cartNumbers');

      const badge = document.querySelector('.my-cart-badge');
      if (badge) badge.textContent = '0';

    } catch (error) {
      console.error("Payment init failed:", error);
      alert("Payment failed. Please try again.");
    }
  });

  function getCartProducts() {
    try {
      const stored = localStorage.getItem("productsInCart");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Object.values(parsed).map(p => ({
        id: p.id,
        inCart: p.inCart
      }));
    } catch (err) {
      console.error("Error reading cart from localStorage:", err);
      return [];
    }
  }
});
