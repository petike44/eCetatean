export type LocationItem = {
  name: string;
  address: string;
  distance: string;
  hours: string;
  phone: string;
  wait: string;
};

export const locationsCatalog: Record<string, LocationItem[]> = {
  pasaport: [
    { name: "Direcția Pașapoarte Cluj", address: "Str. Traian Vuia 33, Cluj-Napoca", distance: "2.4 km", hours: "Lun–Vin 08:30–16:30", phone: "0264 405 305", wait: "~25 min" },
    { name: "Ghișeu Unic Mănăștur", address: "Calea Mănăștur 89, Cluj-Napoca", distance: "3.8 km", hours: "Lun–Vin 09:00–15:00", phone: "0264 433 211", wait: "~12 min" },
    { name: "Pașapoarte Florești", address: "Str. Avram Iancu 12, Florești", distance: "7.1 km", hours: "Lun–Joi 08:00–14:00", phone: "0264 268 412", wait: "~5 min" },
  ],
  buletin: [
    { name: "SPCEP Cluj-Napoca", address: "Str. Moților 1-3, Cluj-Napoca", distance: "1.1 km", hours: "Lun–Vin 08:00–17:00", phone: "0264 596 030", wait: "~18 min" },
    { name: "SPCEP Mărăști", address: "Str. Fabricii 4, Cluj-Napoca", distance: "3.2 km", hours: "Lun–Vin 08:30–16:00", phone: "0264 414 220", wait: "~9 min" },
  ],
  pfa: [
    { name: "ONRC Cluj", address: "Str. Dorobanților 18, Cluj-Napoca", distance: "1.6 km", hours: "Lun–Vin 09:00–16:00", phone: "0264 431 786", wait: "~15 min" },
    { name: "Cameră de Comerț Cluj", address: "Str. Horea 3, Cluj-Napoca", distance: "0.9 km", hours: "Lun–Vin 09:00–17:00", phone: "0264 530 357", wait: "~7 min" },
  ],
  inmatriculare: [
    { name: "DRPCIV Cluj", address: "Str. Aurel Vlaicu 142, Cluj-Napoca", distance: "4.2 km", hours: "Lun–Vin 08:00–15:30", phone: "0264 432 727", wait: "~32 min" },
    { name: "Serviciul Public Înmatriculări", address: "Bd. 21 Decembrie 1989 nr. 79", distance: "1.8 km", hours: "Lun–Vin 08:30–16:00", phone: "0264 590 800", wait: "~20 min" },
  ],
};
