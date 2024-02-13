// uno.config.ts
import { defineConfig, presetUno, presetWebFonts } from 'unocss'
import { extendCatppuccin } from 'unocss-catppuccin';
export default defineConfig({
    // ...UnoCSS options
    presets: [presetUno(), extendCatppuccin(), presetWebFonts()],
    theme: {
        fontFamily: {
            josefin: 'Josefin Sans',
            lxgw: '霞鹜文楷'
        }
    }
})