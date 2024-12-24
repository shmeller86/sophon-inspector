# Используем Node.js для сборки приложения
FROM node:18-alpine AS build

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package.json package-lock.json ./

# Установка зависимостей
RUN npm install

# Копируем исходный код приложения
COPY ./app ./

# Передаём переменную среды в сборку
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Проверяем значение переменной
RUN echo "REACT_APP_API_URL=$REACT_APP_API_URL"

# Сборка React-приложения
RUN npm run build

# Используем nginx для сервировки статических файлов
FROM nginx:stable-alpine

# Копируем конфигурацию Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем собранное приложение в nginx
COPY --from=build /app/build /usr/share/nginx/html

# Открываем порт 80
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
