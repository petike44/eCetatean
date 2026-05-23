import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase'
import { writeAuditEntry } from '../lib/hash-chain'
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getEidKitConfig,
  normalizeEidKitClaims,
  randomUrlToken,
  safeClaimsForStorage,
  tokenExpiryToIso,
} from '../lib/eidkit-oidc'
import type { EidKitClaims, EidKitVerificationStatus } from '../types'

export const eidKitRoute = new Hono()

eidKitRoute.get('/status', requireAuth, async (c) => {
  const userId = c.get('userId')
  const config = getEidKitConfig()

  if (!isSupabaseConfigured) {
    return c.json({
      success: true,
      data: emptyStatus(config),
    })
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select(
      'full_name, cnp, date_of_birth, address, buletin_series, buletin_number, buletin_expiry, eidkit_sub, identity_verified_at, identity_verification_method, identity_verification_level, identity_verified_claims'
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return c.json({ success: false, error: 'Eroare la citirea verificării EidKit' }, 500)
  }

  const claims = (profile?.identity_verified_claims as Record<string, unknown> | null) ?? null

  const status: EidKitVerificationStatus = {
    configured: config.configured,
    demo_enabled: config.demoEnabled,
    verified: Boolean(profile?.identity_verified_at && profile?.eidkit_sub),
    provider: 'eidkit',
    verified_at: profile?.identity_verified_at ?? null,
    verification_level: profile?.identity_verification_level ?? null,
    scopes: scopesFromClaims(claims),
    claims,
    profile_fields: {
      full_name: profile?.full_name ?? null,
      cnp: profile?.cnp ?? null,
      date_of_birth: profile?.date_of_birth ?? null,
      address: profile?.address ?? null,
      buletin_series: profile?.buletin_series ?? null,
      buletin_number: profile?.buletin_number ?? null,
      buletin_expiry: profile?.buletin_expiry ?? null,
    },
  }

  return c.json({ success: true, data: status })
})

eidKitRoute.post('/start', requireAuth, async (c) => {
  const userId = c.get('userId')
  const config = getEidKitConfig()

  if (!config.configured) {
    return c.json(
      {
        success: false,
        error: 'EidKit nu este configurat încă. Completează EIDKIT_CLIENT_ID și EIDKIT_CLIENT_SECRET.',
        code: 'EIDKIT_NOT_CONFIGURED',
      },
      400
    )
  }

  if (!isSupabaseConfigured) {
    return c.json(
      { success: false, error: 'Supabase este necesar pentru maparea sesiunii EidKit' },
      500
    )
  }

  const state = randomUrlToken()
  const nonce = randomUrlToken()
  const { error } = await supabaseAdmin
    .from('identity_verification_sessions')
    .insert({
      user_id: userId,
      provider: 'eidkit',
      state,
      nonce,
      scopes: config.scopes.join(' '),
      redirect_uri: config.redirectUri,
    })

  if (error) {
    console.error('EidKit session create error:', error.message)
    return c.json({ success: false, error: 'Nu am putut porni verificarea EidKit' }, 500)
  }

  const authorizationUrl = await buildAuthorizationUrl({ state, nonce, config })
  return c.json({
    success: true,
    data: {
      authorization_url: authorizationUrl,
      scopes: config.scopes,
    },
  })
})

eidKitRoute.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')
  const error = c.req.query('error')
  const errorDescription = c.req.query('error_description')
  const frontendUrl = getFrontendUrl()

  if (!state) {
    return redirectToProfile(frontendUrl, 'failed', 'missing_state')
  }

  const session = await loadPendingSession(state)
  if (!session) {
    return redirectToProfile(frontendUrl, 'failed', 'invalid_state')
  }

  if (error || !code) {
    await markSessionFailed(state, errorDescription || error || 'missing_code')
    return redirectToProfile(frontendUrl, 'failed', error || 'missing_code')
  }

  try {
    const tokenSet = await exchangeCodeForTokens({
      code,
      expectedNonce: session.nonce,
    })

    await persistVerifiedIdentity({
      userId: session.user_id,
      claims: tokenSet.claims,
      scopes: session.scopes,
    })

    await supabaseAdmin
      .from('identity_verification_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('state', state)

    await writeAuditEntry({
      userId: session.user_id,
      action: 'Identitate verificată prin EidKit',
      actionType: 'identity_verified',
      data: { provider: 'eidkit', scopes: session.scopes.split(/\s+/) },
    })

    return redirectToProfile(frontendUrl, 'verified')
  } catch (err) {
    console.error('EidKit callback error:', err)
    await markSessionFailed(state, err instanceof Error ? err.message : 'callback_failed')
    return redirectToProfile(frontendUrl, 'failed', 'callback_failed')
  }
})

eidKitRoute.post('/demo', requireAuth, async (c) => {
  const userId = c.get('userId')
  const config = getEidKitConfig()

  if (!config.demoEnabled) {
    return c.json({ success: false, error: 'Verificarea demo EidKit este dezactivată' }, 403)
  }

  const demoClaims: EidKitClaims = {
    sub: `demo-${userId}`,
    name: 'Cetățean Verificat Demo',
    given_name: 'Cetățean',
    family_name: 'Demo',
    birthdate: '1990-01-01',
    cnp: '1900101123456',
    address: { formatted: 'Str. Memorandumului 1, Cluj-Napoca' },
    cei_document: {
      series: 'CJ',
      number: '123456',
      expiry_date: '2031-01-01',
      issuing_authority: 'SPCLEP Cluj-Napoca',
    },
    iss: config.issuer,
    aud: config.clientId || 'demo-client',
    scope: 'openid profile address cei:cnp cei:document',
  }

  await persistVerifiedIdentity({
    userId,
    claims: demoClaims,
    scopes: demoClaims.scope!,
    level: 'demo_eidkit_sso',
  })

  await writeAuditEntry({
    userId,
    action: 'Identitate verificată demo prin EidKit',
    actionType: 'identity_verified',
    data: { provider: 'eidkit', demo: true },
  })

  return c.json({ success: true, data: await buildStatusForUser(userId) })
})

eidKitRoute.post('/unlink', requireAuth, async (c) => {
  const userId = c.get('userId')

  if (!isSupabaseConfigured) {
    return c.json({ success: true, data: emptyStatus(getEidKitConfig()) })
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      eidkit_sub: null,
      identity_verified_at: null,
      identity_verification_method: null,
      identity_verification_level: null,
      identity_verified_claims: {},
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return c.json({ success: false, error: 'Nu am putut deconecta verificarea EidKit' }, 500)
  }

  await writeAuditEntry({
    userId,
    action: 'Verificarea EidKit a fost eliminată din profil',
    actionType: 'identity_unlinked',
    data: { provider: 'eidkit' },
  })

  return c.json({ success: true, data: await buildStatusForUser(userId) })
})

async function persistVerifiedIdentity({
  userId,
  claims,
  scopes,
  level = 'eidkit_sso',
}: {
  userId: string
  claims: EidKitClaims
  scopes: string
  level?: string
}) {
  if (!isSupabaseConfigured) return

  const normalized = normalizeEidKitClaims(claims)
  const safeClaims = safeClaimsForStorage(claims)
  const now = new Date().toISOString()
  const scopeList = scopes.split(/\s+/).filter(Boolean)
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, cnp, date_of_birth, address, city, buletin_series, buletin_number, buletin_expiry')
    .eq('user_id', userId)
    .maybeSingle()

  const row = {
    user_id: userId,
    full_name: normalized.full_name ?? existingProfile?.full_name ?? null,
    cnp: normalized.cnp ?? existingProfile?.cnp ?? null,
    date_of_birth: normalized.date_of_birth ?? existingProfile?.date_of_birth ?? null,
    address: normalized.address ?? existingProfile?.address ?? null,
    city: inferCity(normalized.address) || existingProfile?.city || 'Cluj-Napoca',
    buletin_series: normalized.buletin_series ?? existingProfile?.buletin_series ?? null,
    buletin_number: normalized.buletin_number ?? existingProfile?.buletin_number ?? null,
    buletin_expiry: normalized.buletin_expiry ?? existingProfile?.buletin_expiry ?? null,
    eidkit_sub: claims.sub,
    identity_verified_at: now,
    identity_verification_method: 'eidkit',
    identity_verification_level: level,
    identity_verified_claims: safeClaims,
    updated_at: now,
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(row, { onConflict: 'user_id' })

  if (profileError) {
    throw new Error(`Profile update failed: ${profileError.message}`)
  }

  const { error: verificationError } = await supabaseAdmin
    .from('identity_verifications')
    .insert({
      user_id: userId,
      provider: 'eidkit',
      provider_sub: claims.sub,
      verification_level: level,
      scopes: scopeList,
      claims: safeClaims,
      id_token_iss: typeof claims.iss === 'string' ? claims.iss : null,
      id_token_aud: Array.isArray(claims.aud) ? claims.aud.join(' ') : claims.aud ?? null,
      id_token_exp: tokenExpiryToIso(claims.exp),
    })

  if (verificationError) {
    throw new Error(`Verification insert failed: ${verificationError.message}`)
  }
}

async function buildStatusForUser(userId: string): Promise<EidKitVerificationStatus> {
  const config = getEidKitConfig()
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select(
      'full_name, cnp, date_of_birth, address, buletin_series, buletin_number, buletin_expiry, eidkit_sub, identity_verified_at, identity_verification_level, identity_verified_claims'
    )
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile) return emptyStatus(config)
  const claims = (profile.identity_verified_claims as Record<string, unknown> | null) ?? null

  return {
    configured: config.configured,
    demo_enabled: config.demoEnabled,
    verified: Boolean(profile.identity_verified_at && profile.eidkit_sub),
    provider: 'eidkit',
    verified_at: profile.identity_verified_at ?? null,
    verification_level: profile.identity_verification_level ?? null,
    scopes: scopesFromClaims(claims),
    claims,
    profile_fields: {
      full_name: profile.full_name ?? null,
      cnp: profile.cnp ?? null,
      date_of_birth: profile.date_of_birth ?? null,
      address: profile.address ?? null,
      buletin_series: profile.buletin_series ?? null,
      buletin_number: profile.buletin_number ?? null,
      buletin_expiry: profile.buletin_expiry ?? null,
    },
  }
}

function emptyStatus(config = getEidKitConfig()): EidKitVerificationStatus {
  return {
    configured: config.configured,
    demo_enabled: config.demoEnabled,
    verified: false,
    provider: 'eidkit',
    verified_at: null,
    verification_level: null,
    scopes: config.scopes,
    claims: null,
    profile_fields: {},
  }
}

async function loadPendingSession(state: string): Promise<{
  user_id: string
  nonce: string
  scopes: string
} | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabaseAdmin
    .from('identity_verification_sessions')
    .select('user_id, nonce, scopes')
    .eq('state', state)
    .eq('status', 'pending')
    .maybeSingle()

  return data ?? null
}

async function markSessionFailed(state: string, error: string) {
  if (!isSupabaseConfigured) return
  await supabaseAdmin
    .from('identity_verification_sessions')
    .update({ status: 'failed', error, completed_at: new Date().toISOString() })
    .eq('state', state)
}

function scopesFromClaims(claims: Record<string, unknown> | null): string[] {
  const scope = claims?.scope
  return typeof scope === 'string' ? scope.split(/\s+/).filter(Boolean) : []
}

function redirectToProfile(frontendUrl: string, status: 'verified' | 'failed', reason?: string): Response {
  const url = new URL('/profile', frontendUrl)
  url.searchParams.set('eidkit', status)
  if (reason) url.searchParams.set('reason', reason)
  return Response.redirect(url.toString(), 302)
}

function getFrontendUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '')
}

function inferCity(address: string | null): string | null {
  if (!address) return null
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean)
  return parts[parts.length - 1] ?? null
}
