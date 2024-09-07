const sharp = require('sharp');
const Color = require('color');
const fs = require('fs');
const path = require('path');

// Wczytaj plik colors.json
const colorsFile = path.join(__dirname, 'colors.json');
const colorsData = JSON.parse(fs.readFileSync(colorsFile, 'utf8'));

// Ścieżka do katalogu wyjściowego
const outputDir = path.join(__dirname, 'themes');

// Utwórz katalog themes, jeśli nie istnieje
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Funkcja do generowania gradientu
function applyGradient(inputFile, outputFile, colors) {
  const [color1, color2, color3] = colors.map(c => Color(c).rgb().array());

  // Wczytaj obraz za pomocą Sharp
  sharp(inputFile)
    .raw()
    .ensureAlpha()
    .toBuffer((err, data, info) => {
      if (err) throw err;

      const width = info.width;
      const height = info.height;

      const gradientImage = Buffer.alloc(data.length);

      // Tworzenie gradientu
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const ratio = x / width;
          const [r, g, b] = interpolateColors(color1, color2, color3, ratio);

          const idx = (y * width + x) * 4; // 4 bajty na pixel (RGBA)

          // Nałożenie koloru gradientu na obraz
          gradientImage[idx] = r;
          gradientImage[idx + 1] = g;
          gradientImage[idx + 2] = b;
          gradientImage[idx + 3] = data[idx + 3]; // Zachowanie oryginalnej wartości alpha
        }
      }

      // Zapisz przetworzony obraz
      sharp(gradientImage, {
        raw: {
          width: width,
          height: height,
          channels: 4,
        },
      })
        .toFile(outputFile, (err) => {
          if (err) throw err;
          console.log(`Zapisano: ${outputFile}`);
        });
    });
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
colorsData.forEach(theme => {
  const themeName = Object.keys(theme)[0]; // Pobierz nazwę tematu, np. "theme-ocean"
  const themeColors = theme[themeName]; // Pobierz kolory dla tego tematu

  // Pobierz kolory z pól manerty-primary-200, manerty-primary-600, manerty-primary-900
  const gradientColors = [
    themeColors['manerty-primary-200'],
    themeColors['manerty-primary-600'],
    themeColors['manerty-primary-900']
  ];

  // Utwórz katalog dla danego tematu, np. "themes/theme-ocean"
  const themeDir = path.join(outputDir, themeName);
  if (!fs.existsSync(themeDir)) {
    fs.mkdirSync(themeDir);
  }

  // Przetwórz pliki graficzne
  const inputFiles = ['bottom-button.png', 'top-button.png']; // Pliki wejściowe
  inputFiles.forEach(file => {
    const inputFile = path.join(__dirname, 'images', file);
    const outputFile = path.join(themeDir, file);
    applyGradient(inputFile, outputFile, gradientColors);
  });
});
