<p align="center">
  <img src="favicons/icon-512.png" alt="Bordsplacering" width="160">
</p>

# Bordsplacering

Webbapp för att planera bordsplacering vid middagar och evenemang — importera gäster från CSV, skapa bord och placera automatiskt eller manuellt.

**App:** [https://delit.github.io/bordsplacering/](https://delit.github.io/bordsplacering/)

<table width="100%" cellpadding="6" cellspacing="0">
  <tr>
    <td width="50%" valign="top"><img src="img/2026_05_20_1705.png" alt="Bordsplacering – översikt" style="width:100%;display:block;border-radius:8px"></td>
    <td width="50%" valign="top"><img src="img/2026_05_20_1706.png" alt="Bordsplacering – gästlista" style="width:100%;display:block;border-radius:8px"></td>
  </tr>
  <tr>
    <td width="25%" valign="top"><img src="img/2026_05_20_1709.png" alt="Bordsplacering – bordsform" style="width:100%;height:200px;object-fit:cover;object-position:top;display:block;border-radius:8px"></td>
    <td width="25%" valign="top"><img src="img/2026_05_20_1710.png" alt="Bordsplacering – placering" style="width:100%;height:200px;object-fit:cover;object-position:top;display:block;border-radius:8px"></td>
    <td width="25%" valign="top"><img src="img/2026_05_20_1711.png" alt="Bordsplacering – manuellt läge" style="width:100%;height:200px;object-fit:cover;object-position:top;display:block;border-radius:8px"></td>
    <td width="25%" valign="top"><img src="img/2026_05_20_1712.png" alt="Bordsplacering – export" style="width:100%;height:200px;object-fit:cover;object-position:top;display:block;border-radius:8px"></td>
  </tr>
</table>

## Funktioner

- Importera gästlista från CSV (semikolon-separerad)
- Testa eller ladda ned exempeldata (100 gäster) direkt i appen
- Skapa bord (avlångt eller runt), auto-placering eller manuellt läge
- Filtrera på kön och ålder
- Fält för specialkost och övrigt (med ikoner i gränssnittet)
- Exportera placering till Word
- Autospar i webbläsaren (localStorage)

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
| `index.html` | Huvudsida |
| `bordsplacering.css` | Stilar |
| `bordsplacering.js` | Logik |
| `exempel_gaster.csv` | Exempelgäster |
| `favicons/` | Ikoner (16–512 px, SVG, ICO, manifest) |
| `img/` | Skärmdumpar till README |

## Licens

Projektet tillhör [delit](https://github.com/delit) på GitHub.
