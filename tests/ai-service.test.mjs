import test from 'node:test';
import assert from 'node:assert';

function mapSeverityToPriority(raw) {
  if (typeof raw !== 'string') return null;
  const val = raw.trim().toLowerCase();
  switch (val) {
    case 'low':
      return 'Low';
    case 'medium':
    case 'moderate':
      return 'Medium';
    case 'high':
      return 'High';
    case 'critical':
    case 'severe':
    case 'urgent':
      return 'Critical';
    default:
      return null;
  }
}

function parseAndValidateAIResponse(raw, fallbackCategory = 'Other') {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw;

  const rawPriority = obj.severity ?? obj.priority ?? obj.urgency;
  const priority = mapSeverityToPriority(rawPriority);
  if (!priority) {
    return null;
  }

  let category = fallbackCategory;
  if (typeof obj.category === 'string' && obj.category.trim()) {
    category = obj.category.trim();
  }

  const dept = typeof obj.recommendedDepartment === 'string' && obj.recommendedDepartment.trim()
    ? obj.recommendedDepartment.trim()
    : 'Civic General Administration';

  const reason = typeof obj.urgencyReason === 'string' && obj.urgencyReason.trim()
    ? obj.urgencyReason.trim()
    : `AI assessed with ${priority} priority.`;

  return {
    category,
    priority,
    severity: priority,
    urgencyReason: reason,
    recommendedDepartment: dept,
    confidenceScore: 0.95,
    isFallback: false,
  };
}

function createIdentifiedFallback(category = 'Other') {
  return {
    category,
    priority: 'Medium',
    severity: 'Medium',
    urgencyReason: 'AI triage unavailable at submission. Standard priority assigned pending municipal review.',
    recommendedDepartment: 'Civic General Administration',
    confidenceScore: 0,
    isFallback: true,
  };
}

test('AI Service: mapSeverityToPriority correctly maps standard and variant strings', () => {
  assert.strictEqual(mapSeverityToPriority('Low'), 'Low');
  assert.strictEqual(mapSeverityToPriority('low'), 'Low');
  assert.strictEqual(mapSeverityToPriority('Medium'), 'Medium');
  assert.strictEqual(mapSeverityToPriority('moderate'), 'Medium');
  assert.strictEqual(mapSeverityToPriority('High'), 'High');
  assert.strictEqual(mapSeverityToPriority('high'), 'High');
  assert.strictEqual(mapSeverityToPriority('Critical'), 'Critical');
  assert.strictEqual(mapSeverityToPriority('severe'), 'Critical');
  assert.strictEqual(mapSeverityToPriority('urgent'), 'Critical');
  assert.strictEqual(mapSeverityToPriority('unknown-random'), null);
  assert.strictEqual(mapSeverityToPriority(null), null);
  assert.strictEqual(mapSeverityToPriority(123), null);
});

test('AI Service: parseAndValidateAIResponse parses valid AI output', () => {
  const mockAiOutput = {
    category: 'Water Leakage',
    severity: 'Critical',
    urgencyReason: 'Burst water main flooding residential street and cutting off supply.',
    recommendedDepartment: 'Water Supply & Sewerage Board',
  };

  const parsed = parseAndValidateAIResponse(mockAiOutput);
  assert.notStrictEqual(parsed, null);
  assert.strictEqual(parsed.category, 'Water Leakage');
  assert.strictEqual(parsed.priority, 'Critical');
  assert.strictEqual(parsed.severity, 'Critical');
  assert.strictEqual(parsed.recommendedDepartment, 'Water Supply & Sewerage Board');
  assert.strictEqual(parsed.isFallback, false);
});

test('AI Service: parseAndValidateAIResponse rejects invalid or missing priority', () => {
  assert.strictEqual(parseAndValidateAIResponse(null), null);
  assert.strictEqual(parseAndValidateAIResponse({ category: 'Roads and Potholes' }), null);
  assert.strictEqual(parseAndValidateAIResponse({ severity: 'invalid-level' }), null);
});

test('AI Service: createIdentifiedFallback produces identified fallback with Medium priority', () => {
  const fallback = createIdentifiedFallback('Roads and Potholes');
  assert.strictEqual(fallback.isFallback, true);
  assert.strictEqual(fallback.priority, 'Medium');
  assert.strictEqual(fallback.confidenceScore, 0);
  assert.ok(fallback.urgencyReason.includes('unavailable'));
});
