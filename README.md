# 🎥 Blackmagic Camera Control Center (PWA)

**Професійний веб-додаток** для управління Blackmagic Design Micro Studio Camera 4K G2 через REST API з підтримкою MIDI контролерів.

🌐 **Live Demo:** [https://yourusername.github.io/BM-Camera-Control](https://yourusername.github.io/BM-Camera-Control)

📱 **Встановити як додаток:** Відкрийте у браузері та натисніть "Встановити додаток"

## 🚀 Ключові особливості

### 📱 **Progressive Web App (PWA)**
- ✅ Встановлення на мобільні пристрої та комп'ютери
- ✅ Офлайн режим з кешуванням
- ✅ Push-сповіщення
- ✅ Нативний вигляд додатку

### 🎛️ **Повний контроль камери**
- **Експозиція:** Gain, ISO, Shutter, Iris
- **Колір:** White Balance, Tint
- **Фокус:** Ручний та автоматичний
- **Запис:** Старт/стоп, статус медіа

### 🎹 **MIDI Integration**
- Підтримка будь-яких MIDI контролерів
- Кастомні кнопки з фіксованими значеннями
- Експорт/імпорт налаштувань
- Real-time MIDI learn режим

## 🎯 Функціональність

### ✅ Повністю реалізовано
- **Підключення до камери** - автоматичне виявлення та підключення
- **Gain Control** - повне управління підсиленням (-12 dB до +36 dB)
- **Shutter Control** - управління витримкою (1/24 до 1/2000)
- **ISO Control** - управління чутливістю (100-25600)
- **White Balance** - налаштування білого балансу (2500K-10000K)
- **Tint Control** - коригування відтінку (-50 до +50)
- **Focus Control** - ручне управління фокусом та автофокус
- **Iris Control** - управління діафрагмою (f/1.4 до f/16)
- **Recording Control** - початок/зупинка запису
- **System Information** - інформація про камеру та статус
- **Media Information** - інформація про залишок місця та кліпи
- **Real-time Updates** - автоматичне оновлення статусу кожні 10 секунд
- **Activity Logging** - детальний лог всіх операцій

## 🚀 Швидкий старт

### 🌐 Онлайн версія (рекомендовано)
1. Відкрийте [https://yourusername.github.io/BM-Camera-Control](https://yourusername.github.io/BM-Camera-Control)
2. Натисніть "Встановити додаток" для PWA
3. Підключіться до камери

### 💻 Локальна версія
```bash
# Перейдіть до папки проекту
cd "BM Camera Control"

# Відкрийте index.html у браузері
open index.html
```

### 2. Налаштуйте браузер (ВАЖЛИВО!)
Для роботи з камерою необхідно відключити CORS у браузері:

**Chrome (macOS):**
```bash
open -na "Google Chrome" --args --user-data-dir="/tmp/chrome-dev" --disable-web-security --disable-features=VizDisplayCompositor
```

**Chrome (Windows):**
```cmd
chrome.exe --user-data-dir="C:/chrome-dev" --disable-web-security --disable-features=VizDisplayCompositor
```

**Chrome (Linux):**
```bash
google-chrome --user-data-dir="/tmp/chrome-dev" --disable-web-security --disable-features=VizDisplayCompositor
```

### 3. Підключіться до камери
1. Введіть IP адресу камери (наприклад: `micro-studio-camera-4k-g2-1.local`)
2. Натисніть "Підключити"
3. Дочекайтеся зеленого індикатора підключення

## 📋 Структура проекту

```
BM Camera Control/
├── index.html              # Головний файл додатка
├── css/
│   └── styles.css          # Стилі інтерфейсу
├── js/
│   ├── camera-controller.js # API контролер камери
│   └── app.js              # Основна логіка додатка
└── README.md               # Документація
```

## 🎮 Управління

### Основні контроли
- **Gain**: Від -12 dB до +36 dB (кроками по 6 dB або довільне значення)
- **Shutter**: Попередні значення (1/50, 1/60, 1/120, тощо) або довільне
- **ISO**: Стандартні значення (100, 200, 400, тощо) або довільне
- **White Balance**: Попередні температури або довільна (2500K-10000K)
- **Tint**: Слайдер від -50 до +50
- **Focus**: Ручне управління + автофокус
- **Iris**: Стандартні діафрагми (f/1.4 до f/16)

### Запис
- **Початок запису**: Червона кнопка "Почати запис"
- **Зупинка запису**: Кнопка "Зупинити запис"
- **Статус**: Індикатор показує поточний стан запису

## 🔧 Технічні деталі

### API Endpoints (використовуються)
- `GET/PUT /video/gain` - управління gain
- `GET/PUT /video/shutter` - управління витримкою
- `GET/PUT /video/iso` - управління ISO
- `GET/PUT /video/whiteBalance` - білий баланс
- `GET/PUT /video/tint` - відтінок
- `GET/PUT /lens/focus` - фокус
- `PUT /lens/focus/doAutoFocus` - автофокус
- `GET/PUT /lens/iris` - діафрагма
- `GET/PUT /transports/0/record` - запис
- `GET /system` - системна інформація
- `GET /media/active` - інформація про медіа

### Особливості реалізації
- **Прямі HTTP запити** до камери (без проксі)
- **Автоматичне оновлення** статусу кожні 10 секунд
- **Обробка помилок** та таймаутів
- **Адаптивний дизайн** для мобільних пристроїв
- **Детальне логування** всіх операцій

## ⚠️ Важливі примітки

1. **CORS**: Обов'язково запустіть браузер з відключеним CORS
2. **Мережа**: Камера повинна бути в тій самій мережі
3. **REST API**: Переконайтеся, що REST API увімкнений на камері
4. **Таймаути**: Деякі операції можуть тривати до 10 секунд

## � HTTPS/HTTP Сумісність

### Проблема Mixed Content
При використанні онлайн версії (HTTPS) з GitHub Pages можуть виникати проблеми підключення до камери (HTTP), оскільки браузери блокують "Mixed Content" - змішаний захищений і незахищений контент.

### Рішення:
1. **Локальна версія** (рекомендовано): Завантажте проект та запустіть локально
2. **HTTPS на камері**: Якщо камера підтримує HTTPS - використайте його
3. **Дозвіл Mixed Content**: У браузері дозвольте незахищений контент для сайту
4. **Proxy**: Використайте локальний proxy-сервер

### Як дозволити Mixed Content в браузері:
- **Chrome**: Натисніть на іконку замка в адресному рядку → "Дозволити незахищений контент"
- **Firefox**: Натисніть на іконку щита → "Вимкнути захист"
- **Safari**: Розробка → Дозволити Mixed Content

## �🐛 Усунення проблем

### Камера не підключається
- Перевірте IP адресу камери
- Переконайтеся, що REST API увімкнений
- Перевірте, що CORS відключений у браузері
- Спробуйте ping до камери: `ping micro-studio-camera-4k-g2-1.local`

### Повільні відповіді
- Це нормально для деяких операцій
- Зачекайте завершення операції
- Перевірте лог для деталей

### Команди не виконуються
- Перевірте підключення (зелений індикатор)
- Спробуйте оновити статус
- Перезапустіть додаток

## 📱 PWA (Progressive Web App)

### Встановлення на пристрої
- **Android/Chrome:** "Додати на головний екран"
- **iOS/Safari:** "Додати на головний екран" 
- **Desktop:** "Встановити додаток" у адресному рядку

### Переваги PWA
- 🚀 Швидкий запуск з головного екрану
- 📶 Офлайн кешування інтерфейсу
- 🔔 Push-сповіщення (майбутнє)
- 💾 Автоматичні оновлення

## 🌐 Розгортання

### GitHub Pages (автоматично)
Проект автоматично розгортається на GitHub Pages при push до main гілки.

### Власний хостинг
```bash
# Просто розмістіть файли на веб-сервері
# PWA працює з будь-якого HTTPS хостингу
```

### Альтернативні платформи
- **Netlify:** Перетягніть папку проекту
- **Vercel:** `vercel --prod`
- **Firebase Hosting:** `firebase deploy`
- **Surge.sh:** `surge ./`

## 📞 Тестування

Для тестування API команд через curl:
```bash
# Отримання gain
curl "http://micro-studio-camera-4k-g2-1.local/control/api/v1/video/gain"

# Встановлення gain
curl -X PUT "http://micro-studio-camera-4k-g2-1.local/control/api/v1/video/gain" \
     -H "Content-Type: application/json" \
     -d '{"gain": 4}'
```

## 🎉 Успіхів у роботі!

Цей додаток надає повний контроль над Blackmagic камерою через зручний веб-інтерфейс. Усі основні функції реалізовані та протестовані.