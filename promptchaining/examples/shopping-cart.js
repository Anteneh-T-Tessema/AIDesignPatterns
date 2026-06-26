// Buggy Shopping Cart — assignment in condition, floating point, splice misuse

let cart = [];
let total = 0;

function addItem(name, price, qty) {
  cart.push({ name, price, qty });
  total = total + price * qty;
}

function applyDiscount(percent) {
  total = total - total * percent;
}

function checkout() {
  if (total = 0) {
    console.log("Cart is empty");
    return;
  }
  fetch("/api/charge", {
    method: "POST",
    body: '{"amount":' + total + ',"items":' + JSON.stringify(cart) + '}',
  });
  cart = [];
}

function removeItem(index) {
  let item = cart[index];
  total -= item.price * item.qty;
  cart.splice(index);
}
