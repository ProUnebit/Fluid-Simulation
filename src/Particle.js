/**
 * Particle - одна частица в системе
 *
 * Каждая частица:
 * - Имеет позицию (x, y)
 * - Имеет скорость (vx, vy)
 * - Имеет историю позиций для trail эффекта
 * - Следует векторному полю
 */

export class Particle {
    constructor(x, y, width, height) {
        // Добавляем небольшой отступ от краёв при инициализации
        const padding = 50;
        this.x = padding + Math.random() * (width - padding * 2);
        this.y = padding + Math.random() * (height - padding * 2);
        this.width = width;
        this.height = height;

        // Скорость частицы
        this.vx = 0;
        this.vy = 0;

        // Максимальная скорость (для ограничения)
        this.maxSpeed = 2;

        // Цвет частицы (будет зависеть от скорости)
        this.hue = Math.random() * 360;

        // История позиций для trail
        this.history = [];
        this.maxHistory = 20; // Длина следа
    }

    /**
     * Обновление частицы
     *
     * @param {Object} force - вектор силы из flow field {x, y}
     * @param {number} speed - множитель скорости
     */
    update(force, speed) {
        // Применяем силу к скорости (F = ma, у нас m = 1)
        // Acceleration = Force
        this.vx += force.x * 0.3;
        this.vy += force.y * 0.3;

        // Ограничиваем максимальную скорость
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > this.maxSpeed) {
            this.vx = (this.vx / currentSpeed) * this.maxSpeed;
            this.vy = (this.vy / currentSpeed) * this.maxSpeed;
        }

        // Сохраняем текущую позицию в историю
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Обновляем позицию на основе скорости
        this.x += this.vx * speed;
        this.y += this.vy * speed;

        // Отскок от границ вместо wrap-around (более стабильно)
        let bounced = false;
        const damping = 0.7; // Потеря энергии при отскоке
        const margin = 2; // Небольшой отступ от края

        // Проверяем X границы
        if (this.x < margin) {
            this.x = margin;
            this.vx = Math.abs(this.vx) * damping; // Отскок вправо
            bounced = true;
        } else if (this.x > this.width - margin) {
            this.x = this.width - margin;
            this.vx = -Math.abs(this.vx) * damping; // Отскок влево
            bounced = true;
        }

        // Проверяем Y границы
        if (this.y < margin) {
            this.y = margin;
            this.vy = Math.abs(this.vy) * damping; // Отскок вниз
            bounced = true;
        } else if (this.y > this.height - margin) {
            this.y = this.height - margin;
            this.vy = -Math.abs(this.vy) * damping; // Отскок вверх
            bounced = true;
        }

        // Если отскочили - очищаем историю
        if (bounced) {
            this.history = [];
        }

        // Обновляем цвет на основе скорости (быстрые = яркие)
        const speedRatio = currentSpeed / this.maxSpeed;
        this.hue = speedRatio * 120; // От 0 (красный) до 120 (зелёный)
    }

    /**
     * Сброс частицы на случайную позицию
     */
    reset(width, height) {
        const padding = 50;
        this.x = padding + Math.random() * (width - padding * 2);
        this.y = padding + Math.random() * (height - padding * 2);
        this.vx = 0;
        this.vy = 0;
        this.history = [];
        this.width = width;
        this.height = height;
    }
}
