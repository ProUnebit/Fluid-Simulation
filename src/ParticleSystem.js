import { Graphics, RenderTexture, Sprite } from "pixi.js";
import { Particle } from "./Particle.js";
import { FlowField } from "./FlowField.js";

/**
 * ParticleSystem - управляет всеми частицами и их рендерингом
 *
 * Используем технику "trail rendering":
 * 1. Рисуем на RenderTexture с частичной прозрачностью
 * 2. Каждый кадр немного затемняем предыдущий (fade)
 * 3. Рисуем новые позиции частиц
 * 4. Получаем эффект следов (trails)
 */

export class ParticleSystem {
    constructor(app, particleCount) {
        this.app = app;
        this.width = app.screen.width;
        this.height = app.screen.height;

        // Параметры
        this.particleCount = particleCount;
        this.speed = 1.0;
        this.trailAlpha = 0.95; // Чем ближе к 1, тем длиннее следы

        // Создаём flow field
        this.flowField = new FlowField(this.width, this.height, "flow");

        // Создаём частицы
        this.particles = [];
        this.initParticles();

        // Создаём RenderTexture для trail эффекта
        this.trailTexture = RenderTexture.create({
            width: this.width,
            height: this.height,
        });

        // Спрайт для отображения trail texture
        this.trailSprite = new Sprite(this.trailTexture);
        this.app.stage.addChild(this.trailSprite);

        // Graphics для рисования частиц
        this.graphics = new Graphics();

        // Fade overlay для создания trail эффекта
        this.fadeOverlay = new Graphics();
        this.updateFadeOverlay();
    }

    /**
     * Инициализация частиц
     */
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            this.particles.push(new Particle(x, y, this.width, this.height));
        }
        console.log(`✨ Created ${this.particleCount} particles`);
    }

    /**
     * Обновление fade overlay (для trail эффекта)
     */
    updateFadeOverlay() {
        this.fadeOverlay.clear();
        this.fadeOverlay.rect(0, 0, this.width, this.height);
        this.fadeOverlay.fill({ color: 0x000000, alpha: 1 - this.trailAlpha });
    }

    /**
     * Главный цикл обновления
     */
    update() {
        // Обновляем flow field
        this.flowField.update();

        // Применяем fade к trail texture (создаём эффект затухания)
        this.app.renderer.render({
            container: this.fadeOverlay,
            target: this.trailTexture,
            clear: false,
        });

        // Очищаем graphics
        this.graphics.clear();

        // Обновляем и рисуем каждую частицу
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];

            // Получаем вектор силы из flow field
            const force = this.flowField.getVector(particle.x, particle.y);

            // Обновляем частицу
            particle.update(force, this.speed);

            // Рисуем частицу
            // Цвет меняется от синего (медленные) к красному (быстрые)
            const speed = Math.sqrt(
                particle.vx * particle.vx + particle.vy * particle.vy
            );
            const speedRatio = speed / particle.maxSpeed;

            // HSL в RGB для красивых цветов
            const hue = speedRatio * 180; // 0-180 градусов
            const color = this.hslToHex(hue, 100, 50);

            // Рисуем точку
            this.graphics.circle(particle.x, particle.y, 1.5);
            this.graphics.fill({ color: color, alpha: 0.8 });

            // Рисуем короткую линию в направлении движения
            // НО только если расстояние < 50px (иначе это телепортация через границу!)
            if (particle.history.length > 0) {
                const prev = particle.history[particle.history.length - 1];
                const dx = particle.x - prev.x;
                const dy = particle.y - prev.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Рисуем линию только если частица не телепортировалась
                if (dist < 50) {
                    this.graphics.moveTo(prev.x, prev.y);
                    this.graphics.lineTo(particle.x, particle.y);
                    this.graphics.stroke({
                        width: 1,
                        color: color,
                        alpha: 0.3,
                    });
                }
            }
        }

        // Рендерим graphics на trail texture
        this.app.renderer.render({
            container: this.graphics,
            target: this.trailTexture,
            clear: false,
        });
    }

    /**
     * HSL в HEX для цветов
     */
    hslToHex(h, s, l) {
        s /= 100;
        l /= 100;

        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;

        let r = 0,
            g = 0,
            b = 0;

        if (0 <= h && h < 60) {
            r = c;
            g = x;
            b = 0;
        } else if (60 <= h && h < 120) {
            r = x;
            g = c;
            b = 0;
        } else if (120 <= h && h < 180) {
            r = 0;
            g = c;
            b = x;
        } else if (180 <= h && h < 240) {
            r = 0;
            g = x;
            b = c;
        } else if (240 <= h && h < 300) {
            r = x;
            g = 0;
            b = c;
        } else if (300 <= h && h < 360) {
            r = c;
            g = 0;
            b = x;
        }

        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);

        return (r << 16) | (g << 8) | b;
    }

    /**
     * Установить количество частиц
     */
    setParticleCount(count) {
        if (count > this.particleCount) {
            // Добавляем новые частицы
            const toAdd = count - this.particleCount;
            for (let i = 0; i < toAdd; i++) {
                const x = Math.random() * this.width;
                const y = Math.random() * this.height;
                this.particles.push(
                    new Particle(x, y, this.width, this.height)
                );
            }
        } else if (count < this.particleCount) {
            // Удаляем лишние частицы
            this.particles = this.particles.slice(0, count);
        }
        this.particleCount = count;
        console.log(`✨ Updated to ${count} particles`);
    }

    /**
     * Сброс всех частиц
     */
    reset() {
        // Очищаем trail texture
        this.graphics.clear();
        this.graphics.rect(0, 0, this.width, this.height);
        this.graphics.fill(0x000000);
        this.app.renderer.render({
            container: this.graphics,
            target: this.trailTexture,
            clear: true,
        });
        this.graphics.clear();

        // Переинициализируем частицы
        this.particles.forEach((p) => p.reset(this.width, this.height));
        console.log("🔄 Reset particles");
    }

    /**
     * Установить режим
     */
    setMode(mode) {
        this.flowField.setMode(mode);
        console.log(`🎨 Mode changed to: ${mode}`);
    }

    /**
     * Установить позицию мыши
     */
    setMousePosition(x, y) {
        this.flowField.setMousePosition(x, y);
    }

    /**
     * Установить состояние мыши
     */
    setMousePressed(pressed) {
        this.flowField.setMousePressed(pressed);
    }

    /**
     * Обработка resize
     */
    resize(width, height) {
        this.width = width;
        this.height = height;

        // Пересоздаём trail texture
        this.trailTexture.destroy();
        this.trailTexture = RenderTexture.create({
            width: width,
            height: height,
        });
        this.trailSprite.texture = this.trailTexture;

        // Обновляем fade overlay
        this.updateFadeOverlay();

        // Обновляем flow field
        this.flowField.resize(width, height);

        // Сбрасываем частицы
        this.particles.forEach((p) => {
            p.width = width;
            p.height = height;
        });

        console.log(`📐 Resized to ${width}x${height}`);
    }
}
