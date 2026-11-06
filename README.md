# Automated Deadlock Detection Tool

A student-friendly hybrid application: **C++ detection engine + HTML/CSS/JavaScript interface + Node.js local server**.

## Requirements
- Windows 10/11
- MinGW-w64 `g++` compiler
- Node.js (includes npm, though this project uses no npm packages)
- VS Code (recommended)

## Project structure
- `frontend/` — HTML, CSS and JavaScript interface
- `backend/server.js` — local HTTP server; sends matrix data to the C++ program
- `engine/main.cpp` — matrix-based deadlock detection algorithm

## 1. Compile the C++ engine
Open the project root in VS Code and run in the terminal:

```powershell
g++ -std=c++17 engine/main.cpp -o engine/deadlock_engine.exe
```

## 2. Start the application
Run:

```powershell
node backend/server.js
```

Open this address in Chrome or Edge:

```text
http://localhost:3000
```

Keep the terminal running while using the application. Press `Ctrl+C` to stop the server.

## 3. Demonstration
1. Open Dashboard.
2. Choose **Load deadlock scenario** and open Detection Analysis.
3. Run detection. Expected unfinished processes: P1, P2 and P3.
4. Return to Dashboard and choose **Load safe scenario**.
5. Run detection again. Expected result: no deadlock and a completion sequence.
6. Configure custom process/resource counts and enter your own matrices.

## Algorithm summary
This project uses the matrix-based deadlock detection algorithm for systems with multiple instances of resource types:
1. Calculate `Available = Total − sum of Allocation`.
2. Initialize `Work = Available`.
3. Mark processes that hold no resources as finished.
4. Find an unfinished process whose outstanding `Request` is less than or equal to `Work`.
5. Assume it completes, release its allocated resources into `Work`, and mark it finished.
6. Repeat while progress is possible.
7. Any process still unfinished is reported as deadlocked in the current snapshot.

## Important scope note
The tool analyzes a manually supplied resource-allocation snapshot. It is an educational simulator; it does not inspect, control, or terminate actual Windows processes. Recovery suggestions are advisory.

## Troubleshooting
- If `g++` is not recognized, install/configure MinGW-w64 and add its `bin` directory to PATH.
- If `node` is not recognized, install the current Node.js LTS release and restart VS Code.
- If the web page says the C++ engine is missing, compile it from the project root using the command above.
- If port 3000 is already in use, close the other local server using it or change `PORT` in `backend/server.js`.
