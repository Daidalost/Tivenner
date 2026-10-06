# 10'er-venner

Et lille spil til at øve 10'er-venner. Brættet er 10 × 10 felter med cifrene 1–9.
Klik på to **nabofelter** (vandret, lodret eller skråt) der tilsammen giver 10 – så
forsvinder de, og felterne ovenover falder ned. Målet er at tømme hele brættet.

Alle bræt kan løses. For hvert level bliver der færre rækkefølger, der fører til et
tomt bræt, så eleven skal planlægge mere og mere.

## Læg appen på nettet (GitHub + Vercel)

1. Opret et nyt, tomt repository på github.com.
2. Vælg **uploading an existing file**, og træk hele indholdet af denne mappe derind
   (ikke selve mappen – `package.json` skal ligge yderst). Tryk **Commit changes**.
3. Gå til vercel.com → **Add New… → Project** → vælg repository'et → **Deploy**.
   Vercel genkender selv, at det er et Vite-projekt. Der skal ikke indstilles noget.

Hver gang du retter en fil på GitHub, opdaterer Vercel automatisk siden.

## Kør appen på din egen computer (valgfrit)

Kræver Node.js 18 eller nyere.

```
npm install
npm run dev      # åbner appen på http://localhost:5173
npm test         # tjekker spillogikken
npm run build    # bygger den færdige side i mappen dist/
```

## Hvor retter jeg hvad?

| Vil du ændre …                         | Fil               |
| -------------------------------------- | ----------------- |
| Sværhedsgraden på de 10 levels         | `src/levels.js`   |
| Tekster, knapper og beskeder           | `src/App.jsx`     |
| Farver, størrelser og animationer      | `src/styles.css`  |
| Regler, brætgenerator og hint          | `src/game.js`     |

### Sværhedsgrad

Hvert level i `src/levels.js` har tre tal:

- `vertical` – andelen af par der ligger lodret i samme kolonne. De par kan ikke
  blive skilt ad af det der sker i nabokolonnerne, så et højt tal giver et tilgivende bræt.
  Ved 1.0 kan hele brættet tømmes kolonne for kolonne; level 1 står på 0.85, så nogle
  par skal findes vandret eller skråt.
- `deep` – hvor ofte et par er "gemt" inde i et andet par, så det inderste skal
  fjernes først. Et højt tal gør rækkefølgen vigtigere.
- `target` – hvor ofte en spiller der klikker helt tilfældigt på gyldige par skal
  kunne tømme brættet. Appen laver otte bræt og vælger det der rammer tallet bedst.
  Level 1 ligger omkring 20 %, level 10 tæt på 0 %.

### Smutvej til et bestemt level

Eleverne låser et nyt level op ved at tømme brættet. Du kan selv hoppe direkte til
et level ved at skrive `?level=7` efter adressen, fx `https://din-app.vercel.app/?level=7`.

Appen husker elevens level i browseren på den enhed, der spilles på.
