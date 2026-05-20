<p align="center">
  <img src="favicons/icon-512.png" alt="Bordsplacering" width="160">
</p>

# Bordsplacering

Webbapp för att planera bordsplacering vid middagar och evenemang — importera gäster från CSV, skapa bord och placera automatiskt eller manuellt.

**Repository:** [https://github.com/delit/bordsplacering](https://github.com/delit/bordsplacering)

## Funktioner

- Importera gästlista från CSV (semikolon-separerad)
- Testa eller ladda ned exempeldata (100 gäster) direkt i appen
- Skapa bord (avlångt eller runt), auto-placering eller manuellt läge
- Filtrera på kön och ålder
- Fält för specialkost och övrigt (med ikoner i gränssnittet)
- Exportera placering till Word (.docx)
- Spara i webbläsaren (localStorage)

## Kom igång

1. Klona repot eller ladda ned filerna
2. Öppna `bordsplacering.html` i en modern webbläsare

Ingen server krävs för grundfunktionen. För exempel-CSV via nätverk kan du köra en enkel lokal server, t.ex. `npx serve .`

## CSV-format

```text
Namn;Kön;Född;Specialkost;Övrigt
```

| Kolumn | Beskrivning |
|--------|-------------|
| Namn | För- och efternamn |
| Kön | Man, Kvinna eller Annat |
| Född | Födelseår (t.ex. 1978) |
| Specialkost | Valfritt (glutenfri, vegetarisk, …) |
| Övrigt | Valfri fri text (ej matrelaterat) |

Exempelfil: [`exempel_gaster.csv`](exempel_gaster.csv)

## Filer

| Fil | Innehåll |
|-----|----------|
| `bordsplacering.html` | Huvudsida |
| `bordsplacering.css` | Stilar |
| `bordsplacering.js` | Logik |
| `exempel_gaster.csv` | Exempelgäster |
| `favicons/` | Ikoner (16–512 px, SVG, ICO, manifest) |

## Licens

Projektet tillhör [delit](https://github.com/delit) på GitHub.
