const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const db = require('../config/db');

// === API: Return JSON for frontend/products.js ===
exports.getAllProductsJson = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products');
    const productsWithParsedPrice = products.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
    res.json({ products: productsWithParsedPrice });
  } catch (err) {
    console.error('Error fetching all products JSON:', err);
    return res.status(500).json({ message: "Failed to load products" });
  }
};

// === View All Products ===
exports.viewProducts = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products');
    res.render('admin/products', {
      products,
      layout: 'admin',
      showSidebar: true,
      admin: req.session.admin
    });
  } catch (err) {
    console.error('Error viewing products:', err);
    res.render('admin/products', {
      products: [],
      layout: 'admin',
      showSidebar: true,
      admin: req.session.admin,
      error: 'Failed to load products'
    });
  }
};

// === Add New Product ===
exports.addProduct = async (req, res) => {
  console.log("Request file object:", req.file);
  const { name, price, stock, description } = req.body;
  const image = req.file ? req.file.filename : null;

  if (!image) {
    return res.status(400).send('Image upload failed.');
  }

  try {
    await db.query(
      'INSERT INTO products (name, price, stock, description, image) VALUES (?, ?, ?, ?, ?)',
      [name, price, stock, description, image]
    );
    res.redirect('/admin/products');
  } catch (err) {
    console.error('Error adding product:', err);
    res.redirect('/admin/products?error=Add+product+failed');
  }
};

// === Show Edit Product Form ===
exports.editProductPage = async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db.query('SELECT * FROM products WHERE id = ?', [id]);

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
    return res.redirect('/admin/products?error=Product+load+failed');
  }
};

// === Handle Edit Form Submission (With Optional Image Update) ===
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price, description, stock } = req.body;
  const image = req.file ? req.file.filename : null;

  try {
    const queryParams = [name, price, description, stock];
    let sql = 'UPDATE products SET name = ?, price = ?, description = ?, stock = ?';

    if (image) {
      sql += ', image = ?';
      queryParams.push(image);
    }

    sql += ' WHERE id = ?';
    queryParams.push(id);

    await db.query(sql, queryParams);

    res.redirect('/admin/products?success=Product+updated');
  } catch (err) {
    console.error('Error updating product:', err);
    return res.redirect('/admin/products?error=Update+failed');
  }
};

// === Delete Product ===
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    res.redirect('/admin/products');
  } catch (err) {
    console.error('Error deleting product:', err);
    res.redirect('/admin/products?error=Delete+failed');
  }
};
