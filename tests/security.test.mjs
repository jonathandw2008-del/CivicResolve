import test from 'node:test';
import assert from 'node:assert';

// Implementation under test
function isSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return true;
  }

  if (
    trimmed.startsWith('data:image/jpeg;base64,') ||
    trimmed.startsWith('data:image/jpg;base64,') ||
    trimmed.startsWith('data:image/png;base64,') ||
    trimmed.startsWith('data:image/webp;base64,')
  ) {
    return true;
  }

  return false;
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

test('Security: isSafeImageUrl permits safe web image URLs', () => {
  assert.strictEqual(isSafeImageUrl('https://storage.googleapis.com/bucket/photo.jpg'), true);
  assert.strictEqual(isSafeImageUrl('http://localhost:3000/sample.png'), true);
});

test('Security: isSafeImageUrl permits valid base64 raster image data URIs', () => {
  assert.strictEqual(isSafeImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
  assert.strictEqual(isSafeImageUrl('data:image/png;base64,iVBORw0KGgo=='), true);
  assert.strictEqual(isSafeImageUrl('data:image/webp;base64,UklGR=='), true);
});

test('Security: isSafeImageUrl blocks XSS and malicious protocols', () => {
  assert.strictEqual(isSafeImageUrl('javascript:alert(document.cookie)'), false);
  assert.strictEqual(isSafeImageUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.strictEqual(isSafeImageUrl('data:image/svg+xml;utf8,<svg onload="alert(1)"/>'), false);
  assert.strictEqual(isSafeImageUrl('file:///etc/passwd'), false);
  assert.strictEqual(isSafeImageUrl(''), false);
  assert.strictEqual(isSafeImageUrl(null), false);
  assert.strictEqual(isSafeImageUrl(undefined), false);
});

test('Security: sanitizeInput strips non-printable ASCII control characters', () => {
  const dirty = 'Hazardous \x00road\x07 crater\x1B near school\x7F';
  const clean = sanitizeInput(dirty);
  assert.strictEqual(clean, 'Hazardous road crater near school');
  assert.strictEqual(sanitizeInput('   Pothole on Main St   '), 'Pothole on Main St');
  assert.strictEqual(sanitizeInput(null), '');
});
