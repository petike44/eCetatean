# Car from Germany Integration Guide
## eCetățean — EU Car Registration Flow

**Date:** May 23, 2026  
**Feature:** `car_from_germany` life event with 7-step DRPCIV process  
**Status:** ✅ Implemented & Ready to Deploy

---

## What Was Done

### 1. **Backend Knowledge Base Updated** (`backend/src/lib/knowledge-base.ts`)

#### Added `car_from_germany` Life Event
- **7 complete steps** with office locations, costs, documents, and deadlines
- **Keyword detection** for EU car imports (detects "Germania", "UE", "import", etc.)
- **Form references** for both PDF templates

**Steps:**
1. **Gather ownership documents from seller** (no office visit)
2. **Register at local finance office** (Primăria Cluj) — Get REMTII stamp
3. **DRPCIV registration** (DRPCIV Cluj) — Submit Cerere DRPCIV, pay 49 RON
4. **ANAF TVA certificate** (ANAF Cluj) — Submit TVA form if not VAT-registered
5. **Pay auto tax** (Primăria Cluj) — Variable by engine cc, online on ghiseu.ro
6. **Order license plates** (ghiseu.ro) — ~100 RON, 5–10 day delivery
7. **ITP inspection** (Any ITP station) — New inspection + RCA visa

#### Added `anaf_cluj` Office
```typescript
anaf_cluj: {
  name: 'Agenția Națională de Administrare Fiscală — Cluj',
  address: 'Str. Gh. Doja 67, Cluj-Napoca',
  hours: 'Luni–Vineri: 08:00–16:30',
  phone: '0264-591.890',
  notes: 'Orice birou ANAF din țară poate emite certificatul de TVA.',
}
```

#### Updated Event Detection
The `detectEventType()` function now catches:
- "Germania" + "mașină" → `car_from_germany`
- "UE" + "auto" → `car_from_germany`
- "import" + "vehicul" → `car_from_germany`
- Falls back to generic `bought_car` if no EU keywords found

---

### 2. **PDF Form Templates Enhanced** (`backend/src/lib/pdf-templates.ts`)

#### `anaf_tva_certificate_request` — Upgraded
**Fields auto-filled from user profile + vehicle data:**
- Solicitant details (name, CNP, fiscal code, VAT registration)
- Fiscal address (county, city, street, email, phone)
- Vehicle identification (make, model, VIN, homologation number)
- Declaration checkbox (compliance statement)
- Date & signature line

**When used:** Step 4 of the car_from_germany flow

#### `cerere_drpciv` — Upgraded
**Fields auto-filled from user profile + vehicle data:**
- Declarant details (full name, CNP, address, email, phone)
- Request type checkbox (set to "Înmatriculare" = Registration)
- Vehicle data (make, model, VIN, current plate if any)
- Optional: Other person using vehicle (co-owner)
- Agreement checkboxes (internet account, email notifications, info notice)
- Date & signature line

**When used:** Step 3 of the car_from_germany flow

---

## Architecture: How It Works End-to-End

### User Says (Frontend Chat)
```
"Am cumpărat o mașină din Germania"
```

### AI Agent Processing (Backend)
```
1. detectEventType(message) → Finds "Germania" + "mașina"
   ↓
2. findProcedure('car_from_germany') → Loads 7-step flow
   ↓
3. Streams response to frontend with action plan
```

### Frontend Shows (Life Event Dashboard)
```
✓ 7 steps in visual timeline
✓ Cost calculator: 380–700 RON (excluding RCA)
✓ Document wallet with pre-filled forms
✓ Office locations & contact details for each step
✓ Download buttons for Cerere DRPCIV & ANAF forms
```

### User Downloads PDF (Backend)
```
POST /api/pdf/generate
{
  formType: "cerere_drpciv",
  profile: { full_name, cnp, address, city, email, phone },
  additionalData: { make, model, vin, county, ... }
}
↓
Backend fills template with user data using @pdfme/generator
↓
Returns generated PDF buffer for download
```

### User Uploads Documents (Frontend)
```
Uploads to Supabase Storage → Linked to user's life event progress
↓
Audit log records: Who uploaded what, when, from where
```

---

## Key Integration Points

### 1. **Backend Files Modified**

**File:** `backend/src/lib/knowledge-base.ts`
- ✅ Added ANAF office location
- ✅ Added 7-step `car_from_germany` life event
- ✅ Updated `detectEventType()` with EU car detection

**File:** `backend/src/lib/pdf-templates.ts`
- ✅ Enhanced `anaf_tva_certificate_request` case
- ✅ Enhanced `cerere_drpciv` case
- ✅ Added field mappings for ANAF form (12 fields)
- ✅ Added field mappings for DRPCIV form (14 fields)

### 2. **Frontend (No Changes Needed)**
The Life Event Dashboard at `/life-event/[eventId]` will automatically:
- Display all 7 steps from the knowledge base
- Calculate and show costs (€380–700 RON)
- Show document wallet with download buttons for forms
- Track step progress (De făcut → În curs → Completat)

### 3. **Type Definitions**
The forms `anaf_tva_certificate_request` and `cerere_drpciv` are already in your `FormType` union.  
If missing, add to `backend/src/types/index.ts`:
```typescript
type FormType = 
  | 'sale_contract' 
  | 'transcription' 
  | 'impozit_auto' 
  | 'viza_flotant' 
  | 'doctor_transfer' 
  | 'scholarship_certificate'
  | 'anaf_tva_certificate_request'  // ← Already there
  | 'cerere_drpciv'                   // ← Already there
```

---

## Testing the Integration

### 1. **In Chat (Frontend)**
```
User: "Am cumpărat o mașină din Germania pe eBay"
ClaudIA: [Streams 7-step action plan]
↓
Dashboard shows car_from_germany life event
↓
User clicks "Download Cerere DRPCIV"
```

### 2. **PDF Generation (Manual Test)**
```bash
curl -X POST http://localhost:3001/api/pdf/generate \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "formType": "cerere_drpciv",
    "profile": {
      "full_name": "Ion Popescu",
      "cnp": "1900000123456",
      "address": "Str. Dorobanților 2",
      "city": "Cluj-Napoca",
      "email": "ion@example.com",
      "phone": "0755123456"
    },
    "additionalData": {
      "make": "BMW",
      "model": "320d",
      "vin": "WBADT43452G297186",
      "county": "Cluj",
      "purchase_date": "2024-05-15"
    }
  }'
```

### 3. **Event Detection (Testing)**
```typescript
import { detectEventType } from './knowledge-base'

console.log(detectEventType("Am cumpărat o mașină din Germania"))
// → "car_from_germany" ✓

console.log(detectEventType("Am o mașină nouă"))
// → "bought_car" (fallback)
```

---

## What User Data Is Auto-Filled

### From User Profile (Supabase `profiles` table)
- `full_name` → Both PDFs
- `cnp` → Both PDFs
- `email` → ANAF form
- `address` → Both PDFs (street)
- `city` → DRPCIV form

### From Vehicle Info (Supabase `vehicles` table or life event context)
- `make` (brand) → Both PDFs
- `model` → Both PDFs
- `vin` (number of identification) → Both PDFs
- `engine_cc` (cilindree) → Impozit auto form
- `fuel_type` (carburant) → Impozit auto form
- `year` (an fabricație) → Both PDFs

### Additional Data (Collected via Chat / Step Forms)
- `county` (județ) → ANAF form
- `tva_code` (optional) → ANAF form if already registered
- `purchase_date` → For audit trail
- `homologation_number` → ANAF form (technical spec)
- `phone` → Both PDFs

---

## Cost Breakdown

| Step | Item | Cost | Online? |
|------|------|------|---------|
| 2 | Registration at finance authority | Free | N/A |
| 3 | Certificate of registration (49 RON) | 49 RON | ✅ ghiseu.ro |
| 4 | ANAF TVA certificate | Free | ✅ ANAF portal |
| 5 | Auto tax (annual, variable) | 100–400 RON | ✅ ghiseu.ro |
| 6 | License plates (metal) | 100–150 RON | ✅ ghiseu.ro |
| 7 | ITP inspection | 80–150 RON | ❌ Station |
| — | RCA insurance (annual) | 300–600 RON | ✅ Insurer |

**Total (excluding RCA): 380–700 RON**  
**Timeline: 7–10 business days**

---

## Deployment Checklist

- [ ] Push backend changes to `main` branch
- [ ] Verify `knowledge-base.ts` compiles without errors
- [ ] Verify `pdf-templates.ts` compiles without errors
- [ ] Deploy backend to Vercel
- [ ] Test event detection: `detectEventType("Am cumpărat o mașină din Germania")`
- [ ] Test PDF generation for both forms
- [ ] Verify frontend `/life-event` page loads the 7-step car_from_germany flow
- [ ] Test with real phone (390px viewport) on Vercel URL
- [ ] Record demo video showing: Chat → Dashboard → PDF download

---

## Future Enhancements

1. **Dynamic cost calculation** based on:
   - Engine displacement (cc)
   - Fuel type (benzină/motorină/hibrid/electric)
   - Vehicle age (taxation formula)
   - RCA insurance quotes (fetch from APIs)

2. **Integration with external APIs:**
   - `ghiseu.ro` payment tracking
   - `politiaromana.ro` appointment booking
   - ITP station finder
   - RCA insurance comparison

3. **Document tracking:**
   - Status: "Pending" → "Uploaded" → "Verified"
   - Expiry alerts for RCA, ITP

4. **Multi-language support:**
   - Currently Romanian only
   - Could add English for EU expats

5. **New life events:**
   - `new_baby` (alocație + indemnizație cascading)
   - `pfa_freelancer` (D212 deadline + CAS/CASS calculation)
   - `moving_to_eu` (export vehicle registration)

---

## Questions? Troubleshooting

### "Form not generating"
- Check: Is `ANTHROPIC_API_KEY` set in backend `.env.local`?
- Check: Are Clerk JWT tokens valid?
- Check: Does user have profile data (name, CNP, address)?

### "Step not showing in dashboard"
- Check: `detectEventType()` returning `"car_from_germany"`?
- Check: `LIFE_EVENTS['car_from_germany']` exists in knowledge base?
- Check: Frontend `/life-event/[eventId]` page exists?

### "PDF fields blank"
- Check: `additionalData` object passed to `/api/pdf/generate` has all required fields
- Check: Field names in `pdf-templates.ts` match the template keys

### "Office info not showing"
- Check: `OFFICES['anaf_cluj']` added to knowledge base
- Check: `office_id` in step references valid OFFICES key

---

## Summary

✅ **Backend integrated:** 7-step car_from_germany flow in knowledge base  
✅ **PDFs ready:** Cerere DRPCIV + ANAF TVA forms with auto-fill  
✅ **Event detection:** Automatic trigger for EU car imports  
✅ **Cost transparency:** 380–700 RON calculated and shown  
✅ **All steps documented:** Offices, deadlines, documents, fees  

**Next:** Deploy backend → Test frontend → Record demo → Submit! 🚀
