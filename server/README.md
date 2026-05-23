# Andromeda Server

Node.js backend для email verification и авторизации.

## Быстрый старт

```bash
cd server
cp .env.example .env
# Заполни .env — MONGODB_URI и RESEND_API_KEY обязательны
npm install
npm run dev
```

Сервер запустится на `http://localhost:3001`.

## Переменные окружения

| Переменная | Обязательно | Описание |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `RESEND_API_KEY` | ✅ | API ключ Resend (resend.com) |
| `JWT_SECRET` | ✅ | Секрет для JWT токенов |
| `EMAIL_FROM` | | Отправитель писем |
| `EMAIL_DEMO_MODE` | | `true` = код в консоль, не отправлять |
| `PORT` | | Порт (по умолчанию 3001) |
| `CORS_ORIGIN` | | Разрешённый origin (по умолчанию http://localhost:5173) |

## API Endpoints

| Method | Route | Описание |
|---|---|---|
| POST | `/api/auth/register` | Регистрация → код на email |
| POST | `/api/auth/verify` | Подтверждение email |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/forgot-password` | Запрос сброса пароля |
| POST | `/api/auth/reset-password` | Сброс пароля |
| POST | `/api/auth/resend-code` | Повторная отправка кода |
| GET | `/api/auth/me` | Текущий пользователь (нужен JWT) |
| PUT | `/api/auth/me` | Обновить профиль |
| GET | `/api/health` | Health check |

## Запуск с MongoDB

### Локально
```bash
# Установи MongoDB и запусти
mongod --dbpath ./data
```

### MongoDB Atlas (бесплатно)
1. Создай кластер на https://cloud.mongodb.com
2. Скопируй connection string в `MONGODB_URI`
3. Разреши доступ с IP 0.0.0.0/0 для development

## Запуск с Resend

1. Регистрируйся на https://resend.com
2. Добавь домен или протестируй через their sandbox
3. Скопируй API ключ в `RESEND_API_KEY`

## Демо-режим

`EMAIL_DEMO_MODE=true` — код верификации выводится в консоль сервера вместо отправки на email. Удобно для тестирования без настройки SMTP.

```
📧 [DEMO] Verification email to: test@example.com
   Code: 482916 (expires in 10 minutes)
```
