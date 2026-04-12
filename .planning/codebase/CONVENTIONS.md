## Code Conventions

**Focus:** quality
**Description:** Analysis of coding styles, patterns, naming, and error handling.

### Language & Type System
- **TypeScript**: Used rigorously. All business domains are typed using interfaces exported from `src/types.ts`.
- **ES Modules**: Standard `import/export` mapping is exclusively used (no CommonJS logic).

### File Structure and Naming
- File paths are completely lowercase hyphenated (kebab-case) within the `components/` block (e.g. `chart-wrapper.ts`, `progress-bar.ts`) except for single-word utility abstractions. 
- TypeScript interfaces enforce CamelCase.
- Explicit `.js` module paths seen inside `db.ts` dependencies, generally aligned with Vite execution strategies.

### Architectural Patterns
- **Database Abstraction**: `db.ts` acts as an asynchronous facade wrapper for IndexedDB operations using the idb package.
- **Component Pattern**: Because Vanilla TS is utilized, 'Components' generally export a class or set of functions that construct elements, parse templates, hook event listeners, and return parent node fragments to caller Views.

### Error Handling
- Typically wraps IndexedDB methods and initial boots (`main.ts`) inside standard async/await closures, catching errors directly.
- Minimal custom Error class implementation limits logging mostly to console outputs.

### CSS Naming 
- Scoped/Local CSS imports define classes without BEM strictly, bound by view implementation requirements. Variables managed in `variables.css`.
