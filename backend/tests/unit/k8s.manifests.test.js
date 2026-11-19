// tests/unit/k8s.manifests.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('PIPE-07 — Kubernetes Manifests & Deployment Specifications', () => {
    const k8sBaseDir = path.resolve(__dirname, '../../../k8s/base');
    const k8sScriptsDir = path.resolve(__dirname, '../../../k8s/scripts');

    it('should have all standard Kubernetes base manifests present', () => {
        const requiredFiles = [
            'deployment.yaml',
            'service.yaml',
            'ingress.yaml',
            'serviceaccount.yaml',
            'kustomization.yaml',
        ];

        for (const file of requiredFiles) {
            const filePath = path.join(k8sBaseDir, file);
            assert(fs.existsSync(filePath), `Expected manifest file ${file} to exist in k8s/base/`);
        }
    });

    it('Deployment manifest should enforce security best practices (least-privilege)', () => {
        const deploymentContent = fs.readFileSync(path.join(k8sBaseDir, 'deployment.yaml'), 'utf8');

        // Security context checks
        assert(deploymentContent.includes('runAsNonRoot: true'), 'Deployment must specify runAsNonRoot: true');
        assert(deploymentContent.includes('allowPrivilegeEscalation: false'), 'Deployment must specify allowPrivilegeEscalation: false');
        assert(deploymentContent.includes('drop:'), 'Deployment must drop capabilities');
        assert(deploymentContent.includes('- ALL'), 'Deployment must drop ALL capabilities');

        // Health probes checks
        assert(deploymentContent.includes('livenessProbe:'), 'Deployment must include livenessProbe');
        assert(deploymentContent.includes('readinessProbe:'), 'Deployment must include readinessProbe');

        // Resource limits checks
        assert(deploymentContent.includes('resources:'), 'Deployment must define resources block');
        assert(deploymentContent.includes('limits:'), 'Deployment must define resource limits');
        assert(deploymentContent.includes('requests:'), 'Deployment must define resource requests');
    });

    it('ServiceAccount manifest should disable automatic token mounting', () => {
        const saContent = fs.readFileSync(path.join(k8sBaseDir, 'serviceaccount.yaml'), 'utf8');
        assert(saContent.includes('automountServiceAccountToken: false'), 'ServiceAccount must disable automountServiceAccountToken for security');
    });

    it('render-and-deploy.sh script should contain rollout timeout and readiness checks', () => {
        const scriptPath = path.join(k8sScriptsDir, 'render-and-deploy.sh');
        assert(fs.existsSync(scriptPath), 'render-and-deploy.sh must exist');

        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        assert(scriptContent.includes('set -euo pipefail'), 'Script must enforce strict bash error handling');
        assert(scriptContent.includes('kubectl rollout status'), 'Script must invoke kubectl rollout status');
        assert(scriptContent.includes('--timeout='), 'Script must pass a timeout to rollout status');
        assert(scriptContent.includes('readyReplicas'), 'Script must verify readyReplicas for workload readiness');
    });

    it('AWS-02: render-and-deploy.sh must validate deployment identity namespace access', () => {
        const scriptPath = path.join(k8sScriptsDir, 'render-and-deploy.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        assert(
            scriptContent.includes('kubectl auth can-i create deployments'),
            'Script must check deployment identity can CREATE deployments in namespace'
        );
        assert(
            scriptContent.includes('kubectl auth can-i get deployments'),
            'Script must check deployment identity can GET deployments in namespace'
        );
    });

    it('AWS-02: render-and-deploy.sh must return actionable failure messages when cluster is unreachable', () => {
        const scriptPath = path.join(k8sScriptsDir, 'render-and-deploy.sh');
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        assert(
            scriptContent.includes('ACTIONABLE:'),
            'Script must include ACTIONABLE: failure messages to guide operators'
        );
        assert(
            scriptContent.includes('Cannot reach Kubernetes cluster'),
            'Script must emit a clear message when the cluster endpoint is unreachable'
        );
        assert(
            scriptContent.includes('Deployment identity cannot'),
            'Script must emit a clear message when namespace access is denied'
        );
    });
});
