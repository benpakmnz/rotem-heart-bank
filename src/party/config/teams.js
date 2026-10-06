// Class mode teams: no names to type and no animals to pick - every team is a
// heart in its own color, the same as the pyramid sign on its table
// (public/team-signs.pdf). New teams take the next free color in this order.
//   colors: the heart's gradient (light top -> deep bottom); ink: one solid tone
export const TEAM_COLORS = [
  { id: 'red', name: 'הלב האדום', colors: ['#FF7B8E', '#D7143C'], ink: '#E11D48' },
  { id: 'blue', name: 'הלב הכחול', colors: ['#6DB6FF', '#1F55DB'], ink: '#2563EB' },
  { id: 'green', name: 'הלב הירוק', colors: ['#7EE38D', '#169B3D'], ink: '#16A34A' },
  { id: 'yellow', name: 'הלב הצהוב', colors: ['#FFEB70', '#F2B400'], ink: '#FACC15' },
  { id: 'orange', name: 'הלב הכתום', colors: ['#FFB870', '#EE6A0E'], ink: '#F97316' },
  { id: 'purple', name: 'הלב הסגול', colors: ['#CDA2FF', '#7B2FD8'], ink: '#9333EA' },
  { id: 'pink', name: 'הלב הוורוד', colors: ['#FFAEDB', '#EC3FA0'], ink: '#EC4899' },
  { id: 'turquoise', name: 'הלב התכלת', colors: ['#8CF0FF', '#0FA8C8'], ink: '#06B6D4' },
];

export const teamColor = (id) => TEAM_COLORS.find((c) => c.id === id) || null;
