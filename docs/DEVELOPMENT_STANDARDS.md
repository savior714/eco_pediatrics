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
