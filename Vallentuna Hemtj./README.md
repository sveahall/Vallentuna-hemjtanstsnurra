# Vallentuna hemtjänstsnurra

Ett enkelt frontendskript för preliminär avgiftsberäkning för hemtjänst (Vallentuna kommun).

## Så kör du
- Öppna `index.html` i valfri browser, inga byggsteg krävs.
- Formuläret är stegvis och visar obligatoriska fält med `*`.

## Viktiga värden (2026)
- Prisbasbelopp: 59 200 kr
- Maxtaxa: 2 660 kr
- Servicekostnader: trygghetslarm 267 kr, servicemax2h 333 kr, servicemax4h 1 332 kr, service8h 2 660 kr, matlåda-leverans 333 kr, matlåda 37 kr/st (utanför maxtaxan).
- Schabloner: uppvärmning 198, vatten/avlopp 341, el per kvm 4.98, max el 598, max fastighetsavgift 10 425.

## Uppdatera till nytt år
1. Justera konstanterna överst i `document.js` (prisbasbelopp, maxtaxa, servicekostnader, schabloner).
2. Sätt rätt `max`-år i byggårsfältet i `index.html`.
3. Om priser ändras för matlåda/larm: uppdatera `serviceCosts`.

## Tillgänglighet och validering
- Obligatoriska fält är markerade med `*`.
- Diskret felruta (`#formError`) visar vad som saknas och fokuserar första relevanta fältet.
- Resultatbeloppen har `aria-live="polite"` för skärmläsare.

## Utskrift/PDF
- Knappar för utskrift och PDF finns i resultatvyn.
- Resultatet visar datum för beräkningen och en kort disclaimer.

