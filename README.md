# Resistor Lab

Read a resistor's colour bands or turn a value into bands, then check it against standard E-series values.

**Live:** https://lazarzec18.github.io/resistor-lab/

![Resistor Lab screenshot](screenshot.png)

## What it does

- Decodes 4-band, 5-band and 6-band resistors. Click a band on the drawn resistor, or pick a colour from the palette, and the value, tolerance range and temperature coefficient update straight away.
- Works the other way too: type `4k7`, `4.7k`, `220`, `1M` or `0R47` and it sets the bands for you, with a clear message when a value can't be shown in the bands you chose.
- Tells you the nearest E12, E24 and E96 value and whether yours is a standard part, so you know what to order or pull from the drawer.
- Each band shows its colour name and value as text in a legend and on hover or keyboard focus, so you don't need to tell brown from red by eye.
- Includes a series and parallel calculator for any list of resistors, and a voltage divider calculator (Vin, R1, R2 give Vout, current and ratio).
- Remembers your last resistor, list and divider values between visits.

## How it works

Band colours follow IEC 60062: black to white are the digits 0 to 9, the multiplier runs from silver (×0.01) and gold (×0.1) up to white (×1G), and tolerance and tempco have their own tables. Values are built as decimal strings (`47e-1`) rather than floating-point multiplication, so 4.7 Ω stays exactly 4.7. Encoding searches for the multiplier that fits the value into two or three significant digits, and the E-series lookup compares candidates on a log scale across neighbouring decades to find the closest standard value.

## Built with

HTML, CSS and JavaScript (no frameworks, no build step).

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server
```

Then visit http://localhost:8000.

---

Made by [Lazar Zec](https://github.com/LAZARZEC18).
