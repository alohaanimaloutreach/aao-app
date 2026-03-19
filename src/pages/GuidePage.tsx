import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarHeart, PawPrint, Users, MapPin, Stethoscope, StickyNote, Package, Syringe, Pill, Scissors, Heart, ClipboardList, MessageSquarePlus, Send, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function GuidePage() {
  const { user, profile } = useAuth();
  const [suggestion, setSuggestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmitSuggestion() {
    if (!suggestion.trim() || !user) return;
    setSubmitting(true);
    await supabase.from('suggestions').insert({
      message: suggestion.trim(),
      submitted_by: user.id,
      submitted_by_name: profile?.name ?? null,
    });
    setSubmitting(false);
    setSubmitted(true);
    setSuggestion('');
    setTimeout(() => setSubmitted(false), 4000);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-night mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold font-heading text-night tracking-tight mb-1">How to Use the App</h1>
      <p className="text-muted mb-6">A quick guide to the key features</p>

      {/* Outreach Events */}
      <Section
        icon={CalendarHeart}
        iconColor="text-primary"
        title="Running an Outreach Event"
      >
        <p>An outreach event is how you track everything that happens during a day in the field — check-ins, food distribution, vaccines, and more.</p>

        <Step number={1} title="Start the Event">
          Tap <strong>Start Outreach</strong> on the dashboard. Pick the location and date, then tap <strong>Create Event</strong>. The event is now "active" and you'll see it on the dashboard.
        </Step>

        <Step number={2} title="Check In Owners">
          On the <strong>Check In</strong> tab, search for an owner by name, phone, or animal name. If they're new, tap <strong>Add new owner</strong>. Owners at the event location will also appear in a "Nearby" list for quick access.
        </Step>

        <Step number={3} title="Select Animals and Services">
          <p>After selecting an owner, you'll see their animals. Each animal is auto-checked for food. Tap the service tags to add what they need:</p>
          <div className="grid grid-cols-2 gap-1.5 mt-2 mb-2">
            <ServiceLabel icon={Package} label="Food" desc="Food bag pickup" />
            <ServiceLabel icon={Syringe} label="Vaccines" desc="DAPP, Parvo, etc." />
            <ServiceLabel icon={Pill} label="Preventatives" desc="Oral or topical" />
            <ServiceLabel icon={Scissors} label="Nail Trim" desc="Grooming service" />
            <ServiceLabel icon={Stethoscope} label="Medical" desc="Vet attention needed" />
            <ServiceLabel icon={Heart} label="S/N Today" desc="Surgery at this event" />
            <ServiceLabel icon={ClipboardList} label="S/N List" desc="Add to future S/N waitlist" />
          </div>
        </Step>

        <Step number={4} title="Complete or Send to Queue">
          <p><strong>Food only?</strong> Tap <strong>Complete Check-In</strong> — done! The care is logged immediately.</p>
          <p className="mt-1"><strong>Needs vet services?</strong> Tap <strong>Send to Outreach Queue</strong>. The owner will appear in the Queue tab for volunteers to work through.</p>
        </Step>

        <Step number={5} title="End the Event">
          When the day is done, tap <strong>End Event</strong> on the dashboard. This finalizes the summary with food totals and all care logged during the event.
        </Step>
      </Section>

      {/* Logging Care Outside Events */}
      <Section
        icon={Stethoscope}
        iconColor="text-primary"
        title="Logging Care (No Event Needed)"
      >
        <p>You don't need an active event to log care. Go to any animal's profile and tap the green <strong>Log Care</strong> button. Select the services provided, add any notes, and save. It will appear on the animal's timeline.</p>
      </Section>

      {/* Finding Records */}
      <Section
        icon={PawPrint}
        iconColor="text-primary"
        title="Animals, People, and Locations"
      >
        <p>Use the buttons on the dashboard or the bottom menu to find records:</p>
        <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
          <li><strong>Animals</strong> — Search by name or AAO ID. Tap to view timeline, log care, add photos, or update status.</li>
          <li><strong>People</strong> — Search owners by name or phone. View their animals and contact info.</li>
          <li><strong>Locations</strong> — Browse service areas. Each location shows its owners and animals on a map.</li>
        </ul>
      </Section>

      {/* Field Notes */}
      <Section
        icon={StickyNote}
        iconColor="text-muted"
        title="Field Notes"
      >
        <p>Tap <strong>New Field Note</strong> on the dashboard to jot down quick observations. You can link a note to an animal, owner, or location. Notes show up in the activity feed and on the linked record's timeline.</p>
      </Section>

      {/* Quick Reference */}
      <div className="bg-sand/50 rounded-2xl border border-night/5 p-5 mt-2 mb-8">
        <p className="text-sm font-semibold text-night mb-2">Quick Reference</p>
        <div className="space-y-1.5 text-sm text-muted">
          <p><strong className="text-night">S/N List</strong> — Marks an animal's owner as interested in spay/neuter for a future event</p>
          <p><strong className="text-night">S/N Today</strong> — Animal is getting surgery at this event (goes to vet queue)</p>
          <p><strong className="text-night">Needs Attention</strong> — Dashboard alerts for animals needing follow-up</p>
          <p><strong className="text-night">Flags</strong> — Records that need coordinator review (imported data, volunteer notes)</p>
        </div>
      </div>

      {/* Suggestion Box */}
      <div className="bg-white rounded-2xl border border-night/5 p-5 mb-8">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquarePlus className="w-5 h-5 text-primary" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-heading font-bold text-night">Have a Suggestion?</h2>
            <p className="text-xs text-muted">Ideas, requests, or things that would make this app better</p>
          </div>
        </div>
        {submitted ? (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
            <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <p className="text-sm font-medium text-primary">Thanks! Your suggestion has been submitted.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="What would make this app more helpful for you?"
              rows={3}
              className="w-full px-3 py-2.5 bg-white border border-night/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted/40 resize-none"
            />
            <button
              onClick={handleSubmitSuggestion}
              disabled={!suggestion.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl shadow-[0_2px_8px_rgba(110,168,50,0.25)] disabled:opacity-30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Sending...' : 'Send Suggestion'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, iconColor, title, children }: { icon: any; iconColor: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-night/5 p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-heading font-bold text-night">{title}</h2>
      </div>
      <div className="text-sm text-night leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mt-3">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-primary">{number}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-night mb-1">{title}</p>
        <div className="text-sm text-muted leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function ServiceLabel({ icon: Icon, label, desc }: { icon: any; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-2 bg-sand/50 rounded-lg px-2.5 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted shrink-0" />
      <div className="min-w-0">
        <span className="text-xs font-medium text-night">{label}</span>
        <span className="text-xs text-muted ml-1">— {desc}</span>
      </div>
    </div>
  );
}
