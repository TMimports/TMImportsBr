function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
      modal.classList.remove('active');
    });
    document.body.style.overflow = '';
  }
});

function openAnexoModal(tipoEntidade, entidadeId) {
  alert('Funcionalidade de anexos para ' + tipoEntidade + ' #' + entidadeId);
}

document.querySelectorAll('form').forEach(form => {
  form.addEventListener('submit', function() {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Aguarde...';
    }
  });
});

function formatMoney(input) {
  let value = input.value.replace(/\D/g, '');
  value = (parseInt(value) / 100).toFixed(2);
  input.value = value;
}

function confirmAction(message) {
  return confirm(message || 'Confirma esta ação?');
}
