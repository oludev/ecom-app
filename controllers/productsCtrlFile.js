const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const db = require('../config/db'); // Ensure this points to your unified promise-based db.js

exports.getAllProductsJson = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products');

    // IMPORTANT: Map through products and convert price to a float
    const productsWithParsedPrice = products.map(product => ({
      ...product,
      price: parseFloat(product.price) // Convert price string to a float
    }));

    res.json({ products: productsWithParsedPrice }); // Send the updated products array

  } catch (err) {
    console.error('Error fetching all products JSON:', err);
    return res.status(500).json({ message: "Failed to load products" });
  }
};

exports.viewProducts = async (req, res) => { // Made async
  try {
    const [products] = await db.query('SELECT * FROM products'); // Converted to await

    res.render('admin/products', {
      products,
      layout: 'admin',
      showSidebar: true,
      admin: req.session.admin
    });
  } catch (err) {
    console.error('Error viewing products:', err);
    // You might want to render an error page or redirect
    res.render('admin/products', {
      products: [], // Provide empty array on error
      layout: 'admin',
      showSidebar: true,
      admin: req.session.admin,
      error: 'Failed to load products'
    });
  }
};


exports.addProduct = async (req, res) => { // Made async
  console.log("Request file object:", req.file); // Debug log
  const { name, price, stock, description } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  if (!image) {
    return res.status(400).send('Image upload failed.');
  }

  try {
    await db.query('INSERT INTO products (name, price, stock, description, image) VALUES (?, ?, ?, ?, ?)',
      [name, price, stock, description, image]); // Converted to await
    res.redirect('/admin/products');
  } catch (err) {
    console.error('Error adding product:', err);
    res.redirect('/admin/products?error=Add+product+failed'); // Redirect with error
  }
};


// Show edit form
exports.editProductPage = async (req, res) => { // Made async
  const { id } = req.params;

  try {
    const [results] = await db.query('SELECT * FROM products WHERE id = ?', [id]); // Converted to await

    if (results.length === 0) {
      return res.redirect('/admin/products?error=Product+not+found');
    }

    res.render('admin/editProduct', {
      layout: 'admin',
      showSidebar: true,
      admin: req.session.admin,
      product: results[0]
    });
  } catch (err) {
    console.error('Error fetching product for edit:', err);
    return res.redirect('/admin/products?error=Product+load+failed'); // Redirect with error
  }
};

// Handle edit form submission
exports.updateProduct = async (req, res) => { // Made async
  const { id } = req.params;
  const { name, price, description, stock } = req.body;

  try {
    await db.query( // Converted to await
      'UPDATE products SET name = ?, price = ?, description = ?, stock = ? WHERE id = ?',
      [name, price, description, stock, id]
    );
    res.redirect('/admin/products?success=Product+updated');
  } catch (err) {
    console.error('Error updating product:', err);
    return res.redirect('/admin/products?error=Update+failed');
  }
};


exports.deleteProduct = async (req, res) => { // Made async
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = ?', [id]); // Converted to await
    res.redirect('/admin/products');
  } catch (err) {
    console.error('Error deleting product:', err);
    res.redirect('/admin/products?error=Delete+failed'); // Redirect with error
  }
};