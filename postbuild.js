const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "dist");
const fontsOut = path.join(distDir, "fonts");
const fontsSource = path.join(distDir, "assets", "node_modules", "expo", "node_modules", "@expo", "vector-icons", "build", "vendor", "react-native-vector-icons", "Fonts");

if (!fs.existsSync(fontsOut)) fs.mkdirSync(fontsOut);

if (fs.existsSync(fontsSource)) {
  fs.readdirSync(fontsSource).forEach(file => {
    if (file.endsWith(".ttf")) {
      const baseName = file.split(".")[0] + ".ttf";
      fs.copyFileSync(path.join(fontsSource, file), path.join(fontsOut, baseName));
      console.log("Copied " + baseName);
    }
  });
}