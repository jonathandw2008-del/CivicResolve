import test from 'node:test';
import assert from 'node:assert';

function validateComplaintInput({ title, description, location, fileType, fileSize }) {
  const errors = {};

  const cleanTitle = (title || '').trim();
  if (!cleanTitle) {
    errors.title = 'Please enter a clear summary of the issue';
  } else if (cleanTitle.length < 5) {
    errors.title = 'Title must be at least 5 characters';
  } else if (cleanTitle.length > 120) {
    errors.title = 'Title cannot exceed 120 characters';
  }

  const cleanDesc = (description || '').trim();
  if (!cleanDesc) {
    errors.description = 'Please provide detailed information about the civic issue';
  } else if (cleanDesc.length < 15) {
    errors.description = 'Please describe with more detail (at least 15 characters)';
  } else if (cleanDesc.length > 2000) {
    errors.description = 'Description cannot exceed 2000 characters';
  }

  const cleanLoc = (location || '').trim();
  if (!cleanLoc) {
    errors.location = 'Please provide the street address, landmark or pillar number';
  } else if (cleanLoc.length < 3) {
    errors.location = 'Location must be at least 3 characters';
  } else if (cleanLoc.length > 150) {
    errors.location = 'Location cannot exceed 150 characters';
  }

  if (fileType) {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(fileType.toLowerCase())) {
      errors.image = 'Please select a valid JPG, PNG, or WebP image.';
    }
  }

  if (fileSize && fileSize > 2 * 1024 * 1024) {
    errors.image = 'Image size should not exceed 2MB';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

test('Validation: accepts well-formed complaint inputs', () => {
  const result = validateComplaintInput({
    title: 'Severe water pipe leakage near market square',
    description: 'Drinking water pipe has burst flooding the street for over 6 hours.',
    location: 'Cross Cut Road, near pillar 42',
    fileType: 'image/jpeg',
    fileSize: 500 * 1024,
  });
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(Object.keys(result.errors).length, 0);
});

test('Validation: rejects too short or too long title', () => {
  const tooShort = validateComplaintInput({
    title: 'Fix',
    description: 'Valid description that has plenty of length to satisfy check.',
    location: 'Main street',
  });
  assert.strictEqual(tooShort.isValid, false);
  assert.strictEqual(tooShort.errors.title, 'Title must be at least 5 characters');

  const tooLong = validateComplaintInput({
    title: 'A'.repeat(125),
    description: 'Valid description that has plenty of length to satisfy check.',
    location: 'Main street',
  });
  assert.strictEqual(tooLong.isValid, false);
  assert.strictEqual(tooLong.errors.title, 'Title cannot exceed 120 characters');
});

test('Validation: rejects too short or too long description', () => {
  const tooShort = validateComplaintInput({
    title: 'Broken streetlight',
    description: 'Dark road here',
    location: 'Main street',
  });
  assert.strictEqual(tooShort.isValid, false);
  assert.strictEqual(tooShort.errors.description, 'Please describe with more detail (at least 15 characters)');

  const tooLong = validateComplaintInput({
    title: 'Broken streetlight',
    description: 'X'.repeat(2005),
    location: 'Main street',
  });
  assert.strictEqual(tooLong.isValid, false);
  assert.strictEqual(tooLong.errors.description, 'Description cannot exceed 2000 characters');
});

test('Validation: rejects dangerous file uploads', () => {
  const svgUpload = validateComplaintInput({
    title: 'Valid title for testing',
    description: 'Valid description that has plenty of length to satisfy check.',
    location: 'Main street',
    fileType: 'image/svg+xml',
    fileSize: 1024,
  });
  assert.strictEqual(svgUpload.isValid, false);
  assert.ok(svgUpload.errors.image.includes('valid JPG, PNG, or WebP'));

  const oversized = validateComplaintInput({
    title: 'Valid title for testing',
    description: 'Valid description that has plenty of length to satisfy check.',
    location: 'Main street',
    fileType: 'image/png',
    fileSize: 3 * 1024 * 1024, // 3MB
  });
  assert.strictEqual(oversized.isValid, false);
  assert.ok(oversized.errors.image.includes('not exceed 2MB'));
});
