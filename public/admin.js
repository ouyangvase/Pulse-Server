// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    fetchRewards();
  
    const addRewardBtn = document.getElementById('add-reward-btn');
    const rewardModal = document.getElementById('reward-modal');
    const rewardForm = document.getElementById('reward-form');
    const cancelBtn = document.getElementById('cancel-btn');
  
    // 点击 "Add Reward" 按钮，显示表单
    addRewardBtn.addEventListener('click', () => {
      openModal('Add Reward');
    });
  
    // 点击 "Cancel" 按钮，关闭表单
    cancelBtn.addEventListener('click', closeModal);
  
    // 提交奖励表单
    rewardForm.addEventListener('submit', handleRewardFormSubmit);
  });
  
  // 当前正在编辑的奖励 ID（新增时为 null）
  let editingRewardId = null;
  
  // 获取用户列表
  async function fetchUsers() {
    const response = await fetch('/admin/users', {
      method: 'GET',
      headers: {
        Authorization: localStorage.getItem('token'),
      },
    });
  
    if (response.ok) {
      const data = await response.json();
      const usersTable = document.getElementById('users-table').querySelector('tbody');
      usersTable.innerHTML = '';
  
      data.users.forEach((user) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.id}</td>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.points}</td>
          <td>
            <input type="number" placeholder="New Points" style="width: 100px;">
            <button onclick="updateUserPoints(${user.id}, this.previousElementSibling.value)">Update</button>
          </td>
        `;
        usersTable.appendChild(row);
      });
    } else {
      alert('Failed to fetch users');
    }
  }
  
  // 更新用户积分
  async function updateUserPoints(userId, points) {
    if (!points || isNaN(points)) {
      alert('Please enter a valid points value.');
      return;
    }
  
    const response = await fetch('/admin/update-points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('token'),
      },
      body: JSON.stringify({ userId, points: parseInt(points) }),
    });
  
    if (response.ok) {
      alert('User points updated successfully!');
      fetchUsers(); // 刷新用户列表
    } else {
      alert('Failed to update user points');
    }
  }
  
  // 获取奖励列表
  async function fetchRewards() {
    const response = await fetch('/admin/rewards', {
      method: 'GET',
      headers: {
        Authorization: localStorage.getItem('token'),
      },
    });
  
    if (response.ok) {
      const data = await response.json();
      const rewardsTable = document.getElementById('rewards-table').querySelector('tbody');
      rewardsTable.innerHTML = '';
  
      data.rewards.forEach((reward) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${reward.id}</td>
          <td>${reward.name}</td>
          <td>${reward.points_required}</td>
          <td>${reward.stock}</td>
          <td>
            <button onclick="editReward(${reward.id}, '${reward.name}', ${reward.points_required}, ${reward.stock})">Edit</button>
            <button onclick="deleteReward(${reward.id})">Delete</button>
          </td>
        `;
        rewardsTable.appendChild(row);
      });
    } else {
      alert('Failed to fetch rewards');
    }
  }
  
  // 打开模态框
  function openModal(title, reward = {}) {
    editingRewardId = reward.id || null; // 如果有 reward.id，则是编辑模式
    document.getElementById('modal-title').textContent = title;
    document.getElementById('reward-name').value = reward.name || '';
    document.getElementById('reward-points').value = reward.points_required || '';
    document.getElementById('reward-stock').value = reward.stock || '';
    document.getElementById('reward-modal').classList.remove('hidden');
  }
  
  // 关闭模态框
  function closeModal() {
    document.getElementById('reward-modal').classList.add('hidden');
    editingRewardId = null; // 清空编辑状态
  }
  
  // 提交奖励表单（新增或编辑）
  async function handleRewardFormSubmit(event) {
    event.preventDefault();
  
    const name = document.getElementById('reward-name').value;
    const pointsRequired = parseInt(document.getElementById('reward-points').value);
    const stock = parseInt(document.getElementById('reward-stock').value);
  
    if (!name || isNaN(pointsRequired) || isNaN(stock)) {
      alert('Please fill out all fields with valid data.');
      return;
    }
  
    if (editingRewardId) {
      // 编辑奖励
      await updateReward(editingRewardId, name, pointsRequired, stock);
    } else {
      // 新增奖励
      await addReward(name, pointsRequired, stock);
    }
  
    closeModal();
    fetchRewards(); // 刷新奖励列表
  }
  
  // 新增奖励
  async function addReward(name, pointsRequired, stock) {
    const response = await fetch('/admin/add-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('token'),
      },
      body: JSON.stringify({ name, points_required: pointsRequired, stock }),
    });
  
    if (response.ok) {
      alert('Reward added successfully!');
    } else {
      alert('Failed to add reward');
    }
  }
  
  // 编辑奖励
  async function updateReward(id, name, pointsRequired, stock) {
    const response = await fetch('/admin/update-reward', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('token'),
      },
      body: JSON.stringify({ id, name, points_required: pointsRequired, stock }),
    });
  
    if (response.ok) {
      alert('Reward updated successfully!');
    } else {
      alert('Failed to update reward');
    }
  }
  
  // 删除奖励
  async function deleteReward(id) {
    if (!confirm('Are you sure you want to delete this reward?')) return;
  
    const response = await fetch('/admin/delete-reward', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('token'),
      },
      body: JSON.stringify({ id }),
    });
  
    if (response.ok) {
      alert('Reward deleted successfully!');
      fetchRewards(); // 刷新奖励列表
    } else {
      alert('Failed to delete reward');
    }
  }
  
  // 编辑奖励按钮触发
  function editReward(id, name, pointsRequired, stock) {
    openModal('Edit Reward', { id, name, points_required: pointsRequired, stock });
  }
  