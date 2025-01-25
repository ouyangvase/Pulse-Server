const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const response = await fetch('http://localhost:3000/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const result = await response.json();
  document.getElementById('registerMessage').textContent = result.message || result.error;
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const response = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json();
  document.getElementById('loginMessage').textContent = result.message || result.error;
});
