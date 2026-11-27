// backend/src/modules/projects/awsCleanup.service.js
// Full ordered AWS & Kubernetes resource teardown for BYOC EKS projects.
// Works even without a local terraform.tfstate file.
'use strict';

const { spawn } = require('child_process');
const { decryptSecret } = require('../../utils/crypto.service');

/**
 * Normalizes a project name into the `iiap-<name>` Kubernetes/ECR identifier.
 */
function sanitizeK8sName(rawName = 'app') {
    const cleaned = String(rawName)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    const prefixed = `iiap-${cleaned || 'app'}`;
    return prefixed.slice(0, 63).replace(/-+$/, '');
}

/**
 * Run a CLI command and return { exitCode, stdout, stderr }.
 */
function runCli(command, args, { env = {}, timeoutMs = 120_000 } = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            env: { ...process.env, ...env },
            shell: process.platform === 'win32',
        });

        let stdout = '';
        let stderr = '';
        let finished = false;

        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                child.kill('SIGTERM');
                resolve({ exitCode: 124, stdout, stderr: `${stderr}\nTimed out after ${timeoutMs / 1000}s` });
            }
        }, timeoutMs);

        child.stdout.on('data', (c) => { stdout += c.toString('utf8'); });
        child.stderr.on('data', (c) => { stderr += c.toString('utf8'); });
        child.on('error', (err) => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve({ exitCode: 1, stdout, stderr: err.message });
            }
        });
        child.on('close', (code) => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve({ exitCode: code ?? 1, stdout, stderr });
            }
        });
    });
}

function parseJsonSafe(text, fallback = null) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

/**
 * Resolve AWS credentials env from a stored aws_cluster_targets record.
 */
async function resolveAwsEnv(target) {
    const region = target.aws_region || 'us-east-1';
    const env = { AWS_REGION: region, AWS_DEFAULT_REGION: region };

    if (target.auth_mode === 'ACCESS_KEYS') {
        if (target.access_key_id) env.AWS_ACCESS_KEY_ID = target.access_key_id;
        if (target.encrypted_secret_key && target.secret_key_iv && target.secret_key_tag) {
            env.AWS_SECRET_ACCESS_KEY = decryptSecret({
                ciphertext: target.encrypted_secret_key,
                iv: target.secret_key_iv,
                tag: target.secret_key_tag,
            });
        }
        return env;
    }

    if (target.auth_mode === 'IAM_ROLE' && target.role_arn) {
        const stsArgs = [
            'sts', 'assume-role',
            '--role-arn', target.role_arn,
            '--role-session-name', `iiap-destroy-${Date.now()}`,
            '--output', 'json',
        ];
        if (target.external_id) stsArgs.push('--external-id', target.external_id);
        const res = await runCli('aws', stsArgs, { env, timeoutMs: 30_000 });
        if (res.exitCode !== 0) {
            throw new Error(`sts:AssumeRole failed: ${(res.stderr || res.stdout).trim()}`);
        }
        const creds = parseJsonSafe(res.stdout)?.Credentials;
        if (!creds) throw new Error('Invalid STS AssumeRole response');
        return {
            ...env,
            AWS_ACCESS_KEY_ID: creds.AccessKeyId,
            AWS_SECRET_ACCESS_KEY: creds.SecretAccessKey,
            AWS_SESSION_TOKEN: creds.SessionToken,
        };
    }

    return env;
}

/**
 * Step 1: Delete Kubernetes namespace (releases LoadBalancer ELB before VPC teardown).
 */
async function cleanupKubernetesNamespace(clusterName, namespace, region, env, log) {
    const kubeRes = await runCli(
        'aws',
        ['eks', 'update-kubeconfig', '--region', region, '--name', clusterName],
        { env, timeoutMs: 30_000 }
    );
    if (kubeRes.exitCode !== 0) return false;

    log(`[CLEANUP] Deleting Kubernetes namespace '${namespace}' (releases ELB)...`);
    const delRes = await runCli(
        'kubectl',
        ['delete', 'namespace', namespace, '--ignore-not-found', '--wait=true', '--timeout=120s'],
        { env, timeoutMs: 130_000 }
    );
    return delRes.exitCode === 0;
}

/**
 * Step 2: Inspect EKS cluster (to capture VPC ID & OIDC issuer), delete nodegroups, then delete cluster.
 */
async function deleteEksClusterAndNodes(clusterName, region, env, log) {
    let vpcId = null;
    let oidcIssuer = null;

    const descRes = await runCli(
        'aws',
        ['eks', 'describe-cluster', '--name', clusterName, '--region', region, '--output', 'json'],
        { env, timeoutMs: 30_000 }
    );

    if (descRes.exitCode !== 0) {
        log(`[CLEANUP] EKS cluster '${clusterName}' not found (already deleted).`);
        return { vpcId, oidcIssuer, deleted: false };
    }

    const cluster = parseJsonSafe(descRes.stdout)?.cluster;
    vpcId = cluster?.resourcesVpcConfig?.vpcId || null;
    oidcIssuer = cluster?.identity?.oidc?.issuer || null;

    // Delete all Managed Node Groups (and their EC2 instances)
    const ngListRes = await runCli(
        'aws',
        ['eks', 'list-nodegroups', '--cluster-name', clusterName, '--region', region, '--output', 'json'],
        { env, timeoutMs: 30_000 }
    );
    const nodegroups = parseJsonSafe(ngListRes.stdout)?.nodegroups || [];

    for (const ng of nodegroups) {
        log(`[CLEANUP] Deleting EKS node group '${ng}' (terminating EC2 nodes)...`);
        await runCli(
            'aws',
            ['eks', 'delete-nodegroup', '--cluster-name', clusterName, '--nodegroup-name', ng, '--region', region],
            { env, timeoutMs: 30_000 }
        );
        await runCli(
            'aws',
            ['eks', 'wait', 'nodegroup-deleted', '--cluster-name', clusterName, '--nodegroup-name', ng, '--region', region],
            { env, timeoutMs: 600_000 }
        );
    }

    // Delete EKS Control Plane
    log(`[CLEANUP] Deleting EKS cluster '${clusterName}'...`);
    await runCli(
        'aws',
        ['eks', 'delete-cluster', '--name', clusterName, '--region', region],
        { env, timeoutMs: 30_000 }
    );
    await runCli(
        'aws',
        ['eks', 'wait', 'cluster-deleted', '--name', clusterName, '--region', region],
        { env, timeoutMs: 600_000 }
    );

    return { vpcId, oidcIssuer, deleted: true };
}

/**
 * Step 3: Delete OIDC provider associated with the cluster.
 */
async function deleteOidcProvider(oidcIssuer, env, log) {
    if (!oidcIssuer) return;
    const issuerHostPath = oidcIssuer.replace(/^https?:\/\//, '');
    const listRes = await runCli(
        'aws',
        ['iam', 'list-open-id-connect-providers', '--output', 'json'],
        { env, timeoutMs: 20_000 }
    );
    const providers = parseJsonSafe(listRes.stdout)?.OpenIDConnectProviderList || [];
    for (const p of providers) {
        if (p.Arn && p.Arn.includes(issuerHostPath)) {
            log(`[CLEANUP] Deleting OIDC provider ${p.Arn}...`);
            await runCli(
                'aws',
                ['iam', 'delete-open-id-connect-provider', '--open-id-connect-provider-arn', p.Arn],
                { env, timeoutMs: 20_000 }
            );
        }
    }
}

/**
 * Discover VPC ID by cluster tag if EKS cluster was already gone.
 */
async function findVpcIdByClusterTag(clusterName, region, env) {
    const res = await runCli(
        'aws',
        [
            'ec2', 'describe-vpcs', '--region', region,
            '--filters', `Name=tag:kubernetes.io/cluster/${clusterName},Values=shared,owned`,
            '--output', 'json',
        ],
        { env, timeoutMs: 20_000 }
    );
    const vpcs = parseJsonSafe(res.stdout)?.Vpcs || [];
    return vpcs[0]?.VpcId || null;
}

/**
 * Step 4: Delete all Load Balancers, NAT Gateways, Elastic IPs, ENIs, IGWs, Subnets,
 * non-main Route Tables, non-default Security Groups, and finally the VPC itself.
 */
async function deleteVpcAndDependencies(vpcId, region, env, log) {
    if (!vpcId) return false;
    log(`[CLEANUP] Cleaning up VPC '${vpcId}' and all networking dependencies...`);

    // 4a. Delete any Classic ELBs in this VPC
    const elbRes = await runCli('aws', ['elb', 'describe-load-balancers', '--region', region, '--output', 'json'], { env, timeoutMs: 20_000 });
    const elbs = (parseJsonSafe(elbRes.stdout)?.LoadBalancerDescriptions || []).filter((lb) => lb.VPCId === vpcId);
    for (const lb of elbs) {
        log(`[CLEANUP] Deleting Classic ELB '${lb.LoadBalancerName}'...`);
        await runCli('aws', ['elb', 'delete-load-balancer', '--load-balancer-name', lb.LoadBalancerName, '--region', region], { env, timeoutMs: 30_000 });
    }

    // 4b. Delete any ELBv2 (ALB/NLB) in this VPC
    const elbv2Res = await runCli('aws', ['elbv2', 'describe-load-balancers', '--region', region, '--output', 'json'], { env, timeoutMs: 20_000 });
    const elbv2s = (parseJsonSafe(elbv2Res.stdout)?.LoadBalancers || []).filter((lb) => lb.VpcId === vpcId);
    for (const lb of elbv2s) {
        log(`[CLEANUP] Deleting ELBv2 '${lb.LoadBalancerName}'...`);
        await runCli('aws', ['elbv2', 'delete-load-balancer', '--load-balancer-arn', lb.LoadBalancerArn, '--region', region], { env, timeoutMs: 30_000 });
    }

    if (elbs.length > 0 || elbv2s.length > 0) {
        await new Promise((r) => setTimeout(r, 15_000));
    }

    // 4c. Delete NAT Gateways & capture their Elastic IP AllocationIds
    const natRes = await runCli(
        'aws',
        ['ec2', 'describe-nat-gateways', '--region', region, '--filter', `Name=vpc-id,Values=${vpcId}`, '--output', 'json'],
        { env, timeoutMs: 20_000 }
    );
    const natGws = (parseJsonSafe(natRes.stdout)?.NatGateways || []).filter((n) => n.State !== 'deleted');
    const eipAllocIds = [];
    const deletingNatIds = [];

    for (const nat of natGws) {
        for (const addr of nat.NatGatewayAddresses || []) {
            if (addr.AllocationId) eipAllocIds.push(addr.AllocationId);
        }
        if (nat.State !== 'deleting') {
            log(`[CLEANUP] Deleting NAT Gateway '${nat.NatGatewayId}'...`);
            await runCli('aws', ['ec2', 'delete-nat-gateway', '--nat-gateway-id', nat.NatGatewayId, '--region', region], { env, timeoutMs: 30_000 });
        }
        deletingNatIds.push(nat.NatGatewayId);
    }

    if (deletingNatIds.length > 0) {
        log(`[CLEANUP] Waiting for NAT Gateway(s) to finish deleting...`);
        await runCli(
            'aws',
            ['ec2', 'wait', 'nat-gateway-deleted', '--nat-gateway-ids', ...deletingNatIds, '--region', region],
            { env, timeoutMs: 300_000 }
        );
    }

    // 4d. Release Elastic IPs
    for (const allocId of eipAllocIds) {
        log(`[CLEANUP] Releasing Elastic IP '${allocId}'...`);
        await runCli('aws', ['ec2', 'release-address', '--allocation-id', allocId, '--region', region], { env, timeoutMs: 20_000 });
    }

    // 4e. Delete any remaining Network Interfaces (ENIs)
    const eniRes = await runCli(
        'aws',
        ['ec2', 'describe-network-interfaces', '--region', region, '--filters', `Name=vpc-id,Values=${vpcId}`, '--output', 'json'],
        { env, timeoutMs: 20_000 }
    );
    const enis = parseJsonSafe(eniRes.stdout)?.NetworkInterfaces || [];
    for (const eni of enis) {
        if (eni.Attachment?.AttachmentId) {
            await runCli('aws', ['ec2', 'detach-network-interface', '--attachment-id', eni.Attachment.AttachmentId, '--force', '--region', region], { env, timeoutMs: 20_000 });
        }
        await runCli('aws', ['ec2', 'delete-network-interface', '--network-interface-id', eni.NetworkInterfaceId, '--region', region], { env, timeoutMs: 20_000 });
    }

    // 4f. Detach and delete Internet Gateways
    const igwRes = await runCli(
        'aws',
        ['ec2', 'describe-internet-gateways', '--region', region, '--filters', `Name=attachment.vpc-id,Values=${vpcId}`, '--output', 'json'],
        { env, timeoutMs: 20_000 }
    );
    const igws = parseJsonSafe(igwRes.stdout)?.InternetGateways || [];
    for (const igw of igws) {
        log(`[CLEANUP] Detaching & deleting Internet Gateway '${igw.InternetGatewayId}'...`);
        await runCli('aws', ['ec2', 'detach-internet-gateway', '--internet-gateway-id', igw.InternetGatewayId, '--vpc-id', vpcId, '--region', region], { env, timeoutMs: 20_000 });
        await runCli('aws', ['ec2', 'delete-internet-gateway', '--internet-gateway-id', igw.InternetGatewayId, '--region', region], { env, timeoutMs: 20_000 });
    }

    // 4g. Delete Subnets
    const subRes = await runCli(
        'aws',
        ['ec2', 'describe-subnets', '--region', region, '--filters', `Name=vpc-id,Values=${vpcId}`, '--output', 'json'],
        { env, timeoutMs: 20_000 }
    );
    const subnets = parseJsonSafe(subRes.stdout)?.Subnets || [];
    for (const sub of subnets) {
        log(`[CLEANUP] Deleting Subnet '${sub.SubnetId}'...`);
        await runCli('aws', ['ec2', 'delete-subnet', '--subnet-id', sub.SubnetId, '--region', region], { env, timeoutMs: 20_000 });
    }

    // 4h. Delete non-main Route Tables
    const rtRes = await runCli(
        'aws',
        ['ec2', 'describe-route-tables', '--region', region, '--filters', `Name=vpc-id,Values=${vpcId}`, '--output', 'json'],
        { env, timeoutMs: 20_000 }
    );
    const rts = parseJsonSafe(rtRes.stdout)?.RouteTables || [];
    for (const rt of rts) {
        const isMain = (rt.Associations || []).some((a) => a.Main);
        if (isMain) continue;
        for (const assoc of rt.Associations || []) {
            if (assoc.RouteTableAssociationId) {
                await runCli('aws', ['ec2', 'disassociate-route-table', '--association-id', assoc.RouteTableAssociationId, '--region', region], { env, timeoutMs: 20_000 });
            }
        }
        await runCli('aws', ['ec2', 'delete-route-table', '--route-table-id', rt.RouteTableId, '--region', region], { env, timeoutMs: 20_000 });
    }

    // 4i. Delete non-default Security Groups
    const sgRes = await runCli(
        'aws',
        ['ec2', 'describe-security-groups', '--region', region, '--filters', `Name=vpc-id,Values=${vpcId}`, '--output', 'json'],
        { env, timeoutMs: 20_000 }
    );
    const sgs = (parseJsonSafe(sgRes.stdout)?.SecurityGroups || []).filter((sg) => sg.GroupName !== 'default');
    for (const sg of sgs) {
        if (sg.IpPermissions?.length) {
            await runCli('aws', ['ec2', 'revoke-security-group-ingress', '--group-id', sg.GroupId, '--ip-permissions', JSON.stringify(sg.IpPermissions), '--region', region], { env, timeoutMs: 20_000 });
        }
        if (sg.IpPermissionsEgress?.length) {
            await runCli('aws', ['ec2', 'revoke-security-group-egress', '--group-id', sg.GroupId, '--ip-permissions', JSON.stringify(sg.IpPermissionsEgress), '--region', region], { env, timeoutMs: 20_000 });
        }
    }
    for (const sg of sgs) {
        await runCli('aws', ['ec2', 'delete-security-group', '--group-id', sg.GroupId, '--region', region], { env, timeoutMs: 20_000 });
    }

    // 4j. Finally delete the VPC
    log(`[CLEANUP] Deleting VPC '${vpcId}'...`);
    const vpcDel = await runCli('aws', ['ec2', 'delete-vpc', '--vpc-id', vpcId, '--region', region], { env, timeoutMs: 30_000 });
    return vpcDel.exitCode === 0;
}

/**
 * Step 5: Delete IAM Roles created for the EKS cluster and worker nodes.
 */
async function deleteClusterIamRoles(clusterName, env, log) {
    const roleNames = [`${clusterName}-cluster-role`, `${clusterName}-node-role`];

    for (const roleName of roleNames) {
        const getRes = await runCli('aws', ['iam', 'get-role', '--role-name', roleName], { env, timeoutMs: 15_000 });
        if (getRes.exitCode !== 0) continue;

        log(`[CLEANUP] Deleting IAM Role '${roleName}'...`);
        const attachedRes = await runCli('aws', ['iam', 'list-attached-role-policies', '--role-name', roleName, '--output', 'json'], { env, timeoutMs: 15_000 });
        for (const p of parseJsonSafe(attachedRes.stdout)?.AttachedPolicies || []) {
            await runCli('aws', ['iam', 'detach-role-policy', '--role-name', roleName, '--policy-arn', p.PolicyArn], { env, timeoutMs: 15_000 });
        }

        const inlineRes = await runCli('aws', ['iam', 'list-role-policies', '--role-name', roleName, '--output', 'json'], { env, timeoutMs: 15_000 });
        for (const policyName of parseJsonSafe(inlineRes.stdout)?.PolicyNames || []) {
            await runCli('aws', ['iam', 'delete-role-policy', '--role-name', roleName, '--policy-name', policyName], { env, timeoutMs: 15_000 });
        }

        const profRes = await runCli('aws', ['iam', 'list-instance-profiles-for-role', '--role-name', roleName, '--output', 'json'], { env, timeoutMs: 15_000 });
        for (const prof of parseJsonSafe(profRes.stdout)?.InstanceProfiles || []) {
            await runCli('aws', ['iam', 'remove-role-from-instance-profile', '--instance-profile-name', prof.InstanceProfileName, '--role-name', roleName], { env, timeoutMs: 15_000 });
        }

        await runCli('aws', ['iam', 'delete-role', '--role-name', roleName], { env, timeoutMs: 15_000 });
    }
}

/**
 * Step 6: Force-delete the project's ECR repository and all its images.
 */
async function deleteEcrRepository(appName, region, env, log) {
    log(`[CLEANUP] Deleting ECR repository '${appName}' (if present)...`);
    await runCli(
        'aws',
        ['ecr', 'delete-repository', '--repository-name', appName, '--force', '--region', region],
        { env, timeoutMs: 30_000 }
    );
}

/**
 * Orchestrates full ordered cleanup of all AWS & Kubernetes resources for a BYOC project.
 */
async function cleanupAllAwsResources({ projectName, clusterTarget, onLog = console.log }) {
    const region = clusterTarget.aws_region || 'us-east-1';
    const clusterName = clusterTarget.cluster_name;
    const appName = sanitizeK8sName(projectName || clusterName);
    const awsEnv = await resolveAwsEnv(clusterTarget);

    await cleanupKubernetesNamespace(clusterName, appName, region, awsEnv, onLog);

    const eksResult = await deleteEksClusterAndNodes(clusterName, region, awsEnv, onLog);
    await deleteOidcProvider(eksResult.oidcIssuer, awsEnv, onLog);

    const vpcId = eksResult.vpcId || (await findVpcIdByClusterTag(clusterName, region, awsEnv));
    const vpcDeleted = await deleteVpcAndDependencies(vpcId, region, awsEnv, onLog);

    await deleteClusterIamRoles(clusterName, awsEnv, onLog);
    await deleteEcrRepository(appName, region, awsEnv, onLog);

    onLog(`[CLEANUP] Finished full AWS teardown for '${clusterName}' (VPC deleted: ${vpcDeleted}).`);
    return { clusterName, region, vpcId, vpcDeleted };
}

module.exports = {
    cleanupAllAwsResources,
    sanitizeK8sName,
};
