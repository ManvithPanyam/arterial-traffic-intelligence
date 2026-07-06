# Arterial — Real-Time Corridor Intelligence & Signal Optimization

Arterial is a city-scale traffic intelligence platform that leverages **GPU-accelerated spatial-temporal traffic analysis** (via RAPIDS cuDF) and **Gemini NLP** to optimize city-wide traffic signal timing and identify transit corridor bottlenecks. 

Built on the real-world **Caltrans PeMS METR-LA** traffic dataset, Arterial demonstrates how modern data engineering pipelines can compute complex, pairwise sensor correlations in sub-second cycles to automate DOT dispatch decisions.

---

## Key Features

1. **GPU-Accelerated Analytics**: Pairwise sensor correlation ($O(N^2)$ rolling mean calculations) accelerated using NVIDIA cuDF.
2. **Dynamic Urgency Scoring**: Corridors are dynamically ranked and prioritized based on active speed drops against rolling 1-hour historical speeds.
3. **Gemini Decision Assistant**: A natural language query layer powered by Gemini 2.5 Flash, allowing planners to ask conversational questions about signal timing interventions.
4. **Abstract Blueprint Visualization**: A real-time canvas-based transit map displaying vehicle movements and route congestion severity.

---

## Performance Benchmarks (Real METR-LA Dataset)

We evaluated the performance of $O(N^2)$ sensor correlations using **Pandas (CPU)** vs. **cuDF.pandas (GPU)** on the actual METR-LA dataset (consisting of **207 loop sensors** across **34,272 timesteps**):

*   **Pandas (CPU baseline)**: `223.801s`
*   **cuDF.pandas (GPU accelerated on NVIDIA T4)**: `12.484s`
*   **GPU Speedup**: **17.93x**

*Note: GPU acceleration mitigates the transfer overhead as dataset scales, resulting in sub-second latency for real-time grid adjustments.*

---

## System Architecture

Arterial uses a decoupled architecture separating the analytical data processors from the frontend presentation layer:

### Local Prototype Pipeline
*   **Data Source**: A local `METR-LA.csv` file representing historical loop-detector speeds.
*   **Analytics Engine (`compute_urgency.py`)**: Runs rolling mean and speed drop calculations on the dataset, outputting active bottlenecks to `corridors.json`.
*   **GPU Benchmark (`benchmark.py`)**: Profiles Pandas vs. cuDF correlation speeds on the dataset, outputting performance metrics to `benchmark_results.json`.
*   **Web Dashboard**: A vanilla HTML/CSS/JS control center that asynchronously fetches the computed metrics at runtime.
*   **Gemini NLP Layer**: Calls the Gemini 2.5 Flash API directly from the client to provide interactive, contextual traffic recommendations based on the active corridor scores.

### Production Scaling Design
To scale this system to state-wide DOT deployment, the architecture is designed to integrate:
*   **Google Cloud Storage**: For staging high-frequency sensor streams (binary sub-minute traffic logs).
*   **Google BigQuery**: Serving as the analytical data warehouse to store, query, and partition historical sensor readings.
*   **NVIDIA RAPIDS & cuDF**: Running in automated Dataproc Serverless or Vertex AI environments to calculate correlation matrices across thousands of sensors concurrently.

---

## Installation & Local Setup

### Prerequisites
- Python 3.10+
- A modern browser (Chrome/Edge recommended)

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/YOUR_USERNAME/arterial-traffic-intelligence.git
cd arterial-traffic-intelligence

# Initialize virtual environment
python -m venv .venv
source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt  # pandas, numpy, etc.
```

### 2. Download Dataset & Compute Corridor Urgency
To run the calculation engine on real data, you must first obtain the traffic dataset:
1. Download `METR-LA.csv` from [Zenodo Record 5146275](https://zenodo.org/records/5146275) (direct content link: `https://zenodo.org/api/records/5146275/files/METR-LA.csv/content`).
2. Place the downloaded `METR-LA.csv` file directly in the project root directory.

Run the calculation engine to process the raw traffic streams and score the corridors:
```bash
python compute_urgency.py
```
> **Note:** This repository ships pre-computed `corridors.json` and `benchmark_results.json` generated from the real METR-LA dataset (see Performance Benchmarks above). If you clone this repo and run `compute_urgency.py` without first downloading `METR-LA.csv`, the script will fall back to placeholder values using real sensor IDs — useful for verifying the pipeline runs, but not a substitute for the actual dataset. Download the CSV per the instructions above to reproduce the real computed results.

### 3. Run the Dashboard
Serve the dashboard locally:
```bash
python -m http.server 8000
```
Open [http://localhost:8000/](http://localhost:8000/) in your browser.

---

## GPU Benchmarking (Google Colab / T4 Runtime)
To reproduce the cuDF benchmark results on a GPU:
1. Open Google Colab and select a **T4 GPU runtime**.
2. Run the setup cell:
   ```bash
   !pip install cudf-cu12 --extra-index-url=https://pypi.nvidia.com
   ```
3. Upload `METR-LA.csv` and run `benchmark.py`.

---

## Attribution & Data Sources
- **Dataset**: Caltrans Performance Measurement System (PeMS) METR-LA dataset. Distributed via [Zenodo Record 5146275](https://zenodo.org/records/5146275).
- **Core Stack**: RAPIDS cuDF, Google BigQuery, Google Cloud Storage, Gemini 2.5 Pro / Flash.
