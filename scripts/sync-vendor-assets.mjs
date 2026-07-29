import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const nodeModules = resolve(root, "node_modules");
const vendorRoot = resolve(root, "assets", "vendor");
const mduiRoot = resolve(vendorRoot, "mdui");
const fontsRoot = resolve(vendorRoot, "fonts");
const fontFilesRoot = resolve(fontsRoot, "files");

const fontStyles = [
    "@fontsource/noto-sans/latin-400.css",
    "@fontsource/noto-sans/latin-500.css",
    "@fontsource/noto-sans/latin-700.css",
    "@fontsource/noto-sans-sc/chinese-simplified-400.css",
    "@fontsource/noto-sans-sc/chinese-simplified-500.css",
    "@fontsource/noto-sans-sc/chinese-simplified-700.css",
    "@fontsource/material-icons/latin-400.css"
];

const fontUrlPattern = /url\((['"]?)([^)'"\s]+\.woff2)\1\)/g;

const copyMdui = async () => {
    await Promise.all([
        copyFile(resolve(nodeModules, "mdui", "mdui.css"), resolve(mduiRoot, "mdui.css")),
        copyFile(resolve(nodeModules, "mdui", "mdui.global.js"), resolve(mduiRoot, "mdui.global.js"))
    ]);
};

const syncFonts = async () => {
    const output = [];

    for (const relativeStylePath of fontStyles) {
        const sourceStylePath = resolve(nodeModules, relativeStylePath);
        const sourceStyle = (await readFile(sourceStylePath, "utf8"))
            .replace(/,\s*url\((['"]?)[^)'"\s]+\.woff\1\)\s*format\((['"])woff\2\)/g, "");
        const sourceDirectory = dirname(sourceStylePath);

        const localStyle = await Promise.all([...sourceStyle.matchAll(fontUrlPattern)].map(async (match) => {
            const sourceFontPath = resolve(sourceDirectory, match[2]);
            const localFontName = basename(sourceFontPath);
            await copyFile(sourceFontPath, resolve(fontFilesRoot, localFontName));
            return { original: match[0], replacement: `url('./files/${localFontName}')` };
        }));

        output.push(localStyle.reduce(
            (style, replacement) => style.replace(replacement.original, replacement.replacement),
            sourceStyle
        ));
    }

    await writeFile(resolve(fontsRoot, "fonts.css"), `${output.join("\n")}\n`);
};

await mkdir(mduiRoot, { recursive: true });
await mkdir(fontFilesRoot, { recursive: true });
await copyMdui();
await syncFonts();
