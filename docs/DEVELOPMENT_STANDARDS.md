# Development Standards & Critical Patterns

## 1. WebSocket Resilience
- **Do NOT** manually implement `WebSocket` connection logic in components or hooks.
- **ALWAYS** use the `useWebSocket` hook in `frontend/src/hooks/useWebSocket.ts`.
- **Reason**: It handles exponential backoff, auto-reconnection, and cleanup correctly.

## 2. Event Handling & Data Consistency
- **Optimistic Updates**: For user-triggered actions (e.g., Temperature Input), **ALWAYS** implement immediate local state updates (`setVitals`) BEFORE fetching.
- **Strict ID Checks**: In global WebSocket handlers (like `useVitals`), **ALWAYS** check `admission_id` before processing `NEW_MEAL_REQUEST` or other patient-specific events.
    ```typescript
    if (admissionId && message.data.admission_id === admissionId) { ... }
    ```
- **Deduplication**: When merging list data (Vitals, IVs) from WebSockets, **ALWAYS** check for duplicates using unique keys (`id` or `recorded_at`).
    ```typescript
    setVitals(prev => {
        if (prev.some(v => v.recorded_at === newItem.recorded_at)) return prev;
        return [newItem, ...prev];
    });
    ```

## 3. Backend Sorting
- **In-Memory Sorting**: For data requiring complex sort logic (e.g., Meals: Date > Time Priority), sort in Python after fetching if SQL `ORDER BY` is insufficient.
- **Meal Priority**: Dinner > Lunch > Breakfast.

## 4. AI Agent Collaboration & Safe Editing
To prevent document corruption and editing failures (Anti-Pattern Guide):
- **Avoid Line Numbers**: When providing code to or requesting from Assistant, **NEVER** include the line numbers (e.g., `26: `) provided by tools like `view_file`.
- **Use Unique Anchors**: Target single, unique lines of code as anchors for editing instead of large blocks.
- **Verification Loop**: Always verify file integrity and encoding (UTF-8) after AI edits using `view_file`.
- **CRLF vs LF**: Be aware of Windows line endings. Use multi-line edits only when necessary and prefer single-line anchors.
