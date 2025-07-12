const { productList } = require('./products'); // Assuming products.js is in the same directory
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

// Import the unified promise-based DB connection
const db = require('./config/db'); // Adjust path if seedProducts.js is not in a subdirectory relative to config

async function seedProducts() {
  try {
    for (const product of productList) {
      // Use the promise-based db.query directly
      await db.query(
        'INSERT INTO products (name, description, price, image) VALUES (?, ?, ?, ?)',
        [product.name, product.description, product.price, product.image]
      );
    }
    console.log('Products seeded successfully');
    process.exit(0); // Exit with success code
  } catch (err) {
    console.error('Error seeding products:', err);
    process.exit(1); // Exit with error code
  }
}

seedProducts();