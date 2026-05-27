# -*- coding: utf-8 -*-
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Preformatted,
    Table, TableStyle, PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Font registration ────────────────────────────────────────────
FONT_PATHS = [
    ('C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/arialbd.ttf',
     'C:/Windows/Fonts/ariali.ttf', 'C:/Windows/Fonts/arialbi.ttf'),
    ('C:/Windows/Fonts/calibri.ttf', 'C:/Windows/Fonts/calibrib.ttf',
     'C:/Windows/Fonts/calibrii.ttf', 'C:/Windows/Fonts/calibriz.ttf'),
]

BODY_FONT = 'Helvetica'
BOLD_FONT = 'Helvetica-Bold'
ITALIC_FONT = 'Helvetica-Oblique'
CODE_FONT = 'Courier'

for reg_path, bold_path, italic_path, bolditalic_path in FONT_PATHS:
    if os.path.exists(reg_path):
        try:
            pdfmetrics.registerFont(TTFont('CustomFont', reg_path))
            pdfmetrics.registerFont(TTFont('CustomFont-Bold', bold_path))
            pdfmetrics.registerFont(TTFont('CustomFont-Italic', italic_path))
            BODY_FONT = 'CustomFont'
            BOLD_FONT = 'CustomFont-Bold'
            ITALIC_FONT = 'CustomFont-Italic'
            break
        except Exception:
            pass

# ── Colour palette ───────────────────────────────────────────────
BLUE       = colors.HexColor('#1a56db')
DARK_GRAY  = colors.HexColor('#374151')
LIGHT_GRAY = colors.HexColor('#f5f5f5')
BORDER_GRAY= colors.HexColor('#d1d5db')
SUMMARY_BG = colors.HexColor('#e8f4fd')
SUMMARY_BD = colors.HexColor('#3b82f6')
CODE_BG    = colors.HexColor('#f5f5f5')
CODE_BD    = colors.HexColor('#e5e7eb')
WHITE      = colors.white
BLACK      = colors.black

PAGE_W, PAGE_H = A4
LEFT_M = RIGHT_M = 2.2 * cm
TOP_M  = BOTTOM_M = 2.0 * cm

# ── Style sheet ──────────────────────────────────────────────────
def make_styles():
    s = {}

    s['title'] = ParagraphStyle(
        'DocTitle',
        fontName=BOLD_FONT, fontSize=26, leading=32,
        textColor=BLUE, alignment=TA_CENTER, spaceAfter=10
    )
    s['subtitle'] = ParagraphStyle(
        'DocSubtitle',
        fontName=BODY_FONT, fontSize=13, leading=18,
        textColor=DARK_GRAY, alignment=TA_CENTER, spaceAfter=6
    )
    s['cover_body'] = ParagraphStyle(
        'CoverBody',
        fontName=BODY_FONT, fontSize=11, leading=16,
        textColor=DARK_GRAY, alignment=TA_CENTER, spaceAfter=4
    )
    s['h1'] = ParagraphStyle(
        'H1',
        fontName=BOLD_FONT, fontSize=18, leading=24,
        textColor=BLUE, spaceBefore=18, spaceAfter=8
    )
    s['h2'] = ParagraphStyle(
        'H2',
        fontName=BOLD_FONT, fontSize=14, leading=20,
        textColor=DARK_GRAY, spaceBefore=12, spaceAfter=6
    )
    s['h3'] = ParagraphStyle(
        'H3',
        fontName=BOLD_FONT, fontSize=12, leading=17,
        textColor=DARK_GRAY, spaceBefore=8, spaceAfter=4
    )
    s['body'] = ParagraphStyle(
        'Body',
        fontName=BODY_FONT, fontSize=10.5, leading=15.5,
        textColor=BLACK, alignment=TA_JUSTIFY, spaceAfter=6
    )
    s['bullet'] = ParagraphStyle(
        'Bullet',
        fontName=BODY_FONT, fontSize=10.5, leading=15,
        textColor=BLACK, leftIndent=16, spaceAfter=3,
        bulletIndent=4
    )
    s['code_inline'] = ParagraphStyle(
        'CodeInline',
        fontName=CODE_FONT, fontSize=9, leading=13,
        textColor=colors.HexColor('#c0392b'), spaceAfter=4
    )
    s['summary_title'] = ParagraphStyle(
        'SummaryTitle',
        fontName=BOLD_FONT, fontSize=11, leading=16,
        textColor=BLUE, spaceAfter=4
    )
    s['summary_body'] = ParagraphStyle(
        'SummaryBody',
        fontName=BODY_FONT, fontSize=10.5, leading=15,
        textColor=DARK_GRAY, spaceAfter=3
    )
    s['toc_title'] = ParagraphStyle(
        'TocTitle',
        fontName=BOLD_FONT, fontSize=14, leading=20,
        textColor=BLUE, spaceAfter=8
    )
    s['toc_entry'] = ParagraphStyle(
        'TocEntry',
        fontName=BODY_FONT, fontSize=10.5, leading=16,
        textColor=BLACK, spaceAfter=3
    )
    return s

ST = make_styles()

# ── Helper builders ──────────────────────────────────────────────
def h1(text): return Paragraph(text, ST['h1'])
def h2(text): return Paragraph(text, ST['h2'])
def h3(text): return Paragraph(text, ST['h3'])
def p(text):  return Paragraph(text, ST['body'])
def sp(n=8):  return Spacer(1, n)
def hr():     return HRFlowable(width='100%', thickness=0.5, color=BORDER_GRAY, spaceAfter=8, spaceBefore=4)
def bullet(text): return Paragraph(u'•  ' + text, ST['bullet'])

def code_block(code_text):
    lines = code_text.strip()
    t = Table(
        [[Preformatted(lines, ParagraphStyle(
            'CB', fontName=CODE_FONT, fontSize=8.5, leading=12.5,
            textColor=colors.HexColor('#1f2937')
        ))]],
        colWidths=[PAGE_W - LEFT_M - RIGHT_M - 0.4*cm]
    )
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
        ('BOX', (0,0), (-1,-1), 0.7, CODE_BD),
        ('LEFTPADDING',  (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING',   (0,0), (-1,-1), 8),
        ('BOTTOMPADDING',(0,0), (-1,-1), 8),
    ]))
    return t

def summary_box(title, items):
    content = [Paragraph(u'✨  ' + title, ST['summary_title'])]
    for item in items:
        content.append(Paragraph(u'✓  ' + item, ST['summary_body']))
    t = Table([[content]], colWidths=[PAGE_W - LEFT_M - RIGHT_M - 0.4*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), SUMMARY_BG),
        ('BOX', (0,0), (-1,-1), 1.0, SUMMARY_BD),
        ('LEFTPADDING',  (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
        ('TOPPADDING',   (0,0), (-1,-1), 10),
        ('BOTTOMPADDING',(0,0), (-1,-1), 10),
    ]))
    return t

def info_box(items):
    rows = [[Paragraph(k, ParagraphStyle('IK', fontName=BOLD_FONT, fontSize=10, textColor=DARK_GRAY)),
             Paragraph(v, ParagraphStyle('IV', fontName=BODY_FONT, fontSize=10, textColor=BLACK))]
            for k, v in items]
    cw = [4*cm, PAGE_W - LEFT_M - RIGHT_M - 4*cm - 0.4*cm]
    t = Table(rows, colWidths=cw)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_GRAY),
        ('BOX', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('INNERGRID', (0,0), (-1,-1), 0.3, BORDER_GRAY),
        ('LEFTPADDING',  (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING',   (0,0), (-1,-1), 5),
        ('BOTTOMPADDING',(0,0), (-1,-1), 5),
    ]))
    return t

# ════════════════════════════════════════════════════════════════
# CHAPTER CONTENT FUNCTIONS
# ════════════════════════════════════════════════════════════════

def cover_page():
    elems = []
    elems.append(sp(80))
    elems.append(Paragraph("eCetatean", ST['title']))
    elems.append(Paragraph("Tanulasi Utmutato", ST['title']))
    elems.append(sp(12))
    elems.append(hr())
    elems.append(sp(10))
    elems.append(Paragraph("Egy 48 oras hackathon projekt teljes megertese", ST['subtitle']))
    elems.append(sp(30))
    elems.append(Paragraph("Tartalomjegyzek:", ST['cover_body']))
    elems.append(sp(6))
    chapters = [
        "1. Hogyan mukodik egy modern webalkalmazas?",
        "2. TypeScript alapok",
        "3. React 19 es komponensek",
        "4. UI reteg: Tailwind CSS es shadcn/ui",
        "5. Backend: Hono.js es REST API-k",
        "6. Adatbazis: Supabase es PostgreSQL",
        "7. Autentikacio",
        "8. AI integracios",
        "9. PDF generalas",
        "10. Biztonsag es audit",
        "11. Deployment",
        "12. Osszefoglalas es kovetkezo lepesek",
    ]
    for ch in chapters:
        elems.append(Paragraph(ch, ST['cover_body']))
    elems.append(sp(40))
    elems.append(hr())
    elems.append(Paragraph("eCetatean — Hackathon 2024-2025  |  Cluj-Napoca, Romania", ST['cover_body']))
    elems.append(PageBreak())
    return elems

def chapter1():
    e = []
    e.append(h1("1. fejezet: Hogyan mukodik egy modern webalkalmazas?"))
    e.append(p(
        "Mielott belemerulnenk a kodba, ertsuk meg az alapokat. Egy modern webalkalmazas harom nagy "
        "reszbol all: a <b>frontend</b> (amit a felhasznalo lat), a <b>backend</b> (amit a szerver "
        "vegez), es az <b>adatbazis</b> (ahol az adatok tartosan tarolodnak). Az eCetatean projekt "
        "mindharem komponenst hasznalja, es a fejlesztok tudatosan valasztottak el ezeket egymastol."
    ))

    e.append(h2("1.1 Kliens-szerver modell es a HTTP kerelem-valasz ciklus"))
    e.append(p(
        "Kepzelj el egy ettermet. A vendeg (kliens = bongeszod) rendel valamit, a pincer (HTTP protokoll) "
        "tovabbitja a konyhanak (szerver), ahol elkeszul az etel (valasz), majd visszakeruel a vendeghez. "
        "Az internet PONTOSAN igy mukodik."
    ))
    e.append(p(
        "A HTTP (HyperText Transfer Protocol) egy szovegalapU protokoll, amellyel a bongeszo es a "
        "szerver kommunikal. Minden HTTP kerelem tartalmaz:"
    ))
    e.append(bullet("Metodus: GET (lekerdezes), POST (kuldendo adat), PUT/PATCH (frissites), DELETE (torles)"))
    e.append(bullet("URL: hova kuldjuk a keremet (pl. https://api.ecetatean.ro/api/profile)"))
    e.append(bullet("Header-ok: plusz informaciok (Authorization, Content-Type stb.)"))
    e.append(bullet("Body (teszt): az elkuldott adatok (pl. JSON formaban)"))
    e.append(p(
        "A valasz tartalmaz egy <b>statusz kodot</b> (200 = OK, 201 = Letrehozva, 400 = Hibas kerelem, "
        "401 = Nem autentikalt, 404 = Nem talalhato, 500 = Szerver hiba) es egy <b>body</b>-t (a valasz adata)."
    ))

    e.append(h2("1.2 Mi a JSON es miert hasznaljak az API-k?"))
    e.append(p(
        "A JSON (JavaScript Object Notation) egy emberi szemmel is olvasható adatformat. Az eCetatean "
        "backend minden API valaszt JSON-ban kuldoz vissza. Peldaul:"
    ))
    e.append(code_block("""{
  "success": true,
  "data": {
    "full_name": "Kovacs Janos",
    "cnp": "1850312123456",
    "city": "Cluj-Napoca",
    "email": "kovacs@example.com"
  }
}"""))
    e.append(p(
        "A JSON elonyei: konnyen parszealhato minden programozasi nyelvben, ember altal olvasható, "
        "kicsi a merete, es a JavaScript nativan tamogatja (hiszen onnan szarmazik a nev is)."
    ))

    e.append(h2("1.3 Miert vannak elvalasztva a frontend es a backend?"))
    e.append(p(
        "Az eCetatean projektben a frontend es a backend ket kulonallo alkalmazas, kulonbozo "
        "helyen telepitve. Ennek tobb oka van:"
    ))
    e.append(bullet(
        "<b>Kulonbozo deployment helyek:</b> A frontend Cloudflare Workers-en fut (globalis CDN), "
        "a backend Vercel-en (serverless). Igy a frontend gyorsan betoltodik barhan a vilagon."
    ))
    e.append(bullet(
        "<b>Kulonbozo aggodalmak (separation of concerns):</b> A frontend a megjelenitessel "
        "foglalkozik (UI), a backend az uzleti logikával. Ha ujratervezed a gombot, nem kell "
        "hozzanyulni az adatbazishoz."
    ))
    e.append(bullet(
        "<b>Skalazhatasag:</b> Ha sok felhasznalo van, a backendbol tobb peldanyt indithatunk el "
        "anelkul, hogy a frontendhez nyulnank."
    ))
    e.append(bullet(
        "<b>Biztonsag:</b> Az adatbazis tikos kulcsok csak a backenden talalhatok, soha nem "
        "kerul a bongeszohoz."
    ))

    e.append(h2("1.4 Az eCetatean architektura"))
    e.append(info_box([
        ("Frontend", "React 19 + TanStack Router, Cloudflare Workers-en (wrangler deploy)"),
        ("Backend",  "Hono.js + TypeScript, Vercel serverless functions-on"),
        ("Adatbazis","Supabase PostgreSQL (PostgREST API + Auth + Storage)"),
        ("AI",       "Anthropic Claude Sonnet 4.6 (elsobbseg) vagy Google Gemini 2.0 Flash (backup)"),
        ("PDF",      "@pdfme/pdf-lib + pdf-lib: PDF kitoltes es generalas"),
    ]))
    e.append(sp(8))
    e.append(p(
        "Az adatfolyam a kovetkezo: a bongeszo HTTP kerelmet kuldoz a Cloudflare Workers-en futó "
        "React alkalmazasnak, amely megjeleniti a UI-t. Amikor adatra van szukseg, a React "
        "fetch()-hivas utjan kommunikal a Vercel-en futó Hono.js backenddel, amely "
        "Supabase-t hasznal az adatok tarolasara es lekeresere."
    ))

    e.append(h2("1.5 A tenyleges fetch hivas a frontendben"))
    e.append(p(
        "Lassuk meg a frontend/src/lib/api.ts fajlban, hogyan zajlik egy tenyleges HTTP kerelem:"
    ))
    e.append(code_block("""// frontend/src/lib/api.ts
async function request<T>(
  path: string,
  init: RequestInit,
  getToken: GetToken,
): Promise<T> {
  const base = getApiBaseUrl();   // pl. https://api.ecetatean.ro
  const url = `${base}${path}`;  // pl. https://api.ecetatean.ro/api/profile

  const token = await getToken(); // JWT token lekerdezese Supabase Auth-tol
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Minden kereshez hozzaadjuk: Authorization: Bearer eyJhbGci...

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
    // fetch() = beepitett bongeszo API, HTTP keremet kuld
  } catch (err) {
    throw buildFetchError(err);  // Halozati hiba kezelese
  }

  // Ha PDF-et varunk, kulon kezeljuk
  if (contentType.includes("application/pdf")) {
    return (await response.blob()) as unknown as T;
  }

  // Alap eset: JSON valasz parszelasa
  body = await response.json() as Envelope<T>;
  if (!body || body.success === false) {
    throw new ApiError(response.status, body.error);
  }
  return body.data;  // Csak a "data" mezot adjuk vissza
}"""))
    e.append(p(
        "Figyeld meg: minden kereshez automatikusan hozzaadjuk a JWT tokent az Authorization "
        "headerben. Igy a backend tudja ki kuldote a keremet. Az Envelope<T> tipus azt jelenti, "
        "hogy a backend mindig { success: true, data: T } vagy { success: false, error: string } "
        "formatban valaszol."
    ))

    e.append(h2("1.6 Egy valodi HTTP endpoint a backenden"))
    e.append(p(
        "Most nezzuk meg a backend/src/routes/profile.ts fajlban, hogyan valaszol a szerver "
        "a GET /api/profile keresre:"
    ))
    e.append(code_block("""// backend/src/routes/profile.ts
profileRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  // requireAuth middleware mar ellenorizte a JWT tokent
  // es beallitozta a userId-t a kontextusban

  const { data, error } = await supabaseAdmin
    .from('profiles')           // 'profiles' tabla kivalasztasa
    .select('full_name, cnp, ...') // Csak a szukseges mezok
    .eq('user_id', userId)      // WHERE user_id = ?
    .maybeSingle()              // Max 1 sort varunk vissza

  if (error) {
    return c.json({ success: false, error: 'Hiba...' }, 500)
  }

  return c.json({ success: true, data: data ?? null })
  // 200 OK HTTP statusz + JSON valasz
})"""))
    e.append(p(
        "Az egesz folyamat: (1) Bongeszo GET /api/profile kuldese JWT-vel, "
        "(2) requireAuth middleware ellenorzi a tokent, (3) Supabase SQL "
        "lekerdezes vegrehajtas, (4) JSON valasz visszakuldese. Mindez tipikusan "
        "50-200ms alatt megy vegbe."
    ))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A webalkalmazasok kliens-szerver modellre epulnek: a bongeszo HTTP keremeket kuld a szervernek",
        "A JSON az API-k altalanos adatformatja: ember altal olvasható, konnyen feldolgozhato",
        "Az eCetatean frontend (Cloudflare) es backend (Vercel) el van valasztva biztonsagi es skalazasi okokbol",
        "A frontend fetch() hivassal kommunikal a backenddel, JWT tokent kuldve minden keresben",
        "A backend Hono.js routeok feldolgozzak a keremet, lekerdezik az adatbazist, es JSON-ban valaszolnak",
    ]))
    e.append(PageBreak())
    return e

def chapter2():
    e = []
    e.append(h1("2. fejezet: TypeScript alapok"))
    e.append(p(
        "Az eCetatean projekt 100%-ban TypeScript-ben irt -- mind a frontend, mind a backend. "
        "Ez nem veletlen: a TypeScript a JavaScript egy bovitmenye, amely statikus tipusossat "
        "teszi a nyelvet. Ez azt jelenti, hogy a hibak egy resze mar forditaskor kiderul, nem "
        "csak futasidoyben."
    ))

    e.append(h2("2.1 Miert TypeScript, nem JavaScript?"))
    e.append(p(
        "Kepzelj el egy fuggvenyt, amely egy profil objektumot kap paramleterul. JavaScript-ben "
        "semmit sem tudunk a parametervrol -- lehet string, lehet null, lehet hianyzni is. "
        "TypeScript-ben viszont:"
    ))
    e.append(code_block("""// JavaScript - nincs tipusinformacio
function greetUser(profile) {
  return "Buna, " + profile.full_name  // Mi van ha full_name null?
}

// TypeScript - a fordito ellenorzi
function greetUser(profile: Profile): string {
  return "Buna, " + (profile.full_name ?? "cetatenean")
  // A fordito tudja, hogy full_name string | null
  // es figyelmezteti, ha nem kezeled a null esetet
}"""))
    e.append(p(
        "A TypeScript elonyei a projektben: <b>Forditasi hiba</b> jelzi ha rossz mezonevet irsz "
        "(pl. profil.fulNname helyett), <b>Autocompletion</b> az IDE-ben (pontosan tudja milyen "
        "mezok vannak), <b>Ondetektalo kod</b> (a tipusdefiniciok dokumentaciot is szolgalnak)."
    ))

    e.append(h2("2.2 A TypDefiniciok a projektben"))
    e.append(p(
        "A backend/src/types/index.ts fajl tartalmazza az osszes fontos tipus definiciot. "
        "Nezzuk meg a Profile interfacet:"
    ))
    e.append(code_block("""// backend/src/types/index.ts
export interface Profile {
  id: string           // UUID, sohasem null - minden profilnak van
  user_id: string      // A Supabase Auth user azonositoja
  full_name: string | null   // | null = opcionalis mezo, lehet hianyzo
  cnp: string | null         // Roman szemelyi szam (13 szamjegy)
  date_of_birth: string | null  // ISO datum: "1985-03-12"
  buletin_series: string | null // Szemelyigazolvany sorozat: pl. "KX"
  buletin_number: string | null // Szemelyigazolvany szam: pl. "123456"
  buletin_expiry: string | null // Lejarat datuma
  address: string | null        // Lakcim
  city: string                  // Varos, NOT NULL, default 'Cluj-Napoca'
  phone: string | null
  email: string | null
  language: 'ro' | 'hu'  // Union tipus! Csak 'ro' vagy 'hu' lehet
  created_at: string     // ISO timestamp
  updated_at: string
}"""))
    e.append(p(
        "Figyeld meg a `language: 'ro' | 'hu'` sort -- ez egy <b>union tipus</b>. A fordito "
        "nem engedi, hogy mas erteket adj meg. Ha megprobalnals `language: 'en'` irni, "
        "forditasi hibat kapsz."
    ))

    e.append(h2("2.3 A Vehicle interface"))
    e.append(code_block("""export interface Vehicle {
  id: string
  user_id: string
  plate_number: string      // Kotelez! Minden jarmunek kell rendszam
  make: string | null       // Marka (pl. "Dacia")
  model: string | null      // Modell (pl. "Logan")
  year: number | null       // Szam tipusa! Nem string
  engine_cc: number | null  // Hengerurtartalom kubikcentiméterben
  fuel_type: string | null  // "benzin", "diesel", "electric"
  color: string | null
  vin: string | null        // Alvazszam (17 karakter)
  itp_expiry: string | null // ITP lejartat datuma
  rca_expiry: string | null // Kotelez biztositas lejarata
  impozit_amount: number | null  // Adosszeg RON-ban
  created_at: string
}"""))
    e.append(p(
        "Az `year: number | null` kulcsfontos: ha ezt `string | null`-nak definialnad, "
        "matematikai muveleteket nem lehetne rajta vegezni. A TypeScript tipus rendszer "
        "kenyszeri a helyes adattipus hasznalatat."
    ))

    e.append(h2("2.4 AuditActionType - Union tipus"))
    e.append(code_block("""// backend/src/types/index.ts
export type AuditActionType =
  | 'login'
  | 'profile_updated'
  | 'vehicle_added'
  | 'vehicle_updated'
  | 'pdf_generated'
  | 'report_submitted'
  | 'chat_session'
  | 'life_event_started'
  | 'life_event_step_completed'
  | 'payment_handoff_started'
  | 'translation_document_completed'
  // ... es tovabbi tipusok

// Hasznalat:
writeAuditEntry({
  userId,
  action: 'Profil frissitve',
  actionType: 'profile_updated',  // Csak ezek a string ertekek ervenyek!
  data: { ... }
})"""))
    e.append(p(
        "Ez a Pattern rendkivul ertekes: ha uj audit tip hozzaadsz, a fordito megmondja "
        "minden helyet ahol kezelni kell. Nem lehet elfelejteni."
    ))

    e.append(h2("2.5 Interface vs Type kulonbseg"))
    e.append(p(
        "Az eCetatean-ben mindkettot hasznaljak. A gyakorlati kulonbseg:"
    ))
    e.append(code_block("""// Interface - bovitheto (extends, implements)
interface Profile { full_name: string | null }
interface ExtendedProfile extends Profile {
  avatar_url: string  // + uj mezo
}

// Type alias - rugalmasabb, union/intersection lehetseges
type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
type ApiResponse<T> = ApiSuccess<T> | ApiError  // Generic union"""))

    e.append(h2("2.6 Generikus tipusok a projektben"))
    e.append(code_block("""// backend/src/types/index.ts
export interface ApiSuccess<T> {
  success: true
  data: T       // T = barmi lehet (Profile, Vehicle[], stb.)
}

export interface ApiError {
  success: false
  error: string
  code?: string   // ? = opcionalis mezo
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// Pelda hasznalat:
const profileResponse: ApiResponse<Profile> = {
  success: true,
  data: { full_name: "Kovacs Janos", ... }
}
// TypeScript tudja: ha success===true, akkor data Profile tipusu"""))

    e.append(h2("2.7 Hogyan hasznaljak a tipusokat a route-okban?"))
    e.append(code_block("""// backend/src/routes/profile.ts
import type { Profile } from '../types'

profileRoute.post('/', requireAuth, async (c) => {
  let body: Partial<Profile>  // Partial<T> = minden mezo opcionalis
  try {
    body = await c.req.json()  // TypeScript tudja a tipust
  } catch {
    return c.json({ success: false, error: '...' }, 400)
  }

  const row = {
    user_id: userId,
    full_name: body.full_name ?? null,
    // body.full_name tipusa: string | null | undefined
    // ?? null: ha undefined, legyen null (adatbazis kompatibilis)
    city: body.city ?? 'Cluj-Napoca',
    // Ha nincs megadva varos, legyen Cluj-Napoca alapertelmezett
  }
})"""))
    e.append(p(
        "A `Partial<Profile>` TypeScript beepitett utility tipus: az eredeti interface "
        "osszes mezojat opcionalissa teszi. Ez tokeletesen illeszkedik ahhoz, hogy a "
        "felhasznalo nem koteles minden mezot kitolteni."
    ))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A TypeScript statikus tipusossagot ad a JavaScript-hez: hibak forditaskor derulnek ki",
        "Az interface-k leirjak az objektumok alakjat: Profile, Vehicle, AuditEntry stb.",
        "A '| null' azt jelenti: a mezo lehet szoveg vagy null (opcionalis adat)",
        "Az union tipusok ('ro' | 'hu') korlatozzak az ervenyes ertekeket",
        "A generikus tipusok (ApiResponse<T>) ujrafelhasznalhato sablonak",
        "A Partial<T> minden mezot opcionalissa tesz - hasznos frissiteseknel",
    ]))
    e.append(PageBreak())
    return e

def chapter3():
    e = []
    e.append(h1("3. fejezet: React 19 es komponensek"))
    e.append(p(
        "A frontend React 19-et hasznal -- a Facebook altal letrehozott UI konyvtar legujabb "
        "verziojavat. A React alapotlete egyszerU: a UI fuggvenyekbol all, amelyek adatot "
        "kapnak (props) es HTML-t adnak vissza (JSX). Ha az adat valtozik, a React automatikusan "
        "ujrarendereli az erintett reszeket."
    ))

    e.append(h2("3.1 Mi az a React komponens?"))
    e.append(code_block("""// Egy egyszeru React komponens
function ProfileCard({ name, city }: { name: string; city: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <h2 className="font-bold text-lg">{name}</h2>
      <p className="text-gray-500">{city}</p>
    </div>
  )
}

// Hasznalat mas komponensben:
<ProfileCard name="Kovacs Janos" city="Cluj-Napoca" />"""))
    e.append(p(
        "A JSX (JavaScript XML) elso ranezesre HTML-nek tunik, de valojaban JavaScript. "
        "A {} jelek kozott barmi JavaScript kifejezest beirhatsz. A `className` az oka "
        "miert nem egyszeruen `class`: a `class` foglalt szo JavaScriptben."
    ))

    e.append(h2("3.2 A Protected komponens - Vedetem utvonal"))
    e.append(p(
        "A frontend/src/lib/auth-guard.tsx tartalmazza a route vedelmere hasznalt "
        "komponenst, amely pontosan mutatja a React mukodeset:"
    ))
    e.append(code_block("""// frontend/src/lib/auth-guard.tsx
export function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  // useAuth() = custom hook, visszaadja a bejelentkezesi allapotot

  if (!isLoaded) {
    // Meg toltodik - mutassunk egy loading UI-t
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <div className="anim-typing flex gap-1.5 items-center">
          <span className="w-2 h-2 rounded-full bg-text-tertiary" />
          <span className="w-2 h-2 rounded-full bg-text-tertiary" />
          <span className="w-2 h-2 rounded-full bg-text-tertiary" />
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/auth" replace />
    // Nem bejelentkezett? Atiranyitas a bejelentkezesi oldalra
  }

  return <>{children}</>
  // Bejelentkezett! Megjeleniti a gyerek komponenseket
}"""))

    e.append(h2("3.3 useState: lokalis allapot"))
    e.append(p(
        "A `useState` hook lehetove teszi, hogy egy komponens 'emlekezzen' valamire "
        "ujrarendereles kozott. Az auth.tsx fajlban latnio ezt:"
    ))
    e.append(code_block("""// frontend/src/routes/auth.tsx
function Auth() {
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  // tab: aktualis ertek, "signin" az alapertelmezett
  // setTab: fuggveny az ertek megvaltoztatasara

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Amikor setTab("signup") hivodik, React ujrarendereli
  // a komponenst, es a tab erteke "signup" lesz

  return (
    <div>
      <button onClick={() => setTab("signin")}>Bejelentkezes</button>
      <button onClick={() => setTab("signup")}>Regisztracio</button>
      {/* Felteteles rendereles: */}
      {tab === "signin" ? <SignInForm /> : <SignUpForm />}
    </div>
  )
}"""))

    e.append(h2("3.4 useEffect: mellekhatások kezelese"))
    e.append(p(
        "A `useEffect` hook lehetove teszi, hogy a komponens reagaljon valtozasokra "
        "es mellekhatásokat hajtson vegre (API hivások, DOM manipulacio, timers stb.). "
        "A chat.tsx fajlban:"
    ))
    e.append(code_block("""// frontend/src/routes/chat.tsx
useEffect(() => {
  if (profileLoading) return  // Meg toltodik, varjunk

  if (conversationId) {
    if (convLoading) return
    if (hydratedRef.current === conversationId) return
    if (convData) {
      // Betoltott beszelgetes uzeneteit beallitozza
      const mapped = storedMessagesToMsgs(convData.messages)
      setMsgs(mapped.length > 0 ? mapped : [buildGreeting(displayName)])
      hydratedRef.current = conversationId
    }
    return
  }

  // Uj beszelgetes: udvozlo uzenet
  hydratedRef.current = null
  setMsgs((prev) => {
    if (prev.length > 1) return prev
    return [buildGreeting(displayName)]
  })
}, [conversationId, convData, convLoading, displayName, profileLoading])
// A tombbeli ertekek a 'fuggosegek': ha barmelyik valtozik,
// az useEffect ujra lefut"""))

    e.append(h2("3.5 Custom hook: useProfile"))
    e.append(p(
        "A custom hook-ok egyszeruen fuggvenyek, amelyek mas hook-okat hasznalnak. "
        "A frontend/src/lib/api-hooks.ts fajlban:"
    ))
    e.append(code_block("""// frontend/src/lib/api-hooks.ts
export function useProfile() {
  const getToken = useGetToken()
  const { isSignedIn, userId } = useAuth()

  return useQuery({
    // TanStack Query: adatletoltes + cacheles
    queryKey: ["profile", userId],
    // Egyedi azonosito: ha mar letoltottuk, cache-bol jon vissza
    queryFn: () => apiGet<CitizenProfile | null>("/api/profile", getToken),
    // Csak ha be van jelentkezve futtassa a kerdest
    enabled: !!isSignedIn && !!userId,
  })
}

// Hasznalat barmely komponensben:
function Home() {
  const { data: profile, isLoading } = useProfile()
  // data = CitizenProfile | null
  // isLoading = true amig toltodik
  if (isLoading) return <Spinner />
  return <div>{profile?.full_name}</div>
}"""))
    e.append(p(
        "A TanStack Query automatikusan cacheli az adatot, ujra letolti ha szukseges, "
        "es kezeli a betoltesi es hibaallapotokat. Nini, nincs szukseg useEffect + useState "
        "kombinaciora! Ez a modern React fejlesztes elonye."
    ))

    e.append(h2("3.6 TanStack Router: fajl-alapu routing"))
    e.append(p(
        "A projekt TanStack Router-t hasznal, ahol az utvonalak fajlok. A "
        "frontend/src/routes/ mappaban minden fajl egy URL-nek felel meg:"
    ))
    e.append(code_block("""// A fajl neve hatarozza meg az URL-t:
// routes/home.tsx        => /home
// routes/chat.tsx        => /chat
// routes/auth.tsx        => /auth
// routes/profile.tsx     => /profile
// routes/documents.tsx   => /documents

// A route definicioja a fajlban:
// frontend/src/routes/chat.tsx
export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "ClaudIA -- eCetatean" }] }),
  component: () => (
    <Protected>
      <Chat />
    </Protected>
  ),
})"""))
    e.append(p(
        "A `Protected` wrapper ellenorzi, hogy be van-e jelentkezve a felhasznalo. "
        "Ha nem, automatikusan atiranyitja a /auth oldalra."
    ))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A React komponens egy fuggveny amely JSX-et ad vissza (mint HTML, de valojaban JavaScript)",
        "A Props lehetove teszi az adatok lefele aramlasat a szulo komponstol a gyerekig",
        "A useState az adatok 'emlekezete': ha valtozik, a komponens ujrarenderelodik",
        "A useEffect mellekhatásokra reagal: API hivások, betoltes, stb.",
        "A custom hook-ok (useProfile, useNews) ujrafelhasznalhato adatlogikat csoportositanak",
        "A TanStack Router fajl-alapu routingot nyujt: minden fajl = egy URL",
    ]))
    e.append(PageBreak())
    return e

def chapter4():
    e = []
    e.append(h1("4. fejezet: UI reteg: Tailwind CSS es shadcn/ui"))
    e.append(p(
        "Az eCetatean UI realistikus, modern kinezetu mobilalkalmazast utanoz, tele "
        "animaciokkal es aternyezo dizajnelemekkel. Ennek ket fo eszkoze a "
        "<b>Tailwind CSS</b> es a <b>shadcn/ui</b> konyvtar."
    ))

    e.append(h2("4.1 Tailwind CSS: utility-first megkozelites"))
    e.append(p(
        "A hagyomanyos CSS-ben kulsz fajlokat irsz es osztaly neveket adasz az elemeknek. "
        "A Tailwind mas utat jart: minden stilus egy kis utility osztaly. Ehelyett, hogy "
        "`.card { border-radius: 16px; padding: 16px; }` irsz, az osztalyokat kozvetlenul "
        "az elemre rakodd:"
    ))
    e.append(code_block("""// Tailwind osztalyok a home.tsx-bol:
<button
  onClick={() => nav({ to: a.to as "/chat" })}
  className="press flex items-center gap-3 px-4 py-3.5 rounded-2xl
             border border-border bg-surface shadow-card
             hover:shadow-elevated transition-shadow text-left"
>

// Osztaly magyarazat:
// press          = custom: lenyomashatosag vizualis visszajelzese
// flex           = display: flex (flexbox)
// items-center   = align-items: center (vertikalis kozepre)
// gap-3          = rem egysegekben koz a flex gyermekek kozott
// px-4           = padding balra-jobbra 1rem
// py-3.5         = padding fel-le 0.875rem
// rounded-2xl    = border-radius 1rem (16px)
// border         = border: 1px solid
// border-border  = custom szin a border-ra (CSS variable)
// bg-surface     = hattar szin (CSS variable, vilagos/sotet tema)
// shadow-card    = arnyekozas (custom CSS variable)
// hover:shadow-elevated = hover allapotban nagyobb arnyekozas
// transition-shadow = animalt atvaltas"""))
    e.append(p(
        "A Tailwind fobb elonyei: nem kell nevet kitalalni CSS osztalyoknak, nem no a CSS fajl "
        "merete (csak a hasznalt osztalyok kerulnek be a bundle-be), es a stilus kozvetlenul "
        "latszik a JSX-ben -- nincs konstans fajlvaltogatas."
    ))

    e.append(h2("4.2 Tobbszoros Tailwind osztaly kombinacio"))
    e.append(p(
        "A home.tsx FeatureGrid komponenseben latszik a bonyolultabb hasznalat:"
    ))
    e.append(code_block("""// frontend/src/routes/home.tsx - FeatureGrid
<motion.button
  key={card.id}
  onClick={() => onCardClick(card.id)}
  className={cn(
    "press rounded-[20px] bg-gradient-to-br text-left flex flex-col",
    "border border-black/[0.07] shadow-card overflow-hidden",
    card.bgClass,  // Dinamikus: "from-[#0E7C66]/10 to-[#0E7C66]/4"
  )}
  style={{ aspectRatio: "196 / 230", color: card.accentColor }}
  aria-label={`Deschide ${card.title}`}
>

// cn() = class merging utility (clsx + tailwind-merge)
// Ha ellentmondo osztalyok vannak, az utolso nyer
// rounded-[20px] = tetszoleges ertek szogletes zarojellel"""))

    e.append(h2("4.3 shadcn/ui: Radix UI alapu komponensek"))
    e.append(p(
        "A shadcn/ui nem egy hagyomanyos konyvtar -- nem telepitod npm-mel, hanem a "
        "komponensek forraskodjat masolved a projektbe. Ezek a Radix UI primitiveire "
        "epulnek, amelyek accessibility-t (ARIA attributumok, keyboard navigacio) "
        "biztositanak. A home.tsx-ban lathato Dialog komponens:"
    ))
    e.append(code_block("""// frontend/src/routes/home.tsx - QuickActionSheet
import * as Dialog from "@radix-ui/react-dialog"

function QuickActionSheet({ cardId, onClose }) {
  return (
    <Dialog.Root open={!!cardId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Overlay: sotet hattar */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" />
        {/* Content: a panel maga */}
        <Dialog.Content asChild>
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={slideUpSheet}  // Framer Motion animacio
            className="fixed bottom-0 left-0 right-0 z-50
                       bg-surface rounded-t-[22px] shadow-sheet"
          >
            <Dialog.Close className="press ml-auto w-8 h-8 rounded-full ...">
              <X size={15} />
            </Dialog.Close>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}"""))
    e.append(p(
        "A Radix Dialog automatikusan: (1) focus trapping (fókusz a dialogon belul marad), "
        "(2) Escape gombon becsukodik, (3) ARIA attributumok (role, aria-modal), "
        "(4) scroll lock. Mindezt elerjuk anelkul, hogy magunk megirnenk."
    ))

    e.append(h2("4.4 Framer Motion animaciok"))
    e.append(p(
        "A projekt Framer Motion-t hasznal animaciokhoz. A motion elemek css transition "
        "helyett JavaScript-alapu animaciot hasznalnak, amely komplexebb effektusokat tesz lehetove:"
    ))
    e.append(code_block("""// frontend/src/lib/motion.ts (valoszinusitheto tartalma)
export const slideUpSheet = {
  hidden: { y: "100%", opacity: 0 },      // Kiindulo allapot
  visible: {
    y: 0, opacity: 1,                      // Vegso allapot
    transition: { type: "spring",          // Rugoszeru animacio
                  damping: 25, stiffness: 300 }
  }
}

// Hasznalat:
<motion.div
  initial="hidden"    // Mikor megjelenik: hidden-bol indul
  animate="visible"   // Animate to visible allapot
  exit="hidden"       // Mikor eltavozik: visszamegy hidden-be
  variants={slideUpSheet}  // A fenti animacio definicio
>"""))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A Tailwind CSS utility osztályokat hasznal CSS fajlok helyett: minden stilus az elemnel van",
        "A cn() fuggveny okosan egyesiti a Tailwind osztalyokat (clsx + tailwind-merge)",
        "A shadcn/ui accessibility-t kapunk ingyen: keyboard navigacio, ARIA, focus management",
        "A Radix UI primitives az accessibility ret alapja (Dialog, Dropdown, Tooltip stb.)",
        "A Framer Motion spring-alapu animaciokat tesz lehetove deklarativ modon",
    ]))
    e.append(PageBreak())
    return e

def chapter5():
    e = []
    e.append(h1("5. fejezet: Backend: Hono.js es REST API-k"))
    e.append(p(
        "A backend egy HTTP szerver, amely 3001-es porton hallgat (fejlesztesben), "
        "vagy Vercel serverless functionkent fut (produkcioban). A Hono.js egy "
        "ultrakonnyu TypeScript web framework, amely kifejezetten edge environment-ekre "
        "(Cloudflare Workers, Vercel Edge) terveztek."
    ))

    e.append(h2("5.1 Mi a web szerver?"))
    e.append(p(
        "Egy web szerver egy program, amely hallgat egy portot, fogadja a HTTP kereseket, "
        "es valaszol rajuk. Az eCetatean backend Node.js-ben fut, de Vercel-en "
        "serverless funkciokkent deployol. Minden egyes API kerelem egy uj 'szalat' indit el."
    ))

    e.append(h2("5.2 A Hono.js app setup (backend/src/index.ts)"))
    e.append(code_block("""// backend/src/index.ts - A teljes szerver beleptesi pontja
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { corsMiddleware } from './middleware/cors'
import { claudiaRoute } from './routes/claudia'
import { profileRoute } from './routes/profile'
// ... tovabbi route import-ok

const app = new Hono()

// ---- Globalis Middleware -----------------------------------------
app.use('*', logger())         // Minden kereset naploz (URL, ido, statusz)
app.use('*', corsMiddleware)   // CORS headerek hozzaadasa

// ---- Route-ok regisztralalasa -----------------------------------
app.route('/api/claudia', claudiaRoute)    // AI chat
app.route('/api/profile', profileRoute)   // Profil CRUD
app.route('/api/vehicles', vehiclesRoute) // Jarmu kezeles
app.route('/api/pdf', pdfRoute)           // PDF generalas
app.route('/api/news', newsRoute)         // Hirek
// ... tovabbi route-ok

// ---- 404 Handler ------------------------------------------------
app.notFound((c) => c.json({ success: false, error: 'Endpoint negasit' }, 404))

// ---- Hibakezeles ------------------------------------------------
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ success: false, error: 'Eroare interna' }, 500)
})

// ---- Helyi fejleszto szerver inditas ----------------------------
if (process.env.VERCEL !== '1') {
  const port = Number(process.env.PORT ?? 3001)
  import('@hono/node-server').then(({ serve }) => {
    serve({ fetch: app.fetch, port })
    console.log(`eCetatean API listening on http://localhost:${port}`)
  })
}

export default app  // Vercel ezt a modult importalja"""))
    e.append(p(
        "A `process.env.VERCEL !== '1'` ellenorzes kulcsfontossagu: Vercel-en NEM kell "
        "portot nyitni, mert a platform maga kezeli a HTTP hallgatast. Az `export default app` "
        "sorral Vercel azt kapja, amire szuksege van: a Hono app `fetch` metodusat."
    ))

    e.append(h2("5.3 REST API konvenciok"))
    e.append(info_box([
        ("GET /api/vehicles",     "Osszes jarmU listazasa (olvasas)"),
        ("POST /api/vehicles",    "Uj jarmu letrehozasa (body-ban az adatok)"),
        ("PATCH /api/vehicles/:id","Jarmu frissitese (reszleges)"),
        ("DELETE /api/vehicles/:id","Jarmu torlese"),
        ("GET /api/profile",      "Sajat profil lekerese"),
        ("POST /api/profile",     "Profil mentese/frissitese"),
    ]))
    e.append(sp(6))
    e.append(p(
        "Az `:id` egy URL parameter -- a Hono `c.req.param('id')`-vel eri el. "
        "Peldaul: `PATCH /api/vehicles/abc-123-def` esetenv az `id` erteke `abc-123-def`."
    ))

    e.append(h2("5.4 Jarmu endpoint -- teljes peldaval"))
    e.append(code_block("""// backend/src/routes/vehicles.ts
vehiclesRoute.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  // userId-t a requireAuth middleware allitotta be (JWT alapjan)

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: [] })
    // Ha nincs adatbazis, ures tombot adunk vissza
  }

  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .select('id, plate_number, make, model, year, vin, ...')
    .eq('user_id', userId)              // WHERE user_id = ?
    .order('created_at', { ascending: false })  // ORDER BY created_at DESC

  if (error) {
    return c.json({ success: false, error: 'Hiba...' }, 500)
  }

  return c.json({ success: true, data: data ?? [] })
  // 200 OK + JSON valasz
})"""))

    e.append(h2("5.5 Az auth middleware (middleware/auth.ts)"))
    e.append(p(
        "A `requireAuth` middleware minden vedett endpoint elott fut. "
        "Ellenorzi a JWT tokent es beallitozza a userId-t:"
    ))
    e.append(code_block("""// backend/src/middleware/auth.ts
export const requireAuth = createMiddleware(async (c, next) => {

  // ---- Fejlesztesi gyorsbillentu ---------------------------------
  // AUTH_STUB=true eseten atugorjuk a JWT ellenorzest
  // SOHASEM hasznald produkcioban!
  if (process.env.AUTH_STUB === 'true') {
    c.set('userId', 'stub-user-citizen')
    c.set('userRole', 'citizen')
    return next()
  }

  // ---- Valos JWT ellenorzes ------------------------------------
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Token hianyzik' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  // Az 'Authorization: Bearer eyJhbGci...' headerbol kivonjuk a tokent

  try {
    const payload = await verifySupabaseJWT(token)
    c.set('userId', payload.sub)        // User azonosito beallitozasa
    c.set('userRole', payload.role)     // Szerep beallitozasa
    c.set('clerkPayload', payload)      // Teljes payload mentese
    await next()                         // Kovetkezo handler futtatasa
  } catch (err) {
    return c.json({ success: false, error: 'Token ervenytelen' }, 401)
  }
})"""))
    e.append(p(
        "Az `AUTH_STUB=true` kornyezeti valtojo fejlesztoknek hasznos: nem kell "
        "bejelentkezni a fejlesztes soran. A `.env.local` fajlban beallitjuk, "
        "es a backend atugorbja a JWT ellenorzest."
    ))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A Hono.js egyszeru, tipusbiztos web framework Edge es Node.js kornyezetekhez",
        "A route-ok hierarchikusan szervezett HTTP endpointok (GET/POST/PATCH/DELETE)",
        "A middleware koztes szoftver: logger, CORS, auth -- minden keresnel lefut",
        "A requireAuth middleware ellenorzi a JWT tokent es beallitozza a userId-t a kontextusba",
        "Az AUTH_STUB=true fejlesztesi gyorsbillentu: atugorja a JWT ellenorzest",
        "A Vercel-en az `export default app` elegendo -- nem kell portot nyitni",
    ]))
    e.append(PageBreak())
    return e

def chapter6():
    e = []
    e.append(h1("6. fejezet: Adatbazis: Supabase es PostgreSQL"))
    e.append(p(
        "Az eCetatean adatait egy PostgreSQL adatbazisban tarolja, amelyet a Supabase "
        "platform kezeli. A Supabase nyujt: (1) Hosztolt PostgreSQL adatbazist, "
        "(2) REST API-t (PostgREST), (3) Autentikacios szervert, (4) Fajltarolot (Storage), "
        "(5) Valos ideju subscriptionokat. Ingyenes tier is elerheto."
    ))

    e.append(h2("6.1 Mi a relacionalas adatbazis?"))
    e.append(p(
        "Kepzelj el egy Excel tablazt. Az adatbazis hasonlo: tablakbol all, amelyek sorokbol "
        "es oszlopokbol allnak. A kulonbseg: az adatbazis kenyszeritheto szabalyokat "
        "(NOT NULL, UNIQUE, FOREIGN KEY), jobb teljesitmenyt nyujt (indexek), "
        "es biztos az adatkonzisztencia (tranzakciok)."
    ))
    e.append(p(
        "Az eCetatean adatbazisa tablak: profiles, vehicles, civic_reports, "
        "audit_log, pdf_forms, life_event_progress, news, chat_conversations, chat_messages."
    ))

    e.append(h2("6.2 A profiles tabla schema.sql-bol"))
    e.append(code_block("""-- backend/schema.sql
create table if not exists public.profiles (
  id              uuid primary key default gen_random_uuid(),
  -- uuid = universally unique identifier, gen_random_uuid() auto-general
  user_id         text not null unique,
  -- text = szoveg, not null = nem lehet ures, unique = minden usernek 1 sor
  full_name       text,                      -- Nullable: lehet ures
  cnp             text,                      -- Roman szemelyi szam
  date_of_birth   date,                      -- Datum tipus
  buletin_series  text,
  buletin_number  text,
  buletin_expiry  date,
  address         text,
  city            text not null default 'Cluj-Napoca',
  -- default erteket ad ha nem adjuk meg
  phone           text,
  email           text,
  language        text not null default 'ro' check (language in ('ro', 'hu')),
  -- check: csak 'ro' vagy 'hu' lehet, mint a TypeScript union tipus!
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- Indexek: gyors keresest tesznek lehetove
create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_cnp_idx on public.profiles (cnp);"""))

    e.append(h2("6.3 A vehicles tabla"))
    e.append(code_block("""create table if not exists public.vehicles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            text not null,
  -- FOREIGN KEY kapcsolat: profiles.user_id-re mutat (implicitten)
  plate_number       text not null,  -- Kotelezo rendszam
  make               text,           -- Marka: "Dacia", "BMW" stb.
  model              text,
  year               int,            -- Egesz szam
  engine_cc          int,            -- Hengerurtartalom
  fuel_type          text,
  color              text,
  vin                text,           -- 17-karakteres alvazszam
  itp_expiry         date,           -- ITP lejarat datuma
  rca_expiry         date,           -- Biztositas lejarat datuma
  impozit_amount     numeric,        -- Decimalis: 234.50 RON
  created_at         timestamptz not null default now()
);
create index if not exists vehicles_user_id_idx on public.vehicles (user_id);
-- Index nelkul: O(n) keresni 1 millio jarmu kozott
-- Indexszel: O(log n) - sorrendnyi gyorsabb!"""))

    e.append(h2("6.4 Miert fontosak az indexek?"))
    e.append(p(
        "Ha egy tablanal nincs index es 1 millio sor van benne, az adatbazisnak "
        "minden sort at kell nezni, hogy megtalala a keresett profilt. Az index "
        "olyan, mint egy konyv targymutatoja: kozvetlenul a megfelelo lapra ugrik."
    ))
    e.append(p(
        "A `profiles_user_id_idx` index azert fontos, mert MINDEN API keresnel "
        "`WHERE user_id = ?` feltetelje van. Index nelkul ez nagyon lassú lenne."
    ))

    e.append(h2("6.5 Row Level Security (RLS)"))
    e.append(p(
        "Az eCetatean projektben az RLS KI VAN KAPCSOLVA, mert a backend "
        "service_role kulcssal csatlakozik (kivesezetett), amely alapbol atugorja az RLS-t. "
        "A schema.sql megjegyzi: 'add production policies before enabling it'. "
        "Ha RLS be lenne kapcsolva, ez lenne egy tipikus policy:"
    ))
    e.append(code_block("""-- Ha RLS be lenne kapcsolva (produkcioban):
alter table public.profiles enable row level security;

create policy "Users can only see their own profile"
  on public.profiles
  for select
  using (auth.uid()::text = user_id);
  -- auth.uid() = a bejelentkezett felhasznalo azonositoja
  -- Mindenki csak a SAJAT profilját lathatja!

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);"""))

    e.append(h2("6.6 A Supabase kliens inicializalasa"))
    e.append(code_block("""// backend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL          // Supabase projekt URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY  // Titkos kulcs!

export const isSupabaseConfigured = Boolean(url && key)

export const supabaseAdmin = createClient(
  url || 'http://localhost:54321',
  key || 'placeholder-service-role-key',
  {
    auth: {
      autoRefreshToken: false,   // Backend nem frissiti a tokent
      persistSession: false,     // Nem tarolja a munkamenetet
    },
  }
)

// FONTOS: a service_role kulcs atugorja az RLS-t
// Sohasem kuld ki a frontendre!"""))

    e.append(h2("6.7 Valos Supabase lekerdezes"))
    e.append(code_block("""// Profil mentese (backend/src/routes/profile.ts)
const row = {
  user_id: userId,
  full_name: body.full_name ?? null,
  city: body.city ?? 'Cluj-Napoca',
  // ...
}

const { data, error } = await supabaseAdmin
  .from('profiles')          // FROM profiles
  .upsert(row, { onConflict: 'user_id' })
  // INSERT ... ON CONFLICT (user_id) DO UPDATE SET ...
  // Ha mar van profil az adott user_id-vel, frissiti!
  .select('full_name, cnp, email, ...')
  .single()                  // Pontosan 1 sort varunk vissza

if (error) {
  console.error('profile upsert error:', error.message)
  return c.json({ success: false, error: 'Hiba' }, 500)
}
return c.json({ success: true, data })"""))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A PostgreSQL relacionalas adatbazis: tablak, sorok, oszlopok, kulcsok",
        "Az UUID primary key auto-general egyedi azonositot minden sorhoz",
        "Az indexek drantikusan gyorsitjak a keresest: O(n) helyett O(log n)",
        "A Supabase service_role kulcs atugorja az RLS-t -- csak backenden hasznald",
        "Az upsert = INSERT OR UPDATE: ha letezik, frissit; ha nem, beilleszt",
        "Az isSupabaseConfigured flag lehetove teszi mock adatokat ha nincs adatbazis",
    ]))
    e.append(PageBreak())
    return e

def chapter7():
    e = []
    e.append(h1("7. fejezet: Autentikacio"))
    e.append(p(
        "Az autentikacio valaszolja meg: 'Ki vagy te?' A Supabase Auth JWT-t (JSON Web Token) "
        "hasznal a felhasznalok azonositasara. Minden bejelentkezes utan a Supabase kiad egy "
        "JWT tokent, amelyet a frontend elment es minden API keresnel elkuldoz."
    ))

    e.append(h2("7.1 Session vs JWT alapu autentikacio"))
    e.append(info_box([
        ("Session-alapu", "A szerver tartja nyilvan ki van bejelentkezve (sessionStore). Allapotos."),
        ("JWT-alapu",     "A token maga tartalmazza az adatokat. A szerver csak ellenorzi az alairasat. Allapotmentes."),
        ("Supabase Auth", "JWT-t hasznal. Bejelentkezes utan access_token + refresh_token kerul a kliensre."),
    ]))
    e.append(sp(6))

    e.append(h2("7.2 A JWT struktura"))
    e.append(p(
        "A JWT harom, ponttal elvalasztott reszbol all: header.payload.signature. Mindenki "
        "meg tudja nezni a tartalmat (Base64 kodolt), de megvaltoztatni nem -- a signature "
        "ellenorzi az integritast."
    ))
    e.append(code_block("""// JWT token peldaja (rorviditve):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9   <- Header (algoritmus)
.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoiam9obi4uLi4iLCJyb2xl... <- Payload
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  <- Signature

// Dekodolt payload:
{
  "sub": "user-abc-123",          // User azonosito (subject)
  "email": "kovacs@example.com",
  "role": "authenticated",
  "user_metadata": { "role": "citizen" },
  "iat": 1748380800,              // Kiadasi ido (Unix timestamp)
  "exp": 1748384400,              // Lejarati ido (1 ora mulva)
  "aud": "authenticated"          // Kozonseg (audience)
}"""))

    e.append(h2("7.3 JWT ellenorzes (supabase-jwt.ts)"))
    e.append(code_block("""// backend/src/lib/supabase-jwt.ts
import { jwtVerify } from 'jose'

export async function verifySupabaseJWT(token: string): Promise<ClerkPayload> {
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
  // A titkos kulcs: csak a szerver ismeri
  // .encode() = string-bol Uint8Array (bytes) konverzio

  try {
    const { payload } = await jwtVerify(token, secret, {
      audience: 'authenticated'  // Ellenorzi az 'aud' mezot
    })
    // A jwtVerify:
    // 1. Ellenorzi a signature-t (titkos kulccsal)
    // 2. Ellenorzi a lejarasi idot (exp)
    // 3. Ellenorzi az audience-t (aud)
    // Ha barmely ellenorzes megbukik: exception!

    const role = appMeta?.app_role ?? 'citizen'
    return {
      sub: payload.sub!,      // User azonosito
      email: payload.email,
      role,                    // citizen | civil_servant | admin
      exp: payload.exp ?? 0,
      iat: payload.iat ?? 0,
    }
  } catch {
    throw new Error('Token Supabase invalid')
  }
}"""))

    e.append(h2("7.4 Bejelentkezesi folyamat a frontenden"))
    e.append(code_block("""// frontend/src/routes/auth.tsx
async function handleSignIn(e: React.FormEvent) {
  e.preventDefault()
  setLoading(true)

  const { error: authError } = await supabase.auth.signInWithPassword({
    email, password
  })
  // Supabase kliens elkuldja a bejelentkezesi adatokat
  // Supabase visszakuld: { session: { access_token, refresh_token }, user }

  setLoading(false)
  if (authError) {
    setError("Email vagy jelszo helytelen.")
    return
  }
  // Ha sikeres: Supabase Auth kliens automatikusan elmenti a tokent
  // A useAuth() hook ezutan isSignedIn = true-t ad vissza
}"""))

    e.append(h2("7.5 EidKit OIDC: elektronikus szemelyazonossag ellenorzes"))
    e.append(p(
        "Az eCetatean tamogatja az EidKit-et, amely az OIDC (OpenID Connect) protokollt "
        "hasznalja. Az OIDC az OAuth 2.0-ra epul, kiegeszitodik azonossag adatokkal. "
        "Az authorization code flow menete:"
    ))
    e.append(bullet("Felhasznalo kattint 'Azonositas EidKit-tel'"))
    e.append(bullet("A backend letrehoz egy 'state' es 'nonce' erteket (CSRF es replay vedelem)"))
    e.append(bullet("Atiranyit az EidKit login oldalara a state-tel"))
    e.append(bullet("Felhasznalo azonositja magat az EidKit-en (szemelyazonossag igazolvanyaval)"))
    e.append(bullet("EidKit visszairanyit a backend callback URL-jere az authorization code-dal"))
    e.append(bullet("A backend a code-ot tokerre csereli, ellenorzi a nonce-t"))
    e.append(bullet("A verifikalas eredmenye elmentodik a profilba (identity_verified_at stb.)"))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A JWT (JSON Web Token) harom reszes token: header.payload.signature",
        "A payload tartalmazza a user adatokat; csak a signature ellenorzese szukseges",
        "A jwtVerify ellenorzi az alairasst, lejarasi idot es az audience-t",
        "Az AUTH_STUB=true atugorja az ellenorzest fejlesztesben",
        "Az OIDC (EidKit) authorization code flow-val verifikalja a szemelyazonossagot",
        "A Supabase Auth kezeli a session-t, token frissiteset es kijelentkezest",
    ]))
    e.append(PageBreak())
    return e

def chapter8():
    e = []
    e.append(h1("8. fejezet: AI integracios"))
    e.append(p(
        "A ClaudIA az eCetatean AI asszisztense -- egy nagy nyelvi modell (LLM) API-n keresztul "
        "kommunikal. A projekt hierarchiat alkalmaz: eloszor megprobalalja Anthropic Claude-dal, "
        "majd Google Gemini-vel, vegul egy mock valasszal. Ezt 'graceful degradation'-nek hivjak."
    ))

    e.append(h2("8.1 Mi az az LLM API?"))
    e.append(p(
        "Egy LLM (Large Language Model) API-nal uzenetek tombjet kuldjuk el (messages array), "
        "es a modell szoveget valaszol. Nincs allapot: minden kerelem teljes kontextust igenyel. "
        "A modellek 'tokenekkel' dolgoznak (kb. 4 karakter = 1 token), es token-limi van."
    ))

    e.append(h2("8.2 A Claude API hivas (claude-claudia.ts)"))
    e.append(code_block("""// backend/src/lib/claude-claudia.ts
const MODEL = 'claude-sonnet-4-6'

export async function streamClaudeClaudia(
  messages: ChatMessage[],
  profile: Partial<Profile> | undefined,
  enqueue: (line: object) => void
): Promise<void> {
  const client = new Anthropic({ apiKey })
  const lastUser = messages.filter(m => m.role === 'user').pop()?.content ?? ''
  const history = toAnthropicHistory(messages)

  const stream = client.messages.stream({
    model: MODEL,                    // claude-sonnet-4-6
    max_tokens: 1024,                // Max 1024 token a valaszban
    system: buildSystemPrompt(profile), // Rendszer prompt
    tools,                           // Eszk. amit a modell hivhat
    messages: [
      ...history,                    // Elozo uzenetek (kontextus)
      { role: 'user', content: lastUser }  // Legujabb uzenet
    ],
  })

  // Streaming: tokenenk erkeznek, azonnal kuld tovabb
  for await (const event of stream) {
    if (event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta') {
      enqueue({ type: 'text', content: event.delta.text })
      // Minden token azonnal elkuldodik a frontendre!
    }
  }
  // ... (folytatas a fajlban)
}"""))

    e.append(h2("8.3 A rendszer prompt"))
    e.append(p(
        "A system prompt hatarozza meg a modell viselkedeset. A claude-claudia.ts-ben:"
    ))
    e.append(code_block("""function buildSystemPrompt(profile?: Partial<Profile>): string {
  const eventsSummary = Object.values(LIFE_EVENTS)
    .map(e => `- ${e.event_type}: ${e.title} -- ${e.summary}`)
    .join('\\n')
  // Az osszes eletesemeny bekerul a promptba

  const profileBlock = profile?.full_name
    ? `\\nProfil cetatean: ${profile.full_name}, CNP ${profile.cnp ?? '--'}`
    : ''

  return `Esti ClaudIA, asistent civic digital...
REGULI CRITICE:
- Raspunde INTOTDEAUNA in limba romana.
- Fii SCURT si DIRECT. Maxim 2-3 propozitii.
- NU folosi formatare markdown: fara **, fara #
- Pentru ORICE intrebare administrativa, foloseste un instrument.
${profileBlock}
Evenimente disponibile:
${eventsSummary}`
}"""))

    e.append(h2("8.4 Tool use / Function calling"))
    e.append(p(
        "A modell nem csak szoveget valaszolhat -- 'eszkozoket' is hivhat. "
        "Az eszkozok definialva vannak a claude-claudia.ts-ban:"
    ))
    e.append(code_block("""const tools: Anthropic.Tool[] = [
  {
    name: 'handle_life_event',
    description: 'Genereaza plan de actiune pentru un eveniment civic',
    input_schema: {
      type: 'object',
      properties: {
        event_type: {
          type: 'string',
          description: 'Cheia evenimentului din baza de cunostinte'
        }
      },
      required: ['event_type']
    }
  },
  {
    name: 'find_procedure',
    description: 'Cauta o procedura administrativa in catalogul tipizatul.eu',
    input_schema: { ... }
  },
  // ... tovabbi eszkozok
]"""))
    e.append(p(
        "Amikor a Claude ugy donto, hogy hasznalnia kell az 'handle_life_event' eszkozi, "
        "visszakuldi az eszkoz nevit es az inputot. A backend ezutan meghivja a "
        "`handleToolCall()` fuggvenyt a claudia-tools.ts-bol:"
    ))
    e.append(code_block("""// backend/src/lib/claudia-tools.ts
export async function handleToolCall(
  toolName: string,
  input: Record<string, string>
) {
  switch (toolName) {
    case 'handle_life_event': {
      const procedure = findProcedure(input.event_type)
      const upgraded = await resolveProcedureActionPlanFormSlugs(procedure)
      return {
        type: 'action_plan' as const,
        procedure: upgraded,
        create_life_event: DEMO_LIFE_EVENT_TYPES.has(input.event_type),
        event_type: input.event_type,
      }
    }
    case 'find_procedure': {
      const matches = await findProcedures(input.query, { county: 'Cluj', limit: 5 })
      const plan = await synthesizeActionPlan(matches[0])
      return { type: 'tipizatul_action_plan', plan, alternatives: ... }
    }
    // ...
  }
}"""))

    e.append(h2("8.5 Graceful degradation: Claude -> Gemini -> Mock"))
    e.append(code_block("""// backend/src/routes/claudia.ts
const useClaude = isClaudeConfigured()
const useGemini = !useClaude && isGeminiConfigured()

if (useClaude) {
  await streamClaudeClaudia(messages, profile, enqueue)
} else if (useGemini) {
  await streamGeminiClaudia(messages, profile, enqueue)
} else {
  // Nincs API kulcs - mock valasz
  const mock = getMockResponse(lastUserMessage)
  enqueue({ type: 'text', content: mock.text })
}"""))
    e.append(p(
        "A Gemini implementacioban a MODEL_CANDIDATES tomb mutatja a 'model fallback chain-t': "
        "eloszor gemini-2.0-flash-lite (ingyenes), azutan gemini-2.0-flash, vegul gemini-2.5-flash. "
        "Ha kvota hiba jon, a GeminiQuotaError el kap es nem try-olja a kovetkező modellt."
    ))

    e.append(h2("8.6 Streaming a frontenden"))
    e.append(code_block("""// A ClaudIA chat valasz streaming feldolgozasa (chat.tsx)
// Az apiStreamPost egy Response objektumot ad vissza (nem JSON-t!)

const chunks: ClaudIAStreamChunk[] = []
const reader = response.body?.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  const text = decoder.decode(value)
  // Minden sor egy JSON objektum:
  // {"type":"text","content":"Am"}
  // {"type":"text","content":" inteles"}
  // {"type":"tool_result","tool_name":"handle_life_event","result":{...}}
  for (const line of text.split('\\n')) {
    if (line.trim()) chunks.push(JSON.parse(line))
  }
}"""))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "Az LLM API-k uzeneteket fogadnak es szoveget valaszolnak (token-onkent)",
        "A system prompt hatarozza meg a modell viselkedeset es kontextust ad",
        "A tool use / function calling lehetove teszi, hogy az AI fuggvenyeket hivjon",
        "A streaming azonnal kuldozi a token-eket: a felhasznalo nem var a teljes valaszra",
        "A graceful degradation: Claude -> Gemini -> Mock -- mindig van valasz",
        "A GeminiQuotaError specialis kezeles: kvota tullepes eseten nem probalkozik tovabb",
    ]))
    e.append(PageBreak())
    return e

def chapter9():
    e = []
    e.append(h1("9. fejezet: PDF generalas"))
    e.append(p(
        "Az eCetatean egyik fő funkcioja: roman kozigazgatasi urlapok automatikus kitoltese "
        "a felhasznalo profil adataival. Ez egy bonyolult problema: a PDF-eknek nincsenek "
        "egységes mezoneveik, es az urlapok kulonbozok."
    ))

    e.append(h2("9.1 @pdfme/pdf-lib vs pdf-lib"))
    e.append(info_box([
        ("@pdfme/pdf-lib", "A pdfme csomagban levo fork. Az eCetatean ezt hasznalja a PDF-ek betoltesehez, AcroForm mezok kinyeresehez es kitoltesehez."),
        ("pdf-lib",        "Altalanos PDF manipulacios konyvtar: uj PDF-ek letrehozasa, szoveg elhelyezese, rajzolas. Hasznaljak a forditas funkcioban (integrations.ts)."),
        ("@pdfme/generator","Sablonok alapjan uj PDF-eket general (nem hasznalt a fo folyamatban)."),
    ]))
    e.append(sp(6))

    e.append(h2("9.2 A pdf-autofill.ts logika"))
    e.append(p(
        "A folyamat negy lepesbol all: (1) PDF baitok letoltese Supabase Storage-bol, "
        "(2) AcroForm mezok kinyerese, (3) Profil adatok ratesitese, (4) PDF kimentese."
    ))
    e.append(code_block("""// backend/src/lib/pdf-autofill.ts
export async function analyzePdf(
  form: PdfForm,
  sourcePdf: Uint8Array,
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {},
): Promise<PdfAutofillField[]> {
  const savedFields = normalizeFields(form.mapping)
  // 1. Betoltott mezo definiciok az adatbazisbol

  const nativeFields = await extractAcroFields(sourcePdf)
  // 2. PDF-bol kinyert AcroForm mezok

  const baseFields =
    savedFields.length > 0
      ? mergeSavedAndNativeFields(savedFields, nativeFields)
      : nativeFields
  // 3. Mentett es natív mezok összefesülése

  const fallbackFields = baseFields.length > 0 ? baseFields : heuristicFields(form)
  // 4. Ha semmi sincs, heurisztikus mezok

  const hydrated = hydrateFieldValues(fallbackFields, profile, inputValues)
  // 5. Ertekek behelyettesitese
  return enrichWithTemplateMeta(hydrated, form)
}"""))

    e.append(h2("9.3 A dataKey rendszer -- hogyan csatlakoztunk az adathoz?"))
    e.append(p(
        "Minden PDF mezonek van egy `dataKey` erteke, amely megmondja honnan kell az adatot venni:"
    ))
    e.append(code_block("""// backend/src/lib/pdf-autofill.ts
export function resolveDataKey(
  dataKey: string,
  profile: Partial<Profile>,
  inputValues: Record<string, string>,
): string {
  if (dataKey === "system.today")
    return new Date().toLocaleDateString("ro-RO")  // Mai datum

  if (dataKey === "profile.full_address") {
    return [profile.address, profile.city].filter(Boolean).join(", ")
    // "Str. Memorandumului 1, Cluj-Napoca"
  }

  if (dataKey.startsWith("profile.")) {
    const key = dataKey.replace(/^profile\\./, "") as keyof Profile
    return String(profile[key] ?? "")
    // profile.cnp => profile["cnp"] => "1850312123456"
  }

  if (dataKey.startsWith("input.")) {
    const key = dataKey.replace(/^input\\./, "")
    return inputValues[key] ?? ""
    // input.make => inputValues["make"] => "Dacia"
  }
}"""))

    e.append(h2("9.4 A guessDataKey heurisztika"))
    e.append(p(
        "Ha egy PDF-ben ismeretlen nevU mező van, a kod megprobaalja kitalalni mit akar:"
    ))
    e.append(code_block("""function guessDataKey(label: string): string {
  const value = normalize(label)  // Kisbetus + diakritikus eltavolitás
  if (value.includes("cnp")) return "profile.cnp"
  if (value.includes("email")) return "profile.email"
  if (value.includes("telefon")) return "profile.phone"
  if (value.includes("adresa") || value.includes("domicili"))
    return "profile.full_address"
  if (value.includes("marca")) return "input.make"
  if (value.includes("model")) return "input.model"
  if (value.includes("vin") || value.includes("sasiu"))
    return "input.vin"
  if (value.includes("data")) return "system.today"
  if (value.includes("nume") || value.includes("subsemnat"))
    return "profile.full_name"
  return `input.${safeId(label)}`  // Ismeretlen: input-kent kezeli
}"""))

    e.append(h2("9.5 A kitoltes folyamata (fillPdf)"))
    e.append(code_block("""export async function fillPdf(
  sourcePdf: Uint8Array,
  fields: PdfAutofillField[],
  profile: Partial<Profile>,
  inputValues: Record<string, string> = {},
): Promise<Buffer> {
  const pdf = await PDFDocument.load(sourcePdf, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const hydratedFields = hydrateFieldValues(fields, profile, inputValues)
  const pdfForm = pdf.getForm()

  for (const field of hydratedFields) {
    const value = (field.value ?? "").trim()
    if (!value) continue

    if (field.acroFieldName) {
      try {
        const textField = pdfForm.getTextField(field.acroFieldName)
        textField.setText(latinize(value))  // Roman betuk -> ASCII
        continue
      } catch { /* Ha nem talalhato, rajzolas lesz */ }
    }

    // Rajzolas overlay-kent (ha nincs AcroForm mezo):
    page.drawText(latinize(value), {
      x: field.x, y: height - field.y - field.height + 4,
      size: 10, font, color: rgb(0.05, 0.05, 0.05),
    })
  }
  return Buffer.from(await pdf.save())
}"""))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A @pdfme/pdf-lib AcroForm mezokat kinyeri es kitolti PDF-ekbol",
        "A dataKey rendszer meghatározza honnan jon az adat: profile.*, input.*, system.*",
        "A guessDataKey heurisztikusan megprobaalja kitalalni az ismeretlen mezo tipusat",
        "A latinize() fuggveny roman diakritikus jeleket ASCII-ra csere (Helvetica kompatibilis)",
        "A hydrateFieldValues() osszekoti a mezo definiciokat az aktualis adatokkal",
        "Ha az AcroForm mezo nem taltathato, szoveget rajzol overlay-kent",
    ]))
    e.append(PageBreak())
    return e

def chapter10():
    e = []
    e.append(h1("10. fejezet: Biztonsag es audit"))
    e.append(p(
        "Az eCetatean bizalmas szemelyazonosito adatokat kezel (CNP, lakcim, szemelyigazolvan szam). "
        "Ezert kiemelten fontos a biztonsag. Ket fő mechanizmus: a hash-lanic audit naplo "
        "es a parameterizalt SQL lekerdezesek SQL injection ellen."
    ))

    e.append(h2("10.1 SHA-256 hash fuggveny"))
    e.append(p(
        "A SHA-256 egy kriptografiai hash fuggveny. Fontos tulajdonsagai:"
    ))
    e.append(bullet("<b>Egyiranyú:</b> hash-bol nem lehet visszafejteni az eredetit"))
    e.append(bullet("<b>Determinisztikus:</b> ugyanaz az input mindig ugyanazt adja"))
    e.append(bullet("<b>Lavina effektus:</b> 1 bit valtozas teljesem mas hash-t ad"))
    e.append(bullet("<b>Utkozes mentes (gyakorlatilag):</b> ket kulonbozo input azonos hash-t adjon, astronomially valoszinUtlen"))

    e.append(h2("10.2 A hash-chain.ts teljes elemzese"))
    e.append(code_block("""// backend/src/lib/hash-chain.ts
import { createHash } from 'crypto'

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export async function writeAuditEntry({
  userId, action, actionType, data = {}
}: WriteAuditEntryParams): Promise<void> {

  // 1. Legutobb bejegyzes hash-enek lekerese
  const { data: lastEntry } = await supabaseAdmin
    .from('audit_log')
    .select('record_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()

  const previousHash = lastEntry?.record_hash ?? 'GENESIS'
  // Az elso bejegyzes previousHash-e: 'GENESIS'

  const timestamp = new Date().toISOString()

  // 2. Adatok hash-e (az aktualis bejegyzes tartalma)
  const dataHash = sha256(
    JSON.stringify({ action, actionType, timestamp, data })
  )

  // 3. Bejegyzes hash-e = sha256(elozo_hash + adat_hash)
  const recordHash = sha256(previousHash + dataHash)

  // 4. Mentes az adatbazisba
  await supabaseAdmin.from('audit_log').insert({
    user_id: userId, action, action_type: actionType,
    data, data_hash: dataHash,
    previous_hash: previousHash,
    record_hash: recordHash,
  })
}"""))
    e.append(p(
        "Miert megvaltoztathatatlan? Ha valaki megvaltoztatna az N. bejegyzest, annak "
        "data_hash-e megvaltozna, ezert a record_hash is megvaltozna, ami az (N+1). "
        "bejegyzes previous_hash-evel nem egyezne. A teljes lanc szervicen vegig leellenorizheto."
    ))

    e.append(h2("10.3 A hash lanc ellenorzese"))
    e.append(code_block("""// backend/src/lib/hash-chain.ts
export function verifyHashChain(
  entries: Array<{ data_hash: string; previous_hash: string; record_hash: string }>
): boolean {
  for (let i = 1; i < entries.length; i++) {
    // Az (i). bejegyzes record_hash-enek ujraszamitasa:
    const expectedRecordHash = sha256(
      entries[i - 1].record_hash + entries[i].data_hash
    )

    // Ha nem egyezik: valaki megvaltoztatta!
    if (expectedRecordHash !== entries[i].record_hash) return false

    // Az (i). bejegyzes previous_hash-enek ellenorzese:
    if (entries[i].previous_hash !== entries[i - 1].record_hash) return false
  }
  return true  // A lanc intact
}"""))

    e.append(h2("10.4 SQL injection megelozese"))
    e.append(p(
        "Az SQL injection az egyik legelterjedtebb webes tamadas. Ha a felhasznalo adatait "
        "kozvetlenul beszidjuk az SQL string-be, a tamado SQL kodot illeszt be:"
    ))
    e.append(code_block("""// VESZÉLYES (ne csinalj ilyet!):
const query = `SELECT * FROM profiles WHERE cnp = '${userInput}'`
// Ha userInput = "' OR '1'='1", az osszes profilt adja vissza!

// BIZTONSÁGOS - parameterizalt lekerdezes:
const { data } = await supabaseAdmin
  .from('profiles')
  .select('user_id')
  .eq('cnp', cnp)  // A Supabase SDK automatikusan parameterizal
  // Ez: WHERE cnp = $1 (a $1 erteket biztonságosan aadja at)"""))
    e.append(p(
        "A Supabase JS kliens MINDIG parameterizalt lekerdezeseket hasznal. "
        "Emiatt az eCetatean-ban nincsen SQL injection sebezhetoseg."
    ))

    e.append(h2("10.5 CORS (Cross-Origin Resource Sharing)"))
    e.append(p(
        "A bongeszo biztonsagi szabalyai tiltjak, hogy az egyik domain JavaScript-je "
        "keres kuldjok masik domain API-janak. Ezert kell CORS konfiguralast:"
    ))
    e.append(code_block("""// backend/src/middleware/cors.ts (valoszinusitheto tartalom)
import { cors } from 'hono/cors'

export const corsMiddleware = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Csak errol a domainről engedi a kereseket
  credentials: true,   // Cookie-k engedelyezese
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
})

// Ha a frontend https://app.ecetatean.ro domain-rol
// probalna elerni az API-t, es CORS nincs beallitva,
// a bongeszo blokkolna a keres. Ezert kell explicit engedely."""))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A SHA-256 egyiranyú hash: hash-bol nem fejthetö vissza az eredeti adat",
        "A hash lanc (blockchain-szeru) megvaltoztathatatlanná teszi az audit naplot",
        "A verifyHashChain ellenorzi, hogy az osszes bejegyzes hash-e konzisztens-e",
        "A SQL injection parameterizalt lekerdezesekkel megelőzhető (Supabase SDK csinalja)",
        "A CORS ellenorzi, hogy melyik domain kuldhet HTTP kereseket az API-hoz",
        "A service_role Supabase kulcs SOHASEM kerul a frontendre (csak backenden)",
    ]))
    e.append(PageBreak())
    return e

def chapter11():
    e = []
    e.append(h1("11. fejezet: Deployment"))
    e.append(p(
        "A 'deployment' azt jelenti: a helyi gepen iro kod elerhető lesz az interneten "
        "barki szamara. Az eCetatean ket kulonbozo platformot hasznal a ket reszhez."
    ))

    e.append(h2("11.1 Cloudflare Workers: edge computing"))
    e.append(p(
        "A frontend Cloudflare Workers-en fut. Ez nem egy hagyomanyos szerver -- "
        "Cloudflare 300+ globalis adatkozpontjaban fut a kod, mindig a felhasznalohoz "
        "legkozelebbi szerverol szolaltatva."
    ))
    e.append(code_block("""{
  // frontend/wrangler.jsonc
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "tanstack-start-app",
  "compatibility_date": "2025-09-24",
  "compatibility_flags": ["nodejs_compat"],
  "main": "src/server.ts"
}

// Deployment parancs:
// npx wrangler deploy
// Ez feltolti a build kimerete Cloudflare-re es globálisan elerhető lesz"""))
    e.append(p(
        "Az `nodejs_compat` flag lehetove teszi a Node.js API-k hasznalatat "
        "(pl. crypto, Buffer) a Worker kornyezetben, ahol alapbol csak Web API-k erhetok el."
    ))

    e.append(h2("11.2 Vercel: serverless functions"))
    e.append(p(
        "A backend Vercel-en fut. Minden API kerelem egy uj serverless function peldanyt indit. "
        "Nincsen allandoan futo szerver -- a Vercel 'on demand' inditja a kodot."
    ))
    e.append(code_block("""{
  // backend/vercel.json
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
      // @vercel/node leforditja es futtatja a TypeScript koodot
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",   // Minden /api/... URL...
      "dest": "src/index.ts"  // ...az index.ts-hez megy
    },
    {
      "src": "/(.*)",       // Minden mas URL is
      "dest": "src/index.ts"
    }
  ],
  "env": {
    "SUPABASE_URL": "@supabase_url",
    // @supabase_url = Vercel secret neve (nem a valodi ertek!)
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key",
    "SUPABASE_JWT_SECRET": "@supabase_jwt_secret",
    "GEMINI_API_KEY": "@gemini_api_key",
    "FRONTEND_URL": "@frontend_url"
  }
}"""))

    e.append(h2("11.3 Kornyezeti valtozok (Environment Variables)"))
    e.append(p(
        "Sohasem szabad titkos kulcsokat (API kulcsok, adatbazis jelszavak) "
        "a forraskodoba irni! Ezert leteznek a kornyezeti valtozok:"
    ))
    e.append(code_block("""# backend/.env.local (NEM kerül git-be! .gitignore-ba van!)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_JWT_SECRET=super-titkos-jwt-secret
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
AUTH_STUB=true                  # Fejlesztesben: atugorja a JWT-t
AUTH_STUB_ROLE=citizen          # Stub felhasznalo szerepe

# frontend/.env.local
VITE_API_URL=http://localhost:3001  # Backend URL
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...  # Anon kulcs (publikus)"""))
    e.append(p(
        "A `VITE_` elottag fontos: csak ezek a valtozok kerulnek bele a frontend build-be. "
        "A VITE_ nelkuli valtozok biztonságban maradnak a szerveren."
    ))

    e.append(h2("11.4 Az AUTH_STUB pattern erteke"))
    e.append(p(
        "Az `AUTH_STUB=true` egy elegans fejlesztesi mintazat: "
        "lehetove teszi a backend API teszteleset bejelentkezesi folyamat nelkul. "
        "Produkcios kornyezetben sohasem szabad bekapcsolni (a Vercel kornyezeti "
        "valtozokban ez az ertek nincs beallitva)."
    ))

    e.append(sp(8))
    e.append(summary_box("Mit tanultam ebbol?", [
        "A Cloudflare Workers edge computing: 300+ helyszinen fut, minimalis latencia",
        "A Vercel serverless functions 'on demand' inditjak a kodot minden keresre",
        "A wrangler.jsonc konfigurálja a Cloudflare deploymentet (name, compat_date, main)",
        "A vercel.json a route-okat es a build konfiguracion határozza meg",
        "A kornyezeti valtozok titkok tarolasara szolgalnak (sohasem a forraskodoba!)",
        "Az AUTH_STUB=true fejlesztesi gyorsbillentu -- sohasem produkcioba!",
    ]))
    e.append(PageBreak())
    return e

def chapter12():
    e = []
    e.append(h1("12. fejezet: Osszefoglalas es kovetkezo lepesek"))
    e.append(p(
        "Gratulalok! Vegigmentel az eCetatean projekt osszes fontos technologiaian. "
        "Ez a fejezet osszefoglalja a kapcsolatokat a technologiak kozott, es megmutatja "
        "hova erdemes tovabbmenni."
    ))

    e.append(h2("12.1 Technologia terkep"))
    rows = [
        ["Technologia", "Hol van a projektben", "Egyertelmu ceel"],
        ["TypeScript", "Mindenhol (frontend + backend)", "Tipusbiztos, kevesebb bug"],
        ["React 19", "frontend/src/routes/*.tsx", "UI kompones rendszer"],
        ["TanStack Router", "frontend/src/routes/ fajlok", "Fajl-alapu URL routing"],
        ["TanStack Query", "useProfile(), useNews() stb.", "API adat cacheles"],
        ["Tailwind CSS", "className='...' minden jsx-ben", "Gyors, egyseges stilus"],
        ["Framer Motion", "motion.div, slideUpSheet stb.", "Animaciok"],
        ["Hono.js", "backend/src/index.ts", "HTTP szerver framework"],
        ["Supabase", "supabase.ts + SQL lekerdesek", "Adatbazis + Auth + Storage"],
        ["JWT", "supabase-jwt.ts + middleware/auth.ts", "Autentikacio"],
        ["Claude/Gemini", "claude-claudia.ts + gemini-claudia.ts", "AI asszisztens"],
        ["pdf-lib", "pdf-autofill.ts", "PDF kitoltes"],
        ["Cloudflare", "wrangler.jsonc", "Frontend hosting (edge)"],
        ["Vercel", "vercel.json", "Backend hosting (serverless)"],
    ]
    col_widths = [3.5*cm, 6*cm, 5.5*cm]
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BLUE),
        ('TEXTCOLOR',  (0,0), (-1,0), WHITE),
        ('FONTNAME',   (0,0), (-1,0), BOLD_FONT),
        ('FONTSIZE',   (0,0), (-1,0), 9),
        ('BACKGROUND', (0,1), (-1,-1), LIGHT_GRAY),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_GRAY]),
        ('FONTNAME',   (0,1), (-1,-1), BODY_FONT),
        ('FONTSIZE',   (0,1), (-1,-1), 8.5),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, BORDER_GRAY),
        ('BOX',        (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
        ('VALIGN',     (0,0), (-1,-1), 'MIDDLE'),
    ]))
    e.append(t)

    e.append(h2("12.2 Hogyan kapcsolodnak a technologiak mas projektekhez?"))
    e.append(p(
        "Az eCetatean-ban tanult dolgok szorosan kapcsolodnak a mas nepszeru projektekhez:"
    ))
    e.append(bullet("<b>Hono.js -> Express.js:</b> Az Express a legelterjedtebb Node.js framework. Szinte ugyanolyan API, de Hono gyorsabb es TypeScript-natív."))
    e.append(bullet("<b>Supabase -> Prisma + raw PostgreSQL:</b> Prisma egy TypeScript ORM, ami szintén SQL felett mukodik. A Supabase SDK es a Prisma hasonlo koncepteket hasznal."))
    e.append(bullet("<b>TanStack Router -> Next.js App Router:</b> A Next.js 13+ hasonlo fajl-alapu routingot hasznal. Mindket rendszer server-side rendering-et tamogat."))
    e.append(bullet("<b>TanStack Query -> SWR, React Query:</b> Ugyanaz az alap idea: API adat cacheles React hook-okkal."))
    e.append(bullet("<b>Vercel serverless -> AWS Lambda, Google Cloud Functions:</b> Ugyanaz a paradigma: kod fut 'on demand', nem allandoan futó szerver."))
    e.append(bullet("<b>Cloudflare Workers -> Deno Deploy, Fastly Compute@Edge:</b> Edge computing alternativak."))

    e.append(h2("12.3 Tanulasi utmutato"))
    e.append(p("A kovetkezo sorrend ajanlott:"))
    rows2 = [
        ["Lepcsofok", "Mit tanulj", "Forras"],
        ["1. Alap", "HTML, CSS, JavaScript (vanillia)", "MDN Web Docs (mdn.dev)"],
        ["2. TypeScript", "Tipusok, interface-k, generikusok", "typescriptlang.org"],
        ["3. React", "Komponensek, hooks, state", "react.dev (hivatalos)"],
        ["4. Node.js", "Event loop, npm, modul rendszer", "nodejs.org"],
        ["5. SQL", "SELECT, JOIN, INDEX, transaction", "PostgreSQL tutorial"],
        ["6. HTTP/REST", "Kerelem-valasz, statusz kodok, headers", "REST API tutorial"],
        ["7. JWT/Auth", "Token struktura, ellenorzes, refresh", "jwt.io"],
        ["8. Deployment", "Docker, CI/CD, cloud platformok", "Vercel/Cloudflare docs"],
    ]
    col_widths2 = [2*cm, 6*cm, 6*cm]
    t2 = Table(rows2, colWidths=col_widths2)
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#374151')),
        ('TEXTCOLOR',  (0,0), (-1,0), WHITE),
        ('FONTNAME',   (0,0), (-1,0), BOLD_FONT),
        ('FONTSIZE',   (0,0), (-1,0), 9),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, LIGHT_GRAY]),
        ('FONTNAME',   (0,1), (-1,-1), BODY_FONT),
        ('FONTSIZE',   (0,1), (-1,-1), 8.5),
        ('INNERGRID',  (0,0), (-1,-1), 0.3, BORDER_GRAY),
        ('BOX',        (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('LEFTPADDING',  (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING',   (0,0), (-1,-1), 4),
        ('BOTTOMPADDING',(0,0), (-1,-1), 4),
    ]))
    e.append(t2)

    e.append(h2("12.4 Hivatkozasok es dokumentaciok"))
    links = [
        ("React 19",       "react.dev"),
        ("TanStack Router","tanstack.com/router"),
        ("TanStack Query", "tanstack.com/query"),
        ("Tailwind CSS",   "tailwindcss.com"),
        ("Framer Motion",  "motion.dev"),
        ("shadcn/ui",      "ui.shadcn.com"),
        ("Hono.js",        "hono.dev"),
        ("Supabase",       "supabase.com/docs"),
        ("PostgreSQL",     "postgresql.org/docs"),
        ("Anthropic Claude","docs.anthropic.com"),
        ("Google Gemini",  "ai.google.dev"),
        ("Vercel",         "vercel.com/docs"),
        ("Cloudflare Workers","developers.cloudflare.com"),
        ("TypeScript",     "typescriptlang.org/docs"),
        ("pdf-lib",        "pdf-lib.js.org"),
    ]
    for name, url in links:
        e.append(bullet(f"<b>{name}:</b> {url}"))

    e.append(sp(10))
    e.append(summary_box("Vegso osszefoglalas: Mit tanultam ebbol az utmutatobol?", [
        "A modern webalkalmazasok haromretegUek: frontend (React), backend (Hono.js), adatbazis (Supabase)",
        "A TypeScript statikus tipusossag forditasi hibakat talal, javitja a kod minosegat",
        "A React komponens-alapu UI rendszer: useState, useEffect, custom hooks",
        "A Tailwind utility-first CSS: gyors UI fejlesztes CSS fajlok nelkul",
        "A Hono.js REST API szerver: route-ok, middleware, request/response ciklus",
        "A PostgreSQL relacionalas adatbazis: tablak, indexek, RLS biztonsag",
        "A JWT autentikacio: header.payload.signature, ellenorzes a backenden",
        "Az LLM API (Claude/Gemini) tool use-sal: AI eszkoz hivasok, streaming",
        "A PDF autofill: AcroForm mezok, dataKey rendszer, latinize",
        "A hash lanc audit naplo: SHA-256, megvaltoztathatatlan bejegyzesek",
        "A deployment: Cloudflare Workers (edge) + Vercel (serverless)",
        "Kornyezeti valtozok: titkos kulcsok sose a forraskodoba!",
    ]))
    e.append(PageBreak())
    return e

# ════════════════════════════════════════════════════════════════
# MAIN
# ════════════════════════════════════════════════════════════════

def build_pdf():
    output_path = r'c:\Users\Dávid\Documents\Github\eCetatean\ecetataean_tanulasi_utmutato.pdf'

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=LEFT_M,
        rightMargin=RIGHT_M,
        topMargin=TOP_M,
        bottomMargin=BOTTOM_M,
        title="eCetatean Tanulasi Utmutato",
        author="eCetatean Hackathon",
        subject="Egy 48 oras hackathon projekt teljes megertese",
    )

    story = []
    story += cover_page()
    story += chapter1()
    story += chapter2()
    story += chapter3()
    story += chapter4()
    story += chapter5()
    story += chapter6()
    story += chapter7()
    story += chapter8()
    story += chapter9()
    story += chapter10()
    story += chapter11()
    story += chapter12()

    doc.build(story)
    print(f"PDF sikeresen generálva: {output_path}")
    return output_path

if __name__ == '__main__':
    path = build_pdf()
    size_kb = os.path.getsize(path) // 1024
    print(f"Fajlmeret: {size_kb} KB")
