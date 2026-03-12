/* ==========================================================================
   iCodeMyBusiness Dashboard - Convex Integration
   ========================================================================== */

import convexClient from './convex-client.js';

(function() {
  'use strict';

  // Initialize dashboard on load
  document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing dashboard with Convex...');

    // Initialize authentication
    const user = await convexClient.initAuth();
    if (!user) {
      console.error('Authentication failed');
      // In production, redirect to login page
      // window.location.href = '/login';
      return;
    }

    // Update user info in sidebar
    updateUserInfo(user);

    // Load dashboard data
    await loadDashboardData();

    // Initialize real-time updates
    initRealTimeUpdates();

    // Initialize existing UI components
    initUIComponents();
  });

  // Update user information in the sidebar
  function updateUserInfo(user) {
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    const avatarEl = document.querySelector('.sidebar-user .avatar');

    if (userNameEl) userNameEl.textContent = user.name;
    if (userRoleEl) userRoleEl.textContent = user.role === 'admin' ? 'Founder' : user.role;
    if (avatarEl) {
      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
      avatarEl.textContent = initials;
    }
  }

  // Load all dashboard data
  async function loadDashboardData() {
    try {
      // Load metrics
      const metrics = await convexClient.dashboard.getMetrics();
      updateMetrics(metrics);

      // Load leads
      const leads = await convexClient.leads.getAll({ status: 'qualified', limit: 3 });
      updateLeadsSection(leads);

      // Load recent activity
      const activity = await convexClient.dashboard.getRecentActivity();
      updateActivityFeed(activity);

      // Load upcoming appointments
      const appointments = await convexClient.dashboard.getUpcomingAppointments();
      updateSchedule(appointments);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showNotification('Error loading dashboard data', 'error');
    }
  }

  // Update metrics display
  function updateMetrics(metrics) {
    // Update lead stats
    const leadValueEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
    const leadChangeEl = document.querySelector('.stat-card:nth-child(1) .stat-change');

    if (leadValueEl && metrics.leads) {
      leadValueEl.textContent = metrics.leads.total || 0;

      // Calculate weekly change
      const weeklyNew = metrics.leads.new || 0;
      if (leadChangeEl) {
        leadChangeEl.textContent = `+${weeklyNew} this week`;
        leadChangeEl.className = weeklyNew > 0 ? 'stat-change up' : 'stat-change';
      }
    }

    // Update project stats
    const projectCards = document.querySelectorAll('.stat-card');
    if (projectCards.length > 2 && metrics.projects) {
      // Update active projects count
      const projectValueEl = projectCards[2].querySelector('.stat-value');
      if (projectValueEl) {
        projectValueEl.textContent = metrics.projects.active || 0;
      }
    }

    // Update client stats
    if (metrics.clients) {
      // Update MRR if displayed
      const mrrEl = document.querySelector('[data-metric="mrr"]');
      if (mrrEl) {
        mrrEl.textContent = `$${(metrics.clients.totalMRR || 0).toLocaleString()}`;
      }
    }

    // Update badge counts in navigation
    updateNavBadges(metrics);
  }

  // Update navigation badge counts
  function updateNavBadges(metrics) {
    const leadsBadge = document.querySelector('a[href="leads.html"] .nav-badge');
    const contentBadge = document.querySelector('a[href="content.html"] .nav-badge');
    const messagesBadge = document.querySelector('a[href="messages.html"] .nav-badge');

    if (leadsBadge && metrics.leads) {
      leadsBadge.textContent = metrics.leads.new || 0;
      leadsBadge.style.display = metrics.leads.new > 0 ? 'inline-flex' : 'none';
    }

    // These would come from actual queries in production
    if (contentBadge) {
      contentBadge.textContent = '2'; // Placeholder
    }

    if (messagesBadge) {
      messagesBadge.textContent = '5'; // Placeholder
    }
  }

  // Update leads follow-up section
  function updateLeadsSection(leads) {
    const container = document.querySelector('.card-body');
    if (!container || !leads || leads.length === 0) return;

    // Find the follow-ups card
    const followUpsCard = Array.from(document.querySelectorAll('.card')).find(
      card => card.querySelector('h2')?.textContent === 'Follow-ups to Review'
    );

    if (!followUpsCard) return;

    const cardBody = followUpsCard.querySelector('.card-body');
    if (!cardBody) return;

    // Clear existing lead cards (keep the footer text)
    const existingCards = cardBody.querySelectorAll('.lead-card');
    existingCards.forEach(card => card.remove());

    // Add new lead cards
    leads.forEach((lead, index) => {
      const leadCard = createLeadCard(lead);
      if (index === 0) {
        cardBody.insertBefore(leadCard, cardBody.firstChild);
      } else {
        const previousCard = cardBody.querySelectorAll('.lead-card')[index - 1];
        if (previousCard && previousCard.nextSibling) {
          cardBody.insertBefore(leadCard, previousCard.nextSibling);
        } else {
          cardBody.appendChild(leadCard);
        }
      }
    });
  }

  // Create a lead card element
  function createLeadCard(lead) {
    const card = document.createElement('div');
    card.className = 'lead-card';
    card.setAttribute('data-lead-id', lead._id);

    const initials = lead.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const company = lead.company || 'No company';
    const source = formatLeadSource(lead.source);

    card.innerHTML = `
      <div class="lead-avatar">${initials}</div>
      <div class="lead-info">
        <div class="lead-name">${lead.name}</div>
        <div class="lead-company">${company}</div>
        <div class="lead-details">
          <span>${source}</span>
        </div>
      </div>
      <div class="lead-actions">
        <button class="btn btn-primary btn-sm btn-send-followup">Send Follow-up</button>
        <button class="btn btn-ghost btn-sm">View Draft</button>
      </div>
    `;

    // Add event listeners
    const sendBtn = card.querySelector('.btn-send-followup');
    sendBtn.addEventListener('click', () => handleSendFollowup(lead));

    return card;
  }

  // Format lead source for display
  function formatLeadSource(source) {
    const sourceMap = {
      'calendly': 'Calendly booking',
      'website': 'Website inquiry',
      'linkedin': 'LinkedIn connection',
      'referral': 'Referral',
      'cold': 'Cold outreach',
      'voice_agent': 'Voice call'
    };
    return sourceMap[source] || source;
  }

  // Handle send follow-up action
  async function handleSendFollowup(lead) {
    try {
      // In production, this would trigger email sending
      await convexClient.leads.updateStatus(lead._id, 'contacted', 'Follow-up sent');
      showNotification(`Follow-up sent to ${lead.name}`, 'success');

      // Refresh the lead card
      const card = document.querySelector(`[data-lead-id="${lead._id}"]`);
      if (card) {
        card.style.opacity = '0.5';
        setTimeout(() => card.remove(), 500);
      }
    } catch (error) {
      console.error('Error sending follow-up:', error);
      showNotification('Failed to send follow-up', 'error');
    }
  }

  // Update activity feed
  function updateActivityFeed(activities) {
    // This would update an activity feed if present on the dashboard
    console.log('Activity feed:', activities);
  }

  // Update schedule section
  function updateSchedule(appointments) {
    // This would update the schedule section with real appointments
    console.log('Upcoming appointments:', appointments);
  }

  // Initialize real-time updates
  function initRealTimeUpdates() {
    convexClient.dashboard.initRealTimeUpdates({
      onLeadsUpdate: (leads) => {
        console.log('Leads updated:', leads);
        updateLeadsSection(leads);
      },
      onClientsUpdate: (clients) => {
        console.log('Clients updated:', clients);
      },
      onProjectsUpdate: (projects) => {
        console.log('Projects updated:', projects);
      },
      onNotification: (notification) => {
        console.log('New notification:', notification);
        showNotification(notification.message, notification.type);
      }
    });
  }

  // Show notification toast
  function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialize existing UI components
  function initUIComponents() {
    // ── Mobile sidebar toggle ──────────────────────────────────────────────
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    if (menuBtn) {
      menuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // ── Tabs ────────────────────────────────────────────────────────────────
    document.querySelectorAll('.tabs').forEach(function(tabGroup) {
      var tabs = tabGroup.querySelectorAll('.tab');
      tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
          var target = this.getAttribute('data-tab');
          tabs.forEach(function(t) { t.classList.remove('active'); });
          this.classList.add('active');
          var parent = tabGroup.parentElement;
          parent.querySelectorAll('.tab-content').forEach(function(c) {
            c.classList.remove('active');
          });
          var targetEl = parent.querySelector('#' + target);
          if (targetEl) targetEl.classList.add('active');
        });
      });
    });

    // ── Date display ───────────────────────────────────────────────────────
    var dateEl = document.querySelector('.topbar-date');
    if (dateEl) {
      var now = new Date();
      var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('en-US', options);
    }

    // ── File upload zones ──────────────────────────────────────────────────
    document.querySelectorAll('.upload-zone').forEach(function(zone) {
      var fileInput = zone.querySelector('input[type="file"]');

      zone.addEventListener('click', function() {
        if (fileInput) fileInput.click();
      });

      zone.addEventListener('dragover', function(e) {
        e.preventDefault();
        zone.classList.add('dragover');
      });

      zone.addEventListener('dragleave', function() {
        zone.classList.remove('dragover');
      });

      zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.classList.remove('dragover');
        var files = e.dataTransfer.files;
        if (files.length > 0) {
          handleFileUpload(zone, files);
        }
      });

      if (fileInput) {
        fileInput.addEventListener('change', function() {
          if (this.files.length > 0) {
            handleFileUpload(zone, this.files);
          }
        });
      }
    });
  }

  // Handle file upload
  async function handleFileUpload(zone, files) {
    var file = files[0];
    var textEl = zone.querySelector('.upload-text');
    var hintEl = zone.querySelector('.upload-hint');

    if (file.type.startsWith('image/')) {
      // Show image preview
      var reader = new FileReader();
      reader.onload = async function(e) {
        zone.style.backgroundImage = 'url(' + e.target.result + ')';
        zone.style.backgroundSize = 'contain';
        zone.style.backgroundPosition = 'center';
        zone.style.backgroundRepeat = 'no-repeat';
        zone.classList.add('has-file');

        if (textEl) textEl.textContent = 'Processing...';
        if (hintEl) hintEl.textContent = file.name;

        // Process business card with OCR
        if (zone.id === 'card-upload') {
          await processBusinessCard(file, e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // Process business card with OCR
  async function processBusinessCard(file, imageData) {
    try {
      // This would call the Claude Vision API in production
      showNotification('Processing business card...', 'info');

      // Simulate OCR processing
      setTimeout(() => {
        showNotification('Business card processed successfully', 'success');
        // In production, this would create a lead from the extracted data
      }, 2000);
    } catch (error) {
      console.error('Error processing business card:', error);
      showNotification('Failed to process business card', 'error');
    }
  }

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

})();