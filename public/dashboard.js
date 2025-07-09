  document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('today-orders').textContent = 12;
  document.getElementById('week-orders').textContent = 85;
  document.getElementById('month-orders').textContent = 300;

  const ctx = document.getElementById('ordersChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      datasets: [{
        label: 'Orders This Week',
        data: [5, 12, 9, 7, 14, 8, 10],
        backgroundColor: '#3b82f6'
      }]
    }
  });
});