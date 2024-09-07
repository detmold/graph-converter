import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import Color from 'color';
import fs from 'fs';
import Jimp from 'jimp';

// Uzyskaj ścieżki katalogu i pliku
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Wczytaj plik colors.json
const colorsFile = join(__dirname, 'colors.json');
const colorsData = JSON.parse(fs.readFileSync(colorsFile, 'utf8'));

// Ścieżka do katalogu wyjściowego
const outputDir = join(__dirname, 'themes');

// Utwórz katalog themes, jeśli nie istnieje
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Funkcja do zaokrąglania rogów
async function roundCorners(image, radius) {
    const { width, height } = image.bitmap;
    const mask = new Jimp(width, height, 0x00000000); // Całkowicie przezroczysty obraz

    // Rysuj maskę z zaokrąglonymi rogami
    mask.scan(0, 0, width, height, (x, y, idx) => {
        const distX = Math.min(x, width - x);
        const distY = Math.min(y, height - y);
        const distance = Math.min(distX, distY);

        if (distance < radius) {
            mask.setPixelColor(0xFFFFFFFF, x, y); // Ustaw biały kolor dla maski
        } else {
            mask.setPixelColor(0x00000000, x, y); // Ustaw przezroczysty kolor
        }
    });

    // Stosuj maskę do obrazu
    return image.mask(mask);
}

// Funkcja do generowania gradientu z dodaniem napisu
async function applyGradientWithText(inputFile, outputFile, colors, text) {
    const [color1, color2, color3] = colors.map(c => Color(c).rgb().array());

    try {
        const { data, info } = await sharp(inputFile).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
        const { width, height } = info;

        const gradientImage = Buffer.alloc(data.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const ratio = x / width;
                const [r, g, b] = interpolateColors(color1, color2, color3, ratio);

                const idx = (y * width + x) * 4;

                gradientImage[idx] = r;
                gradientImage[idx + 1] = g;
                gradientImage[idx + 2] = b;
                gradientImage[idx + 3] = data[idx + 3];
            }
        }

        const buffer = await sharp(gradientImage, {
            raw: {
                width: width,
                height: height,
                channels: 4,
            },
        }).toFormat('png').toBuffer();

        const image = await Jimp.read(buffer);

        // Załaduj font
        const font = await Jimp.loadFont(join(__dirname, 'fonts', 'inter.fnt')); // Możesz użyć innego fonta z Jimp lub wczytać własny

        // Oblicz wymiary napisu
        const textWidth = Jimp.measureText(font, text);
        const textHeight = Jimp.measureTextHeight(font, text);

        // Oblicz pozycję napisu, aby był wyśrodkowany
        const x = (width - textWidth) / 2;
        const y = (height - textHeight) / 2;

        // Dodaj tekst na obrazie
        image.print(font, x, y, text);

        // Zaokrąglij rogi
        // const radius = 30; // Promień zaokrąglenia
        // const roundedImage = await roundCorners(image, radius);

        // Zapisz obraz z zaokrąglonymi rogami
        await image.writeAsync(outputFile);

        console.log(`Zapisano: ${outputFile}`);
    } catch (err) {
        console.error('Błąd podczas przetwarzania obrazu:', err);
    }
}

// Funkcja do interpolacji kolorów
function interpolateColors(color1, color2, color3, ratio) {
    if (ratio < 0.5) {
        return blend(color1, color2, ratio * 2);
    } else {
        return blend(color2, color3, (ratio - 0.5) * 2);
    }
}

// Funkcja do blendowania dwóch kolorów
function blend(colorA, colorB, ratio) {
    const r = Math.round(colorA[0] * (1 - ratio) + colorB[0] * ratio);
    const g = Math.round(colorA[1] * (1 - ratio) + colorB[1] * ratio);
    const b = Math.round(colorA[2] * (1 - ratio) + colorB[2] * ratio);
    return [r, g, b];
}

// Przetwarzanie kolorów z colors.json
async function processThemes() {
    for (const theme of colorsData) {
        const themeName = Object.keys(theme)[0];
        const themeColors = theme[themeName];

        const gradientColors = [
            themeColors['manerty-primary-200'],
            themeColors['manerty-primary-600'],
            themeColors['manerty-primary-900']
        ];

        const themeDir = join(outputDir, themeName);
        if (!fs.existsSync(themeDir)) {
            fs.mkdirSync(themeDir);
        }

        const inputFiles = [{file: 'bottom-button.png', text: 'Ajouter un collaborateur'}, {file: 'top-button.png', text: 'Se connecter'}];
        for (const file of inputFiles) {
            const inputFile = join(__dirname, 'images', file.file);
            const outputFile = join(themeDir, file.file);
            await applyGradientWithText(inputFile, outputFile, gradientColors, file.text);
        }
    }
}

processThemes();
