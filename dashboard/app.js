/* ==========================================================================
   iCodeMyBusiness Dashboard - Shared JavaScript
   ========================================================================== */

(function() {
  'use strict';

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
        // Deactivate all tabs in this group
        tabs.forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        // Show target content
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

  function handleFileUpload(zone, files) {
    var file = files[0];
    var textEl = zone.querySelector('.upload-text');
    var hintEl = zone.querySelector('.upload-hint');

    if (file.type.startsWith('image/')) {
      // Show image preview
      var reader = new FileReader();
      reader.onload = function(e) {
        zone.style.backgroundImage = 'url(' + e.target.result + ')';
        zone.style.backgroundSize = 'contain';
        zone.style.backgroundRepeat = 'no-repeat';
        zone.style.backgroundPosition = 'center';
        zone.style.borderStyle = 'solid';
        zone.style.borderColor = 'var(--success)';
        if (textEl) textEl.textContent = file.name;
        if (hintEl) hintEl.textContent = 'Click or drag to replace';
      };
      reader.readAsDataURL(file);
    } else {
      if (textEl) textEl.textContent = file.name;
      if (hintEl) hintEl.textContent = 'File loaded - click or drag to replace';
      zone.style.borderColor = 'var(--success)';
      zone.style.borderStyle = 'solid';
    }

    // Store file reference for later use
    zone.dataset.fileName = file.name;
    zone.dataset.fileType = file.type;
    zone.dataset.fileSize = file.size;
  }

  // ── Modal controls ─────────────────────────────────────────────────────
  // Open modal
  document.querySelectorAll('[data-modal]').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var modalId = this.getAttribute('data-modal');
      var modal = document.getElementById(modalId);
      if (modal) modal.classList.add('active');
    });
  });

  // Close modal
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var backdrop = this.closest('.modal-backdrop');
      if (backdrop) backdrop.classList.remove('active');
    });
  });

  // Close modal on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(function(backdrop) {
    backdrop.addEventListener('click', function(e) {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // ── Toast notifications ────────────────────────────────────────────────
  window.showToast = function(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:14px 24px;border-radius:8px;color:white;font-size:14px;font-weight:600;z-index:300;opacity:0;transform:translateY(10px);transition:all 0.3s ease;font-family:var(--font);';

    var colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#2563eb'
    };
    toast.style.background = colors[type] || colors.info;

    document.body.appendChild(toast);

    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  };

  // ── Quick action: approve content ──────────────────────────────────────
  document.querySelectorAll('.btn-approve').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var card = this.closest('.content-preview') || this.closest('.item-row');
      if (card) {
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        this.textContent = 'Approved';
        this.classList.remove('btn-primary');
        this.classList.add('btn-success');
        showToast('Content approved and scheduled!', 'success');
      }
    });
  });

  // ── Quick action: send follow-up ───────────────────────────────────────
  document.querySelectorAll('.btn-send-followup').forEach(function(btn) {
    btn.addEventListener('click', function() {
      this.textContent = 'Scheduled';
      this.disabled = true;
      this.classList.remove('btn-primary');
      this.classList.add('btn-success');
      showToast('Follow-up email scheduled!', 'success');
    });
  });

})();
