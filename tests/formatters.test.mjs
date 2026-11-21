import test from 'node:test';
import assert from 'node:assert';

function getPriorityBadgeColor(priority) {
  switch (priority) {
    case 'Critical':
      return { bg: 'bg-rose-50', text: 'text-rose-700' };
    case 'High':
      return { bg: 'bg-orange-50', text: 'text-orange-700' };
    case 'Medium':
      return { bg: 'bg-amber-50', text: 'text-amber-700' };
    case 'Low':
    default:
      return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
  }
}

function getStatusBadgeColor(status) {
  switch (status) {
    case 'Reported':
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
    case 'Acknowledged':
    case 'Under Review':
      return { bg: 'bg-blue-50', text: 'text-blue-700' };
    case 'Assigned':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700' };
    case 'In Progress':
      return { bg: 'bg-amber-50', text: 'text-amber-800' };
    case 'Resolved':
      return { bg: 'bg-teal-50', text: 'text-teal-800' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

test('Formatters: getPriorityBadgeColor covers all 4 priority levels', () => {
  assert.strictEqual(getPriorityBadgeColor('Critical').text, 'text-rose-700');
  assert.strictEqual(getPriorityBadgeColor('High').text, 'text-orange-700');
  assert.strictEqual(getPriorityBadgeColor('Medium').text, 'text-amber-700');
  assert.strictEqual(getPriorityBadgeColor('Low').text, 'text-emerald-700');
});

test('Formatters: getStatusBadgeColor covers all status progression stages', () => {
  assert.strictEqual(getStatusBadgeColor('Reported').bg, 'bg-slate-100');
  assert.strictEqual(getStatusBadgeColor('Acknowledged').bg, 'bg-blue-50');
  assert.strictEqual(getStatusBadgeColor('Under Review').bg, 'bg-blue-50');
  assert.strictEqual(getStatusBadgeColor('Assigned').bg, 'bg-indigo-50');
  assert.strictEqual(getStatusBadgeColor('In Progress').bg, 'bg-amber-50');
  assert.strictEqual(getStatusBadgeColor('Resolved').bg, 'bg-teal-50');
});
