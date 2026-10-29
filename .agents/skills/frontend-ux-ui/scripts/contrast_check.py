#!/usr/bin/env python3
"""
scripts/contrast_check.py
Calculador y verificador de ratios de contraste WCAG 2.2 AA / AAA
para la paleta de diseño institucional de SIPA.
"""

def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

def srgb_channel_to_linear(c: float) -> float:
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def relative_luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = [srgb_channel_to_linear(val) for val in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(hex1: str, hex2: str) -> float:
    lum1 = relative_luminance(hex_to_rgb(hex1))
    lum2 = relative_luminance(hex_to_rgb(hex2))
    l_max = max(lum1, lum2)
    l_min = min(lum1, lum2)
    return (l_max + 0.05) / (l_min + 0.05)

def wcag_rating(ratio: float, is_large_text: bool = False) -> str:
    if is_large_text:
        if ratio >= 4.5:
            return "AAA"
        if ratio >= 3.0:
            return "AA"
        return "FAIL"
    else:
        if ratio >= 7.0:
            return "AAA"
        if ratio >= 4.5:
            return "AA"
        if ratio >= 3.0:
            return "AA (Large Only)"
        return "FAIL"

PALETTE = {
    "Deep Ocean (Brand Primary)": "#2C365A",
    "Forest Pig Green (Accent)": "#1E4D3B",
    "Foreground Text": "#182038",
    "Subtle Text": "#444F6E",
    "Beige Border": "#C4BCB0",
    "Warning Amber": "#B45309",
    "Danger Red": "#B91C1C",
}

BACKGROUNDS = {
    "Cream (#EEE8DF)": "#EEE8DF",
    "White (#FFFFFF)": "#FFFFFF",
    "Surface Panel (#F7F4EF)": "#F7F4EF",
}

def main():
    print("=" * 72)
    print(" 🎨 SIPA UX/UI DESIGN SYSTEM — AUDITORÍA DE CONTRASTE WCAG 2.2")
    print("=" * 72)
    for bg_name, bg_hex in BACKGROUNDS.items():
        print(f"\n📌 Fondo de referencia: {bg_name}")
        print(f"{'Color':<30} | {'Hex':<8} | {'Ratio':<8} | {'Normal':<6} | {'Large':<6}")
        print("-" * 72)
        for name, fg_hex in PALETTE.items():
            ratio = contrast_ratio(fg_hex, bg_hex)
            norm = wcag_rating(ratio, is_large_text=False)
            large = wcag_rating(ratio, is_large_text=True)
            print(f"{name:<30} | {fg_hex:<8} | {ratio:>5.2f}:1 | {norm:<6} | {large:<6}")
    print("\n" + "=" * 72)

if __name__ == "__main__":
    main()

