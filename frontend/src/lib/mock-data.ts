export const citizen = {
  name: "Ion Popescu",
  initials: "IP",
  cnp: "1990115123456",
  cnpMasked: "199****3456",
  email: "ion.popescu@gmail.com",
  phone: "+40 7** *** **3",
  address: "Str. Memorandumului 5",
  city: "Cluj-Napoca",
  birth: "15.01.1990",
  idSerie: "KX",
  idNumber: "456789",
  idExpiry: "15.01.2030",
};

export const vehicle = {
  plate: "CJ 01 ABC",
  model: "Dacia Logan 2019",
  engine: "1461cc benzină",
  itp: { date: "15 Ian 2025", status: "expired" as const, label: "EXPIRAT" },
  rca: { date: "28 Mai 2026", status: "urgent" as const, label: "5 ZILE", subtitle: "5 zile rămase" },
  tax: { value: "187 RON", paid: true },
};

export const auditLog = [
  { id: 1, type: "form", action: "Formular transcripție generat — CJ01ABC", time: "14 Mai 2026, 14:32", hash: "a3f7b2c9d8e1f4a6b7c2d5e8f9a0b3c4" },
  { id: 2, type: "report", action: "Sesizare înregistrată — Groapă Str. Horea #CLJ-2026-7284", time: "13 Mai 2026, 09:44", hash: "3b8c9e0f2a4d6b8c1e3f5a7b9c2d4e6f" },
  { id: 3, type: "auth", action: "Autentificare reușită", time: "13 Mai 2026, 09:40", hash: "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6" },
  { id: 4, type: "form", action: "Contract vânzare-cumpărare generat — CJ01ABC", time: "10 Mai 2026, 16:22", hash: "9d4e7a2b5c8d1e4f7a0b3c6d9e2f5a8b" },
  { id: 5, type: "payment", action: "Impozit auto plătit — 187 RON", time: "08 Mai 2026, 10:11", hash: "b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2" },
  { id: 6, type: "auth", action: "Autentificare reușită", time: "07 Mai 2026, 18:03", hash: "5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d" },
  { id: 7, type: "form", action: "Adeverință venit descărcată", time: "05 Mai 2026, 12:47", hash: "e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2b5" },
  { id: 8, type: "report", action: "Sesizare iluminat public #CLJ-2026-7102", time: "02 Mai 2026, 21:18", hash: "c6d9e2f5a8b1c4d7e0f3a6b9c2d5e8f1" },
  { id: 9, type: "auth", action: "Autentificare reușită", time: "01 Mai 2026, 08:22", hash: "1a4b7c0d3e6f9a2b5c8d1e4f7a0b3c6d" },
];

export const gps = { lat: 46.7712, lng: 23.5898 };

export const quickActions = [
  { icon: "id-card", label: "Buletin de identitate", topic: "Reînnoire buletin" },
  { icon: "plane", label: "Pașaport", topic: "Pașaport urgent" },
  { icon: "briefcase", label: "Înregistrare PFA", topic: "Înregistrare PFA" },
  { icon: "baby", label: "Certificat de naștere", topic: "Certificat de naștere" },
  { icon: "car-front", label: "Permis de conducere", topic: "Permis de conducere" },
  { icon: "car", label: "Înmatriculare vehicul", topic: "Înmatriculare mașină" },
];

export type DocStatus = "have" | "obtain" | "generate";
export type DocItem = {
  name: string;
  status: DocStatus;
  institution?: string;
  address?: string;
  form_type?: string;
};
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
