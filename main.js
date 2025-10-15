// main.js - shared by all pages

// Highlight current bottom nav (based on pathname)
(function highlightNav(){
  try {
    const path = window.location.pathname.split('/').pop();
    const navs = document.querySelectorAll('.bottom-nav .nav-item');
    navs.forEach(n=>{
      n.classList.remove('active');
      const href = (n.getAttribute('href') || '').split('/').pop();
      if(href === path || (path === '' && href === 'index.html')) n.classList.add('active');
    });
  } catch(e){}
})();

// REGISTER form (if present)
const registerForm = document.getElementById('registerForm');
if(registerForm){
  registerForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const phone = document.getElementById('regPhone').value.trim();
    const pass = document.getElementById('regPassword').value.trim();
    const name = (document.getElementById('regName') || {}).value || 'User';
    if(!phone || !pass){ alert('Enter phone and password'); return; }
    if(localStorage.getItem('user_' + phone)){ alert('User already exists. Please login.'); return; }
    localStorage.setItem('user_' + phone, JSON.stringify({phone, pass, name}));
    alert('Registered successfully. Please login.');
    window.location.href = 'login.html';
  });
}

// LOGIN form (if present)
const loginForm = document.getElementById('loginForm');
if(loginForm){
  loginForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value.trim();
    const pass = document.getElementById('loginPassword').value.trim();
    const saved = localStorage.getItem('user_' + phone);
    if(saved){
      const u = JSON.parse(saved);
      if(u.pass === pass){
        localStorage.setItem('loggedInUser', phone);
        alert('Login successful');
        window.location.href = 'index.html';
        return;
      }
    }
    alert('Invalid phone or password.');
  });
}

// If register page present, provide a fake sendOtp function
function sendOtp(){
  alert('OTP sent (demo). Use any code to continue.');
}

// optional: expose for inline buttons in HTML
window.copyLink = function(){
  const tmp = document.createElement('input');
  tmp.value = 'https://smartfarming77.com/home/register?invite=B1MDT71C';
  document.body.appendChild(tmp);
  tmp.select();
  document.execCommand('copy');
  document.body.removeChild(tmp);
  alert('Invitation link copied!');
};

window.invest = function(price){
  alert('Invested ₹' + price + ' successfully!');
};

// logout helper
window.logout = function(){
  localStorage.removeItem('loggedInUser');
  window.location.href = 'login.html';
};

// Helper function to get user-specific key
function getUserKey(key){
  const user = localStorage.getItem('loggedInUser');
  return user ? key + '_' + user : key;
}

// Quick action buttons functionality
window.checkIn = function(){
  const userCheckInKey = getUserKey('lastCheckIn');
  const lastCheckIn = localStorage.getItem(userCheckInKey);
  const today = new Date().toDateString();
  
  if(lastCheckIn === today){
    alert('You have already checked in today! Come back tomorrow.');
  } else {
    localStorage.setItem(userCheckInKey, today);
    const bonus = Math.floor(Math.random() * 50) + 10; // Random bonus 10-60
    alert(`Check-in successful! You earned ₹${bonus} bonus!`);
    
    // Update user-specific balance
    const balanceKey = getUserKey('balance');
    const currentBalance = parseFloat(localStorage.getItem(balanceKey) || '17.00');
    localStorage.setItem(balanceKey, (currentBalance + bonus).toFixed(2));
    
    location.reload();
  }
};

window.inviteUser = function(){
  const inviteLink = 'https://smartfarming77.com/home/register?invite=B1MDT71C';
  const tmp = document.createElement('input');
  tmp.value = inviteLink;
  document.body.appendChild(tmp);
  tmp.select();
  document.execCommand('copy');
  document.body.removeChild(tmp);
  alert('Invitation link copied! Share with friends to earn commissions.');
};

window.recharge = function(){
  const amount = prompt('Enter recharge amount (₹):');
  if(amount && !isNaN(amount) && parseFloat(amount) > 0){
    const balanceKey = getUserKey('balance');
    const rechargeKey = getUserKey('totalRecharge');
    
    const currentBalance = parseFloat(localStorage.getItem(balanceKey) || '17.00');
    const newBalance = currentBalance + parseFloat(amount);
    localStorage.setItem(balanceKey, newBalance.toFixed(2));
    
    // Update recharge total
    const totalRecharge = parseFloat(localStorage.getItem(rechargeKey) || '0');
    localStorage.setItem(rechargeKey, (totalRecharge + parseFloat(amount)).toFixed(2));
    
    alert(`Successfully recharged ₹${amount}. New balance: ₹${newBalance.toFixed(2)}`);
    location.reload();
  } else if(amount !== null){
    alert('Please enter a valid amount.');
  }
};

window.withdraw = function(){
  const balanceKey = getUserKey('balance');
  const withdrawKey = getUserKey('totalWithdraw');
  
  const currentBalance = parseFloat(localStorage.getItem(balanceKey) || '17.00');
  const amount = prompt(`Enter withdrawal amount (Current balance: ₹${currentBalance}):`);
  
  if(amount && !isNaN(amount) && parseFloat(amount) > 0){
    if(parseFloat(amount) > currentBalance){
      alert('Insufficient balance!');
    } else {
      const newBalance = currentBalance - parseFloat(amount);
      localStorage.setItem(balanceKey, newBalance.toFixed(2));
      
      // Update withdraw total
      const totalWithdraw = parseFloat(localStorage.getItem(withdrawKey) || '0');
      localStorage.setItem(withdrawKey, (totalWithdraw + parseFloat(amount)).toFixed(2));
      
      alert(`Withdrawal of ₹${amount} successful! New balance: ₹${newBalance.toFixed(2)}`);
      location.reload();
    }
  } else if(amount !== null){
    alert('Please enter a valid amount.');
  }
};

// Profile page links functionality
window.viewAboutCompany = function(){
  alert('Smart Farming is a revolutionary platform combining IoT technology with agriculture. Founded in 2024.');
};

window.viewIncomeRecord = function(){
  const incomeKey = getUserKey('totalIncome');
  alert('Income Record:\n- Daily earnings from investments\n- Referral commissions\n- Check-in bonuses\n\nTotal Income: ₹' + (localStorage.getItem(incomeKey) || '0'));
};

window.viewWithdrawRecord = function(){
  const withdrawKey = getUserKey('totalWithdraw');
  alert('Withdrawal Record:\n\nTotal Withdrawn: ₹' + (localStorage.getItem(withdrawKey) || '0'));
};

window.redeemCode = function(){
  const code = prompt('Enter redeem code:');
  if(code){
    if(code.toUpperCase() === 'WELCOME2024'){
      const bonus = 50;
      const balanceKey = getUserKey('balance');
      const currentBalance = parseFloat(localStorage.getItem(balanceKey) || '17.00');
      localStorage.setItem(balanceKey, (currentBalance + bonus).toFixed(2));
      alert(`Redeem code successful! You received ₹${bonus}!`);
      location.reload();
    } else {
      alert('Invalid redeem code!');
    }
  }
};

window.downloadApp = function(){
  alert('App download coming soon! Continue using the web version for now.');
};