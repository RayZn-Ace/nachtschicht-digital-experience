# Mollie Nur-Lese-Prüfung (Ergebnis, kein Umsetzungsplan)

Es ist nichts umzusetzen. Mit „Approve“ oder „Skip“ wird keine Änderung ausgeführt.

## Laufzeit-Logs
- create-mollie-payment, create-lounge-payment und mollie-webhook liefern keine Logeinträge.
- Auch eine Abfrage der Aufrufprotokolle ergab für diese Funktionen keine Einträge, ebenso die allgemeinen Funktionslogs.
- Unverifiziert: Ob es keine Aufrufe gab oder die Logs nicht mehr vorgehalten werden, ist nicht feststellbar. Erfolgreiche oder fehlgeschlagene Aufrufe lassen sich daraus nicht belegen.

## Schlüssel-Konfiguration
- Ein Mollie-Schlüssel ist als Secret hinterlegt. Der Wert wurde nicht angezeigt.

## Lesender Mollie-Abruf
- Abfrage der letzten 5 Zahlungen: HTTP 200, der Schlüssel funktioniert.
- Modus: live.
- Letzte Zahlungen (Zeit UTC, Status):
  - 18.11. 13:02: offen
  - 17.11. 17:40: bezahlt
  - 17.11. 16:20: bezahlt
  - 17.11. 16:13: abgelaufen
  - 17.11. 12:41: bezahlt
- Unverifiziert:
  - Ob der Schlüssel in der Prüfumgebung exakt dem Schlüssel der veröffentlichten Funktionen entspricht.
  - Ob die Webhooks diese Zahlungen verarbeitet haben.

Es wurden keine Codes, Secrets, Daten oder Zahlungen verändert oder ausgelöst.
