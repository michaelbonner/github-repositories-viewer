#!/usr/bin/env node
// Per-PR preview orchestration for Dokploy.
//
// Dokploy's built-in preview deployments build the image on the production
// box, which is exactly what we moved off it. Instead, CI builds a per-PR
// image and this script drives Dokploy's API to create/update/delete a
// Docker-provider app that just pulls it.
//
// Usage:
//   node scripts/dokploy-preview.mjs deploy     # create-or-update + deploy the PR's preview app
//   node scripts/dokploy-preview.mjs teardown   # delete the PR's preview app
//
// Required env:
//   DOKPLOY_URL                       e.g. https://dokploy.bootpack.dev
//   DOKPLOY_API_KEY                   Dokploy API key (x-api-key)
//   DOKPLOY_TEMPLATE_APPLICATION_ID   production app id — its previewEnv is the runtime-env template
//   DOKPLOY_PREVIEW_PROJECT_ID        project that holds the per-PR apps
//   DOKPLOY_PREVIEW_ENVIRONMENT_ID    environment (within that project) to create apps in
//   PR_NUMBER                         pull request number
//   IMAGE                             full image ref to deploy (deploy command only)
//   GHCR_USERNAME + GHCR_PASSWORD     GHCR pull credentials for the private image
// Optional:
//   GHCR_REGISTRY                     default "ghcr.io"
//   PREVIEW_HOST_SUFFIX               default "bootpack.work" (wildcard DNS + cert)

const {
	DOKPLOY_URL,
	DOKPLOY_API_KEY,
	DOKPLOY_TEMPLATE_APPLICATION_ID,
	DOKPLOY_PREVIEW_PROJECT_ID,
	DOKPLOY_PREVIEW_ENVIRONMENT_ID,
	PR_NUMBER,
	IMAGE,
	GHCR_USERNAME,
	GHCR_PASSWORD,
	GHCR_REGISTRY = 'ghcr.io',
	PREVIEW_HOST_SUFFIX = 'bootpack.work'
} = process.env;

const command = process.argv[2];
const APP_NAME = `grv-${PR_NUMBER}`;
const HOST = `${APP_NAME}.${PREVIEW_HOST_SUFFIX}`;
const APP_PORT = 3000;

// Values in previewEnv that must resolve to this PR's own host. Anything left
// pointing at production would send preview auth callbacks to the live site.
const HOST_DEPENDENT_KEYS = [];

function required(name, value) {
	if (!value) {
		console.error(`Missing required env: ${name}`);
		process.exit(1);
	}
}

// Dokploy's generated API uses GET for queries (.one/.all) and POST for mutations.
async function call(path, { method = 'POST', query, body } = {}) {
	let url = `${DOKPLOY_URL}/api/${path}`;
	if (query) url += '?' + new URLSearchParams(query).toString();
	const res = await fetch(url, {
		method,
		headers: {
			'x-api-key': DOKPLOY_API_KEY,
			'Content-Type': 'application/json',
			accept: 'application/json'
		},
		body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} /api/${path} -> ${res.status}: ${text.slice(0, 500)}`);
	let json;
	try {
		json = text ? JSON.parse(text) : null;
	} catch {
		json = text;
	}
	// Unwrap the { success, message, data } envelope when present.
	return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

// Read endpoint: try GET (Dokploy's query convention) and fall back to POST.
async function query(path, params) {
	try {
		return await call(path, { method: 'GET', query: params });
	} catch (err) {
		const status = Number(String(err.message).match(/-> (\d+):/)?.[1]);
		if ([400, 404, 405].includes(status)) {
			return await call(path, { method: 'POST', body: params });
		}
		throw err;
	}
}

// Pull previewEnv (the runtime env for preview containers) from the production
// app — one place to edit preview config, editable from the Dokploy UI.
async function getTemplate() {
	const app = await query('application.one', {
		applicationId: DOKPLOY_TEMPLATE_APPLICATION_ID
	});
	// Never fall back to the production env: it carries the production
	// DATABASE_URL, and a preview pointed at it could read and write live data.
	if (!app.previewEnv || !app.previewEnv.trim()) {
		throw new Error(
			'Template app has no previewEnv set; refusing to fall back to production env for a preview.'
		);
	}
	return { previewEnv: app.previewEnv, prodEnv: app.env || '' };
}

function getEnvValue(env, key) {
	const m = env.match(new RegExp(`^\\s*${key}=(.*)$`, 'm'));
	return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
}

// previewEnv is written for Dokploy's native preview flow, which substitutes
// ${{DOKPLOY_DEPLOY_URL}} itself. This script creates plain Docker-provider
// apps, so that substitution never happens — do it here before saving.
function materializePreviewEnv(env) {
	const materialized = env
		.replaceAll('${{DOKPLOY_DEPLOY_URL}}', HOST)
		.replaceAll('${{ DOKPLOY_DEPLOY_URL }}', HOST)
		.replaceAll('${DOKPLOY_DEPLOY_URL}', HOST)
		.replaceAll('$DOKPLOY_DEPLOY_URL', HOST);

	if (materialized.includes('DOKPLOY_DEPLOY_URL')) {
		throw new Error(
			'Preview env still contains DOKPLOY_DEPLOY_URL after host substitution; refusing to deploy.'
		);
	}

	// Assert the host-dependent values actually landed on this PR's host. A
	// stale production URL here silently breaks auth callbacks and redirects.
	for (const key of HOST_DEPENDENT_KEYS) {
		const value = getEnvValue(materialized, key);
		if (!value) {
			throw new Error(`Preview env is missing ${key}; refusing to deploy.`);
		}
		if (value.replace(/\/$/, '') !== `https://${HOST}`) {
			throw new Error(
				`Preview ${key} is "${value}", expected "https://${HOST}"; refusing to deploy.`
			);
		}
	}

	return materialized;
}

// Defense in depth: refuse to deploy a preview whose DB is the production DB.
function assertPreviewDb(previewEnv, prodEnv) {
	const previewDb = getEnvValue(previewEnv, 'DATABASE_URL');
	const prodDb = getEnvValue(prodEnv, 'DATABASE_URL');
	if (!previewDb) {
		throw new Error('Preview env has no DATABASE_URL; refusing to deploy.');
	}
	if (prodDb && previewDb === prodDb) {
		throw new Error(
			'Preview DATABASE_URL equals the production DATABASE_URL; refusing to deploy a preview against the production database.'
		);
	}
}

async function findAppId() {
	const project = await query('project.one', { projectId: DOKPLOY_PREVIEW_PROJECT_ID });
	for (const environment of project.environments || []) {
		const apps = environment.applications || environment.services?.applications || [];
		const match = apps.find((a) => a.name === APP_NAME);
		if (match) return match.applicationId;
	}
	return null;
}

async function deploy() {
	required('IMAGE', IMAGE);
	required('GHCR_USERNAME', GHCR_USERNAME);
	required('GHCR_PASSWORD', GHCR_PASSWORD);

	const template = await getTemplate();
	const env = materializePreviewEnv(template.previewEnv);
	assertPreviewDb(env, template.prodEnv);

	const creds = {
		dockerImage: IMAGE,
		registryUrl: GHCR_REGISTRY,
		username: GHCR_USERNAME,
		password: GHCR_PASSWORD
	};

	let appId = await findAppId();
	if (!appId) {
		console.log(`Creating preview app ${APP_NAME}...`);
		const created = await call('application.create', {
			body: { name: APP_NAME, environmentId: DOKPLOY_PREVIEW_ENVIRONMENT_ID }
		});
		appId = created.applicationId;
		await call('application.saveDockerProvider', { body: { applicationId: appId, ...creds } });
		await call('application.update', {
			body: { applicationId: appId, sourceType: 'docker', autoDeploy: false, env }
		});
		await call('domain.create', {
			body: {
				applicationId: appId,
				domainType: 'application',
				host: HOST,
				port: APP_PORT,
				https: true,
				certificateType: 'letsencrypt',
				stripPath: false
			}
		});
	} else {
		console.log(`Updating existing preview app ${APP_NAME} (${appId})...`);
		await call('application.saveDockerProvider', { body: { applicationId: appId, ...creds } });
		await call('application.update', {
			body: { applicationId: appId, sourceType: 'docker', autoDeploy: false, env }
		});
	}

	await call('application.deploy', { body: { applicationId: appId } });
	console.log(`Deployed. Preview URL: https://${HOST}`);

	if (process.env.GITHUB_OUTPUT) {
		const { appendFileSync } = await import('node:fs');
		appendFileSync(process.env.GITHUB_OUTPUT, `preview_url=https://${HOST}\n`);
	}
}

async function teardown() {
	const appId = await findAppId();
	if (!appId) {
		console.log(`No preview app named ${APP_NAME} to delete.`);
		return;
	}
	await call('application.delete', { body: { applicationId: appId } });
	console.log(`Deleted preview app ${APP_NAME} (${appId}).`);
}

required('DOKPLOY_URL', DOKPLOY_URL);
required('DOKPLOY_API_KEY', DOKPLOY_API_KEY);
required('DOKPLOY_TEMPLATE_APPLICATION_ID', DOKPLOY_TEMPLATE_APPLICATION_ID);
required('DOKPLOY_PREVIEW_PROJECT_ID', DOKPLOY_PREVIEW_PROJECT_ID);
required('DOKPLOY_PREVIEW_ENVIRONMENT_ID', DOKPLOY_PREVIEW_ENVIRONMENT_ID);
required('PR_NUMBER', PR_NUMBER);

const run = command === 'teardown' ? teardown : command === 'deploy' ? deploy : null;
if (!run) {
	console.error('Usage: dokploy-preview.mjs <deploy|teardown>');
	process.exit(1);
}
run().catch((err) => {
	console.error(err.message || err);
	process.exit(1);
});
