/**
 * FlowField - создаёт векторное поле на основе Perlin Noise
 *
 * Perlin Noise - это алгоритм генерации плавного, природного шума.
 * Мы используем его для создания векторного поля, где каждая точка
 * имеет направление и величину, по которым движутся частицы.
 *
 * Математика:
 * - В каждой точке (x, y) вычисляется угол θ из Perlin noise
 * - Вектор силы: (cos(θ), sin(θ))
 * - Частицы следуют этому векторному полю
 */

export class FlowField {
    constructor(width, height, mode = "flow") {
        this.width = width;
        this.height = height;
        this.mode = mode;

        // Параметры Perlin Noise
        this.scale = 100; // Чем меньше - тем более "зашумлённое" поле
        this.time = 0;
        this.timeSpeed = 0.0003; // Скорость изменения поля во времени

        // Для интерактивности
        this.mouseX = width / 2;
        this.mouseY = height / 2;
        this.mouseRadius = 150;
        this.mouseForce = 0.5;
        this.mousePressed = false;

        // Инициализируем Perlin Noise
        this.initPerlin();
    }

    /**
     * Инициализация Perlin Noise
     *
     * Используем упрощённую версию - 2D Simplex Noise
     * Это быстрее чем классический Perlin и даёт похожий результат
     */
    initPerlin() {
        // Таблица перестановок для Perlin noise
        this.perm = new Array(512);
        this.gradP = new Array(512);

        // Инициализируем случайной перестановкой
        const p = [];
        for (let i = 0; i < 256; i++) {
            p[i] = Math.floor(Math.random() * 256);
        }

        // Дублируем для избежания переполнения
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.gradP[i] = this.grad3[this.perm[i] % 12];
        }
    }

    // Градиенты для 3D noise (используем только x, y)
    grad3 = [
        [1, 1, 0],
        [-1, 1, 0],
        [1, -1, 0],
        [-1, -1, 0],
        [1, 0, 1],
        [-1, 0, 1],
        [1, 0, -1],
        [-1, 0, -1],
        [0, 1, 1],
        [0, -1, 1],
        [0, 1, -1],
        [0, -1, -1],
    ];

    /**
     * Fade function для сглаживания
     * f(t) = 6t^5 - 15t^4 + 10t^3
     * Это даёт плавные переходы между значениями
     */
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    /**
     * Линейная интерполяция
     */
    lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }

    /**
     * 2D Perlin Noise
     *
     * Возвращает значение от -1 до 1
     * x, y - координаты точки
     */
    noise2D(x, y) {
        // Находим единичный квадрат, содержащий точку
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;

        // Находим относительные координаты точки в квадрате
        x -= Math.floor(x);
        y -= Math.floor(y);

        // Вычисляем fade кривые
        const u = this.fade(x);
        const v = this.fade(y);

        // Хеш координат 4х углов квадрата
        const A = this.perm[X] + Y;
        const AA = this.perm[A];
        const AB = this.perm[A + 1];
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B];
        const BB = this.perm[B + 1];

        // Добавляем смешанные результаты из 4х углов квадрата
        return this.lerp(
            this.lerp(
                this.grad(this.perm[AA], x, y),
                this.grad(this.perm[BA], x - 1, y),
                u
            ),
            this.lerp(
                this.grad(this.perm[AB], x, y - 1),
                this.grad(this.perm[BB], x - 1, y - 1),
                u
            ),
            v
        );
    }

    /**
     * Вычисление градиента
     */
    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    /**
     * Получить вектор силы в точке (x, y)
     *
     * Возвращает { x, y } - нормализованный вектор направления
     */
    getVector(x, y) {
        let angle;

        // Разные режимы создают разные паттерны
        switch (this.mode) {
            case "flow":
                // Плавное течение на основе Perlin noise
                angle =
                    this.noise2D(x / this.scale, y / this.scale + this.time) *
                    Math.PI *
                    2;
                break;

            case "galaxy":
                // Спиральная галактика
                const centerX = this.width / 2;
                const centerY = this.height / 2;
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const baseAngle = Math.atan2(dy, dx);

                // Добавляем вращение + небольшой noise для неоднородности
                angle =
                    baseAngle +
                    dist * 0.01 +
                    this.noise2D(x / this.scale, y / this.scale) * 0.5;
                break;

            case "vortex":
                // Водоворот с турбулентностью
                const vortexX = this.width / 2;
                const vortexY = this.height / 2;
                const vdx = x - vortexX;
                const vdy = y - vortexY;
                const vdist = Math.sqrt(vdx * vdx + vdy * vdy);

                // Сильное вращение + Perlin noise
                angle = Math.atan2(vdy, vdx) + Math.PI / 2 + vdist * 0.005;
                angle +=
                    this.noise2D(
                        x / (this.scale * 0.5),
                        y / (this.scale * 0.5) + this.time
                    ) * 1.5;
                break;

            case "chaos":
                // Хаотичное движение - высокочастотный noise
                angle =
                    this.noise2D(
                        x / (this.scale * 0.3),
                        y / (this.scale * 0.3) + this.time * 2
                    ) *
                    Math.PI *
                    4;
                angle +=
                    this.noise2D(
                        x / (this.scale * 0.5),
                        y / (this.scale * 0.5) - this.time
                    ) *
                    Math.PI *
                    2;
                break;

            default:
                angle = 0;
        }

        // Интерактивность: мышь влияет на поле
        if (this.mousePressed) {
            const dx = x - this.mouseX;
            const dy = y - this.mouseY;
            const distToMouse = Math.sqrt(dx * dx + dy * dy);

            if (distToMouse < this.mouseRadius) {
                // Сила влияния убывает с расстоянием (квадратично)
                const influence = 1 - distToMouse / this.mouseRadius;
                const mouseAngle = Math.atan2(dy, dx) + Math.PI; // Отталкивание

                // Смешиваем угол поля с углом от мыши
                const mixFactor = influence * this.mouseForce;
                angle = angle * (1 - mixFactor) + mouseAngle * mixFactor;
            }
        }

        // Конвертируем угол в вектор (cos, sin)
        return {
            x: Math.cos(angle),
            y: Math.sin(angle),
        };
    }

    /**
     * Обновление поля (анимация)
     */
    update() {
        this.time += this.timeSpeed;
    }

    /**
     * Установить позицию мыши
     */
    setMousePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    /**
     * Установить состояние мыши
     */
    setMousePressed(pressed) {
        this.mousePressed = pressed;
    }

    /**
     * Изменить режим
     */
    setMode(mode) {
        this.mode = mode;

        // Для разных режимов - разные параметры
        switch (mode) {
            case "galaxy":
                this.timeSpeed = 0.0001;
                break;
            case "vortex":
                this.timeSpeed = 0.0005;
                break;
            case "chaos":
                this.timeSpeed = 0.001;
                break;
            default:
                this.timeSpeed = 0.0003;
        }
    }

    /**
     * Ресайз
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.mouseX = width / 2;
        this.mouseY = height / 2;
    }
}
