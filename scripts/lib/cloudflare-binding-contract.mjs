function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function checkBindingContract(config, baseline) {
  const failures = [];
  if (config.name !== baseline.worker) failures.push("Worker name changed");
  if (config.compatibilityDate !== baseline.compatibilityDate) failures.push("Compatibility date changed");
  if (!same([...(config.compatibilityFlags || [])].sort(), [...baseline.compatibilityFlags].sort())) failures.push("Compatibility flags changed");
  if (config.assets?.notFoundHandling !== baseline.assets.notFoundHandling) failures.push("Asset routing changed");
  if (Object.keys(config.assets || {}).some(key => key !== "notFoundHandling")) failures.push("Unreviewed asset setting");
  const expected = { ...baseline.bindings, ...baseline.reviewedAdditions };
  const env = config.env || {};
  for (const [name, binding] of Object.entries(expected)) {
    const candidate = env[name];
    if (!candidate) { failures.push(`Missing binding: ${name}`); continue; }
    if (candidate.type !== binding.type) failures.push(`Binding type changed: ${name}`);
    if (binding.type === "secret" && Object.keys(candidate).some(key => key !== "type")) failures.push(`Unexpected secret configuration: ${name}`);
    if (binding.type === "text" && candidate.value !== binding.value) failures.push(`Text binding changed: ${name}`);
    if (binding.type === "hyperdrive" && candidate.id !== binding.id) failures.push(`Resource binding changed: ${name}`);
    if (binding.type === "hyperdrive" && candidate.dev?.connectionString) failures.push(`Local database override present: ${name}`);
  }
  for (const name of Object.keys(env)) if (!(name in expected)) failures.push(`Unreviewed binding: ${name}`);
  // Never serialize config, connection strings, text values or provider bodies.
  if (failures.length) throw new Error(`Cloudflare binding contract failed:\n${failures.join("\n")}`);
  return { preserved: Object.keys(baseline.bindings), added: Object.keys(baseline.reviewedAdditions) };
}

export function checkActiveVersion(version, baseline) {
  if (version.id !== baseline.activeVersion) throw new Error("Active Worker version changed; refresh authenticated binding evidence before release.");
  const actual = {};
  if (!Array.isArray(version.bindings) || !version.bindings.length) throw new Error("Active binding evidence missing.");
  for (const binding of version.bindings) {
    if (typeof binding.name !== "string" || Object.hasOwn(actual, binding.name)) throw new Error("Invalid or duplicate active binding name.");
    if (binding.type === "secret_text") actual[binding.name] = { type: "secret" };
    else if (binding.type === "plain_text") actual[binding.name] = { type: "text", value: binding.text };
    else if (binding.type === "hyperdrive") actual[binding.name] = { type: "hyperdrive", id: binding.id };
    else if (binding.type === "assets") actual[binding.name] = { type: "assets" };
    else throw new Error(`Unreviewed active binding type: ${binding.name}`);
  }
  const config = {
    name: baseline.worker,
    compatibilityDate: version.compatibility_date,
    compatibilityFlags: version.compatibility_flags,
    assets: { notFoundHandling: version.assets?.config?.not_found_handling },
    env: actual,
  };
  return checkBindingContract(config, { ...baseline, reviewedAdditions: {} });
}
