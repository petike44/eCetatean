import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";

import { Bell, IdCard, Plane, Briefcase, Baby, CarFront, Car, AlertCircle, ChevronRight, FileUp, Loader2, Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";

import { HomeTopBar } from "@/components/TopBar";

import { Card, PrimaryButton, GhostButton, Badge } from "@/components/ui-bits";

import { Protected } from "@/lib/auth-guard";

import { useProfile, useLifeEvents } from "@/lib/api-hooks";

import { profileCompletion, formatRoDate } from "@/lib/profile-utils";



export const Route = createFileRoute("/documents")({

  head: () => ({ meta: [{ title: "Documente — eCetățean" }] }),

  component: () => (

    <Protected>

      <Documents />

    </Protected>

  ),

});



const iconFor: Record<string, typeof IdCard> = {

  "id-card": IdCard, plane: Plane, briefcase: Briefcase, baby: Baby, "car-front": CarFront, car: Car,

};



const procedureGroups = [

  {

    title: "Identitate",

    items: [

      { icon: "id-card", label: "Buletin de identitate", query: "Reînnoire buletin" },

      { icon: "plane", label: "Pașaport", query: "Pașaport simplu electronic" },

    ],

  },

  {

    title: "Vehicule",

    items: [

      { icon: "car-front", label: "Permis de conducere", query: "Permis de conducere" },

      { icon: "car", label: "Înmatriculare vehicul", query: "Înmatriculare vehicul" },

    ],

  },

  {

    title: "Afaceri & familie",

    items: [

      { icon: "briefcase", label: "Înregistrare PFA", query: "Înregistrare PFA" },

      { icon: "baby", label: "Certificat de naștere", query: "Certificat de naștere copil" },

    ],

  },

];



function Documents() {

  const nav = useNavigate();

  const { data: profile, isLoading: profileLoading } = useProfile();

  const { data: lifeEvents = [] } = useLifeEvents();

  const { pct, filled, total } = profileCompletion(profile);

  const activeEvents = lifeEvents.filter((e) => !e.is_completed);



  const hasId =

    profile?.buletin_series?.trim() && profile?.buletin_number?.trim();



  const startProcedure = () => {
    nav({ to: "/chat" });
  };



  return (

    <AppShell

      topBar={

        <HomeTopBar

          right={

            <button aria-label="Notificări" className="press relative min-h-11 min-w-11 flex items-center justify-center rounded-xl">

              <Bell size={22} className="text-text-primary" />

            </button>

          }

        />

      }

    >

      <div className="lg:max-w-6xl lg:mx-auto">

        <div className="px-5 pt-4 lg:px-8 lg:pt-6">

          <h1 className="font-display font-bold text-[22px] lg:text-[28px] text-text-primary">Documentele mele</h1>

          <p className="text-[14px] text-text-secondary mt-1">Acte din profil, proceduri active și pași noi cu ClaudIA.</p>

        </div>



        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:px-8 lg:mt-6">

          <div>

            <div className="px-5 mt-5 lg:px-0 lg:mt-0">

              <Card accent={pct >= 100 ? "green" : "amber"}>

                {profileLoading ? (

                  <div className="flex items-center gap-2 text-text-secondary text-[14px] py-2">

                    <Loader2 size={18} className="animate-spin shrink-0" /> Se încarcă profilul...

                  </div>

                ) : (

                  <>

                    <div className="flex items-baseline justify-between gap-3 mb-3">

                      <h3 className="font-display font-semibold text-[15px] text-text-primary">

                        {pct >= 100 ? "Profil complet" : "Completează profilul"}

                      </h3>

                      <span className="text-[12px] text-text-tertiary shrink-0">{filled}/{total} câmpuri</span>

                    </div>

                    <div className="h-2 bg-surface-secondary rounded-full overflow-hidden mb-3">

                      <div

                        className="h-full bg-accent rounded-full transition-all duration-500 ease-out"

                        style={{ width: `${pct}%` }}

                      />

                    </div>

                    <p className="text-[13px] text-text-secondary mb-3">

                      {pct >= 100

                        ? "Datele tale sunt gata pentru autocompletare în formulare."

                        : "Cu cât completezi mai mult, cu atât ClaudIA îți pregătește formularele mai repede."}

                    </p>

                    <Link to="/profile" className="press text-[13px] font-semibold text-primary inline-flex items-center gap-1 min-h-11">

                      {pct < 100 ? "Mergi la profil" : "Vezi profilul"}

                      <ChevronRight size={14} />

                    </Link>

                  </>

                )}

              </Card>

            </div>



            <section className="px-5 mt-6 lg:px-0">

              <h2 className="font-display font-semibold text-[18px] text-text-primary mb-3">Proceduri în desfășurare</h2>

              {activeEvents.length === 0 ? (

                <Card>

                  <div className="flex items-start gap-3">

                    <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">

                      <Sparkles size={20} />

                    </div>

                    <div>

                      <p className="font-display font-semibold text-[15px] text-text-primary">Nicio procedură activă</p>

                      <p className="text-[14px] text-text-secondary mt-1">

                        Începe una din secțiunea de mai jos sau întreabă direct în chat.

                      </p>

                      <PrimaryButton className="py-3.5 mt-4" onClick={() => nav({ to: "/chat" })}>

                        Deschide ClaudIA

                      </PrimaryButton>

                    </div>

                  </div>

                </Card>

              ) : (

                <div className="space-y-3">

                  {activeEvents.map((ev) => (

                    <Card key={ev.id} accent="amber">

                      <p className="font-display font-semibold text-[15px] text-text-primary mb-1">{ev.event_title}</p>

                      <p className="text-[14px] text-text-secondary mb-3">

                        Pasul {ev.current_step} din {ev.total_steps}

                      </p>

                      <GhostButton onClick={() => nav({ to: "/chat" })}>Continuă în chat</GhostButton>

                    </Card>

                  ))}

                </div>

              )}

            </section>

          </div>



          <div>

            <section className="px-5 mt-6 lg:px-0 lg:mt-0">

              <h2 className="font-display font-semibold text-[18px] text-text-primary mb-3">Actele mele</h2>

              {!hasId ? (

                <Card>

                  <div className="flex items-start gap-3">

                    <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">

                      <FileUp size={20} />

                    </div>

                    <div className="flex-1 min-w-0">

                      <p className="font-display font-semibold text-[15px] text-text-primary">Niciun act înregistrat</p>

                      <p className="text-[14px] text-text-secondary mt-1">

                        Adaugă seria și numărul buletinului în profil pentru a le vedea aici.

                      </p>

                      <Link

                        to="/profile"

                        className="press inline-flex items-center gap-1 text-[13px] font-semibold text-primary mt-3 min-h-11"

                      >

                        Completează buletinul <ChevronRight size={14} />

                      </Link>

                    </div>

                  </div>

                </Card>

              ) : (

                <div className="space-y-2">

                  <DocRow

                    icon={IdCard}

                    title="Carte de identitate"

                    meta={`Seria ${profile!.buletin_series} ${profile!.buletin_number}`}

                    badge={<Badge tone="green">ÎNREGISTRAT</Badge>}

                    sub={

                      profile?.buletin_expiry

                        ? `Expiră ${formatRoDate(profile.buletin_expiry)}`

                        : "Adaugă data expirării în profil"

                    }

                  />

                  <DocRow

                    icon={Plane}

                    title="Pașaport"

                    meta="Nu este înregistrat"

                    badge={<Badge tone="neutral">LIPSĂ</Badge>}

                    sub="Întreabă ClaudIA pentru pașaport"

                    onAction={() => startProcedure()}

                  />

                </div>

              )}

            </section>



            {procedureGroups.map((group) => (

              <section key={group.title} className="px-5 mt-6 lg:px-0">

                <h2 className="font-display font-semibold text-[18px] text-text-primary mb-3">{group.title}</h2>

                <div className="grid grid-cols-2 gap-3">

                  {group.items.map((a) => {

                    const I = iconFor[a.icon];

                    return (

                      <button

                        key={a.label}

                        type="button"

                        onClick={() => startProcedure()}

                        className="press bg-surface border border-border rounded-2xl p-4 shadow-card text-left min-h-[5.5rem]"

                      >

                        <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center mb-3">

                          <I size={20} />

                        </div>

                        <p className="font-display font-semibold text-[13.5px] text-text-primary leading-snug">{a.label}</p>

                      </button>

                    );

                  })}

                </div>

              </section>

            ))}



            <section className="px-5 mt-6 lg:px-0">

              <Card>

                <div className="flex items-start gap-3 mb-3">

                  <div className="w-11 h-11 rounded-2xl bg-accent-light text-accent-dark flex items-center justify-center shrink-0">

                    <AlertCircle size={20} />

                  </div>

                  <div>

                    <h3 className="font-display font-semibold text-[15px] text-text-primary">Sesizare rapidă</h3>

                    <p className="text-[14px] text-text-secondary mt-0.5">Raportează o problemă în oraș — groapă, iluminat, gunoi.</p>

                  </div>

                </div>

                <GhostButton onClick={() => nav({ to: "/report" })}>Sesizează acum</GhostButton>

              </Card>

            </section>

          </div>

        </div>



        <section className="px-5 mt-6 mb-4 lg:px-8">

          <Link to="/staff" className="press block text-center text-[13px] text-primary font-medium min-h-11 flex items-center justify-center underline-offset-4 hover:underline">

            Ești funcționar public?

          </Link>

        </section>

      </div>

    </AppShell>

  );

}



function DocRow({

  icon: Icon,

  title,

  meta,

  badge,

  sub,

  onAction,

}: {

  icon: typeof IdCard;

  title: string;

  meta: string;

  badge: React.ReactNode;

  sub: string;

  onAction?: () => void;

}) {

  const inner = (

    <article className="bg-surface border border-border rounded-2xl p-4 shadow-card flex items-center gap-3">

      <div className="w-11 h-11 rounded-2xl bg-primary-light text-primary flex items-center justify-center shrink-0">

        <Icon size={20} />

      </div>

      <div className="flex-1 min-w-0">

        <p className="font-display font-semibold text-[14.5px] text-text-primary truncate">{title}</p>

        <p className="text-[13px] text-text-secondary mt-0.5 truncate">{meta}</p>

        <p className="text-[12px] text-text-tertiary truncate">{sub}</p>

      </div>

      {badge}

    </article>

  );

  if (onAction) {

    return (

      <button type="button" onClick={onAction} className="press w-full text-left">

        {inner}

      </button>

    );

  }

  return inner;

}

