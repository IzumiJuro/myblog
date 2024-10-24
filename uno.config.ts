// uno.config.ts
import { defineConfig, presetIcons, presetUno, presetWebFonts, transformerDirectives } from 'unocss'
import { presetCatppuccin } from 'unocss-catppuccin';

export default defineConfig({
    // ...UnoCSS options
    presets: [presetUno(), presetCatppuccin(), presetWebFonts(), presetIcons()],
    theme: {
        fontFamily: {
            josefin: ['Josefin Sans', '霞鹜文楷', 'sans-serif'],
            lxgw: '霞鹜文楷',
            pacifico: ['Pacifico', '霞鹜文楷', 'sans-serif'],
            sarasa: '更纱黑体 SC',
        },
    },
    transformers: [transformerDirectives()],
})