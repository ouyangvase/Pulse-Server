// 初始化仪表盘页面
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户是否已登录
    if (!localStorage.getItem('token')) {
      alert('You are not logged in. Redirecting to login page.');
      window.location.href = '/login.html'; // 跳转到登录页面
      return;
    }
  
    // 初始化数据加载
    initDashboard();
  });
  
  // 获取用户积分
  async function fetchPoints() {
    try {
      const response = await fetch('/points', {
        method: 'GET',
        headers: {
          Authorization: localStorage.getItem('token'), // 从本地存储中获取 JWT
        },
      });
  
      const data = await response.json();
      if (response.ok) {
        document.getElementById('points').textContent = data.points || '0';
      } else {
        alert(`Error fetching points: ${data.error}`);
      }
    } catch (err) {
      console.error('Error fetching points:', err);
    }
  }
  
  // 获取交易记录
  async function fetchTransactions() {
    try {
      const response = await fetch('/transactions', {
        method: 'GET',
        headers: {
          Authorization: localStorage.getItem('token'),
        },
      });
  
      const data = await response.json();
      if (response.ok) {
        const transactionsList = document.getElementById('transactions');
        transactionsList.innerHTML = ''; // 清空列表
        data.transactions.forEach((transaction) => {
          const listItem = document.createElement('li');
          listItem.textContent = `${transaction.type === 'reward' ? 'Reward' : 'Redeem'}: ${transaction.amount} points`;
          transactionsList.appendChild(listItem);
        });
      } else {
        alert(`Error fetching transactions: ${data.error}`);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  }
  
  // 获取奖励列表并动态渲染
  async function fetchRewards() {
    try {
      const response = await fetch('/rewards', {
        method: 'GET',
      });
  
      const data = await response.json();
      if (response.ok) {
        const rewardsList = document.getElementById('rewards');
        rewardsList.innerHTML = ''; // 清空列表
        data.rewards.forEach((reward) => {
          const listItem = document.createElement('li');
          listItem.innerHTML = `
            ${reward.name} - ${reward.points_required} points
            <button onclick="redeemReward(${reward.id})">Redeem</button>
          `;
          rewardsList.appendChild(listItem);
        });
      } else {
        alert(`Error fetching rewards: ${data.error}`);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
    }
  }
  
  // 兑换奖励
  async function redeemReward(rewardId) {
    try {
      const response = await fetch('/redeem-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('token'),
        },
        body: JSON.stringify({ rewardId }),
      });
  
      const data = await response.json();
      if (response.ok) {
        alert(`Reward redeemed successfully: ${data.reward}`);
        fetchPoints(); // 刷新积分
        fetchTransactions(); // 刷新交易记录
        fetchRewards(); // 刷新奖励列表
      } else {
        alert(`Error redeeming reward: ${data.error}`);
      }
    } catch (err) {
      console.error('Error redeeming reward:', err);
    }
  }
  
  // 初始化仪表盘
  async function initDashboard() {
    try {
      await fetchUserInfo();
      await fetchPoints();
      await fetchTransactions();
      await fetchRewards();
    } catch (err) {
      console.error('Error initializing dashboard:', err);
    }
  }
  
  // 获取用户信息并更新欢迎信息
  async function fetchUserInfo() {
    try {
      const response = await fetch('/login', {
        method: 'GET',
        headers: {
          Authorization: localStorage.getItem('token'),
        },
      });
  
      const data = await response.json();
      if (response.ok) {
        const welcomeMessage = document.getElementById('welcome-message');
        welcomeMessage.textContent = `Welcome, ${data.user.name}!`;
      } else {
        alert(`Error fetching user info: ${data.error}`);
        localStorage.removeItem('token'); // 移除过期的令牌
        window.location.href = '/login.html'; // 跳转到登录页面
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
    }
  }
  