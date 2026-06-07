/** @type {{ items: Array<{ courseId: string, courseCode: string, courseName: string, fee: number }>, total: number }} */
let billingState = { items: [], total: 0 };

document.addEventListener('DOMContentLoaded', async function () {
  const user = await EduRegAPI.requireAuth({ role: 'student' });
  if (!user) return;

  const form = document.getElementById('deposit-form');
  const messageEl = document.getElementById('deposit-form-message');
  const historyEl = document.getElementById('deposit-history');
  const confirmBtn = document.getElementById('confirm-payment-btn');

  await loadBillingBreakdown();
  await loadHistory(historyEl);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (billingState.items.length === 0) {
        showFormMessage(messageEl, 'Register for courses before confirming payment.', 'error');
        return;
      }

      if (billingState.total <= 0) {
        showFormMessage(messageEl, 'No course fees are due for your current enrollments.', 'error');
        return;
      }

      const note = document.getElementById('note').value.trim();

      if (confirmBtn) confirmBtn.disabled = true;

      try {
        const data = await EduRegAPI.apiRequest('/api/deposits', {
          method: 'POST',
          body: {
            amount: billingState.total,
            note,
            payEnrollmentFees: true,
          },
        });
        showFormMessage(messageEl, data.message || 'Payment confirmed.', 'success');
        document.getElementById('note').value = '';
        await loadHistory(historyEl);
      } catch (error) {
        showFormMessage(messageEl, error.message || 'Could not confirm payment.', 'error');
      } finally {
        updateConfirmButton();
      }
    });
  }
});

async function loadBillingBreakdown() {
  const container = document.getElementById('billing-breakdown');
  const amountEl = document.getElementById('amount');

  try {
    const data = await EduRegAPI.apiRequest('/api/enrollments/billing');
    billingState = {
      items: data.data?.items || [],
      total: Number(data.data?.total) || 0,
    };
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    billingState = { items: [], total: 0 };
    if (container) {
      container.innerHTML =
        '<p class="text-on-error-container">Could not load your enrolled courses. Try again from Course Search.</p>';
    }
    if (amountEl) amountEl.value = '—';
    updateConfirmButton();
    return;
  }

  if (container) {
    container.innerHTML = renderBillingBreakdown(billingState.items, billingState.total);
  }

  if (amountEl) {
    amountEl.value = formatMoney(billingState.total);
  }

  updateConfirmButton();
}

function renderBillingBreakdown(items, total) {
  if (!items.length) {
    return `<p class="text-on-surface-variant">You are not enrolled in any courses yet. <a href="courses.html" class="font-medium text-primary underline">Register for classes</a> first — your course fees will appear here.</p>`;
  }

  const rows = items
    .map(
      (item) => `<li class="flex justify-between gap-md border-b border-outline-variant/50 py-sm last:border-0">
        <span class="text-on-surface"><strong>${escapeHtml(item.courseCode)}</strong> — ${escapeHtml(item.courseName)}</span>
        <span class="shrink-0 font-medium text-on-surface">${formatMoney(item.fee)}</span>
      </li>`
    )
    .join('');

  return `
    <ul class="mb-md divide-y divide-outline-variant/30">${rows}</ul>
    <p class="flex justify-between border-t border-outline-variant pt-md font-label-md font-bold text-on-surface">
      <span>Total due</span>
      <span class="text-primary">${formatMoney(total)}</span>
    </p>`;
}

function updateConfirmButton() {
  const confirmBtn = document.getElementById('confirm-payment-btn');
  if (!confirmBtn) return;
  const canPay = billingState.items.length > 0 && billingState.total > 0;
  confirmBtn.disabled = !canPay;
}

function formatMoney(amount) {
  return '$' + Number(amount != null ? amount : 0).toFixed(2);
}

async function loadHistory(container) {
  if (!container) return;
  try {
    const data = await EduRegAPI.apiRequest('/api/deposits');
    const deposits = data.data.deposits || [];

    if (deposits.length === 0) {
      container.innerHTML =
        '<p class="font-body-sm text-on-surface-variant">No payments yet.</p>';
      return;
    }

    container.innerHTML = deposits
      .map((d) => {
        const date = formatDate(d.createdAt);
        const statusClass =
          d.status === 'confirmed'
            ? 'bg-[#e6f4ea] text-[#137333]'
            : 'bg-surface-container-high text-on-surface-variant';
        return `<article class="rounded-lg border border-outline-variant p-md">
          <div class="flex flex-wrap items-start justify-between gap-sm">
            <div>
              <p class="font-label-md font-semibold text-on-surface">${escapeHtml(d.facultyName)}</p>
              <p class="mt-xs font-body-sm text-on-surface-variant">${escapeHtml(date)}</p>
            </div>
            <div class="text-right">
              <p class="font-headline-sm text-primary">$${Number(d.amount).toFixed(2)}</p>
              <span class="mt-xs inline-block rounded-full px-sm py-[2px] font-label-sm ${statusClass}">${escapeHtml(d.status)}</span>
            </div>
          </div>
          ${d.note ? `<p class="mt-sm font-body-sm text-on-surface-variant">${escapeHtml(d.note)}</p>` : ''}
        </article>`;
      })
      .join('');
  } catch (error) {
    if (error.status === 401) {
      window.location.href = 'login.html?expired=1';
      return;
    }
    container.innerHTML =
      '<p class="font-body-sm text-on-error-container">Could not load payment history.</p>';
  }
}

function showFormMessage(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove('hidden');
  el.className =
    'rounded-lg border px-md py-sm font-body-sm ' +
    (type === 'error'
      ? 'border-error/30 bg-error-container text-on-error-container'
      : 'border-primary-fixed-dim bg-primary-fixed text-on-primary-fixed');
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
