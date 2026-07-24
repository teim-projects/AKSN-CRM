## Backend Local Setup

### 1) Create/activate virtual environment
```bash
python -m venv .venv
.venv\Scripts\activate
```

### 2) Install dependencies
```bash
pip install -r requirements.txt
```

### 3) Configure environment
Create/update `.env` in this folder.

Minimum required:
- `MYSQL_DATABASE=krishna_air_db`
- `MYSQL_USER=ka_user`
- `MYSQL_PASSWORD=ka_pass`
- `MYSQL_HOST=127.0.0.1`
- `MYSQL_PORT=3306`
- `SECRET_KEY=<your-secret-key>`

### 4) Run migrations
```bash
python manage.py migrate
```

### 5) Start backend server
```bash
python manage.py runserver 0.0.0.0:8000
```
