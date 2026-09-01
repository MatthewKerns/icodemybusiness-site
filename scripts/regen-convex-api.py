#!/usr/bin/env python3
"""Regenerate convex/_generated/api.d.ts without a Convex deployment.

Mirrors exactly what `npx convex codegen` emits: an alphabetical module list.
Run after adding or removing a convex/*.ts function module.
"""
import pathlib, re, sys

root = pathlib.Path(__file__).resolve()
convex = pathlib.Path("convex")
mods = []
for path in sorted(convex.rglob("*.ts")):
    rel = path.relative_to(convex)
    parts = rel.parts
    if parts[0] == "_generated":
        continue
    if path.name.endswith((".test.ts", ".spec.ts", ".d.ts")):
        continue
    if rel.as_posix() == "schema.ts":   # codegen excludes the schema module
        continue
    name = str(rel.with_suffix(""))          # e.g. lib/auth
    alias = name.replace("/", "_")            # e.g. lib_auth
    mods.append((name, alias))

imports = "\n".join(f'import type * as {a} from "../{n}.js";' for n, a in mods)
entries = "\n".join(
    (f"  {n}: typeof {a};" if "/" not in n else f'  "{n}": typeof {a};')
    for n, a in mods
)

out = f'''/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

{imports}

import type {{
  ApiFromModules,
  FilterApi,
  FunctionReference,
}} from "convex/server";

declare const fullApi: ApiFromModules<{{
{entries}
}}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {{}};
'''
target = convex / "_generated" / "api.d.ts"
target.write_text(out)
print(f"wrote {target} with {len(mods)} modules")
