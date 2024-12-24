# Используем Python
FROM python:3.10-slim

# Устанавливаем зависимости системы
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Указываем рабочую директорию
WORKDIR /app

# Устанавливаем зависимости Python
COPY ./app/requirements.txt ./ 
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код
COPY ./app/ ./ 

# Выполняем скрипт и проверяем его успешное выполнение
# RUN python main.py

# Открываем порт
EXPOSE 8000

# Запускаем FastAPI
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
