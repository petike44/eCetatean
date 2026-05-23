import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import { writeAuditEntry } from '../lib/hash-chain';
import { generateReportReference } from '../lib/reference-generator';
export const reportsRoute = new Hono();
reportsRoute.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    let category = null;
    let description = null;
    let latitude = null;
    let longitude = null;
    let address = null;
    let photoUrl = null;
    const contentType = c.req.header('Content-Type') ?? '';
    if (contentType.includes('multipart/form-data')) {
        const formData = await c.req.formData();
        category = formData.get('category');
        description = formData.get('description') ?? null;
        const lat = formData.get('latitude');
        const lng = formData.get('longitude');
        latitude = lat ? Number(lat) : null;
        longitude = lng ? Number(lng) : null;
        address = formData.get('address') ?? null;
        const photo = formData.get('photo');
        if (photo && photo.size > 0) {
            const photoBuffer = await photo.arrayBuffer();
            const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `reports/${userId}/${Date.now()}_${safeName}`;
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                .from('civic-reports')
                .upload(fileName, photoBuffer, {
                contentType: photo.type,
                upsert: false,
            });
            if (!uploadError && uploadData) {
                const { data: urlData } = supabaseAdmin.storage
                    .from('civic-reports')
                    .getPublicUrl(fileName);
                photoUrl = urlData.publicUrl;
            }
        }
    }
    else {
        const body = await c.req.json();
        category = body.category;
        description = body.description ?? null;
        latitude = body.latitude ?? null;
        longitude = body.longitude ?? null;
        address = body.address ?? null;
    }
    if (!category) {
        return c.json({ success: false, error: 'Categoria sesizării este obligatorie' }, 400);
    }
    const referenceNumber = generateReportReference();
    const { data, error } = await supabaseAdmin
        .from('civic_reports')
        .insert({
        user_id: userId,
        category,
        description,
        latitude,
        longitude,
        address,
        photo_url: photoUrl,
        reference_number: referenceNumber,
        status: 'inregistrata',
    })
        .select()
        .single();
    if (error) {
        console.error('Report insert error:', error);
        return c.json({ success: false, error: 'Eroare la salvarea sesizării' }, 500);
    }
    writeAuditEntry({
        userId,
        action: `Sesizare înregistrată: ${category} — ${referenceNumber}`,
        actionType: 'report_submitted',
        data: { category, reference_number: referenceNumber, address },
    });
    return c.json({
        success: true,
        data: {
            reference_number: referenceNumber,
            status: 'inregistrata',
            report: data,
        },
    }, 201);
});
reportsRoute.get('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const { data, error } = await supabaseAdmin
        .from('civic_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        return c.json({ success: false, error: 'Eroare la preluarea sesizărilor' }, 500);
    }
    return c.json({ success: true, data });
});
