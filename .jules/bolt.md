## 2026-02-23 - PatientCard Re-render Optimization
**Learning:** Polling or WebSocket updates often create new object references for data that hasn't changed. Passing these new objects to memoized components (like `PatientCard`) breaks memoization.
**Action:** Use `React.memo` with a custom `arePropsEqual` function that ignores object reference changes if the relevant fields (e.g., `id`, `token`, `attending_physician`) are identical. This is crucial for list items in dashboards.
