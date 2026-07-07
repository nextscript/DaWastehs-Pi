---
name: "html-golden-rules"
description: "Best Practices für modernes, semantisches und barrierefreies HTML (Stand 2026)."
version: 1
created: "2026-05-29"
updated: "2026-05-29"
---
## When to Use
Wenn HTML-Markup, UI-Komponenten, Web-Templates oder Formulare geschrieben, gereviewt oder refactored werden.

## Procedure
1. 1. Grundstruktur: Setze immer <html lang="..."> und den Mobile-First Viewport-Meta-Tag.
2. 2. Semantik vor Styling: Wähle das Element nach seiner Bedeutung, nicht nach seinem Aussehen. Nutze <header>, <main>, <footer>, <nav>, <aside>, <article> und <section> korrekt.
3. 3. Native interaktive APIs: Bevorzuge native Elemente wie <dialog> für Modals, <details>/<summary> für Akkordeons und das 'popover' Attribut für Tooltips/Popups.
4. 4. A11y First: Verknüpfe jedes Formularfeld explizit via <label for="...">. Nutze ARIA-Attribute nur, wenn natives HTML nicht ausreicht (ARIA is a supplement, not a replacement).
5. 5. Performance-Optimierung: Implementiere natives Lazy-Loading (loading='lazy') für Bilder/Iframes. Nutze <picture> und srcset für responsive Bilder. Setze fetchpriority='high' für LCP-Elemente.
6. 6. Resource Hints: Nutze <link rel='preload'> für kritische Assets und <link rel='prefetch'> für vorhersehbare Folgeseiten.
7. 7. Sicherheit im Markup: Verwende rel='noopener noreferrer' für externe Links. Achte auf korrektes Escaping von Attributen zur XSS-Prävention.

## Pitfalls
- 'Div-Soup': Übermäßiger Einsatz von <div>-Containern anstelle semantischer Elemente (z.B. <main>, <article>, <section>).
- Interaktions-Fehler: Nutzung von <div> oder <span> als Button statt <button> (fehlende Tastaturbedienbarkeit/Screenreader-Support).
- Link-Verwechslung: Verwendung von <a> für Aktionen (statt <button>) oder <button> für Navigation (statt <a>).
- Barrierefreiheit-Lücken: Fehlende alt-Attribute bei Bildern oder redundante Beschreibungen (z.B. 'Bild von...').
- Formular-Mängel: Inputs ohne korrespondierende <label>-Verknüpfung oder <form> ohne definierte Action/Method.
- Kaputtes Tab-Management: Einsatz von tabindex > 0, was die natürliche Tab-Reihenfolge zerstört.
- Hierarchie-Brüche: Übersprungene Heading-Level (z.B. <h1> gefolgt von <h3>).

## Verification
1. W3C Validator: Markup auf syntaktische Korrektheit prüfen.
2. Lighthouse Audit: Accessibility-Score von 100 anstreben.
3. Keyboard-Only Test: Die gesamte Seite ohne Maus mittels Tab-Taste navigierbar machen (Fokus-Indikatoren müssen sichtbar sein).
4. Screenreader-Check: Mit NVDA oder VoiceOver prüfen, ob die Semantik die Struktur korrekt wiedergibt.