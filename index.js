const port = 4000;
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();

// Define allowed origins
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,POST,PUT,PATCH,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// Database connection
mongoose.connect('mongodb+srv://bl4ckdr46on0:PSb2vT2wtNoHyJar@webapplication.jqlva.mongodb.net/?retryWrites=true&w=majority&appName=webapplication/E-comercial');

// Image storage Engine
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage: storage });

// Create upload endpoint for images
app.use('/images', express.static('upload/images'));

app.post('/upload', upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    Image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

// Schema for Product
const Product = mongoose.model('Product', {
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  new_price: { type: Number, required: true },
  old_price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  avilable: { type: Boolean, default: true },
});

// Add product
app.post('/addproduct', async (req, res) => {
  let products = await Product.find({});
  let id;

  if (products.length > 0) {
    let lastProduct = products[products.length - 1];
    id = lastProduct.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log(product);
  await product.save();
  console.log('saved');
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Remove product
app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log('removed');
  res.json({
    success: true,
    name: req.body.name,
  });
});

// Get all products
app.get('/allproduct', async (req, res) => {
  let products = await Product.find({});
  console.log('All Product Fetched');
  res.send(products);
});

// Get a single product
app.get('/singleproduct', async (req, res) => {
  let product = await Product.findOne({});
  console.log('single product fetched');
  res.send(product);
});

// Sort products (currently does nothing)
app.get('/sort', async (req, res) => {
  let products = await Product.find({}).sort({});
  console.log('All Products sorted');
  res.send(products);
});

// Cart items
app.get('/cart', async (req, res) => {
  try {
    let cart = await Product.find({ addToCart: true });
    console.log('Cart items fetched');
    res.send(cart);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching cart items');
  }
});

// Liked items
app.get('/like', async (req, res) => {
  try {
    let likedItems = await Product.find({ likedToCart: true });
    console.log('Liked items fetched');
    res.send(likedItems);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error in fetching liked items');
  }
});

// Schema for Users
const User = mongoose.model('Users', {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  cartData: { type: Object },
  date: { type: Date, default: Date.now },
});

// Register user
app.post('/signup', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        errors: 'A user with this email address already exists.',
      });
    }

    const cartData = Array.from({ length: 300 }, () => 0);

    const newUser = new User({
      name: username,
      email,
      password,
      cartData,
    });

    await newUser.save();

    const data = { user: { id: newUser._id } };

    const token = jwt.sign(data, 'secret_ecom');

    res.status(201).json({
      success: true,
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
      token,
      message: 'User registered successfully',
    });
  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while registering the user',
    });
  }
});

// Login user
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, errors: 'Invalid email' });
    }
    const passwordMatch = password === user.password;

    if (!passwordMatch) {
      return res.status(401).json({ success: false, errors: 'Wrong password' });
    }
    const data = { user: { id: user.id } };

    const token = jwt.sign(data, 'secret_ecom', { expiresIn: '1h' });

    res.status(200).json({ success: true, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, errors: 'An error occurred during login' });
  }
});

// New collection
app.get('/newcollection', async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  console.log('New collection fetched');
  res.send(newcollection);
});

// Popular in women
app.get('/popularinwomen', async (req, res) => {
  let products = await Product.find({ category: 'women' });
  let popular_in_women = products.slice(0, 4);
  console.log('Popular in women fetched');
  res.send(popular_in_women);
});

// Middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    res.status(401).send({ error: 'Please authenticate using a valid token' });
  } else {
    try {
      const data = jwt.verify(token, 'secret_ecom');
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ errors: 'Please authenticate using a valid token' });
    }
  }
};

// Add to cart
app.post('/addtocart', fetchUser, async (req, res) => {
  console.log('Added', req.body.itemId);
  let userData = await User.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await User.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Added');
});

// Remove from cart
app.post('/removefromcart', fetchUser, async (req, res) => {
  console.log('removed', req.body.itemId);
  let userData = await User.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await User.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send('Removed');
});

// Get cart data
app.post('/getcart', fetchUser, async (req, res) => {
  console.log('Getcart');
  let userData = await User.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

app.listen(port, (error) => {
  if (!error) {
    console.log('SERVER RUNNING ON PORT ' + port);
  } else {
    console.log('Error :' + error);
  }
});
