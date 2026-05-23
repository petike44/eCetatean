import type { LifeEventProcedure, OfficeInfo } from '../types'

export const OFFICES: Record<string, OfficeInfo> = {
  dgep: {
    name: 'Direcția de Evidență a Persoanelor Cluj-Napoca',
    address: 'Str. Moților 3, Cluj-Napoca',
    hours: 'Luni–Vineri: 08:30–16:00 | Marți și Joi: până la 18:00',
    phone: '0264-597.670',
    notes: 'Aduceți documentele originale plus câte o fotocopie.',
  },
  drpciv: {
    name: 'DRPCIV Cluj — Înmatriculări și Permise',
    address: 'Str. Traian Vuia 1-4, Cluj-Napoca',
    hours: 'Luni–Vineri: 08:00–16:00',
    phone: '0264-420.464',
    notes: 'Programare online recomandată pe politiaromana.ro.',
  },
  primarie: {
    name: 'Primăria Municipiului Cluj-Napoca — Taxe și Impozite',
    address: 'Calea Moților 3, Cluj-Napoca',
    hours: 'Luni–Joi: 08:00–16:00 | Vineri: 08:00–13:00',
    phone: '0264-596.030',
    notes: 'Puteți plăti impozitele și pe ghiseu.ro fără deplasare.',
  },
  notar: {
    name: 'Birou Notarial (orice notar autorizat)',
    address: 'Orice birou notarial din Cluj-Napoca',
    hours: 'Luni–Vineri: 09:00–17:00',
    phone: 'Variabil — sunați înainte',
    notes: null,
  },
  cnas_cluj: {
    name: 'Casa de Asigurări de Sănătate Cluj',
    address: 'Str. Constanța 5, Cluj-Napoca',
    hours: 'Luni–Vineri: 08:30–16:30',
    phone: '0264-531.155',
    notes: 'Transferul medicului de familie se face direct la noul cabinet.',
  },
}

export const LIFE_EVENTS: Record<string, LifeEventProcedure> = {
  bought_car: {
    event_type: 'bought_car',
    title: 'Și-ai cumpărat o mașină',
    emoji: '🚗',
    summary: 'Trebuie să faci 3 pași principali în 30 de zile.',
    total_estimated_time: '1–2 zile lucrătoare',
    steps: [
      {
        order: 1,
        title: 'Autentifici contractul de vânzare-cumpărare',
        office: 'Birou Notarial',
        address: 'Orice birou notarial din Cluj-Napoca',
        hours: 'Luni–Vineri: 09:00–17:00',
        phone: 'Variabil',
        documents: [
          'Buletin vânzător (original)',
          'Buletin cumpărător (original — al tău)',
          'CIV — Cartea de identitate a vehiculului (original)',
          'Contractul de vânzare-cumpărare completat și semnat de ambele părți',
        ],
        fee: '150–300 RON (tarif notarial)',
        deadline: 'Înainte de pasul 2',
        form_type: 'sale_contract',
        payment_url: null,
        tip: 'Generează contractul din aplicație cu datele tale completate. Tipărește, semnează cu vânzătorul, mergi la notar.',
      },
      {
        order: 2,
        title: 'Transcrieri vehiculului pe numele tău',
        office: 'DRPCIV Cluj — Înmatriculări Auto',
        address: 'Str. Traian Vuia 1-4, Cluj-Napoca',
        hours: 'Luni–Vineri: 08:00–16:00',
        phone: '0264-420.464',
        documents: [
          'Buletin (original + copie)',
          'Contract de vânzare-cumpărare autentificat la notar (original + copie)',
          'CIV (original)',
          'ITP valabil',
          'RCA valabil',
          'Dovada plății taxei de timbru (13 RON)',
          'Cerere tip (o generăm noi)',
        ],
        fee: '13 RON taxă timbru + ~87 RON taxă înmatriculare',
        deadline: 'În maximum 30 de zile de la cumpărare',
        form_type: 'transcription',
        payment_url: null,
        tip: 'Programează-te online pe politiaromana.ro cu cel puțin 3 zile înainte.',
      },
      {
        order: 3,
        title: 'Declari mașina pentru impozit auto',
        office: 'Primăria Cluj-Napoca — Taxe și Impozite',
        address: 'Calea Moților 3, Cluj-Napoca',
        hours: 'Luni–Joi: 08:00–16:00 | Vineri: 08:00–13:00',
        phone: '0264-596.030',
        documents: [
          'Buletin (original + copie)',
          'Noul certificat de înmatriculare (original + copie)',
          'Contract de vânzare-cumpărare (copie)',
          'Declarație impozit auto (o generăm noi)',
        ],
        fee: 'Calculat după cilindree și combustibil',
        deadline: 'În maximum 30 de zile de la înmatriculare',
        form_type: 'impozit_auto',
        payment_url: 'https://www.ghiseu.ro',
        tip: 'După declarare, poți plăti impozitul direct pe ghiseu.ro.',
      },
    ],
  },
  moving_to_cluj: {
    event_type: 'moving_to_cluj',
    title: 'Te muți la Cluj pentru facultate',
    emoji: '🎓',
    summary: '4 pași pentru a te instala complet în Cluj.',
    total_estimated_time: 'Prima săptămână',
    steps: [
      {
        order: 1,
        title: 'Viză de flotant sau schimbare buletin',
        office: 'Direcția de Evidență a Persoanelor Cluj-Napoca',
        address: 'Str. Moților 3, Cluj-Napoca',
        hours: 'Luni–Vineri: 08:30–16:00 | Marți și Joi: până la 18:00',
        phone: '0264-597.670',
        documents: [
          'Buletin (original + copie)',
          'Contract de închiriere sau adeverință de la proprietar',
          'Cerere tip (o generăm noi, completată cu datele tale)',
        ],
        fee: 'Gratuit',
        deadline: 'În 15 zile de la instalarea la noua adresă',
        form_type: 'viza_flotant',
        payment_url: null,
        tip: 'Dacă stai la cămin, cere adeverință de la administrația căminului.',
      },
      {
        order: 2,
        title: 'Transfer la medic de familie în Cluj',
        office: 'Cabinet medicină de familie (rețea CNAS)',
        address: 'Orice cabinet din rețeaua CNAS din Cluj',
        hours: 'Luni–Vineri: 08:00–15:00',
        phone: 'Variabil pe cabinet',
        documents: [
          'Buletin (original)',
          'Card de sănătate CNAS (original)',
        ],
        fee: 'Gratuit',
        deadline: 'Recomandat în prima lună',
        form_type: 'doctor_transfer',
        payment_url: null,
        tip: 'Nu ai nevoie de adeverință de la medicul vechi. Mergi direct la noul cabinet.',
      },
      {
        order: 3,
        title: 'Abonament CTP student',
        office: 'CTP Cluj-Napoca',
        address: 'Piața Mihai Viteazu 16, Cluj-Napoca',
        hours: 'Luni–Vineri: 07:00–19:00 | Sâmbătă: 08:00–14:00',
        phone: '0264-430.917',
        documents: [
          'Buletin (original)',
          'Legitimație student valabilă cu viză pe semestrul curent',
        ],
        fee: '20–25 RON/lună pentru studenți',
        deadline: 'Oricând',
        form_type: null,
        payment_url: null,
        tip: null,
      },
      {
        order: 4,
        title: 'Adeverință pentru bursă de la primăria de acasă',
        office: 'Primăria din orașul tău natal',
        address: 'Variabil — orașul tău de domiciliu',
        hours: 'Variabil',
        phone: 'Variabil',
        documents: [
          'Cerere tip (o generăm noi)',
          'Buletin',
        ],
        fee: 'Gratuit sau taxă mică de timbru',
        deadline: 'Conform secretariatul universității',
        form_type: 'scholarship_certificate',
        payment_url: null,
        tip: 'Trimite cererea generată de noi pe email la primăria de acasă.',
      },
    ],
  },
  id_renewal: {
    event_type: 'id_renewal',
    title: 'Îți reînnoiești buletinul',
    emoji: '🪪',
    summary: 'Reînnoirea buletinului se face la DGEP din județul de domiciliu.',
    total_estimated_time: '30 minute la ghișeu',
    steps: [
      {
        order: 1,
        title: 'Depui cererea la DGEP',
        office: 'Direcția de Evidență a Persoanelor Cluj-Napoca',
        address: 'Str. Moților 3, Cluj-Napoca',
        hours: 'Luni–Vineri: 08:30–16:00',
        phone: '0264-597.670',
        documents: [
          'Buletin vechi sau expirat (original)',
          'Certificat de naștere (original + copie)',
          'Certificat de căsătorie dacă e cazul (original + copie)',
          'Dovada adresei (dacă adresa s-a schimbat): contract chirie sau act proprietate',
          'Chitanță plată taxă (7 RON la CEC sau online)',
          'Cerere tip (o generăm noi)',
        ],
        fee: '7 RON',
        deadline: 'Înainte de expirare sau în 15 zile după',
        form_type: 'viza_flotant',
        payment_url: null,
        tip: 'Buletinul se eliberează în 30 de zile. Poți solicita emitere urgentă în 3 zile pentru 17 RON.',
      },
    ],
  },
  start_business: {
    event_type: 'start_business',
    title: 'Vrei să deschizi o firmă sau PFA',
    emoji: '💼',
    summary: 'Înregistrarea unei firme se face la Registrul Comerțului.',
    total_estimated_time: '3–5 zile lucrătoare',
    steps: [
      {
        order: 1,
        title: 'Rezervare denumire firmă la ONRC',
        office: 'Oficiul Registrului Comerțului Cluj',
        address: 'Str. Dorobanților 2, Cluj-Napoca',
        hours: 'Luni–Vineri: 09:00–14:00',
        phone: '0264-590.500',
        documents: [
          'Cerere rezervare denumire (online sau la ghișeu)',
          'Buletin',
        ],
        fee: '72 RON',
        deadline: 'Rezervarea e valabilă 3 luni',
        form_type: null,
        payment_url: 'https://www.onrc.ro',
        tip: 'Rezervarea se poate face și 100% online pe portalul ONRC.',
      },
      {
        order: 2,
        title: 'Pregătești actele constitutive și le autentifici',
        office: 'Birou Notarial',
        address: 'Orice birou notarial',
        hours: 'Luni–Vineri: 09:00–17:00',
        phone: 'Variabil',
        documents: [
          'Act constitutiv (îl generăm noi)',
          'Buletin asociați',
          'Dovada sediului social',
        ],
        fee: '200–400 RON',
        deadline: 'După rezervarea denumirii',
        form_type: null,
        payment_url: null,
        tip: null,
      },
    ],
  },
}

export function findProcedure(eventType: string): LifeEventProcedure | null {
  return LIFE_EVENTS[eventType] ?? null
}

export function detectEventType(message: string): string | null {
  const msg = message.toLowerCase()
  if (
    msg.includes('mașin') ||
    msg.includes('masin') ||
    msg.includes('auto') ||
    msg.includes('cumpărat') ||
    msg.includes('cumparat')
  )
    return 'bought_car'
  if (
    msg.includes('facultate') ||
    msg.includes('universitate') ||
    msg.includes('mut') ||
    msg.includes('cluj')
  )
    return 'moving_to_cluj'
  if (
    msg.includes('buletin') ||
    msg.includes('act de identitate') ||
    msg.includes('reînnoi') ||
    msg.includes('reinnoi') ||
    msg.includes('expirat')
  )
    return 'id_renewal'
  if (
    msg.includes('firmă') ||
    msg.includes('firma') ||
    msg.includes('pfa') ||
    msg.includes('srl') ||
    msg.includes('afacere')
  )
    return 'start_business'
  return null
}
