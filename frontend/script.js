// InPulse Application - script.js - FINAL, CONSOLIDATED, AND STABLE VERSION

document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL DOM ELEMENTS ---
    const pageTitle = document.getElementById('page-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const mainAppContent = document.getElementById('main-app-content');
    const mainModal = document.getElementById('main-modal');
    const modalContent = mainModal.querySelector('.modal-content');

    let liveTeamMembers = [];
    let currentUser = null;
    let liveDataCache = { tasks: [] };

    // --- CORE APP INITIALIZATION ---
    async function init() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    try {
        const [userResponse, teamResponse] = await Promise.all([
            fetch('https://inpulse-3zws.onrender.com/api/user/me', {
  headers: { 'Authorization': `Bearer ${token}` }
}),
            fetch('https://inpulse-3zws.onrender.com/api/team', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!userResponse.ok || !teamResponse.ok) throw new Error('Auth or data fetch failed');

        // Store both the current user and team members globally
        currentUser = await userResponse.json(); 
        liveTeamMembers = await teamResponse.json();

        if (!liveTeamMembers.find(m => String(m.id) === String(currentUser.id))) {
    liveTeamMembers.push(currentUser);
}

        document.getElementById('user-name-span').textContent = `${currentUser.firstName} ${currentUser.lastName}`;

        if (currentUser.avatar) {
            document.getElementById('header-avatar-img').src = currentUser.avatar + '?t=' + Date.now;
        }
        fetchAndRenderNotifications(); // Initial fetch
        setInterval(fetchAndRenderNotifications, 30000); // Poll every 30 seconds
        
        switchPage('Dashboard');

    } catch (error) {
        console.error('Initialization failed:', error);
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

    // --- PAGE ROUTER ---
    function switchPage(pageName) {
        pageTitle.textContent = pageName;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const activePage = document.getElementById(`page-${pageName}`);
        if (activePage) activePage.classList.add('active');
        navLinks.forEach(link => link.classList.toggle('active', link.dataset.page === pageName));
        const renderFunction = pageRenderers[pageName];
        if (renderFunction) {
            renderFunction();
        } else {
            console.warn(`No renderer found for page: ${pageName}`);
        }
    }

    // --- PAGE RENDERER MAPPING ---
    const pageRenderers = {
        'Dashboard': renderDashboard, 'Campaigns': renderCampaigns,
        'Analytics': renderAnalytics, 'Sales': renderSales,
        'Products': renderProducts, 'Journeys': renderJourneys,
        'InSight': renderInSight, 'Productivity': renderProductivity,
        'Team': renderTeam, 'Messages': renderMessages, 'Settings': renderSettings
    };

    // --- HELPER & CHARTING FUNCTIONS ---
    function hideModal() { mainModal.classList.remove('active'); }
    function triggerConfetti() {
        const container = document.getElementById('confetti-container');
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 90%, 70%)`;
            confetti.style.animation = `fall ${Math.random() * 2 + 3}s linear forwards`;
            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }
    }
    
        function renderRevenueChart(revenueData) {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        const labels = revenueData.map(d => d.date);
        const data = revenueData.map(d => d.revenue);
        const chartTitleEl = document.querySelector('.card-title'); // Get the title element
        const originalTitle = chartTitleEl.innerHTML; // Store original title
    
        // --- Custom Chart.js Plugin ---
        // This plugin draws the vertical line and handles the custom tooltip display.
        const interactiveFocusPlugin = {
            id: 'interactiveFocus',
            afterDraw: (chart) => {
                // Only draw if the tooltip is active (i.e., user is hovering)
                if (chart.tooltip && chart.tooltip._active && chart.tooltip._active.length) {
                    const activePoint = chart.tooltip._active[0];
                    const ctx = chart.ctx;
                    const x = activePoint.element.x;
                    const topY = chart.scales.y.top;
                    const bottomY = chart.scales.y.bottom;

                    // Draw the vertical line
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, topY);
                    ctx.lineTo(x, bottomY);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = '#a5b4fc'; // A soft indigo color for the line
                    ctx.stroke();
                    ctx.restore();
                }
            },
        };
    
        // --- Chart Instance ---
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue',
                    data: data,
                    borderColor: '#6366f1',
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
                        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                        return gradient;
                    },
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0, // Hide points by default
                    pointHoverRadius: 8,
                    pointHitRadius: 20,
                    pointBackgroundColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverBorderColor: '#6366f1',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        border: { display: false },
                        grid: {
                            color: '#f3f4f6', // Very light grid lines
                            drawTicks: false,
                        },
                        ticks: {
                            padding: 10,
                            callback: (value) => '$' + value,
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            padding: 10,
                            autoSkip: true,
                            maxTicksLimit: 8, // Avoid overcrowding the x-axis
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true, // Disable default tooltip
                        external: (context) => {
                            // Custom external tooltip logic to update the chart header
                            const tooltipModel = context.tooltip;
                            // This part of the code has a potential issue. It assumes the chart title element is always for the revenue chart.
                            // To make this robust, we should target the title within the chart's parent card specifically.
                            const chartCard = context.chart.canvas.closest('.card');
                            const titleEl = chartCard ? chartCard.querySelector('.card-title') : null;

                            // Restore original title if tooltip is hidden
                            if (tooltipModel.opacity === 0) {
                                if (titleEl && titleEl.dataset.originalTitle) {
                                    titleEl.innerHTML = titleEl.dataset.originalTitle;
                                }
                                return;
                            }
                            
                            // Store original title if not already stored
                            if (titleEl && !titleEl.dataset.originalTitle) {
                                titleEl.dataset.originalTitle = titleEl.innerHTML;
                            }
    
                            const activePoint = tooltipModel.dataPoints[0];
                            if (activePoint && titleEl) {
                                const date = activePoint.label;
                                const revenue = activePoint.raw.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                                // Update the chart's title with live data
                                titleEl.innerHTML = `<i data-lucide="line-chart"></i> Revenue: ${revenue} on ${date}`;
                            }
                        }
                    },
                    // Register our custom plugin
                    interactiveFocus: true,
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                }
            },
            // Pass the custom plugin to the chart
            plugins: [interactiveFocusPlugin]
        });
    }

    function renderFunnelChart(data) {
    const ctx = document.getElementById('funnelChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Reach', 'Clicks', 'Conversions'],
            datasets: [{
                label: 'Marketing Funnel',
                data: [data.totalReach, data.totalClicks, data.totalConversions],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(129, 140, 248, 0.7)',
                    'rgba(165, 180, 252, 0.7)'
                ],
                borderColor: [
                    '#6366f1',
                    '#818cf8',
                    '#a5b4fc'
                ],
                borderWidth: 2,
            }]
        },
        options: {
            indexAxis: 'y', // This makes the bar chart horizontal
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Customer Journey Funnel'
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                       color: '#f3f4f6'
                    }
                },
                y: {
                     grid: {
                       display: false
                    }
                }
            }
        }
    });
}

    function renderSpendVsSalesChart(data) {
    const ctx = document.getElementById('spendVsSalesChart')?.getContext('2d');
    if (!ctx) return;

    const labels = Object.keys(data);
    const spendData = labels.map(label => data[label].spend);
    const salesData = labels.map(label => data[label].sales);

    // --- MODERN: Create Gradients for the bars ---
    const salesGradient = ctx.createLinearGradient(0, 0, 0, 400);
    salesGradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)'); // Brighter green at top
    salesGradient.addColorStop(1, 'rgba(21, 128, 61, 0.8)');   // Darker green at bottom

    const spendGradient = ctx.createLinearGradient(0, 0, 0, 400);
    spendGradient.addColorStop(0, 'rgba(165, 180, 252, 0.8)'); // Lighter indigo/blue at top
    spendGradient.addColorStop(1, 'rgba(99, 102, 241, 0.8)');    // Darker indigo at bottom

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Spend',
                    data: spendData,
                    // --- MODERN: Apply gradient and rounded corners ---
                    backgroundColor: spendGradient,
                    borderColor: '#6366f1',
                    borderRadius: 6, // This makes the bars have rounded tops
                    hoverBackgroundColor: '#6366f1', // Solid color on hover for feedback
                    borderWidth: 0, // No border for a flatter look
                },
                {
                    label: 'Total Sales',
                    data: salesData,
                    // --- MODERN: Apply gradient and rounded corners ---
                    backgroundColor: salesGradient,
                    borderColor: '#16a34a',
                    borderRadius: 6,
                    hoverBackgroundColor: '#16a34a',
                    borderWidth: 0,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 14 // Slightly larger legend text
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Platform Performance (Spend vs. Sales)',
                    font: {
                        size: 18, // Larger title
                        weight: '600'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                // --- MODERN: Custom tooltip ---
                tooltip: {
                    backgroundColor: '#1f2937', // Dark background
                    titleColor: '#ffffff',
                    bodyColor: '#e5e7eb',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4
                }
            },
             scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '$' + value.toLocaleString()
                    },
                    // --- MODERN: Cleaner grid lines ---
                    grid: {
                       color: '#e5e7eb', // Lighter grid lines
                       drawBorder: false, // Remove the axis border
                    }
                },
                x: {
                     grid: {
                       display: false // No vertical grid lines for a cleaner look
                    }
                }
            }
        }
    });
}
    
    // --- ALL PAGE RENDERING FUNCTIONS ---
    async function fetchAndRenderNotifications() {
    console.log('Attempting to fetch notifications at:', new Date().toLocaleTimeString());
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.warn("No auth token found in localStorage");
            return;
        }

        const response = await fetch('https://inpulse-3zws.onrender.com/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            console.error("Fetch failed:", response.status, response.statusText);
            return;
        }

        const notifications = await response.json();
        console.log("Fetched notifications:", notifications);

        const panel = document.getElementById('notification-panel');
        const dot = document.querySelector('.notification-dot');

        if (!panel || !dot) {
            console.error("Missing DOM elements: panel or dot not found");
            return;
        }

        const unreadCount = Array.isArray(notifications)
            ? notifications.filter(n => !n.read).length
            : 0;

        // Update the red dot
        if (unreadCount > 0) {
            dot.textContent = unreadCount;
            dot.style.display = 'flex';
        } else {
            dot.style.display = 'none';
        }

        // Build the HTML for the notification list
        if (Array.isArray(notifications) && notifications.length > 0) {
            panel.innerHTML = `
                <div class="notification-header">Notifications</div>
                <div class="notification-list">
                    ${notifications.map(n => `
                        <div class="notification-item ${n.read ? '' : 'unread'}">
                            <a href="${n.link || '#'}">${n.message}</a>
                            <span class="notification-time">${new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                    `).join('')}
                </div>`;
        } else {
            panel.innerHTML = `<div class="notification-empty">You have no notifications.</div>`;
        }

    } catch (error) {
        console.error("Polling for notifications failed:", error);
    }
}

    async function renderDashboard() {
    const page = document.getElementById('page-Dashboard');
    page.innerHTML = `<div>Loading Dashboard...</div>`;

    let inactivityTimeout;

    function resetInactivityTimer() {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(() => {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html'; // or your login route
    }, 30 * 60 * 1000); // 30 minutes
}

    // Start the timer when dashboard loads
    resetInactivityTimer();

    // Reset timer on user activity
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);

    try {
        const token = localStorage.getItem('authToken');

        // --- 1. FETCH ALL DATA AT THE BEGINNING ---
        const statsResponse = await fetch('https://inpulse-3zws.onrender.com/api/dashboard/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!statsResponse.ok) throw new Error('Failed to fetch dashboard stats');
        const liveStats = await statsResponse.json(); // Data for KPIs

        const tasksResponse = await fetch('https://inpulse-3zws.onrender.com/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!tasksResponse.ok) throw new Error('Failed to fetch tasks');
        liveDataCache.tasks = await tasksResponse.json(); // Data for lists

        const chartResponse = await fetch('https://inpulse-3zws.onrender.com/api/dashboard/revenue-chart', {
    headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!chartResponse.ok) throw new Error('Failed to fetch chart data');
        const liveChartData = await chartResponse.json(); // Data for chart

        // --- 2. NOW, BUILD THE HTML USING THE FETCHED DATA ---

        const formatChange = (change) => {
            // If change is null, undefined, or not a number, display a neutral state
            if (change === null || typeof change === 'undefined' || isNaN(change)) {
                return `<p class="stat-change" style="color: #6b7280;"><i data-lucide="minus"></i> N/A</p>`;
            }
            const sign = change >= 0 ? '+' : '';
            const colorClass = change >= 0 ? 'text-green-500' : 'text-red-500';
            const icon = change >= 0 ? 'arrow-up-right' : 'arrow-down-right';
            return `<p class="stat-change ${colorClass}"><i data-lucide="${icon}"></i> ${sign}${change.toFixed(1)}%</p>`;
        };


        const originalStatCardsHTML = `
            <div class="stat-card border-green-500">
                <h3 class="stat-title">Total Revenue</h3>
                <p class="stat-value">$${liveStats.totalRevenue.toLocaleString()}</p>
                ${formatChange(liveStats.revenueChange)}
            </div>
            <div class="stat-card border-blue-500">
                <h3 class="stat-title">Total Reach</h3>
                <p class="stat-value">${liveStats.totalReach.toLocaleString()}</p>
                ${formatChange(liveStats.reachChange)}
            </div>
            <div class="stat-card border-purple-500">
                <h3 class="stat-title">Engagement Rate</h3>
                <p class="stat-value">${liveStats.engagementRate}%</p>
                ${formatChange(liveStats.engagementRateChange)}
            </div>
            <div class="stat-card border-yellow-500">
                <h3 class="stat-title">Total Conversions</h3>
                <p class="stat-value">${liveStats.totalConversions}</p>
                ${formatChange(liveStats.totalConversionsChange)}
            </div>
        `;

        const advancedWidgetsHTML = `
            <div class="card stat-card-new" id="financials-widget-sm"><h3 class="stat-title"><i data-lucide="banknote"></i> Net Profit Margin</h3><p class="stat-value">${liveStats.financials.netProfitMargin}%</p><p class="stat-change text-green-500">${liveStats.financials.netProfitMargin > 0 ? 'Healthy' : 'N/A'}</p></div>
            <div class="card stat-card-new" id="team-perf-widget-sm"><h3 class="stat-title"><i data-lucide="users"></i> Task Completion</h3><p class="stat-value">${liveStats.teamPerformance.completionRate}%</p><p class="stat-change text-blue-500">Risk: ${liveStats.teamPerformance.burnoutRisk}</p></div>
            <div class="card stat-card-new" id="customer-segment-widget-sm"><h3 class="stat-title"><i data-lucide="target"></i> Top Segment</h3><p class="stat-value-small">${liveStats.customerSegment.name}</p><p class="stat-change text-purple-600">${liveStats.customerSegment.size}</p></div>
            <div class="card stat-card-new" id="ai-task-widget-sm"><h3 class="stat-title"><i data-lucide="lightbulb"></i> AI Insight</h3><p class="ai-insight-text">${liveStats.actionableInsight.text}</p><button class="btn btn-primary btn-sm" id="generate-task-btn" disabled>Create Task</button></div>
        `;

        const todoTasksForCurrentUser = liveDataCache.tasks.filter(t => t.status === 'TODO' && t.assigneeId === currentUser.id);

        const todoTasksHTML = todoTasksForCurrentUser.map(task => 
            `<li class="todo-item" data-task-id="${task.id}">
                <span>${task.content}</span>
                <button class="todo-action-btn" data-action="done" title="Complete Task"><i data-lucide="check-circle-2" class="icon-xs"></i></button>
            </li>`
        ).join('');

        const bottomWidgetsHTML = `
            <div class="dashboard-bottom-grid">
                <div class="card"><h3 class="card-title"><i data-lucide="line-chart"></i>Revenue vs. Time (Last 30 Days)</h3><div class="chart-container"><canvas id="revenueChart"></canvas></div></div>
                <div class="card"><h3 class="card-title">My To-Do List</h3><div class="todo-list-widget"><ul id="dashboard-todo-list">${todoTasksHTML || '<p class="empty-list-message">You have no assigned tasks.</p>'}</ul></div></div>
            </div>`;

        const deadlineTasks = liveDataCache.tasks.filter(t => t.dueDate && t.status !== 'DONE');
        
        const deadlinesHTML = deadlineTasks.map(task => {
        const priorityClass = `priority-${task.priority?.toLowerCase() || 'low'}`;
        const dueString = new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        let assigneeAvatarHTML = '<div class="assignee-avatar-placeholder"></div>'; // Default to a placeholder

        // --- FIX: First, check if the task even has an assignee. ---
        if (task.assigneeId) {
            const assignee = liveTeamMembers.find(member => String(member.id) === String(task.assigneeId));
            
            // If we find the assignee in our team list, create their avatar.
            if (assignee) {
                const avatarUrl = assignee.avatar || `https://i.pravatar.cc/40?u=${assignee.email}`;
                assigneeAvatarHTML = `<img src="${avatarUrl}" class="assignee-avatar" title="Assigned to ${assignee.firstName}">`;
            }
        }
        
        return `<div class="deadline-item ${priorityClass}">
                    <div class="deadline-details">
                        <h4>${task.content}</h4>
                        <p>Due: ${dueString}</p>
                    </div>
                    ${assigneeAvatarHTML}
                </div>`;
    }).join('');

        const deadlinesWidgetHTML = `<div class="card deadline-widget"><h3 class="card-title"><i data-lucide="calendar-clock"></i>Upcoming Deadlines</h3><div class="deadlines-container">${deadlinesHTML || '<p style="text-align:center; color: #6b7280;">No upcoming deadlines.</p>'}</div></div>`;

        // --- 3. ASSEMBLE THE FINAL HTML ---
        page.innerHTML = `
            <div class="grid-4-cols">${originalStatCardsHTML}</div>
            <div class="grid-4-cols" style="margin-top: 1.5rem;">${advancedWidgetsHTML}</div>
            ${bottomWidgetsHTML}
            ${deadlinesWidgetHTML}`;

        // --- 4. RENDER DYNAMIC COMPONENTS ---
        renderRevenueChart(liveChartData);
        lucide.createIcons();

    } catch (error) {
        console.error("Error rendering dashboard:", error);
        page.innerHTML = `<div>Could not load dashboard data. Please try again later.</div>`;
    }
}

    function updateDashboardWidgets() {
    // This function re-renders ONLY the task-related widgets using data from the cache.
    const deadlinesContainer = document.querySelector('.deadlines-container');
    const todoList = document.getElementById('dashboard-todo-list');

    if (!deadlinesContainer || !todoList) return;

    // --- Re-render "Upcoming Deadlines" ---
    const deadlineTasks = liveDataCache.tasks.filter(t => t.dueDate && t.status !== 'DONE');
    const deadlinesHTML = liveDataCache.tasks
  .filter(t => t.dueDate && t.status !== 'DONE')
  .map(task => {
    let assigneeAvatarHTML = '<div class="assignee-avatar-placeholder"></div>';

    if (task.assigneeId) {
      const assignee = liveTeamMembers.find(
        member => String(member.id) === String(task.assigneeId)
      );

      if (assignee) {
        const avatarUrl = assignee.avatar || `https://i.pravatar.cc/40?u=${assignee.email}`;
        assigneeAvatarHTML = `
          <img 
            src="${avatarUrl}" 
            class="assignee-avatar" 
            title="Assigned to ${assignee.firstName}"
          >
        `;
      }
    }

    return `
      <div class="deadline-item">
        <div class="deadline-details">
          <h4>${task.content}</h4>
          <p>Due: ${new Date(task.dueDate).toLocaleDateString()}</p>
        </div>
        ${assigneeAvatarHTML}
      </div>
    `;
  })
  .join('');

    document.querySelector('.deadlines-container').innerHTML = deadlinesHTML;
    
    todoList.innerHTML = todoTasksHTML || '<p class="empty-list-message">You have no assigned tasks.</p>';

    lucide.createIcons();
}

    function recalculateAndUpdateCompletionWidget() {
    // 1. Check if the cache and the necessary data exist
    if (!liveDataCache.tasks) return;

    // 2. Recalculate the completion percentage from the cached data
    const totalTasks = liveDataCache.tasks.length;
    const completedTasks = liveDataCache.tasks.filter(t => t.status === 'DONE').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Find the specific element in the widget that displays the percentage
    const completionRateEl = document.querySelector('#team-perf-widget-sm .stat-value');
    if (completionRateEl) {
        completionRateEl.textContent = `${completionRate}%`;
    }
}

    async function renderCampaigns() {
    const page = document.getElementById('page-Campaigns');
    page.innerHTML = `<div>Loading Campaigns...</div>`;
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('https://inpulse-3zws.onrender.com/api/campaigns', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch campaigns');
        
        const liveCampaigns = await response.json();

        if (liveCampaigns.length === 0) {
            // This part now also includes the button so you can sync your first campaigns
            page.innerHTML = `
                <div class="page-header-actions">
                    <button class="btn btn-primary" id="sync-facebook-btn">
                        <i data-lucide="refresh-cw"></i><span>Sync Data</span>
                    </button>
                </div>
                <div class="placeholder-card">
                    <i data-lucide="megaphone-off"></i>
                    <h3>No Campaigns Found</h3>
                    <p>Click the sync button to pull in your campaign data.</p>
                </div>`;
            lucide.createIcons();
            return;
        }

        const totalSpend = liveCampaigns.reduce((sum, c) => sum + c.spend, 0);
        const totalReach = liveCampaigns.reduce((sum, c) => sum + c.reach, 0);
        const totalSales = liveCampaigns.reduce((sum, c) => sum + c.sales, 0);
        const overallROAS = totalSpend > 0 ? (totalSales / totalSpend) : 0;

        const kpiCardsHTML = `
            <div class="stat-card border-blue-500"><h3 class="stat-title">Active Campaigns</h3><p class="stat-value">${liveCampaigns.length}</p></div>
            <div class="stat-card border-yellow-500"><h3 class="stat-title">Total Ad Spend</h3><p class="stat-value">$${totalSpend.toLocaleString()}</p></div>
            <div class="stat-card border-purple-500"><h3 class="stat-title">Combined Reach</h3><p class="stat-value">${totalReach.toLocaleString()}</p></div>
            <div class="stat-card border-green-500"><h3 class="stat-title">Overall ROAS</h3><p class="stat-value">${overallROAS.toFixed(2)}x</p></div>`;
        
        const campaignRowsHTML = liveCampaigns.map(c => {
            const roas = c.spend > 0 ? (c.sales / c.spend).toFixed(2) + 'x' : 'N/A';
            const cpc = c.clicks > 0 ? '$' + (c.spend / c.clicks).toFixed(2) : 'N/A';
            const statusClass = c.status.toLowerCase() === 'active' ? 'status-active' : 'status-completed';
            return `<tr><td>${c.campaignName}</td><td>${c.platform}</td><td><span class="status-chip ${statusClass}">${c.status}</span></td><td>${c.reach.toLocaleString()}</td><td>$${c.spend.toLocaleString()}</td><td>${roas}</td><td>${cpc}</td></tr>`;
        }).join('');
        
        // --- THIS IS THE CORRECTED PART ---
        page.innerHTML = `
            <div class="grid-4-cols">${kpiCardsHTML}</div>
            <div class="card">
                <div class="campaign-header">
                    <h3 class="card-title">Campaign Breakdown</h3>
                    <div class="header-actions">
                        <button class="btn btn-secondary" id="sync-facebook-btn">
                            <i data-lucide="refresh-cw"></i><span>Sync Data</span>
                        </button>
                    </div>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Campaign Name</th>
                                <th>Platform</th>
                                <th>Status</th>
                                <th>Reach</th>
                                <th>Spend</th>
                                <th>ROAS</th>
                                <th>CPC</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${campaignRowsHTML}
                        </tbody>
                    </table>
                </div>
            </div>`;

        lucide.createIcons();
    } catch (error) {
        console.error("Error rendering campaigns:", error);
        page.innerHTML = `<div>Could not load campaigns. Please try again.</div>`;
    }
}
    
    async function renderAnalytics(options = {}) {
        const { platformFilter = 'All' } = options;
        const page = document.getElementById('page-Analytics');
        page.innerHTML = `<div>Loading Analytics...</div>`;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/campaigns', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch campaign data for analytics');
            const liveCampaigns = await response.json();
            const platforms = ['All', ...new Set(liveCampaigns.map(c => c.platform))];
            const filterHTML = `<div class="page-header-actions"><label for="platform-filter">Show Data For:</label><select id="platform-filter" class="form-input" data-page="Analytics">${platforms.map(p => `<option value="${p}" ${p === platformFilter ? 'selected' : ''}>${p}</option>`).join('')}</select></div>`;
            const filteredCampaigns = platformFilter === 'All' ? liveCampaigns : liveCampaigns.filter(c => c.platform === platformFilter);
            if (filteredCampaigns.length === 0) {
                page.innerHTML = filterHTML + `<div class="placeholder-card" style="margin-top: 1.5rem;"><i data-lucide="frown"></i><h3>No Data Available</h3><p>There is no analytics data for the selected platform.</p></div>`;
                lucide.createIcons();
                return;
            }
            const totalReach = filteredCampaigns.reduce((sum, c) => sum + c.reach, 0);
            const totalClicks = filteredCampaigns.reduce((sum, c) => sum + c.clicks, 0);
            const totalConversions = 0;
            const totalSpend = filteredCampaigns.reduce((sum, c) => sum + c.spend, 0);
            const totalSales = filteredCampaigns.reduce((sum, c) => sum + c.sales, 0);
            const roas = totalSpend > 0 ? (totalSales / totalSpend) : 0;
            const funnelData = { totalReach, totalClicks, totalConversions };
            const platformPerformance = filteredCampaigns.reduce((acc, c) => {
                if (!acc[c.platform]) { acc[c.platform] = { spend: 0, sales: 0 }; }
                acc[c.platform].spend += c.spend;
                acc[c.platform].sales += c.sales;
                return acc;
            }, {});
            const kpiCardsHTML = `<div class="stat-card border-purple-500"><h3 class="stat-title">Total Reach</h3><p class="stat-value">${totalReach.toLocaleString()}</p></div><div class="stat-card border-blue-500"><h3 class="stat-title">Total Clicks</h3><p class="stat-value">${totalClicks.toLocaleString()}</p></div><div class="stat-card border-yellow-500"><h3 class="stat-title">Total Conversions</h3><p class="stat-value">${totalConversions.toLocaleString()}</p></div><div class="stat-card border-green-500"><h3 class="stat-title">Overall ROAS</h3><p class="stat-value">${roas.toFixed(2)}x</p></div>`;
            page.innerHTML = `${filterHTML}<div class="grid-4-cols" style="margin-top: 1.5rem;">${kpiCardsHTML}</div><div class="analytics-grid-layout"><div class="analytics-main"><div class="card"><h3 class="card-title">Customer Journey Funnel</h3><div class="chart-container" style="height: 350px;"><canvas id="funnelChart"></canvas></div></div><div class="card"><h3 class="card-title">Platform Performance (Spend vs. Sales)</h3><div class="chart-container" style="height: 350px;"><canvas id="spendVsSalesChart"></canvas></div></div></div><aside class="analytics-sidebar"><div class="card"><h3 class="card-title"><i data-lucide="sparkles"></i> AI Insights for ${platformFilter}</h3><p>AI insights will be generated here based on the filtered data.</p></div></aside></div>`;
            renderFunnelChart(funnelData);
            renderSpendVsSalesChart(platformPerformance);
            lucide.createIcons();
        } catch (error) {
            console.error("Error rendering analytics page:", error);
            page.innerHTML = `<div>Could not load analytics data.</div>`;
        }
    }

    async function renderSales(options = {}) {
        const { sourceFilter = 'All' } = options;
        const page = document.getElementById('page-Sales');
        page.innerHTML = `<div>Loading Sales Data...</div>`;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/sales', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch sales');
            const liveSales = await response.json();
            const sources = ['All', ...new Set(liveSales.map(s => s.source || 'Direct'))];
            const filterHTML = `<div class="page-header-actions"><label for="source-filter">Show Sales From:</label><select id="source-filter" class="form-input" data-page="Sales">${sources.map(s => `<option value="${s}" ${s === sourceFilter ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`;
            const filteredSales = sourceFilter === 'All' ? liveSales : liveSales.filter(s => (s.source || 'Direct') === sourceFilter);
            if (filteredSales.length === 0) {
                page.innerHTML = filterHTML + `<div class="placeholder-card" style="margin-top: 1.5rem;"><i data-lucide="frown"></i><h3>No Sales Data Found</h3><p>There are no sales records for the selected source.</p></div>`;
                lucide.createIcons();
                return;
            }
            const totalRevenue = filteredSales.reduce((sum, item) => sum + item.revenue, 0);
            const totalSalesCount = filteredSales.length;
            const averageOrderValue = totalRevenue > 0 ? totalRevenue / totalSalesCount : 0;
            const kpiCardsHTML = `<div class="stat-card text-center"><h3 class="stat-title">Total Revenue</h3><p class="stat-value text-green-500">$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p></div><div class="stat-card text-center"><h3 class="stat-title">Total Sales</h3><p class="stat-value text-blue-500">${totalSalesCount.toLocaleString()}</p></div><div class="stat-card text-center"><h3 class="stat-title">Average Order Value</h3><p class="stat-value text-purple-600">$${averageOrderValue.toFixed(2)}</p></div>`;
            const topSellingHTML = mockData.sales.topSelling.map(p => `<li><span>${p.name}</span><strong>${p.sales} units</strong></li>`).join('');
            const lowSellingHTML = mockData.sales.lowSelling.map(p => `<li><span>${p.name}</span><strong>${p.sales} units</strong></li>`).join('');
            page.innerHTML = `${filterHTML}<div class="grid-3-cols" style="margin-top: 1.5rem;">${kpiCardsHTML}</div><div class="grid-2-cols"><div class="card"><h3 class="card-title"><i data-lucide="trending-up"></i>Top Selling Products</h3><ul class="product-list">${topSellingHTML}</ul></div><div class="card"><h3 class="card-title"><i data-lucide="trending-down"></i>Low Selling Products</h3><ul class="product-list">${lowSellingHTML}</ul></div></div><div class="card"><h3 class="card-title"><i data-lucide="sparkles"></i> AI Sales Forecast for ${sourceFilter}</h3><div class="chart-container" style="height: 300px;"><canvas id="salesForecastChart"></canvas></div></div>`;
            renderSalesForecastChart();
            lucide.createIcons();
        } catch (error) {
            console.error("Error rendering sales page:", error);
            page.innerHTML = `<div>Could not load sales data. Please try again.</div>`;
        }
    }

    async function renderProducts() {
        const page = document.getElementById('page-Products');
        page.innerHTML = `<div>Loading Product Intelligence...</div>`;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/products', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Failed to fetch products');
            const liveProducts = await response.json();
            if (liveProducts.length === 0) {
                page.innerHTML = `<div class="placeholder-card"><i data-lucide="package-search"></i><h3>No Products Found</h3><p>Product data will appear here once sales are recorded.</p></div>`;
                lucide.createIcons();
                return;
            }
            const productCardsHTML = liveProducts.map(product => {
                let alertsHTML = '';
                if (product.inventoryLevel < 50) { alertsHTML += `<div class="smart-alert warning"><i data-lucide="battery-warning"></i><span><strong>Low Stock Alert:</strong> Only ${product.inventoryLevel} units remaining. Consider reordering.</span></div>`; }
                if (product.profitMargin < 40) { alertsHTML += `<div class="smart-alert info"><i data-lucide="dollar-sign"></i><span><strong>Profitability Insight:</strong> Margin is ${product.profitMargin.toFixed(1)}%. Consider a pricing review or cost reduction.</span></div>`; }
                return `<div class="product-card"><h4>${product.name}</h4><div class="product-stats"><div class="product-stat"><span>Inventory</span><strong>${product.inventoryLevel.toLocaleString()}</strong></div><div class="product-stat"><span>Total Sales</span><strong>${product.totalSalesCount}</strong></div><div class="product-stat"><span>Price</span><strong>$${product.salePrice.toFixed(2)}</strong></div><div class="product-stat"><span>Profit Margin</span><strong>${product.profitMargin.toFixed(1)}%</strong></div></div><div class="product-alerts">${alertsHTML || '<p class="no-alerts">No immediate alerts.</p>'}</div></div>`;
            }).join('');
            page.innerHTML = `<div class="page-header-actions"><h3>Product Intelligence</h3></div><div class="product-grid">${productCardsHTML}</div>`;
            lucide.createIcons();
        } catch (error) {
            console.error("Error rendering products page:", error);
            page.innerHTML = `<div>Could not load product data. Please try again later.</div>`;
        }
    }

    async function renderJourneys() {
        const page = document.getElementById('page-Journeys');
        page.innerHTML = `<div>Loading Customer Journeys...</div>`;
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/journeys', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || `Failed to fetch journeys with status ${response.status}`); }
            const liveJourneys = await response.json();
            if (liveJourneys.length === 0) {
                page.innerHTML = `<div class="placeholder-card"><i data-lucide="git-merge"></i><h3>No Journeys Analyzed</h3><p>Data from your integrations will be analyzed to create customer journeys here. Try running a data sync.</p></div>`;
                lucide.createIcons();
                return;
            }
            const totalConversions = liveJourneys.filter(j => j.conversion).length;
            const conversionRate = liveJourneys.length > 0 ? (totalConversions / liveJourneys.length) * 100 : 0;
            const kpiCardsHTML = `<div class="stat-card"><h3 class="stat-title">Journeys Analyzed</h3><p class="stat-value">${liveJourneys.length}</p></div><div class="stat-card"><h3 class="stat-title">Total Conversions</h3><p class="stat-value">${totalConversions}</p></div><div class="stat-card"><h3 class="stat-title">Conversion Rate</h3><p class="stat-value">${conversionRate.toFixed(1)}%</p></div>`;
            const journeyCardsHTML = liveJourneys.map(journey => {
                const touchpointsHTML = Array.isArray(journey.touchpoints) ? journey.touchpoints.map((tp, index) => {
                    let iconName = tp.platform.toLowerCase().replace(/\s+/g, '-');
                    if (tp.platform === 'Google Ads') iconName = 'search';
                    if (tp.platform.includes('Website')) iconName = 'globe';
                    return `<div class="touchpoint-item"><div class="touchpoint-icon platform-${tp.platform.toLowerCase().replace(/\s+/g, '')}"><i data-lucide="${iconName}"></i></div><div class="touchpoint-details"><strong>${tp.platform}</strong><span>${tp.action}</span></div></div>${index < journey.touchpoints.length - 1 ? '<div class="touchpoint-connector"></div>' : ''}`;
                }).join('') : '';
                return `<div class="journey-card ${journey.conversion ? 'converted' : ''}"><div class="journey-header"><span>${journey.customerId}</span><strong class="journey-value">${journey.conversion ? '$' + journey.conversionValue.toFixed(2) : 'No Conversion'}</strong></div><div class="journey-timeline">${touchpointsHTML}</div></div>`;
            }).join('');
            page.innerHTML = `<div class="grid-3-cols">${kpiCardsHTML}</div><div class="journeys-container">${journeyCardsHTML}</div>`;
            lucide.createIcons();
        } catch (error) {
            console.error("Error rendering journeys page:", error);
            page.innerHTML = `<div>Could not load customer journeys. Error: ${error.message}</div>`;
        }
    }

    async function renderEditTaskModal(taskId) {
    const mainModal = document.getElementById('main-modal');
    const modalContent = mainModal.querySelector('.modal-content');
    modalContent.innerHTML = `<div class="loader"></div>`;
    mainModal.classList.add('active');

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`https://inpulse-3zws.onrender.com/api/tasks/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch task details.');
        
        const task = await response.json();
        
        const dueDateValue = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
        
        const assigneeOptions = liveTeamMembers.map(member => 
            `<option value="${member.id}" ${task.assigneeId === member.id ? 'selected' : ''}>${member.firstName} ${member.lastName}</option>`
        ).join('');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Edit Task</h3>
                <button class="modal-close-btn"><i data-lucide="x"></i></button>
            </div>
            <form id="edit-task-form">
                <input type="hidden" name="taskId" value="${task.id}">
                <div class="form-group">
                    <label for="edit-task-content">Task</label>
                    <textarea id="edit-task-content" name="content" class="form-input" required>${task.content}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-task-description">Description</label>
                    <textarea id="edit-task-description" name="description" class="form-input" rows="3">${task.description || ''}</textarea>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label for="edit-task-due-date">Due Date</label>
                        <div class="date-input-wrapper">
                            <input type="date" id="edit-task-due-date" name="dueDate" value="${dueDateValue}" class="form-input">
                            <i data-lucide="calendar" class="date-input-icon"></i>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="edit-task-priority">Priority</label>
                        <select id="edit-task-priority" name="priority" class="form-input">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="edit-task-assignee">Assign To</label>
                    <select id="edit-task-assignee" name="assigneeId" class="form-input">
                        <option value="">Unassigned</option>
                        ${assigneeOptions}
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        `;
        lucide.createIcons();
    } catch (error) {
        console.error("Error rendering edit task modal:", error);
        modalContent.innerHTML = `<p>Could not load task details. Please try again.</p>`;
    }
}

    function renderInSight() {
        const page = document.getElementById('page-InSight');
        page.innerHTML = `<div class="insight-container"><div class="insight-header"><div><h2 class="insight-title">Intelligence Report</h2><p class="insight-subtitle">Your AI-powered analysis of all connected data streams.</p></div></div><div id="insight-content"><div class="placeholder-card" style="min-height: 400px;"><i data-lucide="brain-circuit"></i><h3>Unlock Actionable Insights</h3><p>The InSight Engine analyzes your data to find hidden patterns and opportunities.</p><button class="btn btn-primary btn-lg" id="generate-report-btn" style="margin-top: 1rem;"><i data-lucide="sparkles"></i><span>Generate Report</span></button></div></div></div>`;
        lucide.createIcons();
    }
    
    function displayInsightReport(report) {
        const contentArea = document.getElementById('insight-content');
        if (!contentArea || !report || !report.attributionInsight) {
            contentArea.innerHTML = `<div class="placeholder-card"><i data-lucide="alert-triangle"></i><h3>Could Not Generate Report</h3><p>Not enough data was available.</p></div>`;
            lucide.createIcons();
            return;
        }
        contentArea.innerHTML = `<div class="insight-report-header"><h4>Generated Insights</h4><span>${report.generatedDate}</span></div><div class="insight-card"><div class="insight-card-header"><div class="insight-card-icon" style="background-color: #cffafe;"><i data-lucide="git-merge" style="color: #0891b2;"></i></div><h3 class="insight-card-title">Cross-Channel Attribution</h3></div><div class="insight-card-body"><p>${report.attributionInsight.text}</p></div></div><div class="insight-card high-impact"><div class="insight-card-header"><div class="insight-card-icon" style="background-color: #dcfce7;"><i data-lucide="package-search" style="color: #16a34a;"></i></div><h3 class="insight-card-title">Inventory Opportunity</h3></div><div class="insight-card-body"><p>${report.inventoryInsight.text}</p></div></div>`;
        lucide.createIcons();
    }
    
    function initializeCalendarDND() {
    const taskChips = document.querySelectorAll('.calendar-view .task-chip');
    const calendarDays = document.querySelectorAll('.calendar-view .calendar-day');

    taskChips.forEach(chip => {
        chip.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', chip.dataset.taskId);
            setTimeout(() => chip.classList.add('dragging'), 0);
        });
        chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    });

    calendarDays.forEach(day => {
        day.addEventListener('dragover', e => {
            e.preventDefault(); 
            day.classList.add('drag-over');
        });
        day.addEventListener('dragleave', () => day.classList.remove('drag-over'));
        day.addEventListener('drop', e => {
            e.preventDefault();
            day.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const newDueDate = day.dataset.date;

            (async () => {
                const token = localStorage.getItem('authToken');
                try {
                    await fetch(`https://inpulse-3zws.onrender.com/api/tasks/${taskId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        // --- FIX: Force the date to be interpreted as UTC ---
                        body: JSON.stringify({ dueDate: new Date(`${newDueDate}T00:00:00.000Z`).toISOString() })
                    });
                    
                    renderProductivity({ view: 'calendar', date: new Date(newDueDate) });
                } catch (err) {
                    console.error("Failed to update task due date:", err);
                }
            })();
        });
    });
}
    async function renderProductivity(options = {}) {
    // This function now handles both 'board' and 'calendar' views.
    const { view = 'board', date = new Date() } = options;
    const page = document.getElementById('page-Productivity');
    page.innerHTML = `<div>Loading Productivity...</div>`;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('https://inpulse-3zws.onrender.com/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const liveTasks = await response.json();

        // 1. Build the header with the view-switcher buttons
        const productivityHeaderHTML = `
            <div class="productivity-header">
                <div class="filter-group">
                    <label for="assignee-filter">Filter by Assignee:</label>
                    <select id="assignee-filter" class="form-input">
                        <option value="">All Members</option>
                        ${liveTeamMembers.map(member => `<option value="${member.id}">${member.firstName} ${member.lastName}</option>`).join('')}
                    </select>
                </div>
                <div class="view-switcher">
                    <button class="btn btn-secondary ${view === 'board' ? 'active' : ''}" data-view="board"><i data-lucide="kanban"></i> Board</button>
                    <button class="btn btn-secondary ${view === 'calendar' ? 'active' : ''}" data-view="calendar"><i data-lucide="calendar-days"></i> Calendar</button>
                </div>
            </div>`;

        let viewContentHTML = '';

        // 2. Conditional logic to build either the board or the calendar
        if (view === 'calendar') {
            const calendarDate = new Date(date);
            if (isNaN(calendarDate.getTime())) {
                page.innerHTML = `<div>Error: Invalid date provided to calendar.</div>`;
                return;
            }
            const month = calendarDate.getUTCMonth();
            const year = calendarDate.getUTCFullYear();
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const monthName = calendarDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
            
            let calendarHTML = `<div class="calendar-container"><div class="calendar-header"><button class="btn-icon" id="prev-month-btn"><i data-lucide="chevron-left"></i></button><h2 data-current-date="${calendarDate.toISOString()}">${monthName} ${year}</h2><button class="btn-icon" id="next-month-btn"><i data-lucide="chevron-right"></i></button></div>`;
            const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            calendarHTML += `<div class="calendar-grid weekdays">${weekdays.map(day => `<div class="weekday">${day}</div>`).join('')}</div><div class="calendar-grid days">`;
            for (let i = 0; i < firstDayOfMonth; i++) { calendarHTML += `<div class="calendar-day not-current-month"></div>`; }
            for (let day = 1; day <= daysInMonth; day++) {
                const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const tasksForDay = liveTasks.filter(task => {
                    if (!task.dueDate) return false;
                    const taskDateStr = new Date(task.dueDate).toISOString().split('T')[0];
                    return taskDateStr === fullDateStr;
                });
                calendarHTML += `<div class="calendar-day" data-date="${fullDateStr}"><div class="day-number">${day}</div><div class="tasks-for-day">`;
                tasksForDay.forEach(task => {
                    // --- FIX: Using liveTeamMembers to find assignee details ---
                    const assignee = liveTeamMembers.find(t => t.id === task.assigneeId);
                    const priorityClass = `priority-${task.priority?.toLowerCase() || 'low'}`;
                    calendarHTML += `<div class="task-chip ${priorityClass}" draggable="true" data-task-id="${task.id}" title="${task.content}"><span class="task-chip-content">${task.content}</span>${assignee ? `<img src="${assignee.avatar}" class="task-assignee-avatar" title="Assigned to ${assignee.firstName}">` : ''}</div>`;
                });
                calendarHTML += `</div></div>`;
            }
            calendarHTML += `</div></div>`;
            viewContentHTML = `<div class="calendar-view-wrapper"><div class="calendar-view">${calendarHTML}</div></div>`;
        } else {
            // --- LOGIC TO BUILD THE KANBAN BOARD VIEW ---
            const createCard = (task) => {
                // --- FIX: Using liveTeamMembers to find assignee details ---
                const assignee = liveTeamMembers.find(m => m.id === task.assigneeId);
                const priorityClass = `priority-${task.priority?.toLowerCase() || 'low'}`;
                let dueDateHTML = '';

                if (task.dueDate) {
                    // --- FIX: Correctly parsing the full ISO date from the database ---
                    const dueDate = new Date(task.dueDate); 
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    const dueSoonDate = new Date();
                    dueSoonDate.setDate(now.getDate() + 3);

                    let dateClass = '';
                    if (dueDate < now) dateClass = 'overdue';
                    else if (dueDate <= dueSoonDate) dateClass = 'due-soon';

                    dueDateHTML = `<div class="card-due-date ${dateClass}">
                                    <i data-lucide="calendar"></i>
                                    <span>${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</span>
                                </div>`;
                }

                return `
                <div class="kanban-card" data-task-id="${task.id}" draggable="true">
                    <div class="card-priority ${priorityClass}"></div>
                    <div class="kanban-card-actions">
                         <button class="btn-icon" data-action="edit-task" title="Edit Task"><i data-lucide="edit-2"></i></button>
                         <button class="btn-icon" data-action="delete-task" title="Delete Task"><i data-lucide="trash-2"></i></button>
                    </div>
                    <p class="card-content">${task.content}</p>
                    <div class="kanban-card-footer">
                        ${dueDateHTML}
                        ${assignee ? `<img src="${assignee.avatar}" class="assignee-avatar" title="Assigned to ${assignee.firstName}">` : ''}
                    </div>
                </div>`;
            };

            const todoTasks = liveTasks.filter(t => t.status === 'TODO');
            const inProgressTasks = liveTasks.filter(t => t.status === 'INPROGRESS');
            const doneTasks = liveTasks.filter(t => t.status === 'DONE');

            viewContentHTML = `<div class="kanban-board"><div class="kanban-column" data-status="TODO"><h3>To Do</h3><div class="kanban-cards">${todoTasks.map(createCard).join('')}</div></div><div class="kanban-column" data-status="INPROGRESS"><h3>In Progress</h3><div class="kanban-cards">${inProgressTasks.map(createCard).join('')}</div></div><div class="kanban-column" data-status="DONE"><h3>Done</h3><div class="kanban-cards">${doneTasks.map(createCard).join('')}</div></div></div>`;
        }
        
        page.innerHTML = `${productivityHeaderHTML}${viewContentHTML}`;
        
        lucide.createIcons();
        if (view === 'calendar') {
            initializeCalendarDND();
        } else {
            initializeKanbanListeners();
        }
    } catch (error) {
        console.error("Error rendering productivity page:", error);
        page.innerHTML = `<div>Could not load tasks. Please try again.</div>`;
    }
}

    async function renderTeam() {
    const page = document.getElementById('page-Team');
    page.innerHTML = `<div>Loading Team Members...</div>`;
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('https://inpulse-3zws.onrender.com/api/api/team', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) throw new Error('Failed to fetch team members');
        
        const liveTeamMembers = await response.json();

        if (currentUser && !liveTeamMembers.find(m => String(m.id) === String(currentUser.id))) {
            liveTeamMembers.push(currentUser);
        }

        const memberRowsHTML = liveTeamMembers.map(member => {
            const avatarUrl = member.avatar || `https://i.pravatar.cc/40?u=${member.email}`;
            
            // --- NEW: Logic to style different roles ---
            let roleClass = 'role-member'; // Default class
            if (member.role === 'Admin') roleClass = 'role-admin';
            if (member.role === 'Owner') roleClass = 'role-owner';

            return `
                <tr>
                    <td>
                        <div class="flex-center" style="gap: 0.75rem;">
                            <img src="${avatarUrl}" class="user-avatar-img" style="width:32px; height:32px; border-radius:50%;">
                            <span>${member.firstName} ${member.lastName}</span>
                        </div>
                    </td>
                    <td>${member.email}</td>
                    
                    <td><span class="role-chip ${roleClass}">${member.role}</span></td>

                    <td>
                        <button class="btn btn-secondary" style="padding: 0.25rem 0.75rem;" data-action="assign-task" data-member-id="${member.id}" data-member-name="${member.firstName} ${member.lastName}">Assign Task</button>
                    </td>
                </tr>`;
        }).join('');

        page.innerHTML = `
            <div class="card">
                <div class="campaign-header">
                    <h3 class="card-title">Your Team Members</h3>
                    <button class="btn btn-primary" id="invite-member-btn">
                        <i data-lucide="user-plus" class="icon-sm"></i><span>Invite Member</span>
                    </button>
                </div>
                <div class="table-wrapper">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>${memberRowsHTML}</tbody>
                    </table>
                </div>
            </div>`;
            
        lucide.createIcons();
    } catch (error) {
        console.error("Error rendering Team page:", error);
        page.innerHTML = `<div>Could not load team members.</div>`;
    }
}

    async function renderMessages() {
    const page = document.getElementById('page-Messages');
    page.innerHTML = `<div>Loading Messages...</div>`;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('https://inpulse-3zws.onrender.com/api/conversations', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch conversations.');
        
        const liveConversations = await response.json();

        if (liveConversations.length === 0) {
            page.innerHTML = `<div class="messages-layout"><div class="conversation-list"><div class="messages-header"><h3>Inbox</h3><button class="btn btn-primary btn-sm" id="new-message-btn" title="New Message"><i data-lucide="plus"></i></button></div><div class="conversation-items"></div></div><div class="message-view"><div class="message-view-placeholder"><i data-lucide="inbox"></i><p>You have no messages yet.</p></div></div></div>`;
            lucide.createIcons();
            return;
        }

        const conversationListHTML = liveConversations.map(convo => {
            // Note: This assumes your API returns a 'participant' object with the other user's details.
            const participant = convo.participant; 
            return `<div class="conversation-item" data-id="${convo.id}">
                        <div class="convo-avatar">
                            <img src="${participant.avatar}" alt="${participant.firstName}">
                        </div>
                        <div class="convo-details">
                            <div class="convo-header">
                                <span class="convo-name">${participant.firstName} ${participant.lastName}</span>
                                <span class="convo-time">${new Date(convo.lastMessageTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p class="convo-preview">${convo.lastMessage}</p>
                        </div>
                    </div>`;
        }).join('');

        page.innerHTML = `
                    <div class="messages-layout">
                        <div class="conversation-list">
                            <div class="messages-header">
                                <h3>Inbox</h3>
                                <button class="btn btn-primary btn-sm" id="new-message-btn" title="New Message">
                                    <i data-lucide="plus"></i>
                                </button>
                            </div>
                            <div class="conversation-items">${conversationListHTML || '<div class="no-conversations"><p>You have no active conversations.</p></div>'}</div>
                        </div>
                        <div class="message-view">
                            <div class="message-view-placeholder">
                                <i data-lucide="messages-square"></i>
                                <p>Select a conversation or start a new one.</p>
                            </div>
                        </div>
                    </div>`;
        lucide.createIcons();
    } catch (error) {
        console.error("Error rendering messages:", error);
        page.innerHTML = `<div>Could not load messages. Please try again later.</div>`;
    }
}

    async function showNewMessageModal() {
    modalContent.innerHTML = `<div class="loader"></div>`;
    mainModal.classList.add('active');

    try {
        // We can reuse the team member data we already fetched
        const usersToList = liveTeamMembers.filter(member => member.id !== currentUser.id);

        if (usersToList.length === 0) {
            modalContent.innerHTML = `<div class="modal-header"><h3 class="modal-title">New Message</h3><button class="modal-close-btn"><i data-lucide="x"></i></button></div><p>There are no other users to message.</p>`;
            lucide.createIcons();
            return;
        }

        const userListHTML = usersToList.map(user => `
            <div class="user-select-item" data-id="${user.id}">
                <img src="${user.avatar || 'https://i.pravatar.cc/40'}" class="user-avatar-img">
                <span>${user.firstName} ${user.lastName}</span>
            </div>
        `).join('');

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title">Start a new conversation</h3>
                <button class="modal-close-btn"><i data-lucide="x"></i></button>
            </div>
            <div class="user-select-list">${userListHTML}</div>
        `;
        lucide.createIcons();

    } catch (error) {
        console.error("Error showing new message modal:", error);
        modalContent.innerHTML = `<p>Could not load users.</p>`;
    }
}

    async function renderMessageDetail(conversationId) {
    const messageView = document.querySelector('.message-view');
    if (!messageView) {
        console.error("Fatal Error: Could not find the .message-view element in the DOM.");
        return;
    }

    messageView.innerHTML = `<div class="loader"></div>`;

    let conversation;
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`https://inpulse-3zws.onrender.com/api/conversations/${conversationId}`, {
             headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
             // Log the server's error message for better debugging
             const errorResult = await response.json().catch(() => ({ error: "Failed to parse error response." }));
             throw new Error(errorResult.error || `Failed to fetch message thread with status ${response.status}.`);
        }
        conversation = await response.json();

    } catch (error) {
        console.error("Error fetching conversation details:", error);
        // Display an error but still render the input form so the user isn't stuck
        messageView.innerHTML = `
            <div class="message-view-header">
                <h3>Error</h3>
            </div>
            <div class="message-area">
                <p style="text-align:center; color:#6b7280; padding: 2rem;">Could not load messages: ${error.message}</p>
            </div>
            <form class="message-input-form" data-conversation-id="${conversationId}">
                <button type="button" class="btn-icon" id="upload-file-btn" title="Attach File"><i data-lucide="paperclip"></i></button>
                <input type="file" id="file-input" style="display: none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/png,image/jpeg">
                <input type="text" name="content" class="form-input" placeholder="Type a message..." autocomplete="off">
                <button type="submit" class="btn btn-primary" title="Send Message"><i data-lucide="send"></i></button>
            </form>
        `;
        lucide.createIcons();
        return;
    }

    // If fetch was successful, proceed to render the full view
    const participant = conversation.participant;
    
    const messagesHTML = conversation.messages.map(msg => {
        const isSent = msg.senderId === currentUser.id;
        let messageContentHTML = '';

        if (msg.type === 'FILE') {
            messageContentHTML = `
                <a href="http://localhost:5001${msg.content}" target="_blank" rel="noopener noreferrer" class="file-link">
                    <i data-lucide="file-text"></i>
                    <span>${msg.fileName || 'View File'}</span>
                </a>`;
        } else {
            messageContentHTML = `<p>${msg.content}</p>`;
        }

        return `<div class="message-bubble-wrapper ${isSent ? 'sent' : 'received'}">
                    <div class="message-bubble">${messageContentHTML}</div>
                    <span class="message-timestamp">${new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>`;
    }).join('');

    messageView.innerHTML = `
        <div class="message-view-header">
            <h3>${participant.firstName} ${participant.lastName}</h3>
        </div>
        <div class="message-area">${messagesHTML}</div>
        <form class="message-input-form" data-conversation-id="${conversationId}">
            <button type="button" class="btn-icon" id="upload-file-btn" title="Attach File"><i data-lucide="paperclip"></i></button>
            <input type="file" id="file-input" style="display: none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/png,image/jpeg">
            <input type="text" name="content" class="form-input" placeholder="Type a message..." autocomplete="off">
            <button type="submit" class="btn btn-primary" title="Send Message"><i data-lucide="send"></i></button>
        </form>
    `;
    
    lucide.createIcons();
    
    const messageArea = document.querySelector('.message-area');
    if (messageArea) {
        messageArea.scrollTop = messageArea.scrollHeight;
    }
}

    async function renderSettings() {
    const page = document.getElementById('page-Settings');
    page.innerHTML = `<div>Loading settings...</div>`;

    try {
        const token = localStorage.getItem('authToken');

        // --- Fetch all the data we need for the page ---
        const userResponse = await fetch('http://localhost:5001/api/user/me', { headers: { 'Authorization': `Bearer ${token}` } });
        const integrationsResponse = await fetch('https://inpulse-3zws.onrender.com/api/integrations', { headers: { 'Authorization': `Bearer ${token}` } });
        
        if (!userResponse.ok || !integrationsResponse.ok) {
            throw new Error('Failed to load settings data.');
        }

        const userData = await userResponse.json();
        
        // --- THIS IS THE CORRECTED LINE ---
        const existingIntegrations = await integrationsResponse.json();

        // --- Build the Profile Section HTML (with 'active' class) ---
        const profileHTML = `
            <div class="settings-section active" id="settings-profile">
                <h3>Public Profile</h3>
                <div class="profile-card-header">
                    <label for="avatar-upload" class="profile-avatar-wrapper" title="Click to change picture">
                        <img src="${userData.avatar || 'https://i.pravatar.cc/150'}" alt="Your Avatar" id="profile-page-avatar" class="profile-avatar-img">
                        <div class="profile-avatar-edit-overlay"><i data-lucide="camera"></i></div>
                    </label>
                    <input type="file" id="avatar-upload" name="avatar" accept="image/png, image/jpeg" hidden>
                    <div class="profile-header-info">
                        <h4 class="profile-header-name">${userData.firstName} ${userData.lastName}</h4>
                        <p class="profile-header-email">${userData.email}</p>
                    </div>
                </div>

                <form id="profile-settings-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="firstName">First Name</label>
                            <input type="text" id="firstName" name="firstName" class="form-input" value="${userData.firstName}">
                        </div>
                        <div class="form-group">
                            <label for="lastName">Last Name</label>
                            <input type="text" id="lastName" name="lastName" class="form-input" value="${userData.lastName}">
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" class="form-input" value="${userData.email}" disabled>
                    </div>
                    <div class="form-footer">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>`;

        const passwordFormHTML = `
            <div class="settings-section" id="settings-password">
                <h3>Change Password</h3>
                <form id="change-password-form">
                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" name="currentPassword" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" name="newPassword" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm New Password</label>
                        <input type="password" id="confirmPassword" name="confirmPassword" class="form-input" required>
                    </div>
                    <div class="form-footer">
                        <button type="submit" class="btn btn-primary">Change Password</button>
                    </div>
                </form>
            </div>`;
        
        const facebookIntegration = existingIntegrations.find(i => i.platform === 'Facebook');
        let facebookButtonHTML = facebookIntegration
            ? `<button class="btn btn-danger-outline" data-action="disconnect-integration" data-id="${facebookIntegration.id}">Disconnect</button>`
            : `<button class="btn btn-secondary" data-action="connect-integration" data-platform="facebook">Connect</button>`;

        const integrationsHTML = `
            <div class="settings-section" id="settings-integrations">
                <h3>Integrations</h3>
                <p>Connect InPulse to your favorite third-party services.</p>
                <div class="integration-list">
                    <div class="integration-item">
                        <div class="integration-logo-container">
                             <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="#1877F2"></path><path d="M15.5 12H13.5V17H11V12H9.5V10H11V8.5C11 7.12 11.89 6 13.5 6H15.5V8H14C13.45 8 13 8.45 13 9V10H15.5L15 12H13V12H15.5Z" fill="white"></path></svg>
                        </div>
                        <div class="integration-details">
                            <h4>Facebook</h4>
                            <p>${facebookIntegration ? `Connected as ${facebookIntegration.accountName}` : 'Sync your ad campaigns and page analytics.'}</p>
                        </div>
                        ${facebookButtonHTML}
                    </div>
                </div>
            </div>`;

        const billingHTML = (() => {
        let statusCardHTML = '';
        const userPlan = userData.plan || 'Basic';

        // Special case for you, the founder/owner
        if (userData.role === 'Owner') {
            statusCardHTML = `
                <div class="billing-section-card">
                    <div>
                        <h4>Founder Account</h4>
                        <p>You have permanent access to all Enterprise features. Thank you!</p>
                    </div>
                </div>
            `;
        } else if (userPlan === 'Trial') {
            const endDate = new Date(userData.planExpiresAt);
            const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
            const progressPercent = ((30 - daysLeft) / 30) * 100;
            
            statusCardHTML = `
                <div class="trial-status-card">
                    <h4>You are on your 30-Day Free Trial</h4>
                    <p>You have <strong>${daysLeft > 0 ? daysLeft : 0} days left</strong> with full access to Pro features.</p>
                    <div class="trial-progress">
                        <div class="trial-progress-bar-background">
                            <div class="trial-progress-bar-foreground" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                </div>
            `;
        } else if (userPlan === 'Pro') {
            const renewalDate = userData.planExpiresAt ? `Your plan renews on ${new Date(userData.planExpiresAt).toLocaleDateString()}.` : '';
            statusCardHTML = `
                <div class="billing-section-card">
                    <div>
                        <h4>Your Current Plan</h4>
                        <p>You are on the <strong class="text-primary">Pro Plan</strong>. ${renewalDate}</p>
                    </div>
                    <button class="btn btn-secondary">Manage Subscription</button>
                </div>
            `;
        } else { // This covers the 'Basic' plan
            statusCardHTML = `
                <div class="billing-section-card">
                    <div>
                        <h4>Your Current Plan</h4>
                        <p>You are on the free <strong>Basic Plan</strong>. Upgrade to unlock powerful AI features.</p>
                    </div>
                    <button class="btn btn-primary">Upgrade to Pro</button>
                </div>
            `;
        }

        // This returns the complete HTML for the entire billing section
        return `
            <div class="settings-section" id="settings-billing">
                <h3>Manage Subscription</h3>
                <p>Update your plan and payment details.</p>
                ${statusCardHTML}
            </div>
        `;
    })();

        let teamManagementHTML = '';
        if (userData.role === 'Admin' || userData.role === 'Owner') {
            // Fetch team members only if the user is an admin
            const teamResponse = await fetch('https://inpulse-3zws.onrender.com/api/team', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!teamResponse.ok) throw new Error('Failed to fetch team data.');
            const allTeamMembers = await teamResponse.json();

            if (!allTeamMembers.find(m => String(m.id) === String(userData.id))) {
        allTeamMembers.push(userData);
    }

            const memberRows = allTeamMembers.map(member => `
                <tr>
                    <td>
                        <div class="flex-center" style="gap: 0.75rem;">
                            <img src="${member.avatar || 'https://i.pravatar.cc/40'}" class="user-avatar-img" style="width:32px; height:32px; border-radius:50%;">
                            <span>${member.firstName} ${member.lastName}</span>
                        </div>
                    </td>
                    <td>${member.email}</td>
                    <td>${member.role}</td>
                    <td>
                        ${member.id !== userData.id ? 
                            `<button class="btn btn-danger-outline btn-sm" data-action="delete-user" data-id="${member.id}">Delete</button>` : ''
                        }
                    </td>
                </tr>
            `).join('');

            teamManagementHTML = `
                <div class="settings-section" id="settings-team">
                    <h3>Team Management</h3>
                    <p>Add, view, and remove team members from your workspace.</p>
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
                            <tbody>${memberRows}</tbody>
                        </table>
                    </div>
                    <div class="form-footer">
                        <button class="btn btn-primary" id="add-member-btn">Add New Member</button>
                    </div>
                </div>`;
        }

        // --- Assemble the final page layout ---
        page.innerHTML = `
            <div class="settings-layout">
                <nav class="settings-nav">
                    <a href="#profile" class="settings-nav-link active" data-section="profile">Profile</a>
                    <a href="#password" class="settings-nav-link" data-section="password">Security</a>
                    <a href="#team" class="settings-nav-link" data-section="team">Team</a>
                    <a href="#billing" class="settings-nav-link" data-section="billing">Billing</a> 
                    <a href="#integrations" class="settings-nav-link" data-section="integrations">Integrations</a>
                </nav>
                <div class="settings-content">
                    ${profileHTML}
                    ${passwordFormHTML}
                    ${teamManagementHTML}
                    ${billingHTML}
                    ${integrationsHTML}
                </div>
            </div>`;
        
        lucide.createIcons();
    } catch (error) {
        console.error(error);
        page.innerHTML = `<div>Could not load settings.</div>`;
    }
}

    function initializeKanbanListeners(){
    document.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('dragstart', e => { 
            e.target.classList.add('dragging'); 
        });
        card.addEventListener('dragend', e => { 
            e.target.classList.remove('dragging'); 
        });
    });

    document.querySelectorAll('.kanban-column').forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(column, e.clientY);
            const draggingCard = document.querySelector('.kanban-card.dragging');
            if (draggingCard) { // Ensure draggingCard exists
                const cardContainer = column.querySelector('.kanban-cards');
                if (afterElement == null) {
                    cardContainer.appendChild(draggingCard);
                } else {
                    cardContainer.insertBefore(draggingCard, afterElement);
                }
            }
        });

        column.addEventListener('drop', e => {
            e.preventDefault();
            const draggingCard = document.querySelector('.kanban-card.dragging');
            if (draggingCard) {
                const taskId = parseInt(draggingCard.dataset.taskId);
                const newStatus = column.dataset.status;

                // Update the central data store
                const taskToUpdate = mockData.tasks.find(t => t.id === taskId);
                if (taskToUpdate) {
                    taskToUpdate.status = newStatus;
                }
                
                if (newStatus === 'done') triggerConfetti();
                draggingCard.classList.remove('dragging');
            }
        });
    });

    function getDragAfterElement(column, y) {
        const draggableElements = [...column.querySelectorAll('.kanban-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}
    
    // --- INTERACTIVITY & EVENT LISTENERS ---
    document.getElementById('sidebar-toggle-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
    navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); switchPage(link.dataset.page); }));

    // --- CORRECTED MODAL AND GLOBAL CLICK HANDLER ---
document.addEventListener('click', e => {
    // --- Logic for closing any modal ---
    // Closes the modal if the 'x' or a 'Cancel' button is clicked
    if (e.target.closest('.modal-close-btn')) {
        e.preventDefault();
        hideModal();
    }
    // Closes the modal if the dark overlay is clicked
    if (e.target.matches('#main-modal')) {
        hideModal();
    }

    const notificationIcon = e.target.closest('.notification-icon');
    const notificationPanel = document.getElementById('notification-panel');

    if (notificationIcon) {
        // If the bell icon is clicked, toggle the panel's visibility
        const isVisible = notificationPanel.classList.toggle('active');

        // If the panel just became visible, mark notifications as read
        if (isVisible && document.querySelector('.notification-dot').style.display !== 'none') {
            (async () => {
                const token = localStorage.getItem('authToken');
                await fetch('https://inpulse-3zws.onrender.com/api/notifications/mark-as-read', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                fetchAndRenderNotifications(); // Refresh the UI
            })();
        }
    } else if (!e.target.closest('#notification-panel')) {
        // If a click happens anywhere else that is NOT the panel, hide it
        if (notificationPanel) {
            notificationPanel.classList.remove('active');
        }
    }

    const dateIcon = e.target.closest('.date-input-icon');
    if (dateIcon) {
        // Find the date input field next to the icon and force it to open
        const wrapper = dateIcon.closest('.date-input-wrapper');
        const dateInput = wrapper.querySelector('input[type="date"]');

        // This is the command that forces the calendar to show
        if(dateInput) {
            try {
                dateInput.showPicker();
            } catch (error) {
                console.error("Browser doesn't support .showPicker()", error);
            }
        }
    }

    // Handles the click on the "New Message" button in the message page header
    if (e.target.closest('#new-message-btn')) {
        showNewMessageModal();
    }

    // Handles the click on a user inside the "New Message" modal
    const userSelectItem = e.target.closest('.user-select-item');
if (userSelectItem) {
    const participantId = userSelectItem.dataset.id;
    
    (async () => {
        try {
            const token = localStorage.getItem('authToken');
            // Step 1: Start the conversation and get the new conversationId
            const startResponse = await fetch('https://inpulse-3zws.onrender.com/api/conversations/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ participantId })
            });

            const startResult = await startResponse.json();
            if (!startResponse.ok) throw new Error(startResult.error);
            
            const newConversationId = startResult.conversationId;

            // Step 2: Hide the modal and immediately render the new, empty chat view on the right
            hideModal();
            await renderMessageDetail(newConversationId);

            // Step 3: Fetch the updated list of all conversations
            const listResponse = await fetch('https://inpulse-3zws.onrender.com/api/api/conversations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const liveConversations = await listResponse.json();

            // Step 4: Surgically update ONLY the conversation list on the left
            const conversationListContainer = document.querySelector('.conversation-items');
            if (conversationListContainer) {
                const conversationListHTML = liveConversations.map(convo => {
                    const participant = convo.participant;
                    return `<div class="conversation-item" data-id="${convo.id}">
                                <div class="convo-avatar">
                                    <img src="${participant.avatar}" alt="${participant.firstName}">
                                </div>
                                <div class="convo-details">
                                    <div class="convo-header">
                                        <span class="convo-name">${participant.firstName} ${participant.lastName}</span>
                                        <span class="convo-time">${new Date(convo.lastMessageTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p class="convo-preview">${convo.lastMessage}</p>
                                </div>
                            </div>`;
                }).join('');
                conversationListContainer.innerHTML = conversationListHTML;
            }
            
            // Step 5: Highlight the newly created conversation in the refreshed list
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id === newConversationId);
            });

        } catch (error) {
            console.error('Error starting conversation:', error);
            alert(`Error starting conversation: ${error.message}`);
        }
    })();
}
    // --- Other global click actions can be moved here if needed ---
});

const signOutBtn = document.getElementById('sign-out-btn');
if (signOutBtn) {
    signOutBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent any default button behavior

        // *** FIX: This line is now active ***
        // This clears the user's session token from the browser's storage.
        localStorage.removeItem('authToken');
        
        // This redirects the user to the login page.
        window.location.href = 'login.html'; 
    });
}

    // REVISED AND COMPLETE CLICK LISTENER
mainAppContent.addEventListener('click', e => {
    // --- InSight Page Logic ---
    if (e.target.closest('#generate-report-btn')) {
         const btn = e.target.closest('#generate-report-btn');
         btn.innerHTML = `<div class="loader"></div><span>Analyzing Data...</span>`;
         btn.disabled = true;
         setTimeout(() => { displayInsightReport(); }, 1500);
    }
    
    // --- NEW: Logic to handle tab switching on the Settings page ---
    const settingsLink = e.target.closest('.settings-nav-link');
    if (settingsLink) {
    e.preventDefault();
    const sectionId = settingsLink.dataset.section;

    // Remove 'active' class from all links and sections
    document.querySelectorAll('.settings-nav-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.settings-section').forEach(section => section.classList.remove('active'));

    // Add 'active' class to the clicked link and the corresponding section
    settingsLink.classList.add('active');
    document.getElementById(`settings-${sectionId}`).classList.add('active');
}

    // --- NEW: Logic for the "Connect" button ---
    const connectBtn = e.target.closest('[data-action="connect-integration"]');
if (connectBtn) {
    const platform = connectBtn.dataset.platform;
    const token = localStorage.getItem('authToken');

    if (!token) {
        alert("Authentication error. Please log in again.");
        return;
    }

    // --- THIS IS THE KEY CHANGE ---
    // Instead of a fetch call, we redirect the entire page to the backend auth route.
    // The backend will then redirect the user to Facebook.
    // We add the JWT token to the URL so the backend can identify the user.
    window.location.href = `http://localhost:5001/api/integrations/auth/${platform}?token=${token}`;
}

    // --- ADD THIS BLOCK TO HANDLE CLICKS ON A CONVERSATION ---
    const conversationItem = e.target.closest('.conversation-item');
    if (conversationItem) {
        // First, remove the 'active' class from any other conversation item
        document.querySelectorAll('.conversation-item').forEach(item => item.classList.remove('active'));
        
        // Then, add the 'active' class to the one that was just clicked
        conversationItem.classList.add('active');
        
        // Now, call the function to fetch and render this conversation's details
        // The conversation ID is stored in its 'data-id' attribute
        renderMessageDetail(conversationItem.dataset.id);
    }

    // Handler for the new "Add New Member" button
    if (e.target.id === 'add-member-btn') {
        // This reuses the invitation modal we already designed!
        showInviteModal();
    }

    // Handler for the new "Delete" user button
    const deleteUserBtn = e.target.closest('[data-action="delete-user"]');
    if (deleteUserBtn) {
        const userIdToDelete = deleteUserBtn.dataset.id;
        if (confirm('Are you sure you want to permanently delete this team member? This action cannot be undone.')) {
            (async () => {
                try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`https://inpulse-3zws.onrender.com/api/team/${userIdToDelete}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        alert('User deleted successfully.');
                        renderSettings(); // Re-render the settings page to show the updated list
                    } else {
                        const result = await response.json();
                        throw new Error(result.error || 'Failed to delete user.');
                    }
                } catch (err) {
                    console.error('Error deleting user:', err);
                    alert(err.message);
                }
            })();
        }
    }

        const disconnectBtn = e.target.closest('[data-action="disconnect-integration"]');
    if (disconnectBtn) {
        const integrationId = disconnectBtn.dataset.id;
    if (confirm('Are you sure you want to disconnect this integration?')) {
        (async () => {
            const token = localStorage.getItem('authToken');
            await fetch(`https://inpulse-3zws.onrender.com/api/integrations/${integrationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            renderSettings(); // Re-render to show the change
        })();
    }
}

        if (e.target.closest('#generate-report-btn')) {
        const btn = e.target.closest('#generate-report-btn');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="refresh-cw" class="animate-spin"></i><span>Analyzing Data...</span>`;
        lucide.createIcons();

        (async () => {
            try {
                const token = localStorage.getItem('authToken');
                // It fetches from the API...
                const response = await fetch('https://inpulse-3zws.onrender.com/api/insight/report', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to generate report');
                
                const reportData = await response.json();
                
                // ...and passes the LIVE data to the correct display function.
                displayInsightReport(reportData);

            } catch (err) {
                console.error("Error generating report:", err);
                document.getElementById('insight-content').innerHTML = `<div>Could not generate report. Please try again later.</div>`;
            }
        })();
    }

// --- NEW: Calendar Navigation Logic ---
if (e.target.closest('#prev-month-btn') || e.target.closest('#next-month-btn')) {
    const header = document.querySelector('.calendar-header h2');
    if (!header) return; // Safety check

    // Get the full date string we stored earlier
    const currentDateStr = header.dataset.currentDate;
    const currentMonthDate = new Date(currentDateStr);

    // Check if the date is valid before proceeding
    if (isNaN(currentMonthDate.getTime())) {
        console.error("Could not parse the current date for navigation.");
        return;
    }

    let newDate;
    if (e.target.closest('#prev-month-btn')) {
        // Go to the previous month
        newDate = new Date(currentMonthDate.setUTCMonth(currentMonthDate.getUTCMonth() - 1));
    } else {
        // Go to the next month
        newDate = new Date(currentMonthDate.setUTCMonth(currentMonthDate.getUTCMonth() + 1));
    }

    // Re-render the calendar for the new month
    renderProductivity({ view: 'calendar', date: newDate });
}

    // --- Sync Data Button Logic ---
if (e.target.closest('#sync-data-btn')) {
    const btn = e.target.closest('#sync-data-btn');
    
    // 1. Change button to "syncing" state
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="refresh-cw" class="animate-spin"></i><span>Syncing...</span>`;
    lucide.createIcons(); // Re-render the icon

    // 2. Simulate a network delay
    setTimeout(() => {
        // 3. Modify the underlying mock data
        simulateCampaignDataSync();
        
        // 4. Re-render the entire campaigns page with the new data
        // This will also reset the button to its original state.
        renderCampaigns();
    }, 1500); // 1.5 second delay
}

    const assignTaskBtn = e.target.closest('[data-action="assign-task"]');
if (assignTaskBtn) {
    const memberId = assignTaskBtn.dataset.memberId;
    const memberName = assignTaskBtn.dataset.memberName;
    showAssignTaskModal(memberId, memberName);
}

if (e.target.closest('#sync-facebook-btn')) {
    const btn = e.target.closest('#sync-facebook-btn');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="refresh-cw" class="animate-spin"></i><span>Syncing...</span>`;
    lucide.createIcons();

    (async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/sync/facebook', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const result = await response.json();

            if (response.ok) {
                alert(result.message || 'Facebook campaigns synced successfully!');
                renderCampaigns(); // Re-render the page to show the new data
            } else {
                throw new Error(result.error || 'Failed to sync campaigns.');
            }
        } catch (err) {
            alert(err.message);
            // Re-enable the button on failure
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="refresh-cw"></i><span>Sync Facebook Data</span>`;
            lucide.createIcons();
        }
    })();
}

    if (e.target.id === 'change-picture-btn') {
        // Simulate changing the picture by getting a new random avatar
        const newAvatarId = `user${Date.now()}`; // Creates a unique ID for a new image
        const newAvatarUrl = `https://i.pravatar.cc/150?u=${newAvatarId}`;
        
        // Update the avatar on the settings page
        document.getElementById('profile-page-avatar').src = newAvatarUrl;
        // Update the avatar in the main header
        document.querySelector('.header .user-avatar-img').src = newAvatarUrl.replace('150', '40');
        // Update the mock data so the change persists if you navigate away and back
        mockData.currentUser.avatar = newAvatarUrl;
        
        showToast('Profile picture updated!');
    }

// This new logic correctly handles all actions on a Kanban card
const productivityCard = e.target.closest('.kanban-card');
if (productivityCard) {
    const taskId = productivityCard.dataset.taskId;
    const actionTarget = e.target.closest('[data-action]');

    if (actionTarget) {
        const action = actionTarget.dataset.action;

        if (action === 'edit-task') {
            renderEditTaskModal(taskId); // Call the new function
            return;
        }

        if (action === 'delete-task') {
            // --- NEW DELETE LOGIC ---
            if (confirm('Are you sure you want to delete this task?')) {
                (async () => {
                    try {
                        const token = localStorage.getItem('authToken');
                        const response = await fetch(`https://inpulse-3zws.onrender.com/api/tasks/${taskId}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (response.ok) {
                            // If successful, remove the card from the UI immediately
                            productivityCard.remove();
                        } else {
                            alert('Failed to delete task.');
                        }
                    } catch (err) {
                        console.error('Error deleting task:', err);
                        alert('An error occurred while deleting the task.');
                    }
                })();
            }
            return;
            // --- END NEW DELETE LOGIC ---
        }

        if (action === 'open-task-modal') {
            // This can be a future enhancement
            // renderTaskDetailModal(taskId);
            return;
        }
    }
}

// This handles actions inside the modal, which are separate from the card itself
const actionBtnInModal = e.target.closest('.modal-content [data-action]');
if (actionBtnInModal) {
    const action = actionBtnInModal.dataset.action;
    const taskId = parseInt(actionBtnInModal.dataset.taskId);

    if (action === 'delete-task') {
        if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            const taskIndex = mockData.tasks.findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                mockData.tasks.splice(taskIndex, 1);
                hideModal();
                const activeView = document.querySelector('.view-switcher .btn.active')?.dataset.view || 'board';
                renderProductivity({ view: activeView });
            }
        }
    }

    if (action === 'extend-task') {
        const modal = actionBtnInModal.closest('.modal-content');
        modal.querySelector('.hidden-date-input')?.click();
    }
}


    const viewBtn = e.target.closest('.view-switcher .btn');
    if (viewBtn && !viewBtn.classList.contains('active')) {
    const view = viewBtn.dataset.view;

    // --- START OF CORRECTION ---
    // We now create the options object first...
    const options = { view: view };

    // ...and if the view is 'calendar', we ensure a date is included.
    if (view === 'calendar') {
        options.date = new Date(); // Pass the current date as the default
    }

    // Now call the function with the complete options object.
    renderProductivity(options);
    // --- END OF CORRECTION ---
}

     if (e.target.closest('#generate-task-btn')) {
        const btn = e.target.closest('#generate-task-btn');
        const { content, assigneeId } = btn.dataset;

        const newTaskId = Date.now();
        const newTask = {
            id: newTaskId,
            content: content,
            status: 'todo',
            assigneeId: parseInt(assigneeId),
            startDate: null, 
            dueDate: null
        };
        mockData.tasks.push(newTask);
        
        // Add to UI immediately and show confirmation
        if (e.target.closest('#generate-task-btn')) {
        const btn = e.target.closest('#generate-task-btn');
        const { content, assigneeId } = btn.dataset;

        const newTaskId = Date.now(); // Note: This creates a temporary ID for mock purposes. The backend assigns the real one.
        const newTask = {
            id: newTaskId,
            content: content,
            status: 'todo',
            assigneeId: assigneeId, // assigneeId is already a string (UUID)
            startDate: null, 
            dueDate: null
        };
        mockData.tasks.push(newTask);
        
        // Add to UI immediately and show confirmation
        const todoList = document.getElementById('dashboard-todo-list');
        if (todoList) {
            const li = document.createElement('li');
            li.className = 'todo-item';
            li.dataset.taskId = newTaskId;
            li.innerHTML = `<span>${content}</span>
                            <button class="todo-action-btn" data-action="done" title="Complete Task">
                                <i data-lucide="check-circle-2" class="icon-xs"></i>
                            </button>`;
            todoList.appendChild(li);
            lucide.createIcons();
        }
        
        // --- FIX: Use liveTeamMembers to find the assignee ---
        const assignee = liveTeamMembers.find(t => t.id === assigneeId);
        if (assignee) {
            showToast(`Task assigned to ${assignee.firstName}.`);
        } else {
            showToast('Task created.');
        }

        btn.textContent = 'Task Created!';
        btn.disabled = true;
        return; 
    }
}

    // REPLACED: Logic for the new suggested questions
    if (e.target.closest('.suggested-question-btn')) {
        const btn = e.target.closest('.suggested-question-btn');
        const questionType = btn.dataset.question;
        const questionText = btn.textContent;
        const chatLog = document.getElementById('ai-chat-log-area');
        const report = mockData.insightReport; //

        chatLog.innerHTML += `<div class="ai-chat-message user-message">${questionText}</div>`;
        chatLog.scrollTop = chatLog.scrollHeight;

        setTimeout(() => {
            let aiResponseHTML = '';
            if (questionType === 'attribution') {
                aiResponseHTML = `The report shows that <strong>${report.attributionInsight.platform}</strong> plays a key role in starting customer journeys. Even if it doesn't get the final click, it's vital for building awareness that leads to sales on other channels.`;
            } else if (questionType === 'product_marketing') {
                aiResponseHTML = `The <strong>"${report.productMarketingInsight.campaignName}"</strong> campaign is the most effective for selling <strong>"${report.productMarketingInsight.productName}"</strong>. The average ad cost to sell one unit via this campaign is about <strong>$${report.productMarketingInsight.cost}</strong>.`;
            } else if (questionType === 'inventory') {
                aiResponseHTML = `You have a high stock of <strong>"${report.inventoryInsight.productName}"</strong>. I recommend creating a high-visibility campaign, like a '20% Off Flash Sale' on Google Ads or Facebook, to turn that inventory back into cash flow.`;
            }
            
            chatLog.innerHTML += `<div class="ai-chat-message ai-response">${aiResponseHTML}</div>`;
            lucide.createIcons();
            chatLog.scrollTop = chatLog.scrollHeight;
        }, 1000);
    }

    if (e.target.closest('#invite-member-btn')) showInviteModal();
    
    // --- NEW: Tab switching logic ---
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
        const tabName = tabBtn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabBtn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-content-${tabName}`);
        });
    }
    if (e.target.closest('#upload-file-btn')) {
        document.getElementById('file-input').click();
    }
    
    // --- Invite Member Modal Button ---
    if (e.target.closest('#invite-member-btn')) {
        showInviteModal();
    }
    // --- NEW: File upload button logic ---
    if (e.target.closest('#upload-file-btn')) {
        document.getElementById('file-input').click(); // Programmatically click the hidden file input
    }

    if (e.target.closest('.modal-close-btn')) {
        hideModal();
    }

    // --- Dashboard To-Do List "Done" Button Logic (New) ---
    const todoDoneBtn = e.target.closest('.todo-action-btn[data-action="done"]');
    if (todoDoneBtn) {
    const todoItem = todoDoneBtn.closest('.todo-item');
    
    // --- FINAL FIX: Remove parseInt and use the ID as a string ---
    const taskId = todoItem.dataset.taskId; 

    (async () => {
    try {
        if (!taskId) {
            return alert('Could not complete task due to a missing Task ID.');
        }

        const token = localStorage.getItem('authToken');
        const response = await fetch(`https://inpulse-3zws.onrender.com/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: 'DONE' })
        });

        if (response.ok) {
            // 1. Find the task in our local cache and update its status
            const taskInCache = liveDataCache.tasks.find(t => t.id === taskId);
            if (taskInCache) {
                taskInCache.status = 'DONE';
            }
            
            // 2. Trigger confetti and call our new function to re-render the widgets
            triggerConfetti();
            updateDashboardWidgets();
            recalculateAndUpdateCompletionWidget();

        } else {
            alert('Failed to update task. The server reported an error.');
        }
    } catch (err) {
        console.error("Error completing task:", err);
        alert('An error occurred while completing the task.');
    }
})();
}
});

mainAppContent.addEventListener('change', e => {
    // Logic for the productivity page filter
    if (e.target.id === 'assignee-filter') {
        const assigneeId = e.target.value;
        const activeView = document.querySelector('.view-switcher .btn.active')?.dataset.view || 'board';
        renderProductivity({ view: activeView, filters: { assigneeId: assigneeId } });
    }

    if (e.target.id === 'platform-filter') {
    const platform = e.target.value;
    renderAnalytics({ platformFilter: platform });
    }

    if (e.target.id === 'source-filter') {
    const source = e.target.value;
    renderSales({ sourceFilter: source });
    }

    if (e.target.matches('#platform-filter')) {
        const platform = e.target.value;
        renderAnalytics({ platformFilter: platform });
    }

    if (e.target.matches('#source-filter')) {
        const source = e.target.value;
        renderSales({ sourceFilter: source });
    }


    if (e.target.id === 'avatar-upload') {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file); // Must match Multer's field name

    (async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/upload/avatar', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Upload failed');
            }

            const result = await response.json();

            if (result.newAvatarUrl) {
                // Add a cache-buster so the browser always fetches the fresh image
                const freshUrl = result.newAvatarUrl + '?t=' + Date.now();

                // 1. Update the BIG avatar on the Settings page
                const profileAvatar = document.getElementById('profile-page-avatar');
                if (profileAvatar) profileAvatar.src = freshUrl;

                // 2. Update the SMALL avatar in the main header
                const headerAvatar = document.querySelector('.user-avatar-img');
                if (headerAvatar) headerAvatar.src = freshUrl;

                // 3. Keep the global user object in sync (store clean URL)
                if (currentUser) currentUser.avatar = result.newAvatarUrl;
            }

        } catch (error) {
            console.error('Avatar upload error:', error);
            alert(`Error uploading avatar: ${error.message}`);
        }
    })();
}

    if (e.target.id === 'file-input') {
        console.log('#file-input change event was triggered!'); // Debugging log

        const file = e.target.files[0];
        const form = e.target.closest('form');
        
        if (!file || !form) {
            console.error('Could not find file or form element.');
            return;
        }

        const conversationId = form.dataset.conversationId;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', conversationId);

        (async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch('https://inpulse-3zws.onrender.com/api/messages/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error('File upload failed on the server.');
                }
                
                // On success, re-render the conversation
                await renderMessageDetail(conversationId);

            } catch (err) {
                console.error("Error during file upload fetch:", err);
                alert("Failed to upload file. Please try again.");
            } finally {
                e.target.value = '';
            }
        })();
    }

    // NEW: Logic for extending a task due date
    if (e.target.classList.contains('hidden-date-input')) {
        const newDueDate = e.target.value;
        const taskId = parseInt(e.target.dataset.taskId);
        const taskToUpdate = mockData.tasks.find(t => t.id === taskId);

        if (taskToUpdate) {
            taskToUpdate.dueDate = newDueDate;
            hideModal();
            showToast('Task due date has been updated!');
            // Re-render the productivity page to show the new date
            const activeView = document.querySelector('.view-switcher .btn.active')?.dataset.view || 'board';
            renderProductivity({ view: activeView });
        }
    }
});

    // REVISED AND COMPLETE SUBMIT LISTENER
document.addEventListener('submit', e => {
    e.preventDefault();
    // --- NEW BLOCK FOR THE MESSAGE FORM ---
    if (e.target.matches('.message-input-form')) {
        (async () => {
            const form = e.target;
            const input = form.querySelector('input[name="content"]');
            const content = input.value.trim();
            const conversationId = form.dataset.conversationId;

            if (content) {
                const messageArea = document.querySelector('.message-area');
                
                // Optimistic UI Update: Add the message to the UI immediately
                const optimisticMessageHTML = `
                    <div class="message-bubble-wrapper sent">
                        <div class="message-bubble"><p>${content}</p></div>
                        <span class="message-timestamp">Sending...</span>
                    </div>`;
                messageArea.insertAdjacentHTML('beforeend', optimisticMessageHTML);
                messageArea.scrollTop = messageArea.scrollHeight;
                input.value = ''; // Clear the input

                try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch('https://inpulse-3zws.onrender.com/api/api/messages', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ conversationId, content })
                    });

                    if (!response.ok) {
                        // Handle error, maybe show a "Failed to send" message
                        console.error('Failed to send message');
                        // Find the optimistic message and mark it as failed
                        const failedMessage = messageArea.querySelector('.message-bubble-wrapper:last-child .message-timestamp');
                        if (failedMessage) failedMessage.textContent = 'Failed';
                    } else {
                        const newMessage = await response.json();
                        // Update the timestamp with the real one from the server
                        const sentMessage = messageArea.querySelector('.message-bubble-wrapper:last-child .message-timestamp');
                        if(sentMessage) sentMessage.textContent = new Date(newMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    }

                } catch (err) {
                    console.error("Error sending message:", err);
                    const failedMessage = messageArea.querySelector('.message-bubble-wrapper:last-child .message-timestamp');
                    if (failedMessage) failedMessage.textContent = 'Failed';
                }
            }
        })();
    }

    if (e.target.id === 'change-password-form') {
    (async () => {
        const form = e.target;
        const currentPassword = form.querySelector('#currentPassword').value;
        const newPassword = form.querySelector('#newPassword').value;
        const confirmPassword = form.querySelector('#confirmPassword').value;

        // Client-side validation
        if (newPassword !== confirmPassword) {
            alert("New passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
             alert("New password must be at least 8 characters long.");
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/user/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error);
            }
            
            alert('Password changed successfully!');
            form.reset(); // Clear the form fields

        } catch (error) {
            console.error('Password change error:', error);
            alert(`Failed to change password: ${error.message}`);
        }
    })();
}

    if (e.target.id === 'invite-form') {
    (async () => {
        const form = e.target;
        const email = form.querySelector('input[type="email"]').value;
        const role = form.querySelector('select').value;
        const token = localStorage.getItem('authToken');

        try {
            const response = await fetch('https://inpulse-3zws.onrender.com/api/api/team/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email, role })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to send invite.');
            }
            
            alert('Invitation sent successfully!');
            hideModal();
        } catch (error) {
            alert(error.message);
        }
    })();
}

    if (e.target.id === 'profile-settings-form') {
    (async () => {
        const formData = new FormData(e.target);
        const data = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
        };

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('https://inpulse-3zws.onrender.com/api/user/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const updatedUser = await response.json();
                // Also update the name in the main header
                document.getElementById('user-name-span').textContent = `${updatedUser.firstName} ${updatedUser.lastName}`;
                alert('Profile updated successfully!'); // Or use a more elegant toast notification
            } else {
                alert('Failed to update profile.');
            }
        } catch (err) {
            console.error("Error updating profile:", err);
        }
    })();
}

    // This part handles the edit-task-form
    if (e.target.id === 'edit-task-form') {
        (async () => {
            const formData = new FormData(e.target);
            const taskId = formData.get('taskId');
            
            // This is the corrected data object with proper date formatting
            const dateValue = formData.get('dueDate');
            const dataToUpdate = {
                content: formData.get('content'),
                // This line ensures the date is sent in the full timestamp format
                dueDate: dateValue ? new Date(`${dateValue}T00:00:00.000Z`).toISOString() : null,
                priority: formData.get('priority'),
                description: formData.get('description'),
                assigneeId: formData.get('assigneeId') || null
            };

            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`https://inpulse-3zws.onrender.com/api/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(dataToUpdate)
                });

                if (response.ok) {
                    hideModal();
                    renderProductivity({ view: 'board' }); 
                } else {
                    const errorResult = await response.json();
                    alert(`Failed to update task: ${errorResult.error || 'Unknown server error'}`);
                }
            } catch (err) {
                console.error("Error updating task:", err);
                alert('An error occurred while updating the task.');
            }
        })();
    }

    // Inside the main submit listener, add this block
  if (e.target.id === 'assign-task-form') {
        (async () => {
            const formData = new FormData(e.target);

            // --- FIX: Force the date to be interpreted as UTC ---
            const dateValue = formData.get('dueDate');
            const taskData = {
                content: formData.get('content'),
                assigneeId: formData.get('assigneeId'),
                priority: formData.get('priority'),
                // This template literal `${dateValue}T00:00:00.000Z` prevents timezone shifts.
                dueDate: dateValue ? new Date(`${dateValue}T00:00:00.000Z`).toISOString() : null,
                userId: currentUser.id 
            };

            console.log('Data being sent from Assign Task form:', taskData);

            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch('https://inpulse-3zws.onrender.com/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(taskData)
                });

                if (response.ok) {
                    hideModal();
                    alert('Task assigned successfully!');
                    switchPage('Productivity');
                } else {
                    const errorResult = await response.json();
                    alert(`Failed to assign task: ${errorResult.error || 'Unknown server error'}`);
                }
            } catch (err) {
                console.error('Error assigning task:', err);
            }
        })();
    }
});

// NEW: Function to simulate fetching new campaign data
function simulateCampaignDataSync() {
    mockData.campaigns.forEach(campaign => {
        // Don't change completed campaigns
        if (campaign.status === 'completed') return;

        // Randomly adjust metrics by a small percentage (+/- 5%)
        const reachChange = 1 + (Math.random() - 0.5) * 0.1; // Multiplier between 0.95 and 1.05
        const spendChange = 1 + (Math.random() - 0.5) * 0.1;
        const salesChange = 1 + (Math.random() - 0.5) * 0.1;

        campaign.reach = Math.round(campaign.reach * reachChange);
        campaign.spend = parseFloat((campaign.spend * spendChange).toFixed(2));
        campaign.sales = parseFloat((campaign.sales * salesChange).toFixed(2));
    });
}

function showAssignTaskModal(memberId, memberName) {
    const mainModal = document.getElementById('main-modal');
    const modalContent = mainModal.querySelector('.modal-content');

    modalContent.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title">Assign Task to ${memberName}</h3>
            <button class="modal-close-btn"><i data-lucide="x"></i></button>
        </div>
        <form id="assign-task-form">
            <input type="hidden" name="assigneeId" value="${memberId}">
            <div class="form-group">
                <label for="task-content">Task</label>
                <input type="text" id="task-content" name="content" class="form-input" placeholder="e.g., Follow up on Q2 report" required>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="task-priority">Priority</label>
                    <select id="task-priority" name="priority" class="form-input">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="task-due-date">Due Date</label>
                    <div class="date-input-wrapper">
                        <input type="date" id="task-due-date" name="dueDate" class="form-input">
                        <i data-lucide="calendar" class="date-input-icon"></i>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
                <button type="submit" class="btn btn-primary">Assign Task</button>
            </div>
        </form>
    `;

    mainModal.classList.add('active');
    lucide.createIcons();
}

    // MODIFIED: To update the central mockData on drag-and-drop
function initializeKanbanListeners(){
    document.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('dragstart', e => { 
            e.target.classList.add('dragging'); 
        });
        card.addEventListener('dragend', e => { 
            e.target.classList.remove('dragging'); 
        });
    });

    document.querySelectorAll('.kanban-column').forEach(column => {
        column.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(column, e.clientY);
            const draggingCard = document.querySelector('.kanban-card.dragging');
            if (afterElement == null) {
                column.querySelector('.kanban-cards').appendChild(draggingCard);
            } else {
                column.querySelector('.kanban-cards').insertBefore(draggingCard, afterElement);
            }
        });

        // This 'drop' event listener is now smarter
        column.addEventListener('drop', e => {
            e.preventDefault();
            const draggingCard = document.querySelector('.kanban-card.dragging');
            if (draggingCard) {
                // --- FINAL FIX: Remove parseInt and use the ID as a string ---
                const taskId = draggingCard.dataset.taskId;
                const newStatus = column.dataset.status;

                (async () => {
                    const token = localStorage.getItem('authToken');
                    try {
                        await fetch(`https://inpulse-3zws.onrender.com/api/tasks/${taskId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ status: newStatus })
                        });

                        if (newStatus === 'DONE') {
                            triggerConfetti();
                        }
                    } catch (err) {
                        console.error("Failed to update task status:", err);
                    }
                })();
        // --- END of new logic ---

                if (newStatus === 'done') triggerConfetti();
                draggingCard.classList.remove('dragging');
            }
        });
    });

    async function renderProductivity(options = { view: 'board', date: new Date() }) {
    // Determine the view to render, defaulting to 'board'
    const view = options.view || 'board';
    
    const page = document.getElementById('page-Productivity');
    page.innerHTML = `<div>Loading Productivity Board...</div>`;

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('https://inpulse-3zws.onrender.com/api/tasks', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch tasks');
        
        const liveTasks = await response.json();

        // --- 1. Build the Filter/Header Section ---
        const productivityHeaderHTML = `
            <div class="productivity-header">
                <div class="filter-group">
                    <label for="assignee-filter">Filter by Assignee:</label>
                    <select id="assignee-filter" class="form-input">
                        <option value="">All Members</option>
                        ${liveTeamMembers.map(member => `<option value="${member.id}">${member.firstName} ${member.lastName}</option>`).join('')}
                    </select>
                </div>
                <div class="view-switcher">
                    <button class="btn btn-secondary ${view === 'board' ? 'active' : ''}" data-view="board"><i data-lucide="kanban"></i> Board</button>
                    <button class="btn btn-secondary ${view === 'calendar' ? 'active' : ''}" data-view="calendar"><i data-lucide="calendar-days"></i> Calendar</button>
                </div>
            </div>`;

        let viewContentHTML = '';

        // --- 2. Conditional Rendering Logic ---
        if (view === 'calendar') {
            let calendarHTML = '';
            const calendarDate = new Date(options.date);

            if (isNaN(calendarDate.getTime())) {
                console.error("renderProductivity was called with an invalid date.", options.date);
                page.innerHTML = `<div>Error: Invalid date provided to calendar.</div>`;
                return;
            }

            const month = calendarDate.getUTCMonth();
            const year = calendarDate.getUTCFullYear();
            const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
            const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const monthName = calendarDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
            
            calendarHTML += `<div class="calendar-container">`;
            calendarHTML += `<div class="calendar-header">
                                <button class="btn-icon" id="prev-month-btn"><i data-lucide="chevron-left"></i></button>
                                <h2 data-current-date="${calendarDate.toISOString()}">${monthName} ${year}</h2>
                                <button class="btn-icon" id="next-month-btn"><i data-lucide="chevron-right"></i></button></div>`;
            const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            calendarHTML += `<div class="calendar-grid weekdays">${weekdays.map(day => `<div class="weekday">${day}</div>`).join('')}</div>`;
            calendarHTML += `<div class="calendar-grid days">`;

            for (let i = 0; i < firstDayOfMonth; i++) { calendarHTML += `<div class="calendar-day not-current-month"></div>`; }
            
            for (let day = 1; day <= daysInMonth; day++) {
                const fullDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                
                const tasksForDay = liveTasks.filter(task => {
                    if (!task.dueDate) return false;
                    const taskDateStr = new Date(task.dueDate).toISOString().split('T')[0];
                    return taskDateStr === fullDateStr;
                });

                calendarHTML += `<div class="calendar-day" data-date="${fullDateStr}"><div class="day-number">${day}</div><div class="tasks-for-day">`;
                
                tasksForDay.forEach(task => {
                    // --- FIX: Use liveTeamMembers to find the assignee ---
                    const assignee = liveTeamMembers.find(t => t.id === task.assigneeId);
                    const priorityClass = `priority-${task.priority?.toLowerCase() || 'low'}`;
                    calendarHTML += `<div class="task-chip ${priorityClass}" draggable="true" data-task-id="${task.id}" title="${task.content}"><span class="task-chip-content">${task.content}</span>${assignee ? `<img src="${assignee.avatar}" class="task-assignee-avatar" title="Assigned to ${assignee.firstName}">` : ''}</div>`;
                });
                calendarHTML += `</div></div>`;
            }
            calendarHTML += `</div></div>`;
            viewContentHTML = `<div class="calendar-view-wrapper"><div class="calendar-view">${calendarHTML}</div></div>`;

        } else {
            // --- LOGIC TO BUILD THE KANBAN BOARD VIEW ---
            const createCard = (task) => {
                // --- FIX: Use liveTeamMembers to find the assignee ---
                const assignee = liveTeamMembers.find(m => m.id === task.assigneeId);
                const priorityClass = `priority-${task.priority?.toLowerCase() || 'low'}`;
                let dueDateHTML = '';

                if (task.dueDate) {
                    // --- FIX: Correctly parse the full ISO string from the database ---
                    const dueDate = new Date(task.dueDate); 
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    const dueSoonDate = new Date();
                    dueSoonDate.setDate(now.getDate() + 3);

                    let dateClass = '';
                    if (dueDate < now) dateClass = 'overdue';
                    else if (dueDate <= dueSoonDate) dateClass = 'due-soon';

                    dueDateHTML = `<div class="card-due-date ${dateClass}">
                                    <i data-lucide="calendar"></i>
                                    <span>${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </div>`;
                }

                return `
                <div class="kanban-card" data-task-id="${task.id}" draggable="true">
                    <div class="card-priority ${priorityClass}"></div>
                    <div class="kanban-card-actions">
                         <button class="btn-icon" data-action="edit-task" title="Edit Task"><i data-lucide="edit-2"></i></button>
                         <button class="btn-icon" data-action="delete-task" title="Delete Task"><i data-lucide="trash-2"></i></button>
                    </div>
                    <p class="card-content">${task.content}</p>
                    <div class="kanban-card-footer">
                        ${dueDateHTML}
                        ${assignee ? `<img src="${assignee.avatar}" class="assignee-avatar" title="Assigned to ${assignee.firstName}">` : ''}
                    </div>
                </div>`;
            };

            const todoTasks = liveTasks.filter(t => t.status === 'TODO');
            const inProgressTasks = liveTasks.filter(t => t.status === 'INPROGRESS');
            const doneTasks = liveTasks.filter(t => t.status === 'DONE');

            viewContentHTML = `
                <div class="kanban-board">
                    <div class="kanban-column" data-status="TODO"><h3>To Do</h3><div class="kanban-cards">${todoTasks.map(createCard).join('')}</div></div>
                    <div class="kanban-column" data-status="INPROGRESS"><h3>In Progress</h3><div class="kanban-cards">${inProgressTasks.map(createCard).join('')}</div></div>
                    <div class="kanban-column" data-status="DONE"><h3>Done</h3><div class="kanban-cards">${doneTasks.map(createCard).join('')}</div></div>
                </div>`;
        }
        
        page.innerHTML = `
            ${productivityHeaderHTML}
            ${viewContentHTML}
        `;
        
        lucide.createIcons();
        if (view === 'calendar') {
            initializeCalendarDND();
        } else {
            initializeKanbanListeners();
        }

    } catch (error) {
        console.error("Error rendering productivity page:", error);
        page.innerHTML = `<div>Could not load tasks. Please try again.</div>`;
    }
}

    function getDragAfterElement(column, y) {
        const draggableElements = [...column.querySelectorAll('.kanban-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
}

    // This function is now cleaner. The main event listener will handle the close button.
function showInviteModal() {
    	modalContent.innerHTML = `<div class="modal-header">
			<h3 class="modal-title">Invite New Team Member</h3>
			<button class="modal-close-btn"><i data-lucide="x">
			</i>
		</button>
	</div>
			<form id="invite-form">
				<div class="form-group"><label>Email Address</label>
				<input type="email" class="form-input" required>
	</div>
				<div class="form-group"><label>Role</label>
			<select class="form-input"><option>Member</option>
				<option>Admin</option>
				<option>Sales</option>
			</select>
	</div>
			<div class="modal-footer"><button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
			<button type="submit" class="btn btn-primary">Send Invite
		</button>
	</div>
			</form>`;

    mainModal.classList.add('active');
    lucide.createIcons();
}
    function hideModal() { mainModal.classList.remove('active'); 
}

    function triggerConfetti() {
        const container = document.getElementById('confetti-container');
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 90%, 70%)`;
            confetti.style.animation = `fall ${Math.random() * 2 + 3}s linear forwards`;
            container.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }
    }

    
    // --- INITIALIZATION ---
    init();
});