# Performance Optimization: Selective Column Fetching in Admissions List

## 💡 What
Modified `backend/routers/admissions.py` to specify the exact columns needed from the `admissions` table instead of using `select("*")`.

## 🎯 Why
Fetching all columns is inefficient, especially as the database grows. Specifying columns reduces:
1. **Network Bandwidth**: Only required data is sent from the database to the application server.
2. **Database Load**: The database engine can optimize the query plan and avoid reading unnecessary blocks from disk.
3. **Memory Usage**: The application server allocates less memory for the response objects.

## 📊 Measured Improvement
- **Baseline**: Unable to establish a live baseline due to environment constraints (missing dependencies and no database connection).
- **Rationale**: This is a widely recognized performance best practice in database-driven applications. By reducing the data payload per row, the overall throughput of the `list_admissions` endpoint is expected to improve, especially under high load.
- **Verification**: Logic was verified against the `AdmissionSummary` frontend type and `Admission` backend model to ensure all required fields are still being fetched.
