// Client-side persona display data + opening lines. The actual persona "brain"
// (system prompts) lives on the server in server/personas.js. Opening questions
// are static so the executive can greet the user instantly, before any API call.

export const PERSONAS = [
  {
    id: 'hotel-director',
    name: 'Margaret Lindqvist',
    role: 'Skeptical Hotel Director',
    blurb:
      'Primary scenario. 22 years in hospitality, has seen every "transformation" fail. Pushes on behavior change, ROI, and implementation risk.',
    accent: 'from-rose-500 to-orange-500',
    openers: {
      default:
        "Right, you've got my attention for a few minutes. I've sat through a lot of these. So tell me plainly — what is this, and why should I believe it'll actually change anything on my floor?",
    },
  },
  {
    id: 'cfo',
    name: 'David Chen',
    role: 'Chief Financial Officer',
    blurb:
      'Precise and unsentimental. Questions budget, payback period, and the one metric you would put on a dashboard.',
    accent: 'from-sky-500 to-indigo-500',
    openers: {
      default:
        "Let's not waste each other's time. Give me the pitch in two sentences, and then tell me what it costs me — all in, including my people's time.",
    },
  },
  {
    id: 'hr-manager',
    name: 'Aisha Okonkwo',
    role: 'HR Manager',
    blurb:
      'Head of People. Cares whether this is real for employees or just another thing dumped on stretched managers. Focuses on retention, cultural fit, sustainability.',
    accent: 'from-emerald-500 to-teal-500',
    openers: {
      default:
        "Thanks for coming in. Before the slides — tell me honestly: who is this actually for, and what does it ask of my managers who are already stretched thin?",
    },
  },
];

// Suggested contexts the user can pick or override.
export const CONTEXTS = [
  'Pitching a leadership development program',
  'Pitching a culture / engagement transformation',
  'Pitching an executive coaching retainer',
  'Pitching a change-management partnership',
  'Pitching a team performance / accountability program',
];

export function getPersona(id) {
  return PERSONAS.find((p) => p.id === id) || null;
}

export function openingFor(persona, context) {
  // Currently one opener per persona; context is woven in by the live model afterwards.
  return persona.openers.default;
}
