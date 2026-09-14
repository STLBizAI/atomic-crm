// Node module-customization hooks for running the FakeRest data generators
// standalone under Node/tsx (they were only ever meant to run under Vite).
// Registered via seed/register-svg-stub.mjs. Two problems solved here:
//
// 1. .svg imports: src/App's logo assets are Vite-only asset imports,
//    pulled in transitively via defaultConfiguration.ts. Stubbed to an
//    empty string — never rendered by this script.
// 2. `faker`'s named exports (e.g. `import { address } from
//    "faker/locale/en_US"`): Node's CJS->ESM interop only exposes named
//    exports it can statically detect (cjs-module-lexer), which fails for
//    faker's locale modules. Vite's bundler-based interop doesn't have
//    this limitation, which is why this only breaks outside Vite. Fixed
//    by loading the real CJS module ourselves and re-exporting every key.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith(".svg")) {
    return {
      url: "data:text/javascript,export default '';",
      shortCircuit: true,
    };
  }
  const fakerLocaleMatch = specifier.match(/^faker\/locale\/(\w+)$/);
  if (fakerLocaleMatch) {
    return { url: `faker-shim:${fakerLocaleMatch[1]}`, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("faker-shim:")) {
    const locale = url.slice("faker-shim:".length);
    const specifier = `faker/locale/${locale}`;
    const mod = require(specifier);
    const keys = Object.keys(mod).filter((key) =>
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key),
    );
    const source = [
      `import { createRequire as _cr } from "node:module";`,
      `const _req = _cr(${JSON.stringify(import.meta.url)});`,
      `const _mod = _req(${JSON.stringify(specifier)});`,
      `export default _mod;`,
      ...keys.map(
        (key) => `export const ${key} = _mod[${JSON.stringify(key)}];`,
      ),
    ].join("\n");
    return { format: "module", source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
