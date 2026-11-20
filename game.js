// Базовый класс для всех сущностей на поле
class Entity {
    #x;
    #y;
    #radius;
    #speed;

    constructor(x, y, radius, speed, emoji) {
        this.#x = x;
        this.#y = y;
        this.#radius = radius;
        this.#speed = speed;
        this.emoji = emoji;
        this.isMarkedForDeletion = false;
    }

    get x() { return this.#x; }
    get y() { return this.#y; }
    get radius() { return this.#radius; }
    get speed() { return this.#speed; }

    move(dx, dy) {
        this.#x += dx * this.#speed;
        this.#y += dy * this.#speed;
    }

    setPosition(x, y) {
        this.#x = x;
        this.#y = y;
    }

    draw(ctx) {
        ctx.font = `${this.#radius * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.emoji, this.#x, this.#y);
    }
}

// Класс Студента (наследуется от Entity)
class Student extends Entity {
    #health;
    #coffeeLevel;
    #isInvulnerable;

    constructor(x, y) {
        super(x, y, 20, 5, '👨‍🎓'); // Замените эмодзи или имя под себя
        this.#health = 100;
        this.#coffeeLevel = 0;
        this.#isInvulnerable = false;
    }

    get health() { return this.#health; }
    get coffeeLevel() { return this.#coffeeLevel; }
    get isShieldActive() { return this.#coffeeLevel >= 100 && !this.#isInvulnerable; }

    drinkCoffee(amount) {
        this.#coffeeLevel = Math.min(100, this.#coffeeLevel + amount);
    }

    // Сложное условие получения урона с использованием &&, ||, !
    takeDamage(amount, isCriticalDeadline) {
        // Если студент под щитом от кофе И это не критический дедлайн, урон блокируется
        if (this.isShieldActive && !isCriticalDeadline) {
            this.#coffeeLevel = 0; // Щит сгорает
            return false;
        }

        // Если студент неуязвим ИЛИ уже отчислен — урон не проходит
        if (this.#isInvulnerable || this.#health <= 0) {
            return false;
        }

        const finalDamage = (isCriticalDeadline && this.#coffeeLevel < 50) ? amount * 1.5 : amount;
        this.#health = Math.max(0, this.#health - finalDamage);
        
        // Включаем краткую неуязвимость после удара
        this.#isInvulnerable = true;
        setTimeout(() => { this.#isInvulnerable = false; }, 500);
        return true;
    }

    draw(ctx) {
        super.draw(ctx);
        // Отрисовка кофейного щита
        if (this.isShieldActive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#f9e2af';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    }
}

// Класс Врага (Дедлайны и Баги)
class Enemy extends Entity {
    #damage;
    #isCritical;

    constructor(x, y, type) {
        const isCritical = type === 'deadline';
        super(x, y, isCritical ? 22 : 16, isCritical ? 2.2 : 3.2, isCritical ? '🔥' : '🐛');
        this.#damage = isCritical ? 30 : 15;
        this.#isCritical = isCritical;
    }

    get damage() { return this.#damage; }
    get isCritical() { return this.#isCritical; }

    update(targetX, targetY) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        this.move(Math.cos(angle), Math.sin(angle));
    }
}

// Класс Бонуса (Кофе и Автоматы)
class Item extends Entity {
    #type;

    constructor(x, y, type) {
        super(x, y, 15, 0, type === 'coffee' ? '☕' : '📜');
        this.#type = type;
    }

    get type() { return this.#type; }
}

// Главный класс управления игрой
class Game {
    #canvas;
    #ctx;
    #student;
    #enemies = [];
    #items = [];
    #keys = {};
    #score = 0;
    #isGameOver = false;
    #lastSpawnTime = 0;

    constructor(canvasId) {
        this.#canvas = document.getElementById(canvasId);
        this.#ctx = this.#canvas.getContext('2d');
        this.#initEvents();
        this.reset();
    }

    #initEvents() {
        window.addEventListener('keydown', (e) => { this.#keys[e.code] = true; });
        window.addEventListener('keyup', (e) => { this.#keys[e.code] = false; });
        document.getElementById('restartBtn').addEventListener('click', () => this.reset());
    }

    reset() {
        this.#student = new Student(this.#canvas.width / 2, this.#canvas.height / 2);
        this.#enemies = [];
        this.#items = [];
        this.#score = 0;
        this.#isGameOver = false;
        document.getElementById('gameOver').classList.add('hidden');
        requestAnimationFrame((timestamp) => this.#loop(timestamp));
    }

    #spawnEntities(timestamp) {
        // Использование логического присваивания ??= для инициализации таймера
        this.#lastSpawnTime ||= timestamp;

        if (timestamp - this.#lastSpawnTime > 1200) {
            const side = Math.floor(Math.random() * 4);
            let x, y;
            if (side === 0) { x = Math.random() * this.#canvas.width; y = -20; }
            else if (side === 1) { x = this.#canvas.width + 20; y = Math.random() * this.#canvas.height; }
            else if (side === 2) { x = Math.random() * this.#canvas.width; y = this.#canvas.height + 20; }
            else { x = -20; y = Math.random() * this.#canvas.height; }

            const type = Math.random() > 0.7 ? 'deadline' : 'bug';
            this.#enemies.push(new Enemy(x, y, type));

            if (Math.random() > 0.4) {
                const itemType = Math.random() > 0.5 ? 'coffee' : 'scroll';
                this.#items.push(new Item(
                    50 + Math.random() * (this.#canvas.width - 100),
                    50 + Math.random() * (this.#canvas.height - 100),
                    itemType
                ));
            }
            this.#lastSpawnTime = timestamp;
        }
    }

    #handleInput() {
        let dx = 0, dy = 0;
        if (this.#keys['KeyW'] || this.#keys['ArrowUp']) dy -= 1;
        if (this.#keys['KeyS'] || this.#keys['ArrowDown']) dy += 1;
        if (this.#keys['KeyA'] || this.#keys['ArrowLeft']) dx -= 1;
        if (this.#keys['KeyD'] || this.#keys['ArrowRight']) dx += 1;

        // Нормализация диагонального движения
        if (dx !== 0 && dy !== 0) {
            dx *= Math.SQRT1_2;
            dy *= Math.SQRT1_2;
        }

        this.#student.move(dx, dy);

        // Ограничение выхода за границы экрана
        const clampedX = Math.max(this.#student.radius, Math.min(this.#canvas.width - this.#student.radius, this.#student.x));
        const clampedY = Math.max(this.#student.radius, Math.min(this.#canvas.height - this.#student.radius, this.#student.y));
        this.#student.setPosition(clampedX, clampedY);
    }

    #checkCollision(a, b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        return dist < a.radius + b.radius;
    }

    #update(timestamp) {
        this.#spawnEntities(timestamp);
        this.#handleInput();

        // Обновление врагов и проверка столкновений
        this.#enemies.forEach((enemy) => {
            enemy.update(this.#student.x, this.#student.y);
            if (this.#checkCollision(this.#student, enemy)) {
                this.#student.takeDamage(enemy.damage, enemy.isCritical);
                enemy.isMarkedForDeletion = true;
            }
        });

        // Сбор предметов
        this.#items.forEach((item) => {
            if (this.#checkCollision(this.#student, item)) {
                if (item.type === 'coffee') {
                    this.#student.drinkCoffee(35);
                } else {
                    this.#score += 10;
                }
                item.isMarkedForDeletion = true;
            }
        });

        this.#enemies = this.#enemies.filter((e) => !e.isMarkedForDeletion);
        this.#items = this.#items.filter((i) => !i.isMarkedForDeletion);

        // Обновление UI
        document.getElementById('hp').textContent = Math.ceil(this.#student.health);
        document.getElementById('coffee').textContent = this.#student.coffeeLevel;
        document.getElementById('score').textContent = this.#score;

        if (this.#student.health <= 0) {
            this.#isGameOver = true;
            document.getElementById('finalScore').textContent = this.#score;
            document.getElementById('gameOver').classList.remove('hidden');
        }
    }

    #draw() {
        this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
        this.#items.forEach((item) => item.draw(this.#ctx));
        this.#enemies.forEach((enemy) => enemy.draw(this.#ctx));
        this.#student.draw(this.#ctx);
    }

    #loop(timestamp) {
        if (this.#isGameOver) return;
        this.#update(timestamp);
        this.#draw();
        requestAnimationFrame((t) => this.#loop(t));
    }
}

// Запуск игры после загрузки страницы
window.addEventListener('DOMContentLoaded', () => {
    new Game('gameCanvas');
});
