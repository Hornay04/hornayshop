/* app.js
   Client-side logic: localStorage-based mini backend.
   Later: replace localStorage calls with fetch() to your PHP endpoints.
*/

/* ---------- Storage keys ---------- */
const LS_USERS = 'dl_users_v1';
const LS_PRODUCTS = 'dl_products_v1';
const LS_SESSION = 'dl_session_v1';
const LS_CART = 'dl_cart_v1';

/* ---------- Helpers ---------- */
function readLS(key){ try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){ return null; } }
function writeLS(key,val){ localStorage.setItem(key, JSON.stringify(val)); }
function randId(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,10); }
function money(n){ return '$' + Number(n).toFixed(2); }

/* ---------- Password hashing (client-side) ----------
   Using Web Crypto - produces hex SHA-256. On server, always salt+hash properly!
*/
async function hashPass(password){
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b => b.toString(16).padStart(2,'0')).join('');
}

/* ---------- Users (signup/login) ---------- */
async function signup({name,email,password}){
  const users = readLS(LS_USERS) || [];
  if(users.find(u=>u.email===email)) throw new Error('Email already registered');
  const hashed = await hashPass(password);
  const user = { id: randId('user'), name, email, password: hashed, created: Date.now() };
  users.push(user);
  writeLS(LS_USERS, users);

  // SERVER: send POST /api/signup.php with {name,email,password_hash}
  return user;
}
async function login({email,password}){
  const users = readLS(LS_USERS) || [];
  const hashed = await hashPass(password);
  const user = users.find(u=>u.email===email && u.password===hashed);
  if(!user) throw new Error('Invalid credentials');
  writeLS(LS_SESSION, { userId: user.id, since: Date.now() });
  return user;
}
function logout(){
  localStorage.removeItem(LS_SESSION);
  // keep cart and products
}

/* ---------- Session helpers ---------- */
function currentUser(){
  const sess = readLS(LS_SESSION);
  if(!sess) return null;
  const users = readLS(LS_USERS) || [];
  return users.find(u=>u.id===sess.userId) || null;
}

/* ---------- Products ---------- */
function seedProductsIfEmpty(){
  const p = readLS(LS_PRODUCTS) || [];
  if(p.length === 0){
    const sample = [
      { id: randId('prod'), title:'Pro Photo Presets Pack', price:9.99, desc:'10 professional Lightroom presets', image:'https://picsum.photos/seed/preset/600/400', sellerId:'system', created:Date.now() },
      { id: randId('prod'), title:'Minimal Website Template (HTML)', price:14.00, desc:'A clean responsive HTML template', image:'https://picsum.photos/seed/template/600/400', sellerId:'system', created:Date.now() },
      { id: randId('prod'), title:'E-book: Productivity Hacks', price:4.50, desc:'Short e-book on boosting focus', image:'https://picsum.photos/seed/ebook/600/400', sellerId:'system', created:Date.now() }
    ];
    writeLS(LS_PRODUCTS, sample);
  }
}
function getProducts(){ return readLS(LS_PRODUCTS) || []; }
function addProduct({title,price,desc,image, sellerId}){
  const products = getProducts();
  const p = { id: randId('prod'), title, price: Number(price), desc, image: image || 'https://picsum.photos/seed/'+Math.random()+'/600/400', sellerId, created: Date.now() };
  products.unshift(p);
  writeLS(LS_PRODUCTS, products);
  // SERVER: POST /api/products.php?action=add with product data
  return p;
}
function updateProduct(id, data){
  const products = getProducts();
  const idx = products.findIndex(x=>x.id===id); if(idx===-1) throw new Error('Not found');
  products[idx] = {...products[idx], ...data};
  writeLS(LS_PRODUCTS, products);
  return products[idx];
}
function removeProduct(id){
  let products = getProducts();
  products = products.filter(p=>p.id!==id);
  writeLS(LS_PRODUCTS, products);
}

/* ---------- Cart ---------- */
function getCart(){ return readLS(LS_CART) || []; }
function addToCart(productId, qty=1){
  const cart = getCart();
  const found = cart.find(i=>i.productId===productId);
  if(found) found.qty += qty; else cart.push({ productId, qty });
  writeLS(LS_CART, cart);
}
function updateCart(productId, qty){
  let cart = getCart();
  cart = cart.map(i => i.productId===productId ? {...i, qty} : i).filter(i=>i.qty>0);
  writeLS(LS_CART, cart);
}
function clearCart(){ localStorage.removeItem(LS_CART); }

/* ---------- Orders (client-side stub) ---------- */
function placeOrder({buyerId, items, total}){
  // Client-only: store order in localStorage under key orders_v1
  const orders = readLS('dl_orders_v1') || [];
  const order = { id: randId('ord'), buyerId, items, total, created: Date.now() };
  orders.unshift(order);
  writeLS('dl_orders_v1', orders);
  clearCart();

  // SERVER: POST /api/orders.php with order payload (buyerId, items, total)
  return order;
}

/* ---------- Init ---------- */
seedProductsIfEmpty();

/* Export for pages */
window.DL = {
  signup, login, logout, currentUser,
  getProducts, addProduct, updateProduct, removeProduct,
  getCart, addToCart, updateCart, clearCart,
  placeOrder, money
};