// backend/src/modules/integrations/jenkins/jenkins.config.js
require('dotenv').config();

module.exports = {
    url: () => (process.env.JENKINS_URL || 'http://localhost:8080').replace(/\/+$/, ''),
    user: () => process.env.JENKINS_USER || '',
    apiToken: () => process.env.JENKINS_API_TOKEN || '',
    jobName: () => process.env.JENKINS_JOB_NAME || 'pipeline-app-deployment',
    integrationMode: () => process.env.JENKINS_INTEGRATION_MODE || 'direct', // 'direct', 'mock'
    requestTimeoutMs: () => Number(process.env.JENKINS_TIMEOUT_MS || 5000),
};

