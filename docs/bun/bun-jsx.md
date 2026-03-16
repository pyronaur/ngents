---
summary: Plain JSX with Bun: how Bun transpiles JSX, how to avoid React, and the minimal runtime shapes needed for custom JSX components.
read_when:
  - Creating JSX or TSX components in Bun without React.
  - Choosing between `jsxFactory` and `jsxImportSource` for a custom JSX runtime.
  - Checking what Bun supports for JSX transpilation and config.
---

# Bun JSX Without React

This is the local source of truth for writing JSX components with Bun when the
goal is plain JSX syntax, not React.

## Core Idea

Bun supports `.jsx` and `.tsx` files out of the box and transpiles JSX before
execution.

Important boundary:

- Bun gives you the JSX syntax transform.
- Bun does not give you a built-in non-React component model.
- If you do not want React, you must point the JSX transform at your own
  factory or runtime.

In practice, JSX is just syntax that Bun rewrites into function calls.
Your functions decide what a component returns:

- DOM nodes
- HTML strings
- virtual nodes
- plain objects
- anything else your renderer understands

## Where Bun Reads JSX Config

Bun reads JSX settings from:

- `tsconfig.json`
- `jsconfig.json`
- `bunfig.toml`

`bunfig.toml` supports the same JSX-related fields for non-TypeScript projects:

```toml
jsx = "react"
jsxFactory = "h"
jsxFragment = "Fragment"
jsxImportSource = "my-jsx"
```

Use `tsconfig.json` when you are already in TypeScript. Use `bunfig.toml` when
you want Bun runtime config without relying on TypeScript config.

## Bun JSX Modes

These are the Bun-supported JSX transform modes that matter here:

- `jsx = "react"`
  Uses the classic runtime. JSX becomes calls to a factory function such as
  `createElement(...)` or your custom `h(...)`.
- `jsx = "react-jsx"`
  Uses the automatic runtime. JSX imports `jsx` / `jsxs` from
  `${jsxImportSource}/jsx-runtime`.
- `jsx = "react-jsxdev"`
  Uses the automatic development runtime. JSX imports `jsxDEV` from
  `${jsxImportSource}/jsx-dev-runtime`.
- `jsx = "preserve"`
  Not supported by Bun runtime execution.

For plain JSX without React, the two real choices are:

1. classic custom factory
2. custom automatic runtime module

## Option 1: Classic Custom Factory

Use this when you want the smallest, easiest setup.

`tsconfig.json`

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h",
    "jsxFragmentFactory": "Fragment"
  }
}
```

`index.tsx`

```tsx
function h(type: any, props: any, ...children: any[]) {
  if (typeof type === "function") {
    return type({ ...(props ?? {}), children });
  }

  return {
    type,
    props: props ?? {},
    children,
  };
}

function Fragment(props: { children?: any[] }) {
  return props.children ?? [];
}

function Card(props: { title: string }) {
  return (
    <section>
      <h1>{props.title}</h1>
      <p>Ready</p>
    </section>
  );
}

console.log(<Card title="Hello" />);
```

What Bun does here:

- `<Card title="Hello" />` becomes a call to `h(...)`
- fragments `<>...</>` become `Fragment`
- your `h()` implementation decides how elements and components behave
- `h` and `Fragment` must be in scope in the file or imported into it

This is the easiest route when you want JSX syntax but do not want React.

## Option 2: Automatic Runtime With `jsxImportSource`

Use this when you want the modern automatic runtime style.

`tsconfig.json`

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "my-jsx"
  }
}
```

Your runtime module must provide:

- `my-jsx/jsx-runtime` exporting `jsx`, `jsxs`, and `Fragment`
- `my-jsx/jsx-dev-runtime` exporting `jsxDEV` if you use `react-jsxdev`

Minimal shape:

`node_modules/my-jsx/jsx-runtime.js`

```js
export const Fragment = Symbol.for("Fragment");

export function jsx(type, props, key) {
  if (typeof type === "function") {
    return type(props ?? {});
  }

  return {
    type,
    props: props ?? {},
    key: key ?? null,
  };
}

export const jsxs = jsx;
```

`node_modules/my-jsx/jsx-dev-runtime.js`

```js
export const Fragment = Symbol.for("Fragment");

export function jsxDEV(type, props, key) {
  if (typeof type === "function") {
    return type(props ?? {});
  }

  return {
    type,
    props: props ?? {},
    key: key ?? null,
  };
}
```

`index.tsx`

```tsx
function Card(props: { title: string }) {
  return (
    <section>
      <h1>{props.title}</h1>
      <p>Ready</p>
    </section>
  );
}

console.log(<Card title="Hello" />);
```

What Bun does here:

- automatic runtime JSX imports from `my-jsx/jsx-runtime`
- component calls and intrinsic element creation go through `jsx()` / `jsxs()`
- the runtime module, not React, defines what a JSX element means

## Per-File Pragmas

Bun supports per-file JSX pragmas.

Useful when one file needs custom behavior without changing project-wide config:

```ts
// @jsx h
// @jsxFrag Fragment
// @jsxImportSource my-jsx
```

Use these sparingly. Prefer project-level config unless a file truly needs a
different runtime.

When using `@jsxImportSource` in TSX, treat the file as a module by including an
`import` or `export`.

## Bun Defaults And The Non-React Trap

Bun’s recommended TypeScript config uses:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

That is fine for JSX support, but the default automatic-runtime import source is
`react`.

So if the goal is plain JSX without React:

- do not stop at `jsx: "react-jsx"` alone
- either set `jsxImportSource` to your own runtime
- or switch to `jsx: "react"` with a custom `jsxFactory`

If you skip this step, Bun will treat JSX as React-oriented runtime imports by
default.

## Recommended Choice

Default choice for plain Bun JSX components:

- start with the classic custom factory approach
- move to `jsxImportSource` only when you want a reusable runtime module

Reason:

- fewer moving parts
- easier to debug
- no package-style `jsx-runtime` surface needed

## TypeScript Typing Note

Runtime execution and TypeScript typing are separate concerns.

The examples above are enough to execute JSX in Bun. If you want full TSX type
checking for your custom intrinsic elements and component props, define the
appropriate `JSX` types for your runtime.

This becomes more important when:

- you want typed intrinsic tags
- you want typed component props without `any`
- you want editor autocomplete for JSX elements

## Bun-Specific Niceties

- Bun pretty-prints JSX trees in `console.log(...)`, which is useful while
  designing a custom runtime.
- Bun supports prop punning, so `<div {className} />` is valid shorthand for
  `<div className={className} />`.

## Practical Rule

When someone says "use JSX in Bun without React", translate it to:

1. pick a JSX transform mode
2. provide the factory/runtime that mode expects
3. decide what your components return

Without step 2, there is no non-React JSX component system.

## References

- Bun JSX docs: `https://bun.sh/docs/runtime/jsx`
- Bun bunfig docs: `https://bun.sh/docs/runtime/bunfig`
- Bun TypeScript docs: `https://bun.sh/docs/runtime/typescript`
- TypeScript JSX handbook: `https://www.typescriptlang.org/docs/handbook/jsx`
- TypeScript `jsxImportSource`: `https://www.typescriptlang.org/tsconfig/jsxImportSource.html`
- TypeScript `jsxFactory`: `https://www.typescriptlang.org/tsconfig/jsxFactory.html`
