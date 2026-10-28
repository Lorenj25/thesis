# CodeAuthentic

> AI-generated source code detector (C, Java, Python) for live computer laboratory examinations.
> Developed for CCIS, Caraga State University.

---

## Tech Stack
- **Backend**: Python 3.10+, FastAPI, Uvicorn (single worker)
- **Database**: PostgreSQL (local), SQLAlchemy 2.x
- **Authentication**: JWT (`python-jose`) with `passlib[bcrypt]`
- **ML / NLP Pipeline**: PyTorch, Hugging Face `transformers` (CodeBERT frozen representations), `datasets`, `accelerate`, `scikit-learn`, `joblib`, `numpy`
- **Frontend**: Plain HTML5, CSS3, Vanilla JavaScript served directly by FastAPI StaticFiles, plus React SPA live preview console

---

## Machine Learning Pipeline & Hugging Face Human Datasets

The study does **not** fine-tune CodeBERT weights; all transformer weights remain **frozen**.
A small classifier head (`StandardScaler` + `LogisticRegression`) is fitted on top of a 770-dimensional feature vector:
- **768 values**: Mean-pooled last hidden states of unmasked code tokens across 510-token chunks.
- **2 values**: Mean and standard deviation of masked-token negative log-likelihood (perplexity-style signal).

### Connected Human Datasets from Hugging Face
1. **Java Human Dataset**: `code_search_net` ("java") — Human Java methods and docstrings.
2. **Python Human Dataset**: `code_search_net` ("python") — Human Python functions and docstrings.
3. **C Human Dataset**: `bigcode/the-stack` (`data_dir="data/c"`, `streaming=True`) — Human C source code streamed via Hugging Face Access Token.

---

## How to Fetch Datasets and Train Heads

### 1. Configure Hugging Face Token in `.env`
```env
HF_TOKEN=your_huggingface_token_here
```

### 2. Download/Stream Human Datasets
```bash
# Fetch 500 samples each for C, Java, and Python
python -m ml.fetch_dataset --language all --samples 500

# Or fetch a single language
python -m ml.fetch_dataset --language c --samples 200 --token your_huggingface_token_here
```
This populates:
- `dataset/python/human/`
- `dataset/java/human/`
- `dataset/c/human/`

### 3. Add AI-Generated Companion Samples
Pair your human code samples with corresponding AI-generated code snippets in:
- `dataset/python/ai/`
- `dataset/java/ai/`
- `dataset/c/ai/`

### 4. Train Classifier Heads (70/15/15 Stratified Split)
```bash
# Train Python head
python -m ml.train_head --language python --data dataset/python

# Train Java head
python -m ml.train_head --language java --data dataset/java

# Train C head
python -m ml.train_head --language c --data dataset/c
```
This prints Accuracy, Precision, Recall, and F1 score for validation and test splits, and serializes the heads to:
- `ml/heads/python.joblib`
- `ml/heads/java.joblib`
- `ml/heads/c.joblib`

### 5. Score a Single File via CLI
```bash
python -m ml.demo --file path/to/student_code.py
```

---

## Running the Web System

### 1. Verify Database
```bash
python -m backend.test_db
```

### 2. Launch FastAPI Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

### 3. Open Portals
- **Homepage & Faculty Login**: `http://localhost:8000/`
- **Instructor Dashboard**: `http://localhost:8000/dashboard`
- **Student Upload Portal**: `http://localhost:8000/lobby/{uuid}`
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
