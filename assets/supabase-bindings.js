import {
  getSession,
  listExpenses,
  saveExpense,
  deleteExpense,
  getChecklist,
  setChecklistItem,
  subscribeToExpenses,
  signInWithEmail
} from './supabase.js';

const expenseForm = document.querySelector('#expenseForm');
const expenseList = document.querySelector('#expenseList');
const taskList = document.querySelector('#taskList');
const packingList = document.querySelector('#packingList');
const statusText = document.querySelector('#supabaseStatus');
let editingId = null;
let expenses = [];
let expenseFilter = 'all';

function setStatus(message, isError = false) {
  if (statusText) {
    statusText.textContent = message;
    statusText.dataset.error = isError ? 'true' : 'false';
  }
  if (isError) console.error(message);
}

async function requireSession() {
  let session = await getSession();
  if (session) return session;
  const email = window.prompt('请输入行程成员邮箱，以接收 Supabase 登录链接：');
  if (!email) throw new Error('需要登录才能同步到 Supabase。');
  await signInWithEmail(email.trim());
  throw new Error('登录链接已发送，请打开邮件中的链接后重试。');
}

function normalizedExpense(row) {
  return {
    ...row,
    date: row.expense_date,
    amount: Number(row.amount_jpy),
    participants: row.participants || []
  };
}

function money(value) {
  return `JPY ${Number(value || 0).toLocaleString('en-US')}`;
}

function renderExpenses() {
  const visible = expenses.filter((item) =>
    expenseFilter === 'all' || (expenseFilter === 'settled' ? item.settled : !item.settled)
  );
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const outstanding = expenses.filter((item) => !item.settled).reduce((sum, item) => sum + item.amount, 0);
  document.querySelector('#expenseTotal')?.replaceChildren(document.createTextNode(money(total)));
  document.querySelector('#expenseOutstanding')?.replaceChildren(document.createTextNode(money(outstanding)));
  document.querySelector('#expenseCount')?.replaceChildren(document.createTextNode(`${expenses.length} 笔`));
  document.querySelector('#expenseVisibleCount')?.replaceChildren(document.createTextNode(`${visible.length} 笔`));
  if (!expenseList) return;
  expenseList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'expense-empty';
    empty.textContent = '暂无 Supabase 记账记录';
    expenseList.append(empty);
    return;
  }
  visible.forEach((item) => {
    const record = document.createElement('article');
    record.className = `expense-record${item.settled ? ' settled' : ''}`;
    record.dataset.expenseId = item.id;
    record.innerHTML = `
      <div><span class="record-label">日期</span>${item.date}</div>
      <div class="record-description"><span class="record-label">项目</span>${escapeHtml(item.description)}</div>
      <div><span class="record-label">金额</span><span class="record-amount">${money(item.amount)}</span></div>
      <div><span class="record-label">付款人</span>${escapeHtml(item.payer)}</div>
      <div class="record-participants"><span class="record-label">参与人</span>${item.participants.map(escapeHtml).join('、')}</div>
      <div><span class="record-label">状态</span>${item.settled ? '已结清' : '未结清'}</div>
      <div class="record-actions">
        <button class="record-icon" type="button" data-expense-action="edit" aria-label="编辑">✎</button>
        <button class="record-icon delete" type="button" data-expense-action="delete" aria-label="删除">×</button>
      </div>`;
    expenseList.append(record);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function refreshExpenses() {
  expenses = (await listExpenses()).map(normalizedExpense);
  renderExpenses();
}

function bindChecklist(container, type) {
  container?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', async () => {
      try {
        await requireSession();
        await setChecklistItem(type, input.id, input.checked);
        input.closest('.task, .packing-item')?.classList.toggle('done', input.checked);
        setStatus('已同步到 Supabase');
      } catch (error) {
        input.checked = !input.checked;
        setStatus(error.message, true);
      }
    }, { capture: true });
  });
}

expenseForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
  try {
    await requireSession();
    const data = new FormData(expenseForm);
    const participants = data.getAll('participants');
    if (!participants.length) throw new Error('至少选择一名参与分摊人员。');
    await saveExpense({
      description: String(data.get('description') || '').trim(),
      date: data.get('date'),
      amount: data.get('amount'),
      payer: data.get('payer'),
      participants,
      settled: data.get('settled') === 'true'
    }, editingId);
    editingId = null;
    expenseForm.reset();
    expenseForm.querySelectorAll('input[name="participants"]').forEach((input) => { input.checked = true; });
    await refreshExpenses();
    setStatus('记账已保存到 Supabase');
  } catch (error) {
    setStatus(error.message, true);
  }
}, { capture: true });

expenseList?.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-expense-action]');
  if (!button) return;
  const record = button.closest('[data-expense-id]');
  const item = expenses.find((expense) => expense.id === record?.dataset.expenseId);
  if (!item) return;
  try {
    await requireSession();
    if (button.dataset.expenseAction === 'delete') {
      if (!window.confirm('确定删除这条 Supabase 记账记录吗？')) return;
      await deleteExpense(item.id);
      await refreshExpenses();
      setStatus('记录已删除');
    } else {
      editingId = item.id;
      for (const [id, value] of [['expenseDescription', item.description], ['expenseDate', item.date], ['expenseAmount', item.amount], ['expensePayer', item.payer], ['expenseSettled', String(item.settled)]]) {
        const field = document.querySelector(`#${id}`);
        if (field) field.value = value;
      }
      document.querySelectorAll('input[name="participants"]').forEach((input) => { input.checked = item.participants.includes(input.value); });
      document.querySelector('#saveExpense')?.replaceChildren(document.createTextNode('保存修改'));
      expenseForm?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelectorAll('[data-expense-filter]').forEach((button) => button.addEventListener('click', () => {
  expenseFilter = button.dataset.expenseFilter;
  document.querySelectorAll('[data-expense-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
  renderExpenses();
}));

(async function initSupabaseBindings() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    setStatus('Supabase 尚未配置，当前未启用云端同步');
    return;
  }
  try {
    await refreshExpenses();
    bindChecklist(taskList, 'task');
    bindChecklist(packingList, 'packing');
    const channel = await subscribeToExpenses(() => refreshExpenses().catch((error) => setStatus(error.message, true)));
    window.addEventListener('beforeunload', () => channel.unsubscribe());
    setStatus('Supabase 云端同步已启用');
  } catch (error) {
    setStatus(error.message, true);
  }
})();
