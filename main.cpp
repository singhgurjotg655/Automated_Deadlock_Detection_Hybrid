#include <iostream>
#include <vector>
#include <string>
using namespace std;

/*
    Automated Deadlock Detection Tool
    Core algorithm: matrix-based deadlock detection for multiple resource instances.

    Input format (read from standard input):
      process_count resource_type_count
      total_instances[resource_type_count]
      allocation_matrix[process_count][resource_type_count]
      request_matrix[process_count][resource_type_count]

    Output: JSON text consumed by backend/server.js.
*/

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int processCount, resourceCount;
    if (!(cin >> processCount >> resourceCount)) {
        cout << R"({"error":"Missing process/resource counts"})";
        return 1;
    }

    if (processCount < 1 || processCount > 20 ||
        resourceCount < 1 || resourceCount > 20) {
        cout << R"({"error":"Use between 1 and 20 processes and resource types"})";
        return 1;
    }

    vector<int> total(resourceCount);
    for (int j = 0; j < resourceCount; ++j) {
        if (!(cin >> total[j]) || total[j] < 0) {
            cout << R"({"error":"Invalid total resource count"})";
            return 1;
        }
    }

    vector<vector<int>> allocation(processCount, vector<int>(resourceCount));
    vector<vector<int>> request(processCount, vector<int>(resourceCount));

    for (int i = 0; i < processCount; ++i) {
        for (int j = 0; j < resourceCount; ++j) {
            if (!(cin >> allocation[i][j]) || allocation[i][j] < 0) {
                cout << R"({"error":"Invalid allocation matrix value"})";
                return 1;
            }
        }
    }

    for (int i = 0; i < processCount; ++i) {
        for (int j = 0; j < resourceCount; ++j) {
            if (!(cin >> request[i][j]) || request[i][j] < 0) {
                cout << R"({"error":"Invalid request matrix value"})";
                return 1;
            }
        }
    }

    vector<int> available = total;
    for (int j = 0; j < resourceCount; ++j) {
        int allocated = 0;
        for (int i = 0; i < processCount; ++i) allocated += allocation[i][j];
        if (allocated > total[j]) {
            cout << R"({"error":"Allocated instances exceed total instances for a resource type"})";
            return 1;
        }
        available[j] -= allocated;
    }

    // Work represents currently available resource instances.
    vector<int> work = available;
    vector<bool> finish(processCount, false);

    // A process holding no resources cannot be part of a resource deadlock.
    for (int i = 0; i < processCount; ++i) {
        bool holdsResource = false;
        for (int j = 0; j < resourceCount; ++j)
            if (allocation[i][j] > 0) holdsResource = true;
        finish[i] = !holdsResource;
    }

    vector<int> safeSequence;
    vector<string> trace;
    trace.push_back("Initialized Work with Available resources.");

    bool progress = true;
    while (progress) {
        progress = false;
        for (int i = 0; i < processCount; ++i) {
            if (finish[i]) continue;

            bool requestCanBeMet = true;
            for (int j = 0; j < resourceCount; ++j) {
                if (request[i][j] > work[j]) {
                    requestCanBeMet = false;
                    break;
                }
            }

            if (requestCanBeMet) {
                trace.push_back("P" + to_string(i + 1) +
                                " can finish; its allocated resources are released.");
                for (int j = 0; j < resourceCount; ++j)
                    work[j] += allocation[i][j];

                finish[i] = true;
                safeSequence.push_back(i + 1);
                progress = true;
            }
        }
    }

    vector<int> unfinished;
    for (int i = 0; i < processCount; ++i)
        if (!finish[i]) unfinished.push_back(i + 1);

    bool deadlock = !unfinished.empty();

    // Emit a small JSON response without requiring a third-party JSON library.
    cout << "{";
    cout << "\"deadlock\":" << (deadlock ? "true" : "false") << ",";
    cout << "\"safeSequence\":[";
    for (size_t i = 0; i < safeSequence.size(); ++i) {
        if (i) cout << ",";
        cout << safeSequence[i];
    }
    cout << "],\"unfinished\":[";
    for (size_t i = 0; i < unfinished.size(); ++i) {
        if (i) cout << ",";
        cout << unfinished[i];
    }
    cout << "],\"available\":[";
    for (int j = 0; j < resourceCount; ++j) {
        if (j) cout << ",";
        cout << available[j];
    }
    cout << "],\"trace\":[";
    for (size_t i = 0; i < trace.size(); ++i) {
        if (i) cout << ",";
        cout << "\"" << trace[i] << "\"";
    }
    cout << "]}";

    return 0;
}
