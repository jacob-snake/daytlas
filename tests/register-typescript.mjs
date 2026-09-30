// Node >=22.18. Resolve Next.js imports and transpile production TypeScript
// using the project's existing compiler, without a separate test framework.
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, extname } from "node:path";
import ts from "typescript";
const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server")
      return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) {
      specifier = pathToFileURL(resolve(root, "src", specifier.slice(2))).href;
    }
    if (
      !context.parentURL?.includes("/node_modules/") &&
      (specifier.startsWith(".") || specifier.startsWith("file:")) &&
      !extname(specifier)
    ) {
      for (const extension of ["ts", "tsx"]) {
        try {
          return nextResolve(`${specifier}.${extension}`, context);
        } catch (error) {
          if (
            error.code !== "ERR_MODULE_NOT_FOUND" &&
            error.code !== "MODULE_NOT_FOUND"
          )
            throw error;
        }
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url)) {
      return {
        format: "module",
        source: ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
          },
          fileName: fileURLToPath(url),
        }).outputText,
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});
