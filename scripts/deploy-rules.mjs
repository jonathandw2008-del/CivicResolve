import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const keyPath = path.resolve('serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const rulesPath = path.resolve('firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

async function deployRules() {
  console.log(`[CivicResolve] Deploying firestore.rules to project: ${serviceAccount.project_id}...`);

  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();

  // 1. Create a new ruleset
  console.log('1. Creating new ruleset with latest firestore.rules content...');
  const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${serviceAccount.project_id}/rulesets`;
  const createRes = await client.request({
    url: createRulesetUrl,
    method: 'POST',
    data: {
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent,
          },
        ],
      },
    },
  });

  const newRulesetName = createRes.data.name;
  console.log(`✓ Ruleset created successfully: ${newRulesetName}`);

  // 2. Release the new ruleset for cloud.firestore
  console.log('2. Updating release projects/' + serviceAccount.project_id + '/releases/cloud.firestore...');
  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${serviceAccount.project_id}/releases/cloud.firestore`;
  const updateRes = await client.request({
    url: releaseUrl,
    method: 'PATCH',
    data: {
      release: {
        name: `projects/${serviceAccount.project_id}/releases/cloud.firestore`,
        rulesetName: newRulesetName,
      },
    },
  });

  console.log(`✓ Release updated successfully!`);
  console.log(`Active Release: ${updateRes.data.name}`);
  console.log(`Active Ruleset: ${updateRes.data.rulesetName}`);
  console.log(`Update Time: ${updateRes.data.updateTime}`);
  console.log('\n[Success] Firestore Security Rules deployed live to Firebase Project ' + serviceAccount.project_id + '!');
}

deployRules().catch((err) => {
  console.error('[Error] Failed to deploy rules:', err.response?.data || err.message);
  process.exit(1);
});
